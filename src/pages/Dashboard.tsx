import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15
    }
  }
};

const Dashboard = () => {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedVillage, setSelectedVillage] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");

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
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center space-y-4"
        >
          <Users className="h-16 w-16 text-muted-foreground mx-auto opacity-50" />
          <div>
            <p className="text-xl font-semibold mb-2">Data Tidak Tersedia</p>
            <p className="text-muted-foreground">Belum ada data yang tersedia saat ini.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const underFiveRecords = filterUnderFiveYears(allRecords);
  const years = getUniqueYears(underFiveRecords);
  const filteredByYear = selectedYear ? filterByYear(underFiveRecords, selectedYear) : underFiveRecords;

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

  const chartData = getNutritionalStatusByMonth(filteredByYear);

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants}>
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard Status Gizi</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Monitoring status gizi balita — UPT Puskesmas Pulau Gadang
          </p>
        </div>
        <AnimatedFilter
          years={years}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          showYear={true}
        />
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Balita"
          value={totalCount}
          description="Balita aktif terdaftar"
          icon={Users}
          gradient="from-blue-500 to-cyan-500"
          delay={0.1}
        />
        <StatCard
          title="Desa/Kelurahan"
          value={villageData.length}
          description="Wilayah cakupan"
          icon={MapPin}
          gradient="from-emerald-500 to-teal-500"
          delay={0.2}
        />
        <StatCard
          title="Tidak Naik BB"
          value={cumulativeNotGainingData.count}
          description={`Akumulatif ${selectedYear}`}
          icon={AlertTriangle}
          gradient="from-rose-500 to-pink-500"
          delay={0.3}
          onClick={() => setShowCumulativeModal(true)}
        />
      </div>

      {/* Village Status */}
      <motion.div variants={itemVariants}>
        <VillageNutritionalStatus 
          yearData={filteredByYear} 
          monthData={mostRecentMonthRecords} 
          year={selectedYear}
          notGainingWeightData={notGainingWeightData}
          onShowNotGainingModal={() => setShowNotGainingModal(true)}
        />
      </motion.div>

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

      {/* Chart Section */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 p-4 sm:p-6 pb-3 sm:pb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex-shrink-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg md:text-xl truncate">Tren Status Gizi Balita</CardTitle>
                <CardDescription className="text-xs sm:text-sm line-clamp-1">Grafik perkembangan status gizi per bulan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <EnhancedNutritionalChart data={chartData} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Table Section */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 p-4 sm:p-6 pb-3 sm:pb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex-shrink-0">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg md:text-xl truncate">Data Status Gizi Per Posyandu</CardTitle>
                <CardDescription className="text-xs sm:text-sm line-clamp-1">Pilih desa/kelurahan dan bulan untuk melihat data detail</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
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
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;

// Made with Bob
