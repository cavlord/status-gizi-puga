import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchSheetData,
  getUniqueYears,
  filterByYear,
  filterUnderFiveYears,
  getNutritionalStatusByMonth,
} from "@/lib/googleSheets";
import { YearFilter } from "@/components/YearFilter";
import { SummaryCards } from "@/components/SummaryCards";
import { NutritionalStatusChart } from "@/components/NutritionalStatusChart";
import { NutritionalStatusSummary } from "@/components/NutritionalStatusSummary";
import { useToast } from "@/hooks/use-toast";
import LoadingScreen from "@/components/LoadingScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Activity } from "lucide-react";

const Dashboard = () => {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [showLoading, setShowLoading] = useState(true);

  const { data: allRecords, isLoading, error } = useQuery({
    queryKey: ['sheetData'],
    queryFn: fetchSheetData,
    staleTime: 5 * 60 * 1000,
  });

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
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading || showLoading) {
    return <LoadingScreen />;
  }

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

  // Calculate village data
  const villageMap = new Map<string, Set<string>>();
  filteredByYear.forEach(record => {
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

  const uniqueNames = new Set<string>();
  filteredByYear.forEach(record => {
    if (record.Nama) uniqueNames.add(record.Nama);
  });
  const totalCount = uniqueNames.size;

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SummaryCards data={villageData} totalCount={totalCount} />
        </div>
        <div className="lg:col-span-2">
          <NutritionalStatusSummary data={filteredByYear} />
        </div>
      </div>

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
