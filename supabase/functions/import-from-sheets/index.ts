import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { extractAuthPayload } from "../_shared/jwt.ts";

const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const spreadsheetIdRegex = /^[a-zA-Z0-9_-]{20,60}$/;

const importSchema = z.object({
  spreadsheetId: z.string().regex(spreadsheetIdRegex).max(60),
  sheetName: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\s_-]+$/),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const payload = await extractAuthPayload(req);
    if (!payload) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Request body tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validationResult = importSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: validationResult.error.errors[0]?.message || "Input tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { spreadsheetId, sheetName } = validationResult.data;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if user has admin role using verified user ID from JWT
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', payload.sub)
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

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName)}?key=${GOOGLE_SHEETS_API_KEY}`;

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

    const headerMap: Record<string, string> = {
      'NIK': 'nik', 'Nama': 'nama', 'JK': 'jk', 'Tgl Lahir': 'tgl_lahir',
      'BB Lahir': 'bb_lahir', 'TB Lahir': 'tb_lahir', 'Nama Ortu': 'nama_ortu',
      'Prov': 'prov', 'Kab/Kota': 'kab_kota', 'Kec': 'kec', 'Pukesmas': 'puskesmas',
      'Desa/Kel': 'desa_kel', 'Posyandu': 'posyandu', 'RT': 'rt', 'RW': 'rw',
      'Alamat': 'alamat', 'Usia Saat Ukur': 'usia_saat_ukur',
      'Tanggal Pengukuran': 'tanggal_pengukuran', 'Bulan Pengukuran': 'bulan_pengukuran',
      'Status Bulan': 'status_bulan', 'status tahun': 'status_tahun',
      'Berat': 'berat', 'Tinggi': 'tinggi', 'Cara Ukur': 'cara_ukur', 'LiLA': 'lila',
      'BB/U': 'bb_u', 'ZS BB/U': 'zs_bb_u', 'TB/U': 'tb_u', 'ZS TB/U': 'zs_tb_u',
      'BB/TB': 'bb_tb', 'ZS BB/TB': 'zs_bb_tb', 'Naik Berat Badan': 'naik_berat_badan',
      'PMT Diterima (kg)': 'pmt_diterima', 'Jml Vit A': 'jml_vit_a',
      'KPSP': 'kpsp', 'KIA': 'kia', 'Detail Status': 'detail_status', 'status desa': 'status_desa',
    };

    const records: Record<string, string>[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const record: Record<string, string> = {};

      headers.forEach((header: string, index: number) => {
        const dbColumn = headerMap[header];
        if (dbColumn) record[dbColumn] = row[index] || '';
      });

      if (record.nik && record.nama) records.push(record);
    }

    console.log(`Prepared ${records.length} records for import`);

    const batchSize = 100;
    let upserted = 0;
    let errors = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: upsertError } = await supabase
        .from('child_records')
        .upsert(batch, { 
          onConflict: 'nik,tanggal_pengukuran',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error(`Error upserting batch ${i}:`, upsertError);
        errors++;
        continue;
      }

      upserted += batch.length;
    }

    // Remove records from DB that no longer exist in the sheet
    const sheetKeys = new Set(records.map(r => `${r.nik}||${r.tanggal_pengukuran}`));
    
    // Fetch all existing records' keys from DB
    const { data: existingRecords, error: fetchError } = await supabase
      .from('child_records')
      .select('id, nik, tanggal_pengukuran');

    let deleted = 0;
    if (!fetchError && existingRecords) {
      const idsToDelete = existingRecords
        .filter(r => !sheetKeys.has(`${r.nik}||${r.tanggal_pengukuran}`))
        .map(r => r.id);

      if (idsToDelete.length > 0) {
        for (let i = 0; i < idsToDelete.length; i += batchSize) {
          const batch = idsToDelete.slice(i, i + batchSize);
          const { error: delError } = await supabase
            .from('child_records')
            .delete()
            .in('id', batch);
          if (!delError) deleted += batch.length;
        }
      }
    }

    const message = `Berhasil sinkronisasi: ${upserted} record diperbarui/ditambahkan, ${deleted} record dihapus${errors > 0 ? `, ${errors} batch gagal` : ''}`;

    return new Response(
      JSON.stringify({ success: true, message, count: upserted, deleted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan internal" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
