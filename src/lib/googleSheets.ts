import { supabase } from "@/integrations/supabase/client";

const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID || '1o-Lok3oWtmGXaN5Q9CeFj4ji9WFOINYW3M_RBNBUw60';
const SHEET_NAME = 'RECORDS';

// Configuration constants
const AUTH_TOKEN_KEY = 'posyandu_token';
const AUTH_DATA_KEY = 'posyandu_auth';
const AUTH_REDIRECT_PATH = '/auth';
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 1000;

// Type definitions
interface ApiResponse<T> {
  data: T[];
  error?: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  timeout: number;
}

// Custom error classes
class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class NetworkError extends Error {
  public readonly status?: number;
  public readonly isRetryable: boolean;

  constructor(message: string, status?: number, isRetryable = true) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
    this.isRetryable = isRetryable;
  }
}

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

function mapDbToRecord(dbRecord: any): ChildRecord {
  return {
    NIK: dbRecord.nik || '',
    Nama: dbRecord.nama || '',
    JK: dbRecord.jenis_kelamin || '',
    'Tgl Lahir': dbRecord.tgl_lahir || '',
    'BB Lahir': dbRecord.bb_lahir || '',
    'TB Lahir': dbRecord.tb_lahir || '',
    'Nama Ortu': dbRecord.nama_ortu || '',
    Prov: dbRecord.provinsi || '',
    'Kab/Kota': dbRecord.kab_kota || '',
    Kec: dbRecord.kecamatan || '',
    Pukesmas: dbRecord.puskesmas || '',
    'Desa/Kel': dbRecord.desa_kelurahan || '',
    Posyandu: dbRecord.posyandu || '',
    RT: dbRecord.rt || '',
    RW: dbRecord.rw || '',
    Alamat: dbRecord.alamat || '',
    'Usia Saat Ukur': dbRecord.usia_saat_ukur || '',
    'Tanggal Pengukuran': dbRecord.tgl_pengukuran || '',
    'Bulan Pengukuran': dbRecord.bulan_pengukuran || '',
    'Status Bulan': '',
    'status tahun': '',
    Berat: dbRecord.berat_badan || '',
    Tinggi: dbRecord.tinggi_badan || '',
    'Cara Ukur': dbRecord.cara_ukur || '',
    LiLA: dbRecord.lila || '',
    'BB/U': dbRecord.status_bbu || '',
    'ZS BB/U': dbRecord.zscore_bbu || '',
    'TB/U': dbRecord.status_tbu || '',
    'ZS TB/U': dbRecord.zscore_tbu || '',
    'BB/TB': dbRecord.status_bbtb || '',
    'ZS BB/TB': dbRecord.zscore_bbtb || '',
    'Naik Berat Badan': dbRecord.naik_bb || '',
    'PMT Diterima (kg)': dbRecord.pmt_diterima_kg || '',
    'Jml Vit A': dbRecord.jml_vit_a || '',
    KPSP: dbRecord.kpsp || '',
    KIA: dbRecord.kia || '',
    'Detail Status': dbRecord.detail || '',
    'status desa': dbRecord.status_desa || '',
  };
}

// Utility functions
function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function logError(message: string, error?: unknown): void {
  if (import.meta.env.DEV) {
    console.error(message, error);
  }
}

function handleAuthenticationFailure(): never {
  localStorage.removeItem(AUTH_DATA_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  window.location.href = AUTH_REDIRECT_PATH;
  throw new AuthenticationError('Authentication required');
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      logError(`Attempt ${attempt + 1} failed:`, lastError.message);

      // Don't retry on authentication errors
      if (lastError instanceof AuthenticationError) {
        throw lastError;
      }

      // Don't retry on non-retryable network errors
      if (lastError instanceof NetworkError && !lastError.isRetryable) {
        throw lastError;
      }

      // Wait before retry with linear backoff
      if (attempt < config.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, config.baseDelay * (attempt + 1)));
      }
    }
  }

  throw lastError || new NetworkError('Gagal mengambil data. Silakan coba lagi.');
}

async function makeAuthenticatedRequest<T>(
  url: string,
  token: string,
  body: unknown,
  timeout: number
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 401) {
      handleAuthenticationFailure();
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Server error' }));
      throw new NetworkError(
        errorData.error || `Server error: ${response.status}`,
        response.status,
        response.status >= 500 // Retry on 5xx errors
      );
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchSheetData(): Promise<ChildRecord[]> {
  const token = getAuthToken();
  if (!token) {
    throw new AuthenticationError('Sesi telah berakhir. Silakan login kembali.');
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const endpoint = `${supabaseUrl}/functions/v1/get-child-records`;

  const result = await retryWithBackoff(
    () => makeAuthenticatedRequest<any>(endpoint, token, { fetchAll: true }, REQUEST_TIMEOUT_MS),
    {
      maxRetries: MAX_RETRIES,
      baseDelay: BASE_RETRY_DELAY_MS,
      timeout: REQUEST_TIMEOUT_MS,
    }
  );

  if (!result.data || result.data.length === 0) {
    return [];
  }

  return result.data.map(mapDbToRecord);
}

export async function importFromGoogleSheets(userEmail: string): Promise<{ success: boolean; message: string; count?: number }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const token = getAuthToken();
  
  if (!token) {
    return { success: false, message: 'Not authenticated' };
  }
  
  const url = `${supabaseUrl}/functions/v1/import-from-sheets`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME,
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
      const dateParts = record['Tanggal Pengukuran'].split('/');
      if (dateParts.length === 3) {
        const year = dateParts[2];
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
    const yearMatch = ageStr.match(/(\d+)\s*[Tt]ahun/);
    if (!yearMatch) return false;
    const years = parseInt(yearMatch[1]);
    return years < 5;
  });
}

export function deduplicateByName(records: ChildRecord[]): ChildRecord[] {
  const seen = new Set<string>();
  return records.filter(record => {
    if (seen.has(record.Nama)) return false;
    seen.add(record.Nama);
    return true;
  });
}

export function filterByYear(records: ChildRecord[], year: string): ChildRecord[] {
  return records.filter(record => {
    if (!record['Tanggal Pengukuran']) return false;
    const dateParts = record['Tanggal Pengukuran'].split('/');
    if (dateParts.length === 3) {
      return dateParts[2] === year;
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
  const villageMap = new Map<string, Set<string>>();
  records.forEach(record => {
    const village = record['Desa/Kel'];
    const name = record.Nama;
    if (!village || !name || village.trim() === '' || name.trim() === '') return;
    if (!villageMap.has(village)) villageMap.set(village, new Set());
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
  const monthMap = new Map<string, Map<string, Set<string>>>();
  records.forEach(record => {
    const month = record['Bulan Pengukuran'];
    const status = record['BB/TB'];
    const name = record.Nama;
    if (!month || !status || !name || month.trim() === '' || status.trim() === '' || name.trim() === '') return;
    if (!monthMap.has(month)) monthMap.set(month, new Map());
    const statusMap = monthMap.get(month)!;
    if (!statusMap.has(status)) statusMap.set(status, new Set());
    statusMap.get(status)!.add(name);
  });
  const result: { month: string; [key: string]: number | string }[] = [];
  const monthOrder = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  monthOrder.forEach(month => {
    if (monthMap.has(month)) {
      const statusMap = monthMap.get(month)!;
      const monthData: { month: string; [key: string]: number | string } = { month };
      statusMap.forEach((names, status) => { monthData[status] = names.size; });
      result.push(monthData);
    }
  });
  return result;
}

export function getPosyanduData(records: ChildRecord[]): {
  status: string;
  [key: string]: number | string;
}[] {
  const allPosyandus = new Set<string>();
  const statusMap = new Map<string, Map<string, Set<string>>>();
  records.forEach(record => {
    const status = record['BB/TB'];
    const posyandu = record.Posyandu;
    const name = record.Nama;
    if (!status || !posyandu || !name || status.trim() === '' || posyandu.trim() === '' || name.trim() === '') return;
    allPosyandus.add(posyandu);
    if (!statusMap.has(status)) statusMap.set(status, new Map());
    const posyanduMap = statusMap.get(status)!;
    if (!posyanduMap.has(posyandu)) posyanduMap.set(posyandu, new Set());
    posyanduMap.get(posyandu)!.add(name);
  });
  const result: { status: string; [key: string]: number | string }[] = [];
  statusMap.forEach((posyanduMap, status) => {
    const statusData: { status: string; [key: string]: number | string } = { status };
    allPosyandus.forEach(posyandu => {
      statusData[posyandu] = posyanduMap.has(posyandu) ? posyanduMap.get(posyandu)!.size : 0;
    });
    result.push(statusData);
  });
  return result.sort((a, b) => a.status.localeCompare(b.status));
}
