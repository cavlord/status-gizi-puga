import { supabase } from "@/integrations/supabase/client";

const SPREADSHEET_ID = '1o-Lok3oWtmGXaN5Q9CeFj4ji9WFOINYW3M_RBNBUw60';
const SHEET_NAME = 'RECORDS';

export interface ChildRecord {
  NIK: string;
  Nama: string;
  JK: string;
  'Tgl Lahir': string;
  'BB Lahir': string;
  'TB Lahir': string;
  'Nama Ortu': string;
  Prov: string;
  'Kab/Kota': string;
  Kec: string;
  Pukesmas: string;
  'Desa/Kel': string;
  Posyandu: string;
  RT: string;
  RW: string;
  Alamat: string;
  'Usia Saat Ukur': string;
  'Tanggal Pengukuran': string;
  'Bulan Pengukuran': string;
  'Status Bulan': string;
  'status tahun': string;
  Berat: string;
  Tinggi: string;
  'Cara Ukur': string;
  LiLA: string;
  'BB/U': string;
  'ZS BB/U': string;
  'TB/U': string;
  'ZS TB/U': string;
  'BB/TB': string;
  'ZS BB/TB': string;
  'Naik Berat Badan': string;
  'PMT Diterima (kg)': string;
  'Jml Vit A': string;
  KPSP: string;
  KIA: string;
  'Detail Status': string;
  'status desa': string;
}

// Map database column names to ChildRecord field names
function mapDbToRecord(dbRecord: any): ChildRecord {
  return {
    NIK: dbRecord.nik || '',
    Nama: dbRecord.nama || '',
    JK: dbRecord.jk || '',
    'Tgl Lahir': dbRecord.tgl_lahir || '',
    'BB Lahir': dbRecord.bb_lahir || '',
    'TB Lahir': dbRecord.tb_lahir || '',
    'Nama Ortu': dbRecord.nama_ortu || '',
    Prov: dbRecord.prov || '',
    'Kab/Kota': dbRecord.kab_kota || '',
    Kec: dbRecord.kec || '',
    Pukesmas: dbRecord.puskesmas || '',
    'Desa/Kel': dbRecord.desa_kel || '',
    Posyandu: dbRecord.posyandu || '',
    RT: dbRecord.rt || '',
    RW: dbRecord.rw || '',
    Alamat: dbRecord.alamat || '',
    'Usia Saat Ukur': dbRecord.usia_saat_ukur || '',
    'Tanggal Pengukuran': dbRecord.tanggal_pengukuran || '',
    'Bulan Pengukuran': dbRecord.bulan_pengukuran || '',
    'Status Bulan': dbRecord.status_bulan || '',
    'status tahun': dbRecord.status_tahun || '',
    Berat: dbRecord.berat || '',
    Tinggi: dbRecord.tinggi || '',
    'Cara Ukur': dbRecord.cara_ukur || '',
    LiLA: dbRecord.lila || '',
    'BB/U': dbRecord.bb_u || '',
    'ZS BB/U': dbRecord.zs_bb_u || '',
    'TB/U': dbRecord.tb_u || '',
    'ZS TB/U': dbRecord.zs_tb_u || '',
    'BB/TB': dbRecord.bb_tb || '',
    'ZS BB/TB': dbRecord.zs_bb_tb || '',
    'Naik Berat Badan': dbRecord.naik_berat_badan || '',
    'PMT Diterima (kg)': dbRecord.pmt_diterima || '',
    'Jml Vit A': dbRecord.jml_vit_a || '',
    KPSP: dbRecord.kpsp || '',
    KIA: dbRecord.kia || '',
    'Detail Status': dbRecord.detail_status || '',
    'status desa': dbRecord.status_desa || '',
  };
}

export async function fetchSheetData(): Promise<ChildRecord[]> {
  try {
    // Get user email from localStorage
    const authData = localStorage.getItem('posyandu_auth');
    if (!authData) {
      console.log('No auth data found');
      return [];
    }
    
    let email: string;
    try {
      const parsed = JSON.parse(authData);
      email = parsed.email;
      if (!email) {
        console.log('No email in auth data');
        return [];
      }
    } catch {
      console.log('Failed to parse auth data');
      return [];
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    // Fetch all records using pagination via edge function
    const pageSize = 1000;
    let offset = 0;
    const allRows: any[] = [];

    while (true) {
      const response = await fetch(`${supabaseUrl}/functions/v1/get-child-records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          email,
          offset,
          limit: pageSize,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching from edge function:', errorData.error);
        throw new Error(errorData.error || 'Failed to fetch data');
      }

      const result = await response.json();
      
      if (!result.data || result.data.length === 0) break;

      allRows.push(...result.data);

      if (!result.hasMore) break;
      offset += pageSize;
    }

    if (allRows.length === 0) return [];

    // Map database records to ChildRecord format
    return allRows.map(mapDbToRecord);
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}

// Import data from Google Sheets (admin only)
export async function importFromGoogleSheets(userEmail: string): Promise<{ success: boolean; message: string; count?: number }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const url = `${supabaseUrl}/functions/v1/import-from-sheets`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME,
        email: userEmail,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return { success: false, message: result.error || 'Import failed' };
    }
    
    return { success: true, message: result.message, count: result.count };
  } catch (error) {
    console.error('Error importing from Google Sheets:', error);
    return { success: false, message: 'Failed to connect to import service' };
  }
}

export function getUniqueYears(records: ChildRecord[]): string[] {
  const years = new Set<string>();
  records.forEach(record => {
    if (record['Tanggal Pengukuran']) {
      // Parse date in DD/MM/YYYY format
      const dateParts = record['Tanggal Pengukuran'].split('/');
      if (dateParts.length === 3) {
        const year = dateParts[2]; // Year is the third part (DD/MM/YYYY)
        if (!isNaN(parseInt(year)) && year.length === 4) {
          years.add(year);
        }
      }
    }
  });
  return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
}

export function getUniqueValues(records: ChildRecord[], field: keyof ChildRecord): string[] {
  const values = new Set<string>();
  records.forEach(record => {
    if (record[field]) {
      values.add(record[field]);
    }
  });
  return Array.from(values).sort();
}

export function filterUnderFiveYears(records: ChildRecord[]): ChildRecord[] {
  return records.filter(record => {
    const ageStr = record['Usia Saat Ukur'];
    if (!ageStr || ageStr.trim() === '') return false;
    
    // Extract years from format like "4 Tahun - 3 Bulan - 0 Hari" or "4 Tahun 3 Bulan"
    const yearMatch = ageStr.match(/(\d+)\s*[Tt]ahun/);
    if (!yearMatch) return false;
    
    const years = parseInt(yearMatch[1]);
    return years < 5;
  });
}

export function deduplicateByName(records: ChildRecord[]): ChildRecord[] {
  const seen = new Set<string>();
  return records.filter(record => {
    if (seen.has(record.Nama)) {
      return false;
    }
    seen.add(record.Nama);
    return true;
  });
}

export function filterByYear(records: ChildRecord[], year: string): ChildRecord[] {
  return records.filter(record => {
    if (!record['Tanggal Pengukuran']) return false;
    // Parse date in DD/MM/YYYY format
    const dateParts = record['Tanggal Pengukuran'].split('/');
    if (dateParts.length === 3) {
      const recordYear = dateParts[2]; // Year is the third part (DD/MM/YYYY)
      return recordYear === year;
    }
    return false;
  });
}

export function filterByMonth(records: ChildRecord[], month: string): ChildRecord[] {
  return records.filter(record => record['Bulan Pengukuran'] === month);
}

export function filterByVillage(records: ChildRecord[], village: string): ChildRecord[] {
  return records.filter(record => record['Desa/Kel'] === village);
}

export function countByVillage(records: ChildRecord[]): { village: string; count: number }[] {
  // Pivot: Rows = Desa/Kel, Values = COUNTUNIQUE Nama
  // Filter: Already filtered by year before calling this function
  const villageMap = new Map<string, Set<string>>();
  
  records.forEach(record => {
    const village = record['Desa/Kel'];
    const name = record.Nama;
    
    // Only skip if village or name is missing
    if (!village || !name || village.trim() === '' || name.trim() === '') return;
    
    if (!villageMap.has(village)) {
      villageMap.set(village, new Set());
    }
    
    villageMap.get(village)!.add(name);
  });
  
  return Array.from(villageMap.entries())
    .map(([village, names]) => ({ village, count: names.size }))
    .sort((a, b) => a.village.localeCompare(b.village));
}

export function getNutritionalStatusByMonth(records: ChildRecord[]): {
  month: string;
  [key: string]: number | string;
}[] {
  // Group by month first, then count unique names per status in each month - include even with empty columns
  const monthMap = new Map<string, Map<string, Set<string>>>();
  
  records.forEach(record => {
    const month = record['Bulan Pengukuran'];
    const status = record['BB/TB'];
    const name = record.Nama;
    
    // Only skip if essential fields are missing
    if (!month || !status || !name || month.trim() === '' || status.trim() === '' || name.trim() === '') return;
    
    if (!monthMap.has(month)) {
      monthMap.set(month, new Map());
    }
    
    const statusMap = monthMap.get(month)!;
    if (!statusMap.has(status)) {
      statusMap.set(status, new Set());
    }
    
    statusMap.get(status)!.add(name);
  });
  
  const result: { month: string; [key: string]: number | string }[] = [];
  const monthOrder = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  monthOrder.forEach(month => {
    if (monthMap.has(month)) {
      const statusMap = monthMap.get(month)!;
      const monthData: { month: string; [key: string]: number | string } = { month };
      
      statusMap.forEach((names, status) => {
        monthData[status] = names.size;
      });
      
      result.push(monthData);
    }
  });
  
  return result;
}

export function getPosyanduData(records: ChildRecord[]): {
  status: string;
  [key: string]: number | string;
}[] {
  // Pivot: Rows = BB/TB, Columns = Posyandu, Values = COUNTUNIQUE Nama
  // Filters: Desa/Kel, Bulan Pengukuran (month), Tanggal Pengukuran (year)
  // Note: Filters are applied before calling this function
  
  // First, collect all unique posyandus
  const allPosyandus = new Set<string>();
  const statusMap = new Map<string, Map<string, Set<string>>>();
  
  records.forEach(record => {
    const status = record['BB/TB'];
    const posyandu = record.Posyandu;
    const name = record.Nama;
    
    // Only skip if essential fields are missing
    if (!status || !posyandu || !name || status.trim() === '' || posyandu.trim() === '' || name.trim() === '') return;
    
    allPosyandus.add(posyandu);
    
    if (!statusMap.has(status)) {
      statusMap.set(status, new Map());
    }
    
    const posyanduMap = statusMap.get(status)!;
    if (!posyanduMap.has(posyandu)) {
      posyanduMap.set(posyandu, new Set());
    }
    
    posyanduMap.get(posyandu)!.add(name);
  });
  
  const result: { status: string; [key: string]: number | string }[] = [];
  
  // For each status, create a row with all posyandus (even if count is 0)
  statusMap.forEach((posyanduMap, status) => {
    const statusData: { status: string; [key: string]: number | string } = { status };
    
    // Add all posyandus to ensure all columns are present
    allPosyandus.forEach(posyandu => {
      statusData[posyandu] = posyanduMap.has(posyandu) ? posyanduMap.get(posyandu)!.size : 0;
    });
    
    result.push(statusData);
  });
  
  return result.sort((a, b) => a.status.localeCompare(b.status));
}