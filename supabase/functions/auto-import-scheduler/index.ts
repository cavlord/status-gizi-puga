import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");
const SPREADSHEET_ID = Deno.env.get("SPREADSHEET_ID") || Deno.env.get("VITE_SPREADSHEET_ID") || "1o-Lok3oWtmGXaN5Q9CeFj4ji9WFOINYW3M_RBNBUw60";
const SHEET_NAME = "RECORDS";

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

serve(async (_req) => {
  console.log(`[auto-import-scheduler] Starting scheduled import at ${new Date().toISOString()}`);

  if (!GOOGLE_SHEETS_API_KEY) {
    console.error("[auto-import-scheduler] GOOGLE_SHEETS_API_KEY not configured");
    return new Response(JSON.stringify({ error: "API key not configured" }), { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Fetch data from Google Sheets
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(SPREADSHEET_ID)}/values/${encodeURIComponent(SHEET_NAME)}?key=${GOOGLE_SHEETS_API_KEY}`;
  const response = await fetch(url);

  if (!response.ok) {
    const err = await response.text();
    console.error("[auto-import-scheduler] Google Sheets error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch from Google Sheets" }), { status: 502 });
  }

  const data = await response.json();
  const rows = data.values;
  if (!rows || rows.length < 2) {
    return new Response(JSON.stringify({ error: "No data in sheet" }), { status: 400 });
  }

  const headers = rows[0];
  const recordMap = new Map<string, Record<string, string>>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, string> = {};
    headers.forEach((header: string, index: number) => {
      const dbColumn = headerMap[header];
      if (dbColumn) record[dbColumn] = row[index] || '';
    });
    if (!record.nik?.trim() || !record.nama?.trim()) continue;
    const key = record.tanggal_pengukuran?.trim()
      ? `${record.nik}||${record.tanggal_pengukuran}`
      : `${record.nik}||__row_${i}`;
    recordMap.set(key, record);
  }

  const records = Array.from(recordMap.values());
  const batchSize = 100;
  let upserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const { error } = await supabase
      .from('child_records')
      .upsert(records.slice(i, i + batchSize), { onConflict: 'nik,tanggal_pengukuran', ignoreDuplicates: false });
    if (!error) upserted += Math.min(batchSize, records.length - i);
    else console.error(`[auto-import-scheduler] Upsert error batch ${i}:`, error);
  }

  console.log(`[auto-import-scheduler] Done. Upserted: ${upserted} / ${records.length}`);
  return new Response(JSON.stringify({ success: true, upserted, total: records.length }), { status: 200 });
});
