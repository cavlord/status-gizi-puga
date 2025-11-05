import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Calendar } from "lucide-react";
import { ChildRecord } from "@/lib/googleSheets";
import { ChildDetailsModal } from "./ChildDetailsModal";

interface PosyanduTableProps {
  data: { status: string; [key: string]: number | string }[];
  villages: string[];
  months: string[];
  selectedVillage: string;
  selectedMonth: string;
  onVillageChange: (village: string) => void;
  onMonthChange: (month: string) => void;
  allRecords: ChildRecord[];
}

export function PosyanduTable({
  data,
  villages,
  months,
  selectedVillage,
  selectedMonth,
  onVillageChange,
  onMonthChange,
  allRecords,
}: PosyanduTableProps) {
  const [selectedPosyandu, setSelectedPosyandu] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get all unique Posyandu names from data
  const posyandus = data.length > 0 
    ? Object.keys(data[0]).filter(key => key !== 'status')
    : [];

  const handleCellClick = (posyandu: string, status: string) => {
    setSelectedPosyandu(posyandu);
    setSelectedStatus(status);
    setIsModalOpen(true);
  };

  const getFilteredRecords = () => {
    if (!selectedPosyandu || !selectedStatus) return [];
    
    return allRecords.filter(record => {
      return record.Posyandu === selectedPosyandu &&
             record['BB/TB'] === selectedStatus &&
             record['Desa/Kel'] === selectedVillage &&
             record['Bulan Pengukuran'] === selectedMonth;
    });
  };

  return (
    <>
      <Card className="shadow-sm w-full">
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-sm md:text-lg">Data Posyandu – Status Gizi</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-3 md:mt-4">
            <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Desa/Kelurahan
                </label>
                <Select value={selectedVillage} onValueChange={onVillageChange}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Pilih desa" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {villages.map((village) => (
                      <SelectItem key={village} value={village}>
                        {village}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg">
              <Calendar className="h-5 w-5 text-secondary" />
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Bulan
                </label>
                <Select value={selectedMonth} onValueChange={onMonthChange}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Pilih bulan" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          {data.length === 0 ? (
            <div className="text-center py-6 md:py-8 text-sm md:text-base text-muted-foreground">
              Tidak ada data untuk filter yang dipilih
            </div>
          ) : (
            <div className="overflow-x-auto -mx-3 md:mx-0">
              <div className="min-w-max px-3 md:px-0">
                <table className="w-full border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="p-2 md:p-3 text-left font-semibold border whitespace-nowrap">BB/TB</th>
                      {posyandus.map((posyandu) => (
                        <th key={posyandu} className="p-2 md:p-3 text-center font-semibold border whitespace-nowrap min-w-[60px] md:min-w-[80px]">
                          {posyandu}
                        </th>
                      ))}
                      <th className="p-2 md:p-3 text-center font-semibold border whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => {
                      const total = posyandus.reduce((sum, posyandu) => sum + (Number(row[posyandu]) || 0), 0);
                      return (
                        <tr key={row.status} className="hover:bg-muted/30 transition-colors">
                          <td className="p-2 md:p-3 border font-medium whitespace-nowrap text-[10px] md:text-sm">{row.status}</td>
                          {posyandus.map((posyandu) => (
                            <td 
                              key={posyandu} 
                              className="p-2 md:p-3 text-center border cursor-pointer hover:bg-muted/50 text-xs md:text-sm"
                              onClick={() => handleCellClick(posyandu, row.status)}
                            >
                              {row[posyandu] || 0}
                            </td>
                          ))}
                          <td className="p-2 md:p-3 text-center border font-bold text-primary text-xs md:text-sm">
                            {total}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ChildDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        records={getFilteredRecords()}
        posyandu={`${selectedPosyandu || ''} - ${selectedStatus || ''}`}
      />
    </>
  );
}