import { useState, useEffect } from "react";
import {
  getUniqueYears,
  filterByYear,
  filterUnderFiveYears,
  getNutritionalStatusByMonth,
  ChildRecord,
} from "@/lib/googleSheets";
import { useData } from "@/contexts/DataContext";
import { YearFilter } from "@/components/YearFilter";
import { NutritionalStatusChart } from "@/components/NutritionalStatusChart";
import { NutritionalStatusSummary } from "@/components/NutritionalStatusSummary";
import { ChildDetailsModal } from "@/components/ChildDetailsModal";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Activity, AlertTriangle } from "lucide-react";

const Dashboard = () => {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>("");

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

  // Calculate children not gaining weight (consecutive "T" in Naik Berat Badan)
  const getNotGainingWeight = (): { count: number; children: ChildRecord[] } => {
    const recordsByName = new Map<string, ChildRecord[]>();
    
    filteredByYear.forEach(record => {
      if (!record.Nama) return;
      if (!recordsByName.has(record.Nama)) {
        recordsByName.set(record.Nama, []);
      }
      recordsByName.get(record.Nama)!.push(record);
    });

    const notGainingChildren: ChildRecord[] = [];
    recordsByName.forEach(records => {
      const sortedRecords = records.sort((a, b) => 
        new Date(a['Tanggal Pengukuran']).getTime() - new Date(b['Tanggal Pengukuran']).getTime()
      );
      
      if (sortedRecords.length < 2) return;
      
      const latest = sortedRecords[sortedRecords.length - 1];
      const previous = sortedRecords[sortedRecords.length - 2];
      
      if (latest['Naik Berat Badan'] === 'T' && previous['Naik Berat Badan'] === 'T') {
        notGainingChildren.push(latest);
      }
    });
    
    return { count: notGainingChildren.length, children: notGainingChildren };
  };

  const notGainingWeightData = getNotGainingWeight();

  const [showNotGainingModal, setShowNotGainingModal] = useState(false);

  const chartData = getNutritionalStatusByMonth(filteredByYear);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold text-foreground">
            Dashboard Ringkasan
          </h2>
          <p className="text-muted-foreground mt-1">
            Monitoring status gizi balita di wilayah kerja
          </p>
        </div>
        <YearFilter
          years={years}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium opacity-90">
              <Users className="h-5 w-5" />
              Total Balita Aktif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{totalCount}</div>
            <p className="text-sm opacity-80 mt-1">Balita Terdaftar</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-success to-secondary text-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium opacity-90">
              <TrendingUp className="h-5 w-5" />
              Total Desa/Kelurahan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{villageData.length}</div>
            <p className="text-sm opacity-80 mt-1">Wilayah Kerja</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-warning to-destructive text-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium opacity-90">
              <Activity className="h-5 w-5" />
              Data Pengukuran
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{filteredByYear.length}</div>
            <p className="text-sm opacity-80 mt-1">Total Pengukuran</p>
          </CardContent>
        </Card>

        <Card 
          className="border-0 shadow-lg bg-gradient-to-br from-destructive/80 to-destructive text-white cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => setShowNotGainingModal(true)}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium opacity-90">
              <AlertTriangle className="h-5 w-5" />
              Tidak Naik BB
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{notGainingWeightData.count}</div>
            <p className="text-sm opacity-80 mt-1">Balita Berturut-turut (Klik untuk detail)</p>
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
      />

      {/* Chart Section */}
      <div>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-heading">
              Tren Status Gizi Balita
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Grafik perkembangan status gizi per bulan
            </p>
          </CardHeader>
          <CardContent>
            <NutritionalStatusChart data={chartData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
