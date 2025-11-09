import { useState, useEffect } from "react";
import {
  getUniqueYears,
  filterByYear,
  filterUnderFiveYears,
  getNutritionalStatusByMonth,
  getUniqueValues,
  filterByMonth,
  filterByVillage,
  getPosyanduData,
  ChildRecord,
} from "@/lib/googleSheets";
import { useData } from "@/contexts/DataContext";
import { YearFilter } from "@/components/YearFilter";
import { NutritionalStatusChart } from "@/components/NutritionalStatusChart";
import { NutritionalStatusSummary } from "@/components/NutritionalStatusSummary";
import { ChildDetailsModal } from "@/components/ChildDetailsModal";
import { PosyanduTable } from "@/components/PosyanduTable";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, AlertTriangle } from "lucide-react";

const Dashboard = () => {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedVillage, setSelectedVillage] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const { allRecords, error } = useData();

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Gagal mengambil data dari Google Sheets. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (allRecords && allRecords.length > 0 && !selectedYear) {
      const underFiveRecords = filterUnderFiveYears(allRecords);
      const years = getUniqueYears(underFiveRecords);
      if (years.length > 0) {
        setSelectedYear(years[0]);
      }
    }
  }, [allRecords, selectedYear]);

  useEffect(() => {
    if (allRecords && allRecords.length > 0) {
      const underFiveRecords = filterUnderFiveYears(allRecords);
      const filteredByYear = selectedYear ? filterByYear(underFiveRecords, selectedYear) : underFiveRecords;
      const villages = getUniqueValues(filteredByYear, 'Desa/Kel');
      
      if (villages.length > 0 && !selectedVillage) {
        setSelectedVillage(villages[0]);
      }
    }
  }, [allRecords, selectedYear, selectedVillage]);

  useEffect(() => {
    if (allRecords && allRecords.length > 0) {
      const underFiveRecords = filterUnderFiveYears(allRecords);
      const filteredByYear = selectedYear ? filterByYear(underFiveRecords, selectedYear) : underFiveRecords;
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ].filter(month => 
        filteredByYear.some(record => record['Bulan Pengukuran'] === month)
      );
      
      if (months.length > 0 && !selectedMonth) {
        setSelectedMonth(months[0]);
      }
    }
  }, [allRecords, selectedYear, selectedMonth]);

  if (!allRecords || allRecords.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Tidak ada data</p>
          <p className="text-muted-foreground">Data belum tersedia di Google Sheets</p>
        </div>
      </div>
    );
  }

  const underFiveRecords = filterUnderFiveYears(allRecords);
  const years = getUniqueYears(underFiveRecords);
  const filteredByYear = selectedYear ? filterByYear(underFiveRecords, selectedYear) : underFiveRecords;

  // Get latest record per child
  const getLatestRecords = (records: ChildRecord[]): ChildRecord[] => {
    const latestMap = new Map<string, ChildRecord>();
    
    records.forEach(record => {
      if (!record.Nama) return;
      
      const existingRecord = latestMap.get(record.Nama);
      if (!existingRecord) {
        latestMap.set(record.Nama, record);
      } else {
        const existingDate = new Date(existingRecord['Tanggal Pengukuran']);
        const newDate = new Date(record['Tanggal Pengukuran']);
        if (newDate > existingDate) {
          latestMap.set(record.Nama, record);
        }
      }
    });
    
    return Array.from(latestMap.values());
  };

  const latestRecords = getLatestRecords(filteredByYear);

  // Get most recent month's data for nutritional status distribution
  const getMostRecentMonthRecords = (records: ChildRecord[]): ChildRecord[] => {
    if (records.length === 0) return [];
    
    // Find the most recent date
    const mostRecentDate = records.reduce((latest, record) => {
      const recordDate = new Date(record['Tanggal Pengukuran']);
      return recordDate > latest ? recordDate : latest;
    }, new Date(records[0]['Tanggal Pengukuran']));
    
    const mostRecentMonth = mostRecentDate.getMonth();
    const mostRecentYear = mostRecentDate.getFullYear();
    
    // Filter records from that month and get latest per child
    const monthRecords = records.filter(record => {
      const recordDate = new Date(record['Tanggal Pengukuran']);
      return recordDate.getMonth() === mostRecentMonth && 
             recordDate.getFullYear() === mostRecentYear;
    });
    
    return getLatestRecords(monthRecords);
  };

  const mostRecentMonthRecords = getMostRecentMonthRecords(filteredByYear);

  // Calculate village data from latest records
  const villageMap = new Map<string, Set<string>>();
  latestRecords.forEach(record => {
    const village = record['Desa/Kel'];
    if (!villageMap.has(village)) {
      villageMap.set(village, new Set());
    }
    if (record.Nama) {
      villageMap.get(village)!.add(record.Nama);
    }
  });

  const villageData = Array.from(villageMap.entries()).map(([village, names]) => ({
    village,
    count: names.size
  }));

  const totalCount = latestRecords.length;

  // HANYA membandingkan BB bulan terbaru vs 1 bulan sebelumnya
  const getNotGainingWeight = (): { count: number; children: ChildRecord[] } => {
    if (filteredByYear.length === 0) return { count: 0, children: [] };
    
    // Helper function to parse DD/MM/YYYY date format
    const parseDate = (dateStr: string): Date => {
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
      return new Date(dateStr);
    };
    
    // Helper function to format date to DD/MM/YYYY
    const formatDate = (dateStr: string): string => {
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1])) && !isNaN(Number(parts[2]))) {
          return dateStr;
        }
      }
      
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    // 1. Cari bulan terbaru dari SEMUA data
    const allDates = filteredByYear.map(r => parseDate(r['Tanggal Pengukuran']));
    const mostRecentDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const currentMonth = mostRecentDate.getMonth();
    const currentYear = mostRecentDate.getFullYear();
    
    // 2. Hitung bulan sebelumnya (bulan terbaru - 1)
    const prevDate = new Date(currentYear, currentMonth - 1, 1);
    const previousMonth = prevDate.getMonth();
    const previousYear = prevDate.getFullYear();
    
    console.log('Bulan terbaru:', currentMonth + 1, currentYear);
    console.log('Bulan sebelumnya:', previousMonth + 1, previousYear);
    
    // 3. Kelompokkan data per anak
    const childrenMap = new Map<string, ChildRecord[]>();
    filteredByYear.forEach(record => {
      if (!record.Nama) return;
      if (!childrenMap.has(record.Nama)) {
        childrenMap.set(record.Nama, []);
      }
      childrenMap.get(record.Nama)!.push(record);
    });
    
    const notGainingChildren: ChildRecord[] = [];
    
    // 4. Untuk setiap anak, bandingkan BB bulan terbaru vs bulan sebelumnya
    childrenMap.forEach((allRecords, childName) => {
      // Ambil HANYA data dari bulan terbaru
      const currentMonthData = allRecords.filter(r => {
        const d = parseDate(r['Tanggal Pengukuran']);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      
      // Ambil HANYA data dari bulan sebelumnya (bulan terbaru - 1)
      const previousMonthData = allRecords.filter(r => {
        const d = parseDate(r['Tanggal Pengukuran']);
        return d.getMonth() === previousMonth && d.getFullYear() === previousYear;
      });
      
      // SKIP jika tidak ada data di salah satu dari kedua bulan
      if (currentMonthData.length === 0 || previousMonthData.length === 0) {
        return;
      }
      
      // Ambil data terbaru dari bulan terbaru
      const latestCurrent = currentMonthData.reduce((latest, r) => {
        return parseDate(r['Tanggal Pengukuran']) > parseDate(latest['Tanggal Pengukuran']) ? r : latest;
      });
      
      // Ambil data terbaru dari bulan sebelumnya
      const latestPrevious = previousMonthData.reduce((latest, r) => {
        return parseDate(r['Tanggal Pengukuran']) > parseDate(latest['Tanggal Pengukuran']) ? r : latest;
      });
      
      // Parse berat badan
      const currentWeight = parseFloat(latestCurrent.Berat);
      const previousWeight = parseFloat(latestPrevious.Berat);
      
      // Debug log
      console.log(`${childName}: Previous=${previousWeight}kg (${latestPrevious['Tanggal Pengukuran']}), Current=${currentWeight}kg (${latestCurrent['Tanggal Pengukuran']})`);
      
      // HANYA tambahkan jika BB TIDAK NAIK (turun atau tetap)
      // currentWeight > previousWeight = NAIK (JANGAN MASUKKAN)
      // currentWeight <= previousWeight = TIDAK NAIK (MASUKKAN)
      if (!isNaN(currentWeight) && !isNaN(previousWeight)) {
        if (currentWeight <= previousWeight) {
          const formattedDate = formatDate(latestCurrent['Tanggal Pengukuran']);
          if (!formattedDate.includes('NaN')) {
            console.log(`  -> MASUK ke daftar Tidak Naik BB (${currentWeight} <= ${previousWeight})`);
            notGainingChildren.push({
              ...latestCurrent,
              'Tanggal Pengukuran': formattedDate
            });
          }
        } else {
          console.log(`  -> TIDAK masuk (BB naik: ${currentWeight} > ${previousWeight})`);
        }
      }
    });
    
    console.log('Total anak Tidak Naik BB:', notGainingChildren.length);
    return { count: notGainingChildren.length, children: notGainingChildren };
  };

  const notGainingWeightData = getNotGainingWeight();

  const [showNotGainingModal, setShowNotGainingModal] = useState(false);

  const chartData = getNutritionalStatusByMonth(filteredByYear);

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col gap-3 md:gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-heading font-bold text-foreground">
            Dashboard Ringkasan
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1">
            Monitoring status gizi balita di wilayah kerja
          </p>
        </div>
        <div className="w-full md:w-auto">
          <YearFilter
            years={years}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </div>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-primary to-accent text-primary-foreground transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
          <CardHeader className="pb-2 md:pb-3 p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-xs sm:text-sm md:text-base font-medium opacity-90">
              <Users className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span>Total Balita Aktif</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold">{totalCount}</div>
            <p className="text-xs md:text-sm opacity-80 mt-1">Balita Terdaftar</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
          <CardHeader className="pb-2 md:pb-3 p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-xs sm:text-sm md:text-base font-medium opacity-90">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span>Total Desa/Kelurahan</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold">{villageData.length}</div>
            <p className="text-xs md:text-sm opacity-80 mt-1">Wilayah Kerja</p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-lg bg-gradient-to-br from-destructive/80 to-destructive text-white cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-100"
          onClick={() => setShowNotGainingModal(true)}
        >
          <CardHeader className="pb-2 md:pb-3 p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-xs sm:text-sm md:text-base font-medium opacity-90">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
              <span>Tidak Naik BB</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="text-2xl sm:text-3xl md:text-4xl font-bold">{notGainingWeightData.count}</div>
            <p className="text-xs md:text-sm opacity-80 mt-1">2 Bulan Berturut-turut (Klik untuk detail)</p>
          </CardContent>
        </Card>
      </div>

      {/* Nutritional Status Distribution */}
      <div>
        <NutritionalStatusSummary data={mostRecentMonthRecords} />
      </div>

      {/* Modal for Not Gaining Weight Children */}
      <ChildDetailsModal
        isOpen={showNotGainingModal}
        onClose={() => setShowNotGainingModal(false)}
        records={notGainingWeightData.children}
        posyandu="Tidak Naik BB (2 Bulan Berturut-turut)"
        showWeightComparison={true}
        allRecords={filteredByYear}
      />

      {/* Chart Section */}
      <div className="transition-all duration-300">
        <Card className="border-0 shadow-lg">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl font-heading">
              Tren Status Gizi Balita
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Grafik perkembangan status gizi per bulan
            </p>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <NutritionalStatusChart data={chartData} />
          </CardContent>
        </Card>
      </div>

      {/* Data Balita Section */}
      <div className="transition-all duration-300">
        <Card className="border-0 shadow-lg">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base sm:text-lg md:text-xl font-heading">
              Data Status Gizi Per Posyandu
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pilih desa/kelurahan dan bulan untuk melihat data detail
            </p>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <PosyanduTable
              data={getPosyanduData(
                selectedVillage && selectedMonth
                  ? filterByMonth(filterByVillage(filteredByYear, selectedVillage), selectedMonth)
                  : []
              )}
              villages={getUniqueValues(filteredByYear, 'Desa/Kel')}
              months={[
                'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
              ].filter(month => 
                filteredByYear.some(record => record['Bulan Pengukuran'] === month)
              )}
              selectedVillage={selectedVillage}
              selectedMonth={selectedMonth}
              onVillageChange={setSelectedVillage}
              onMonthChange={setSelectedMonth}
              allRecords={selectedVillage && selectedMonth
                ? filterByMonth(filterByVillage(filteredByYear, selectedVillage), selectedMonth)
                : []}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
