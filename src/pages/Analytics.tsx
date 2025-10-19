import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchSheetData,
  getUniqueYears,
  getUniqueValues,
  filterByYear,
  filterUnderFiveYears,
  getNutritionalStatusByMonth,
  countByVillage,
} from "@/lib/googleSheets";
import { YearFilter } from "@/components/YearFilter";
import { NutritionalStatusChart } from "@/components/NutritionalStatusChart";
import { useToast } from "@/hooks/use-toast";
import LoadingScreen from "@/components/LoadingScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, PieChart } from "lucide-react";
import { BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(160, 60%, 45%)', 'hsl(188, 94%, 43%)', 'hsl(38, 92%, 50%)', 'hsl(271, 81%, 56%)'];

const Analytics = () => {
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
    }, 1500);
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

  // Chart data
  const chartData = getNutritionalStatusByMonth(filteredByYear);
  const villageData = countByVillage(filteredByYear);

  // Calculate nutritional status distribution
  const statusMap = new Map<string, number>();
  filteredByYear.forEach(record => {
    const status = record['Status Gizi BB/U'] || 'Tidak Diketahui';
    statusMap.set(status, (statusMap.get(status) || 0) + 1);
  });

  const pieData = Array.from(statusMap.entries()).map(([name, value]) => ({
    name,
    value
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            Analytics & Visualisasi
          </h2>
          <p className="text-muted-foreground mt-1">
            Analisis mendalam dan visualisasi data status gizi balita
          </p>
        </div>
        <YearFilter
          years={years}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
      </div>

      {/* Trend Chart */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-heading flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Tren Status Gizi Per Bulan
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Grafik perkembangan status gizi balita sepanjang tahun
          </p>
        </CardHeader>
        <CardContent>
          <NutritionalStatusChart data={chartData} />
        </CardContent>
      </Card>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Village Distribution Bar Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-secondary" />
              Distribusi Per Desa/Kelurahan
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Jumlah balita terdaftar di setiap wilayah
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={villageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="village" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis tick={{ fill: 'hsl(var(--foreground))' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution Pie Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <PieChart className="h-5 w-5 text-accent" />
              Distribusi Status Gizi
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Proporsi kategori status gizi balita
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Statistics */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-heading">
            Ringkasan Statistik
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from(statusMap.entries()).map(([status, count], index) => (
              <div 
                key={status}
                className="p-4 rounded-lg border-2 hover:shadow-md transition-shadow"
                style={{ borderColor: COLORS[index % COLORS.length] }}
              >
                <div className="text-2xl font-bold" style={{ color: COLORS[index % COLORS.length] }}>
                  {count}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{status}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
