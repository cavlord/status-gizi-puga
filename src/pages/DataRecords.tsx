import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchSheetData,
  getUniqueYears,
  getUniqueValues,
  filterByYear,
  filterByMonth,
  filterByVillage,
  filterUnderFiveYears,
  getPosyanduData,
} from "@/lib/googleSheets";
import { YearFilter } from "@/components/YearFilter";
import { PosyanduTable } from "@/components/PosyanduTable";
import { useToast } from "@/hooks/use-toast";
import LoadingScreen from "@/components/LoadingScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";

const DataRecords = () => {
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
  
  const villages = getUniqueValues(filteredByYear, 'Desa/Kel');
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ].filter(month => 
    filteredByYear.some(record => record['Bulan Pengukuran'] === month)
  );

  const filteredForPosyandu = selectedVillage && selectedMonth
    ? filterByMonth(filterByVillage(filteredByYear, selectedVillage), selectedMonth)
    : [];
  const posyanduData = getPosyanduData(filteredForPosyandu);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            Data Balita
          </h2>
          <p className="text-muted-foreground mt-1">
            Data lengkap status gizi balita per posyandu
          </p>
        </div>
        <YearFilter
          years={years}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
        />
      </div>

      {/* Data Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-heading">
            Data Status Gizi Per Posyandu
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Pilih desa/kelurahan dan bulan untuk melihat data detail
          </p>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default DataRecords;
