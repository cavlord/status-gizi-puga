import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchSheetData,
  getUniqueYears,
  getUniqueValues,
  filterByYear,
  filterByMonth,
  filterByVillage,
  countByVillage,
  getNutritionalStatusByMonth,
  getPosyanduData,
  deduplicateByName,
} from "@/lib/googleSheets";
import { YearFilter } from "@/components/YearFilter";
import { SummaryCards } from "@/components/SummaryCards";
import { NutritionalStatusChart } from "@/components/NutritionalStatusChart";
import { NutritionalStatusSummary } from "@/components/NutritionalStatusSummary";
import { PosyanduTable } from "@/components/PosyanduTable";
import { useToast } from "@/hooks/use-toast";
import LoadingScreen from "@/components/LoadingScreen";

const Index = () => {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedVillage, setSelectedVillage] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [showLoading, setShowLoading] = useState(true);

  const { data: allRecords, isLoading, error } = useQuery({
    queryKey: ['sheetData'],
    queryFn: fetchSheetData,
    staleTime: 5 * 60 * 1000,
  });

  // Always call all hooks in the same order - BEFORE any conditional returns
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Gagal mengambil data dari Google Sheets. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Set initial year
  useEffect(() => {
    if (allRecords && allRecords.length > 0 && !selectedYear) {
      const years = getUniqueYears(allRecords);
      if (years.length > 0) {
        setSelectedYear(years[0]);
      }
    }
  }, [allRecords, selectedYear]);

  // Set initial village and month - moved before early returns
  useEffect(() => {
    if (allRecords && allRecords.length > 0) {
      const filteredByYear = selectedYear ? filterByYear(allRecords, selectedYear) : allRecords;
      const villages = getUniqueValues(filteredByYear, 'Desa/Kel');
      
      if (villages.length > 0 && !selectedVillage) {
        setSelectedVillage(villages[0]);
      }
    }
  }, [allRecords, selectedYear, selectedVillage]);

  useEffect(() => {
    if (allRecords && allRecords.length > 0) {
      const filteredByYear = selectedYear ? filterByYear(allRecords, selectedYear) : allRecords;
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

  // Minimum loading time
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Early returns AFTER all hooks
  if (isLoading || showLoading) {
    return <LoadingScreen />;
  }

  if (!allRecords || allRecords.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold mb-2">Tidak ada data</p>
          <p className="text-muted-foreground">Data belum tersedia di Google Sheets</p>
        </div>
      </div>
    );
  }

  const years = getUniqueYears(allRecords);
  const filteredByYear = selectedYear ? filterByYear(allRecords, selectedYear) : allRecords;
  
  const villages = getUniqueValues(filteredByYear, 'Desa/Kel');
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ].filter(month => 
    filteredByYear.some(record => record['Bulan Pengukuran'] === month)
  );

  const villageData = countByVillage(filteredByYear);
  // Calculate total unique names (COUNTUNIQUE)
  const uniqueNames = new Set<string>();
  filteredByYear.forEach(record => {
    if (record.Nama) uniqueNames.add(record.Nama);
  });
  const totalCount = uniqueNames.size;
  const chartData = getNutritionalStatusByMonth(filteredByYear);
  
  const filteredForPosyandu = selectedVillage && selectedMonth
    ? filterByMonth(filterByVillage(filteredByYear, selectedVillage), selectedMonth)
    : [];
  const posyanduData = getPosyanduData(filteredForPosyandu);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Dashboard Status Gizi Balita
          </h1>
          <p className="text-sm md:text-base opacity-90">
            UPT Puskesmas Pulau Gadang
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <YearFilter
            years={years}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </div>

        <div className="space-y-6 mb-6">
          <div>
            <h2 className="text-xl font-bold mb-4 text-foreground">
              Total Data Aktif Status Gizi Balita
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <SummaryCards data={villageData} totalCount={totalCount} />
              </div>
              <div className="lg:col-span-2">
                <NutritionalStatusSummary data={filteredByYear} />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4 text-foreground">
              Grafik Status Gizi Balita
            </h2>
            <NutritionalStatusChart data={chartData} />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 text-foreground">
            Data Status Gizi Per Posyandu
          </h2>
          <PosyanduTable
            data={posyanduData}
            villages={villages}
            months={months}
            selectedVillage={selectedVillage}
            selectedMonth={selectedMonth}
            onVillageChange={setSelectedVillage}
            onMonthChange={setSelectedMonth}
            allRecords={filteredForPosyandu}
          />
        </div>
      </main>

      <footer className="bg-muted mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} UPT Puskesmas Pulau Gadang. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;