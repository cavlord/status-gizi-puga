const API_KEY = 'AIzaSyBNkFJW0WOXOd2xFfsllmO-tdrXANMZjkA';
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

export async function fetchSheetData(): Promise<ChildRecord[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;
  
  try {
    const response = await fetch(url);
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
      const year = new Date(record['Tanggal Pengukuran']).getFullYear().toString();
      if (!isNaN(parseInt(year))) {
        years.add(year);
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
    const recordYear = new Date(record['Tanggal Pengukuran']).getFullYear().toString();
    return recordYear === year;
  });
}

export function filterByMonth(records: ChildRecord[], month: string): ChildRecord[] {
  return records.filter(record => record['Bulan Pengukuran'] === month);
}

export function filterByVillage(records: ChildRecord[], village: string): ChildRecord[] {
  return records.filter(record => record['Desa/Kel'] === village);
}

export function countByVillage(records: ChildRecord[]): { village: string; count: number }[] {
  // Count all records per village (no deduplication)
  const villageMap = new Map<string, number>();
  
  records.forEach(record => {
    const village = record['Desa/Kel'];
    
    if (!village) return;
    
    villageMap.set(village, (villageMap.get(village) || 0) + 1);
  });
  
  return Array.from(villageMap.entries())
    .map(([village, count]) => ({ village, count }))
    .sort((a, b) => a.village.localeCompare(b.village));
}

export function getNutritionalStatusByMonth(records: ChildRecord[]): {
  month: string;
  [key: string]: number | string;
}[] {
  // Group by month first, then count unique names per status in each month
  const monthMap = new Map<string, Map<string, Set<string>>>();
  
  records.forEach(record => {
    const month = record['Bulan Pengukuran'];
    const status = record['BB/TB'];
    const name = record.Nama;
    
    if (!month || !status || !name) return;
    
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
  posyandu: string;
  [key: string]: number | string;
}[] {
  // Group by posyandu, then by status, count all records (no deduplication)
  const posyanduMap = new Map<string, Map<string, number>>();
  
  records.forEach(record => {
    const posyandu = record.Posyandu;
    const status = record['BB/TB'];
    
    if (!posyandu || !status) return;
    
    if (!posyanduMap.has(posyandu)) {
      posyanduMap.set(posyandu, new Map());
    }
    
    const statusMap = posyanduMap.get(posyandu)!;
    statusMap.set(status, (statusMap.get(status) || 0) + 1);
  });
  
  const result: { posyandu: string; [key: string]: number | string }[] = [];
  
  posyanduMap.forEach((statusMap, posyandu) => {
    const posyanduData: { posyandu: string; [key: string]: number | string } = { posyandu };
    
    statusMap.forEach((count, status) => {
      posyanduData[status] = count;
    });
    
    result.push(posyanduData);
  });
  
  return result.sort((a, b) => a.posyandu.localeCompare(b.posyandu));
}