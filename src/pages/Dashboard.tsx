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
import { AnimatedFilter } from "@/components/AnimatedFilter";
import { EnhancedNutritionalChart } from "@/components/EnhancedNutritionalChart";
import { VillageNutritionalStatus } from "@/components/VillageNutritionalStatus";
import { ChildDetailsModal } from "@/components/ChildDetailsModal";
import { PosyanduTable } from "@/components/PosyanduTable";
import { StatCard } from "@/components/StatCard";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, MapPin, AlertTriangle, TrendingUp, BarChart3 } from "lucide-react";
import { useStaggerReveal, useScrollReveal } from "@/hooks/useGsapAnimations";

const Dashboard = () => {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedVillage, setSelectedVillage] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // GSAP — stagger stat cards on mount, scroll reveal sections below the fold
  const statsGridRef = useStaggerReveal<HTMLDivElement>([selectedYear]);
  const villageRef = useScrollReveal<HTMLDivElement>([selectedYear]);
  const chartRef = useScrollReveal<HTMLDivElement>([selectedYear]);
  const tableRef = useScrollReveal<HTMLDivElement>([selectedYear]);

  const [showNotGainingModal, setShowNotGainingModal] = useState(false);
  const [showCumulativeModal, setShowCumulativeModal] = useState(false);

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
        <div className="text-center space-y-3">
          <Users className="h-12 w-12 text-muted-foreground mx-auto opacity-40" />
          <p className="text-lg font-semibold">Data Tidak Tersedia</p>
          <p className="text-sm text-muted-foreground">Belum ada data yang tersedia saat ini.</p>
        </div>
      </div>
    );
  }

  const underFiveRecords = filterUnderFiveYears(allRecords);
  const years = getUniqueYears(underFiveRecords);
  const filteredByYear = selectedYear ? filterByYear(underFiveRecords, selectedYear) : underFiveRecords;

  const getLatestRecords = (records: ChildRecord[]): ChildRecord[] => {
    const latestMap = new Map<string, ChildRecord>();

    records.forEach(record => {
      const key = record.NIK?.trim() || record.Nama; // NIK is unique; fall back to name
      if (!key) return;

      const existingRecord = latestMap.get(key);
      if (!existingRecord) {
        latestMap.set(key, record);
      } else {
        const existingDate = new Date(existingRecord['Tanggal Pengukuran']);
        const newDate = new Date(record['Tanggal Pengukuran']);
        if (newDate > existingDate) {
          latestMap.set(key, record);
        }
      }
    });

    return Array.from(latestMap.values());
  };

  const latestRecords = getLatestRecords(filteredByYear);

  const getMostRecentMonthRecords = (records: ChildRecord[]): ChildRecord[] => {
    if (records.length === 0) return [];
    
    const parseDate = (dateStr: string): Date => {
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
      return new Date(dateStr);
    };
    
    const mostRecentDate = records.reduce((latest, record) => {
      const recordDate = parseDate(record['Tanggal Pengukuran']);
      return recordDate > latest ? recordDate : latest;
    }, parseDate(records[0]['Tanggal Pengukuran']));
    
    const mostRecentMonth = mostRecentDate.getMonth();
    const mostRecentYear = mostRecentDate.getFullYear();
    
    const monthRecords = records.filter(record => {
      const recordDate = parseDate(record['Tanggal Pengukuran']);
      return recordDate.getMonth() === mostRecentMonth && 
             recordDate.getFullYear() === mostRecentYear;
    });
    
    return getLatestRecords(monthRecords);
  };

  const mostRecentMonthRecords = getMostRecentMonthRecords(filteredByYear);

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

  const getNotGainingWeight = (): { count: number; children: ChildRecord[] } => {
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
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    const allDates = filteredByYear.map(r => parseDate(r['Tanggal Pengukuran']));
    const mostRecentDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const currentMonth = mostRecentDate.getMonth();
    const currentYear = mostRecentDate.getFullYear();
    
    const prevDate = new Date(currentYear, currentMonth - 1, 1);
    const previousMonth = prevDate.getMonth();
    const previousYear = prevDate.getFullYear();
    
    const childrenMap = new Map<string, ChildRecord[]>();
    filteredByYear.forEach(record => {
      if (!record.Nama) return;
      if (!childrenMap.has(record.Nama)) {
        childrenMap.set(record.Nama, []);
      }
      childrenMap.get(record.Nama)!.push(record);
    });
    
    const notGainingChildren: ChildRecord[] = [];
    
    childrenMap.forEach((allRecords, childName) => {
      const currentMonthData = allRecords.filter(r => {
        const d = parseDate(r['Tanggal Pengukuran']);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });
      
      const previousMonthData = allRecords.filter(r => {
        const d = parseDate(r['Tanggal Pengukuran']);
        return d.getMonth() === previousMonth && d.getFullYear() === previousYear;
      });
      
      if (currentMonthData.length === 0 || previousMonthData.length === 0) {
        return;
      }
      
      const latestCurrent = currentMonthData.reduce((latest, r) => {
        return parseDate(r['Tanggal Pengukuran']) > parseDate(latest['Tanggal Pengukuran']) ? r : latest;
      });
      
      const latestPrevious = previousMonthData.reduce((latest, r) => {
        return parseDate(r['Tanggal Pengukuran']) > parseDate(latest['Tanggal Pengukuran']) ? r : latest;
      });
      
      const currentWeight = parseFloat(latestCurrent.Berat);
      const previousWeight = parseFloat(latestPrevious.Berat);
      
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
      const dayStr = String(date.getDate()).padStart(2, '0');
      const monthStr = String(date.getMonth() + 1).padStart(2, '0');
      const yr = date.getFullYear();
      return `${dayStr}/${monthStr}/${yr}`;
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

    // Map: childName → most recent record where they did not gain weight
    const latestNotGaining = new Map<string, ChildRecord>();

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

        if (!isNaN(prevWeight) && !isNaN(currWeight) && currWeight <= prevWeight) {
          const formattedDate = formatDate(latestCurr['Tanggal Pengukuran']);
          if (!formattedDate.includes('NaN')) {
            const candidate = { ...latestCurr, 'Tanggal Pengukuran': formattedDate };
            // Keep only the most recent occurrence per child
            const existing = latestNotGaining.get(childName);
            if (!existing || parseDate(formattedDate) > parseDate(existing['Tanggal Pengukuran'])) {
              latestNotGaining.set(childName, candidate);
            }
          }
        }
      });
    }

    const cumulativeChildren = Array.from(latestNotGaining.values());
    return { count: cumulativeChildren.length, children: cumulativeChildren };
  };

  const cumulativeNotGainingData = getCumulativeNotGainingWeight();

  const chartData = getNutritionalStatusByMonth(filteredByYear);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Dashboard Status Gizi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoring status gizi balita — UPT Puskesmas Pulau Gadang
          </p>
        </div>
        <AnimatedFilter
          years={years}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          showYear={true}
        />
      </div>

      {/* Stats Grid — stagger on mount */}
      <div ref={statsGridRef} className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Balita"
          value={totalCount}
          description="Balita aktif terdaftar"
          icon={Users}
          accentColor="text-sky-500"
          borderColor="border-l-sky-400"
        />
        <StatCard
          title="Desa/Kelurahan"
          value={villageData.length}
          description="Wilayah cakupan"
          icon={MapPin}
          accentColor="text-emerald-600"
          borderColor="border-l-emerald-400"
        />
        <StatCard
          title="Tidak Naik BB"
          value={cumulativeNotGainingData.count}
          description={`Akumulatif ${selectedYear}`}
          icon={AlertTriangle}
          accentColor="text-rose-500"
          borderColor="border-l-rose-400"
          onClick={() => setShowCumulativeModal(true)}
        />
      </div>

      {/* Village Status — scroll reveal */}
      <div ref={villageRef}>
        <VillageNutritionalStatus
          yearData={filteredByYear}
          monthData={mostRecentMonthRecords}
          year={selectedYear}
          notGainingWeightData={notGainingWeightData}
          onShowNotGainingModal={() => setShowNotGainingModal(true)}
        />
      </div>

      {/* Modals */}
      <ChildDetailsModal
        isOpen={showNotGainingModal}
        onClose={() => setShowNotGainingModal(false)}
        records={notGainingWeightData.children}
        posyandu="Tidak Naik BB (2 Bulan Berturut-turut)"
        showWeightComparison={true}
        allRecords={filteredByYear}
      />

      <ChildDetailsModal
        isOpen={showCumulativeModal}
        onClose={() => setShowCumulativeModal(false)}
        records={cumulativeNotGainingData.children}
        posyandu={`Tidak Naik BB Akumulatif ${selectedYear}`}
        showWeightComparison={true}
        allRecords={filteredByYear}
      />

      {/* Chart Section — scroll reveal */}
      <Card ref={chartRef} className="border border-border shadow-sm">
        <CardHeader className="p-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-sky-500 flex-shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold">Tren Status Gizi Balita</CardTitle>
              <CardDescription className="text-xs mt-0.5">Grafik perkembangan status gizi per bulan</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <EnhancedNutritionalChart data={chartData} />
        </CardContent>
      </Card>

      {/* Table Section — scroll reveal */}
      <Card ref={tableRef} className="border border-border shadow-sm">
        <CardHeader className="p-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-sky-500 flex-shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold">Data Status Gizi Per Posyandu</CardTitle>
              <CardDescription className="text-xs mt-0.5">Pilih desa/kelurahan dan bulan untuk melihat data detail</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 space-y-5">
          <AnimatedFilter
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
            showVillage={true}
            showMonth={true}
          />
          <PosyanduTable
            data={getPosyanduData(
              selectedVillage && selectedMonth
                ? filterByMonth(filterByVillage(filteredByYear, selectedVillage), selectedMonth)
                : []
            )}
            villages={[]}
            months={[]}
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

// Made with Bob
