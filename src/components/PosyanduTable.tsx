import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Calendar } from "lucide-react";
import { ChildRecord } from "@/lib/googleSheets";
import { ChildDetailsModal } from "./ChildDetailsModal";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

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

const STATUS_COLORS = {
  "Gizi Baik": "hsl(142 71% 45%)",
  "Gizi Kurang": "hsl(38 92% 50%)",
  "Gizi Buruk": "hsl(0 84% 60%)",
};

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

  // Prepare chart data - aggregate totals per status
  const chartData = data.map(row => {
    const total = posyandus.reduce((sum, posyandu) => sum + (Number(row[posyandu]) || 0), 0);
    return {
      status: row.status,
      total: total,
      fill: STATUS_COLORS[row.status as keyof typeof STATUS_COLORS] || "hsl(var(--primary))"
    };
  });

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
        <CardHeader className="p-3 md:p-4 lg:p-6">
          <CardTitle className="text-sm md:text-base lg:text-lg">Data Posyandu – Status Gizi</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 lg:gap-4 mt-2 md:mt-3 lg:mt-4">
            <div className="flex items-center gap-2 md:gap-3 bg-muted/50 p-2 md:p-3 rounded-lg">
              <Building2 className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 block">
                  Desa/Kelurahan
                </label>
                <Select value={selectedVillage} onValueChange={onVillageChange}>
                  <SelectTrigger className="bg-background h-8 md:h-10 text-xs md:text-sm">
                    <SelectValue placeholder="Pilih desa" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {villages.map((village) => (
                      <SelectItem key={village} value={village} className="text-xs md:text-sm">
                        {village}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3 bg-muted/50 p-2 md:p-3 rounded-lg">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-secondary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 block">
                  Bulan
                </label>
                <Select value={selectedMonth} onValueChange={onMonthChange}>
                  <SelectTrigger className="bg-background h-8 md:h-10 text-xs md:text-sm">
                    <SelectValue placeholder="Pilih bulan" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {months.map((month) => (
                      <SelectItem key={month} value={month} className="text-xs md:text-sm">
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-4 lg:p-6">
          {data.length === 0 ? (
            <div className="text-center py-6 md:py-8 text-xs sm:text-sm md:text-base text-muted-foreground">
              Tidak ada data untuk filter yang dipilih
            </div>
          ) : (
            <>
              {/* Bar Chart */}
              <div className="mb-6" key={`${selectedVillage}-${selectedMonth}`}>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="status" 
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: '12px'
                      }}
                    />
                    <Bar 
                      dataKey="total" 
                      name="Total Anak"
                      animationBegin={0}
                      animationDuration={800}
                      radius={[8, 8, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="overflow-x-auto -mx-2 md:mx-0">
              <div className="min-w-max px-2 md:px-0">
                <table className="w-full border-collapse text-[10px] sm:text-xs md:text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="p-1.5 md:p-2 lg:p-3 text-left font-semibold border whitespace-nowrap">BB/TB</th>
                      {posyandus.map((posyandu) => (
                        <th key={posyandu} className="p-1.5 md:p-2 lg:p-3 text-center font-semibold border whitespace-nowrap min-w-[50px] sm:min-w-[60px] md:min-w-[80px]">
                          {posyandu}
                        </th>
                      ))}
                      <th className="p-1.5 md:p-2 lg:p-3 text-center font-semibold border whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row) => {
                      const total = posyandus.reduce((sum, posyandu) => sum + (Number(row[posyandu]) || 0), 0);
                      return (
                        <tr key={row.status} className="hover:bg-muted/30 transition-colors">
                          <td className="p-1.5 md:p-2 lg:p-3 border font-medium whitespace-nowrap text-[9px] sm:text-[10px] md:text-sm">{row.status}</td>
                          {posyandus.map((posyandu) => (
                            <td 
                              key={posyandu} 
                              className="p-1.5 md:p-2 lg:p-3 text-center border cursor-pointer hover:bg-muted/50 transition-colors text-[10px] sm:text-xs md:text-sm active:scale-95"
                              onClick={() => handleCellClick(posyandu, row.status)}
                            >
                              {row[posyandu] || 0}
                            </td>
                          ))}
                          <td className="p-1.5 md:p-2 lg:p-3 text-center border font-bold text-primary text-[10px] sm:text-xs md:text-sm">
                            {total}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </>
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