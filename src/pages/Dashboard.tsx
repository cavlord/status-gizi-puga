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

  // Calculate children not gaining weight using only the 2 most recent consecutive months
  const getNotGainingWeight = (): { count: number; children: ChildRecord[] } => {
    if (filteredByYear.length === 0) return { count: 0, children: [] };
    
    // Get the most recent date from all records
    const mostRecentDate = filteredByYear.reduce((latest, record) => {
      const recordDate = new Date(record['Tanggal Pengukuran']);
      return recordDate > latest ? recordDate : latest;
    }, new Date(filteredByYear[0]['Tanggal Pengukuran']));
    
    const mostRecentMonth = mostRecentDate.getMonth();
    const mostRecentYear = mostRecentDate.getFullYear();
    
    // Get previous month date
    const previousMonthDate = new Date(mostRecentYear, mostRecentMonth - 1);
    const previousMonth = previousMonthDate.getMonth();
    const previousYear = previousMonthDate.getFullYear();
    
    // Group all records by child name first
    const recordsByName = new Map<string, ChildRecord[]>();
    filteredByYear.forEach(record => {
      if (!record.Nama) return;
      if (!recordsByName.has(record.Nama)) {
        recordsByName.set(record.Nama, []);
      }
      recordsByName.get(record.Nama)!.push(record);
    });

    const notGainingChildren: ChildRecord[] = [];
    
    recordsByName.forEach((records, childName) => {
      // Sort all records by date
      const sortedRecords = records.sort((a, b) => 
        new Date(a['Tanggal Pengukuran']).getTime() - new Date(b['Tanggal Pengukuran']).getTime()
      );
      
      // Find records from the most recent month
      const currentMonthRecords = sortedRecords.filter(record => {
        const recordDate = new Date(record['Tanggal Pengukuran']);
        return recordDate.getMonth() === mostRecentMonth && 
               recordDate.getFullYear() === mostRecentYear;
      });
      
      // Find records from previous month
      const previousMonthRecords = sortedRecords.filter(record => {
        const recordDate = new Date(record['Tanggal Pengukuran']);
        return recordDate.getMonth() === previousMonth && 
               recordDate.getFullYear() === previousYear;
      });
      
      // Must have at least one record in each of the 2 months
      if (currentMonthRecords.length === 0 || previousMonthRecords.length === 0) return;
      
      // Get the latest record from each month
      const latestRecord = currentMonthRecords[currentMonthRecords.length - 1];
      const previousRecord = previousMonthRecords[previousMonthRecords.length - 1];
      
      const previousWeight = parseFloat(previousRecord.Berat);
      const currentWeight = parseFloat(latestRecord.Berat);
      
      // Check if weight did NOT increase (stayed same or decreased)
      if (!isNaN(previousWeight) && !isNaN(currentWeight)) {
        if (currentWeight <= previousWeight) {
          notGainingChildren.push(latestRecord);
        }
      }
    });
    
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
