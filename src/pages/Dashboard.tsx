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
import { VillageNutritionalStatus } from "@/components/VillageNutritionalStatus";
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
        description: "Gagal mengambil data. Silakan coba lagi.",
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
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-xl font-semibold mb-2">Data Tidak Tersedia</p>
          <p className="text-muted-foreground">Belum ada data yang tersedia saat ini. Silakan coba lagi nanti.</p>
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
    
    // Helper to parse DD/MM/YYYY date format
    const parseDate = (dateStr: string): Date => {
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
      return new Date(dateStr);
    };
    
    // Find the most recent date
    const mostRecentDate = records.reduce((latest, record) => {
      const recordDate = parseDate(record['Tanggal Pengukuran']);
      return recordDate > latest ? recordDate : latest;
    }, parseDate(records[0]['Tanggal Pengukuran']));
    
    const mostRecentMonth = mostRecentDate.getMonth();
    const mostRecentYear = mostRecentDate.getFullYear();
    
    // Filter records from that month and get latest per child
    const monthRecords = records.filter(record => {
      const recordDate = parseDate(record['Tanggal Pengukuran']);
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
      
      // HANYA tambahkan jika BB TIDAK NAIK (turun atau tetap)
      if (!isNaN(currentWeight) && !isNaN(previousWeight)) {
        if (currentWeight <= previousWeight) {
          const formattedDate = formatDate(latestCurrent['Tanggal Pengukuran']);
          if (!formattedDate.includes('NaN')) {
            notGainingChildren.push({
              ...latestCurrent,
              'Tanggal Pengukuran': formattedDate
            });
          }
        }
      }
    });
    
    return { count: notGainingChildren.length, children: notGainingChildren };
  };

  const notGainingWeightData = getNotGainingWeight();

  // Akumulatif Tidak Naik BB sepanjang tahun
  const getCumulativeNotGainingWeight = (): { count: number; children: ChildRecord[] } => {
    if (filteredByYear.length === 0) return { count: 0, children: [] };

    const parseDate = (dateStr: string): Date => {
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
      return new Date(dateStr);
    };

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
      const yr = date.getFullYear();
      return `${day}/${month}/${yr}`;
    };

    const childrenMap = new Map<string, ChildRecord[]>();
    filteredByYear.forEach(record => {
      if (!record.Nama) return;
      if (!childrenMap.has(record.Nama)) {
        childrenMap.set(record.Nama, []);
      }
      childrenMap.get(record.Nama)!.push(record);
    });

    const monthSet = new Set<string>();
    filteredByYear.forEach(r => {
      const d = parseDate(r['Tanggal Pengukuran']);
      monthSet.add(`${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`);
    });
    const sortedMonths = Array.from(monthSet).sort();

    const cumulativeChildren: ChildRecord[] = [];
    const seen = new Set<string>();

    for (let i = 1; i < sortedMonths.length; i++) {
      const prevKey = sortedMonths[i - 1];
      const currKey = sortedMonths[i];
      const [prevYear, prevMonth] = prevKey.split('-').map(Number);
      const [currYear, currMonth] = currKey.split('-').map(Number);

      childrenMap.forEach((records, childName) => {
        const prevData = records.filter(r => {
          const d = parseDate(r['Tanggal Pengukuran']);
          return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
        });
        const currData = records.filter(r => {
          const d = parseDate(r['Tanggal Pengukuran']);
          return d.getFullYear() === currYear && d.getMonth() === currMonth;
        });

        if (prevData.length === 0 || currData.length === 0) return;

        const latestPrev = prevData.reduce((a, b) => parseDate(a['Tanggal Pengukuran']) > parseDate(b['Tanggal Pengukuran']) ? a : b);
        const latestCurr = currData.reduce((a, b) => parseDate(a['Tanggal Pengukuran']) > parseDate(b['Tanggal Pengukuran']) ? a : b);

        const prevWeight = parseFloat(latestPrev.Berat);
        const currWeight = parseFloat(latestCurr.Berat);

        const key = `${childName}-${currKey}`;
        if (!isNaN(prevWeight) && !isNaN(currWeight) && currWeight <= prevWeight && !seen.has(key)) {
          seen.add(key);
          const formattedDate = formatDate(latestCurr['Tanggal Pengukuran']);
          if (!formattedDate.includes('NaN')) {
            cumulativeChildren.push({
              ...latestCurr,
              'Tanggal Pengukuran': formattedDate
            });
          }
        }
      });
    }

    return { count: cumulativeChildren.length, children: cumulativeChildren };
  };

  const cumulativeNotGainingData = getCumulativeNotGainingWeight();

  const [showNotGainingModal, setShowNotGainingModal] = useState(false);
  const [showCumulativeModal, setShowCumulativeModal] = useState(false);

  const chartData = getNutritionalStatusByMonth(filteredByYear);

  return (
    <div className="w-full space-y-3 md:space-y-4 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base sm:text-lg md:text-xl font-heading font-bold text-foreground">
            Dashboard Status Gizi
          </h2>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Monitoring status gizi balita — UPT Puskesmas Pulau Gadang
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

      {/* Stats Overview - Compact */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <Card className="border-0 shadow-md bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 opacity-80 shrink-0" />
              <span className="text-[10px] md:text-xs opacity-80">Total Balita</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-700 text-white">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 opacity-80 shrink-0" />
              <span className="text-[10px] md:text-xs opacity-80">Desa/Kel</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{villageData.length}</div>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-md bg-gradient-to-br from-destructive/80 to-destructive text-white cursor-pointer hover:shadow-lg transition-all active:scale-[0.98]"
          onClick={() => setShowCumulativeModal(true)}
        >
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 opacity-80 shrink-0" />
              <span className="text-[10px] md:text-xs opacity-80">Tidak Naik BB</span>
            </div>
            <div className="text-xl md:text-2xl font-bold">{cumulativeNotGainingData.count}</div>
            <p className="text-[10px] opacity-70">Akumulatif {selectedYear}</p>
          </CardContent>
        </Card>
      </div>

      {/* Village Nutritional Status Distribution */}
      <div>
        <VillageNutritionalStatus 
          yearData={filteredByYear} 
          monthData={mostRecentMonthRecords} 
          year={selectedYear}
          notGainingWeightData={notGainingWeightData}
          onShowNotGainingModal={() => setShowNotGainingModal(true)}
        />
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

      {/* Modal for Cumulative Not Gaining Weight */}
      <ChildDetailsModal
        isOpen={showCumulativeModal}
        onClose={() => setShowCumulativeModal(false)}
        records={cumulativeNotGainingData.children}
        posyandu={`Tidak Naik BB Akumulatif ${selectedYear}`}
        showWeightComparison={true}
        allRecords={filteredByYear}
      />

      {/* Chart Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="p-3 md:p-4 pb-1">
          <CardTitle className="text-sm md:text-base font-heading">
            Tren Status Gizi Balita
          </CardTitle>
          <p className="text-[10px] md:text-xs text-muted-foreground">
            Grafik perkembangan status gizi per bulan
          </p>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-1">
          <NutritionalStatusChart data={chartData} />
        </CardContent>
      </Card>

      {/* Data Balita Section */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="p-3 md:p-4 pb-1">
          <CardTitle className="text-sm md:text-base font-heading">
            Data Status Gizi Per Posyandu
          </CardTitle>
          <p className="text-[10px] md:text-xs text-muted-foreground">
            Pilih desa/kelurahan dan bulan untuk melihat data detail
          </p>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-1">
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
            yearData={filteredByYear}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
