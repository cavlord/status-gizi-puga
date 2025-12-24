import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { spreadsheetId, sheetName, email } = await req.json();

    if (!spreadsheetId || !sheetName) {
      return new Response(
        JSON.stringify({ error: "spreadsheetId and sheetName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is authenticated and is admin
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if user exists, is verified, and is admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, verified')
      .eq('email', email)
      .maybeSingle();

    if (userError || !user || !user.verified) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!GOOGLE_SHEETS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Google Sheets API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch data from Google Sheets
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName)}?key=${GOOGLE_SHEETS_API_KEY}`;
    
    console.log("Fetching data from Google Sheets...");
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Sheets API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch data from Google Sheets" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const rows = data.values;

    if (!rows || rows.length < 2) {
      return new Response(
        JSON.stringify({ error: "No data found in spreadsheet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const headers = rows[0];
    console.log("Headers:", headers);

    // Map Google Sheets headers to database columns
    const headerMap: Record<string, string> = {
      'NIK': 'nik',
      'Nama': 'nama',
      'JK': 'jk',
      'Tgl Lahir': 'tgl_lahir',
      'BB Lahir': 'bb_lahir',
      'TB Lahir': 'tb_lahir',
      'Nama Ortu': 'nama_ortu',
      'Prov': 'prov',
      'Kab/Kota': 'kab_kota',
      'Kec': 'kec',
      'Pukesmas': 'puskesmas',
      'Desa/Kel': 'desa_kel',
      'Posyandu': 'posyandu',
      'RT': 'rt',
      'RW': 'rw',
      'Alamat': 'alamat',
      'Usia Saat Ukur': 'usia_saat_ukur',
      'Tanggal Pengukuran': 'tanggal_pengukuran',
      'Bulan Pengukuran': 'bulan_pengukuran',
      'Status Bulan': 'status_bulan',
      'status tahun': 'status_tahun',
      'Berat': 'berat',
      'Tinggi': 'tinggi',
      'Cara Ukur': 'cara_ukur',
      'LiLA': 'lila',
      'BB/U': 'bb_u',
      'ZS BB/U': 'zs_bb_u',
      'TB/U': 'tb_u',
      'ZS TB/U': 'zs_tb_u',
      'BB/TB': 'bb_tb',
      'ZS BB/TB': 'zs_bb_tb',
      'Naik Berat Badan': 'naik_berat_badan',
      'PMT Diterima (kg)': 'pmt_diterima',
      'Jml Vit A': 'jml_vit_a',
      'KPSP': 'kpsp',
      'KIA': 'kia',
      'Detail Status': 'detail_status',
      'status desa': 'status_desa',
    };

    // Build records array
    const records: Record<string, string>[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const record: Record<string, string> = {};
      
      headers.forEach((header: string, index: number) => {
        const dbColumn = headerMap[header];
        if (dbColumn) {
          record[dbColumn] = row[index] || '';
        }
      });
      
      // Only add if required fields are present
      if (record.nik && record.nama) {
        records.push(record);
      }
    }

    console.log(`Prepared ${records.length} records for import`);

    // Clear existing data and insert new
    const { error: deleteError } = await supabase
      .from('child_records')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error("Error clearing existing data:", deleteError);
    }

    // Insert in batches of 100
    const batchSize = 100;
    let imported = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('child_records')
        .insert(batch);
      
      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
        return new Response(
          JSON.stringify({ error: `Failed to import batch: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      imported += batch.length;
      console.log(`Imported ${imported}/${records.length} records`);
    }

    console.log("Import completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully imported ${imported} records`,
        count: imported
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to import data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});