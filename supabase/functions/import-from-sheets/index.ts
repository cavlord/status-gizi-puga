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
  sheetName: z.string().min(1).max(100),
});

// Maps Google Sheet column headers → DB column names
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

// Only the columns that exist in the DB — used to strip any extra fields before insert
const DB_COLUMNS = new Set([
  'nik', 'nama', 'jk', 'tgl_lahir', 'bb_lahir', 'tb_lahir', 'nama_ortu',
  'prov', 'kab_kota', 'kec', 'puskesmas', 'desa_kel', 'posyandu', 'rt', 'rw',
  'alamat', 'usia_saat_ukur', 'tanggal_pengukuran', 'bulan_pengukuran',
  'status_bulan', 'status_tahun', 'berat', 'tinggi', 'cara_ukur', 'lila',
  'bb_u', 'zs_bb_u', 'tb_u', 'zs_tb_u', 'bb_tb', 'zs_bb_tb',
  'naik_berat_badan', 'pmt_diterima', 'jml_vit_a', 'kpsp', 'kia',
  'detail_status', 'status_desa',
]);

type DbRecord = Record<string, string | null>;

function toDbRecord(raw: Record<string, string>): DbRecord {
  const out: DbRecord = {};
  for (const col of DB_COLUMNS) {
    // Convert empty string to null so DB constraints are happy
    const val = raw[col];
    out[col] = val && val.trim() !== '' ? val.trim() : null;
  }
  // nik and nama must not be null (NOT NULL columns)
  out['nik'] = raw['nik']?.trim() || null;
  out['nama'] = raw['nama']?.trim() || null;
  return out;
}

// deno-lint-ignore no-explicit-any
async function fetchAllExistingRecords(supabase: any) {
  const allRecords: { id: number; nik: string | null; tanggal_pengukuran: string | null }[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('child_records')
      .select('id, nik, tanggal_pengukuran')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRecords.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRecords;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      const parseError = validationResult as { success: false; error: { errors: { message: string }[] } };
      return new Response(
        JSON.stringify({ error: parseError.error.errors[0]?.message || "Input tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { spreadsheetId, sheetName } = validationResult.data;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    // Fetch sheet data
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
    const rows: string[][] = data.values;

    if (!rows || rows.length < 2) {
      return new Response(
        JSON.stringify({ error: "No data found in spreadsheet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sheetHeaders: string[] = rows[0];
    const totalDataRows = rows.length - 1;

    // Log actual sheet headers to help diagnose column name mismatches
    console.log(`Sheet headers: ${JSON.stringify(sheetHeaders)}`);

    // Deduplicate by nik+tanggal_pengukuran, last row wins
    const recordMap = new Map<string, DbRecord>();
    let skippedNoNik = 0;
    let skippedNoNama = 0;
    let duplicatesOverwritten = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const raw: Record<string, string> = {};

      sheetHeaders.forEach((header: string, index: number) => {
        const dbCol = headerMap[header.trim()];
        if (dbCol) raw[dbCol] = row[index] ?? '';
      });

      if (!raw.nik?.trim()) { skippedNoNik++; continue; }
      if (!raw.nama?.trim()) { skippedNoNama++; continue; }

      const record = toDbRecord(raw);
      const key = `${record.nik}||${record.tanggal_pengukuran ?? ''}`;
      if (recordMap.has(key)) duplicatesOverwritten++;
      recordMap.set(key, record);
    }

    const records = Array.from(recordMap.values());
    console.log(`Parsed: total=${totalDataRows}, valid=${records.length}, skippedNIK=${skippedNoNik}, skippedNama=${skippedNoNama}, dupes=${duplicatesOverwritten}`);

    // Log first record to verify shape
    if (records.length > 0) {
      console.log(`Sample record: ${JSON.stringify(records[0])}`);
    }

    const batchSize = 100;
    let upserted = 0;
    let errors = 0;
    let firstErrorMsg = '';

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: upsertError } = await supabase
        .from('child_records')
        .upsert(batch, { onConflict: 'nik,tanggal_pengukuran', ignoreDuplicates: false });

      if (upsertError) {
        console.error(`Upsert error batch ${i}:`, JSON.stringify(upsertError));
        if (!firstErrorMsg) firstErrorMsg = upsertError.message;
        errors++;
        continue;
      }
      upserted += batch.length;
    }

    // Sync: remove DB records no longer in sheet
    const sheetKeys = new Set(records.map(r => `${r.nik}||${r.tanggal_pengukuran ?? ''}`));
    let deleted = 0;
    try {
      const existingRecords = await fetchAllExistingRecords(supabase);
      const idsToDelete = existingRecords
        .filter(r => !sheetKeys.has(`${r.nik}||${r.tanggal_pengukuran ?? ''}`))
        .map(r => r.id);

      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const { error: delError } = await supabase
          .from('child_records')
          .delete()
          .in('id', idsToDelete.slice(i, i + batchSize));
        if (!delError) deleted += Math.min(batchSize, idsToDelete.length - i);
      }
    } catch (fetchErr) {
      console.error("Error during delete sync:", fetchErr);
    }

    const message = errors > 0
      ? `Import selesai dengan error: ${upserted} berhasil, ${errors} batch gagal. Error: ${firstErrorMsg}. Total baris sheet: ${totalDataRows}, dilewati (NIK kosong: ${skippedNoNik}, Nama kosong: ${skippedNoNama}, duplikat: ${duplicatesOverwritten})`
      : `Berhasil sinkronisasi: ${upserted} record diperbarui/ditambahkan, ${deleted} record dihapus. Total baris sheet: ${totalDataRows}, dilewati (NIK kosong: ${skippedNoNik}, Nama kosong: ${skippedNoNama}, duplikat: ${duplicatesOverwritten})`;

    return new Response(
      JSON.stringify({ success: true, message, count: upserted, deleted }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Import error:", msg);
    return new Response(
      JSON.stringify({ error: `Terjadi kesalahan internal: ${msg}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
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
  sheetName: z.string().min(1).max(100),
});

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

async function fetchAllExistingRecords(supabase: any) {
  const allRecords: any[] = [];
  const pageSize = 1000;
  let from = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from('child_records')
      .select('id, nik, tanggal_pengukuran')
      .range(from, from + pageSize - 1);
    
    if (error) throw error;
    if (!data || data.length === 0) break;
    
    allRecords.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  
  return allRecords;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      const parseError = validationResult as { success: false; error: { errors: { message: string }[] } };
      return new Response(
        JSON.stringify({ error: parseError.error.errors[0]?.message || "Input tidak valid" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { spreadsheetId, sheetName } = validationResult.data;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
    const totalDataRows = rows.length - 1;

    // Parse all rows, keeping ALL records including those without nik/nama
    const recordMap = new Map<string, Record<string, string>>();
    let skippedNoNik = 0;
    let skippedNoNama = 0;
    let duplicatesOverwritten = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const record: Record<string, string> = {};

      headers.forEach((header: string, index: number) => {
        const dbColumn = headerMap[header];
        if (dbColumn) record[dbColumn] = row[index] || '';
      });

      if (!record.nik || record.nik.trim() === '') {
        skippedNoNik++;
        continue;
      }
      if (!record.nama || record.nama.trim() === '') {
        skippedNoNama++;
        continue;
      }

      const key = record.tanggal_pengukuran?.trim()
        ? `${record.nik}||${record.tanggal_pengukuran}`
        : `${record.nik}||__row_${i}`;
      if (recordMap.has(key)) {
        duplicatesOverwritten++;
      }
      recordMap.set(key, record);
    }

    const records = Array.from(recordMap.values());

    // Split: records with a date use upsert (conflict on nik+date), records without use insert
    const recordsWithDate = records.filter(r => r.tanggal_pengukuran?.trim());
    const recordsWithoutDate = records.filter(r => !r.tanggal_pengukuran?.trim());

    console.log(`Sheet total rows: ${totalDataRows}, After filter: ${records.length} (with date: ${recordsWithDate.length}, without date: ${recordsWithoutDate.length}), Skipped no NIK: ${skippedNoNik}, Skipped no Nama: ${skippedNoNama}, Duplicates overwritten: ${duplicatesOverwritten}`);

    const batchSize = 100;
    let upserted = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Upsert records that have a tanggal_pengukuran (safe to use conflict key)
    for (let i = 0; i < recordsWithDate.length; i += batchSize) {
      const batch = recordsWithDate.slice(i, i + batchSize);
      const { error: upsertError } = await supabase
        .from('child_records')
        .upsert(batch, {
          onConflict: 'nik,tanggal_pengukuran',
          ignoreDuplicates: false
        });

      if (upsertError) {
        console.error(`Error upserting batch ${i}:`, upsertError);
        errorDetails.push(`Batch ${i}: ${upsertError.message}`);
        errors++;
        continue;
      }

      upserted += batch.length;
    }

    // Insert records without a date — delete existing ones for same NIK first to avoid PK conflicts
    for (let i = 0; i < recordsWithoutDate.length; i += batchSize) {
      const batch = recordsWithoutDate.slice(i, i + batchSize);
      const niks = [...new Set(batch.map(r => r.nik))];
      await supabase.from('child_records').delete()
        .in('nik', niks)
        .is('tanggal_pengukuran', null)
        .or(niks.map(n => `nik.eq.${n}`).join(','));
      const { error: insertError } = await supabase
        .from('child_records')
        .insert(batch);

      if (insertError) {
        console.error(`Error inserting no-date batch ${i}:`, insertError);
        errorDetails.push(`No-date batch ${i}: ${insertError.message}`);
        errors++;
        continue;
      }

      upserted += batch.length;
    }

    // Remove records from DB that no longer exist in the sheet (paginated fetch)
    const sheetKeys = new Set(records.map(r => `${r.nik}||${r.tanggal_pengukuran}`));

    let deleted = 0;
    try {
      const existingRecords = await fetchAllExistingRecords(supabase);
      console.log(`Fetched ${existingRecords.length} existing records from DB for sync check`);

      const idsToDelete = existingRecords
        .filter((r: any) => !sheetKeys.has(`${r.nik}||${r.tanggal_pengukuran}`))
        .map((r: any) => r.id);

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
    } catch (fetchErr: any) {
      console.error("Error fetching existing records for delete sync:", fetchErr);
    }

    const firstError = errorDetails[0] ?? '';
    const message = `Berhasil sinkronisasi: ${upserted} record diperbarui/ditambahkan, ${deleted} record dihapus. Total baris sheet: ${totalDataRows}, dilewati (NIK kosong: ${skippedNoNik}, Nama kosong: ${skippedNoNama}, duplikat: ${duplicatesOverwritten})${errors > 0 ? `, ${errors} batch gagal. Error pertama: ${firstError}` : ''}`;

    return new Response(
      JSON.stringify({
        success: true,
        message,
        count: upserted,
        deleted,
        stats: { totalDataRows, skippedNoNik, skippedNoNama, duplicatesOverwritten, errors, errorDetails }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan internal" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
