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

export async function fetchSheetData(userEmail?: string): Promise<ChildRecord[]> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  // Get user email from localStorage if not provided
  const email = userEmail || (() => {
    try {
      const authData = localStorage.getItem('auth_user');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.email;
      }
    } catch {
      // Ignore parsing errors
    }
    return undefined;
  })();
  
  const url = `${supabaseUrl}/functions/v1/google-sheets-proxy`;
  
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
        email,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch data from Google Sheets');
    }
    
    const data = await response.json();
    const rows = data.values;
    
    if (!rows || rows.length === 0) {
      return [];
    }
    
    const headers = rows[0];
    const records: ChildRecord[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const record: any = {};
      
      headers.forEach((header: string, index: number) => {
        record[header] = row[index] || '';
      });
      
      records.push(record as ChildRecord);
    }
    
    return records;
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

export function getUniqueYears(records: ChildRecord[]): string[] {
  const years = new Set<string>();
  records.forEach(record => {
    if (record['Tanggal Pengukuran']) {
      // Parse date in MM/DD/YYYY format
      const dateParts = record['Tanggal Pengukuran'].split('/');
      if (dateParts.length === 3) {
        const year = dateParts[2]; // Year is the third part
        if (!isNaN(parseInt(year))) {
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
    
    // Extract years from format like "4 Tahun 3 Bulan" or "4 tahun"
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
    // Parse date in MM/DD/YYYY format
    const dateParts = record['Tanggal Pengukuran'].split('/');
    if (dateParts.length === 3) {
      const recordYear = dateParts[2]; // Year is the third part
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
