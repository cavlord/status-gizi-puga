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
  yearData?: ChildRecord[];
}

const STATUS_COLORS: Record<string, string> = {
  "Gizi Baik": "hsl(142 71% 45%)",
  "Gizi Kurang": "hsl(38 92% 50%)",
  "Gizi Buruk": "hsl(0 84% 60%)",
  "Tidak Naik BB": "hsl(0 84% 60%)",
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
  yearData = [],
}: PosyanduTableProps) {
  const [selectedPosyandu, setSelectedPosyandu] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tidakNaikChildren, setTidakNaikChildren] = useState<ChildRecord[]>([]);

  // Get all unique Posyandu names from data
  const posyandus = data.length > 0 
    ? Object.keys(data[0]).filter(key => key !== 'status')
    : [];

  // Compute "Tidak Naik BB" per posyandu for the selected village and month
  const computeTidakNaikBB = (): { row: { status: string; [key: string]: number | string }; children: ChildRecord[] } => {
    const row: { status: string; [key: string]: number | string } = { status: 'Tidak Naik BB' };
    const children: ChildRecord[] = [];
    
    if (!selectedVillage || !selectedMonth || yearData.length === 0) {
      posyandus.forEach(p => { row[p] = 0; });
      return { row, children };
    }

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
      const yr = date.getFullYear();
      return `${day}/${month}/${yr}`;
    };

    // Filter yearData by village
    const villageData = yearData.filter(r => r['Desa/Kel'] === selectedVillage);

    // Find the month index for selectedMonth
    const monthOrder = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const currentMonthIdx = monthOrder.indexOf(selectedMonth);
    if (currentMonthIdx <= 0) {
      posyandus.forEach(p => { row[p] = 0; });
      return { row, children };
    }
    const prevMonthName = monthOrder[currentMonthIdx - 1];

    // Group by child name
    const childrenMap = new Map<string, ChildRecord[]>();
    villageData.forEach(record => {
      if (!record.Nama) return;
      if (!childrenMap.has(record.Nama)) {
        childrenMap.set(record.Nama, []);
      }
      childrenMap.get(record.Nama)!.push(record);
    });

    // Per posyandu count
    const posyanduCount = new Map<string, number>();
    posyandus.forEach(p => posyanduCount.set(p, 0));

    childrenMap.forEach((records, childName) => {
      const currMonthData = records.filter(r => r['Bulan Pengukuran'] === selectedMonth);
      const prevMonthData = records.filter(r => r['Bulan Pengukuran'] === prevMonthName);

      if (currMonthData.length === 0 || prevMonthData.length === 0) return;

      const latestCurr = currMonthData.reduce((a, b) => parseDate(a['Tanggal Pengukuran']) > parseDate(b['Tanggal Pengukuran']) ? a : b);
      const latestPrev = prevMonthData.reduce((a, b) => parseDate(a['Tanggal Pengukuran']) > parseDate(b['Tanggal Pengukuran']) ? a : b);

      const currWeight = parseFloat(latestCurr.Berat);
      const prevWeight = parseFloat(latestPrev.Berat);

      if (!isNaN(currWeight) && !isNaN(prevWeight) && currWeight <= prevWeight) {
        const posyandu = latestCurr.Posyandu;
        if (posyandu && posyanduCount.has(posyandu)) {
          posyanduCount.set(posyandu, (posyanduCount.get(posyandu) || 0) + 1);
        }
        const formattedDate = formatDate(latestCurr['Tanggal Pengukuran']);
        if (!formattedDate.includes('NaN')) {
          children.push({
            ...latestCurr,
            'Tanggal Pengukuran': formattedDate
          });
        }
      }
    });

    posyandus.forEach(p => { row[p] = posyanduCount.get(p) || 0; });
    return { row, children };
  };

  const tidakNaikBBResult = computeTidakNaikBB();
  const dataWithTidakNaik = [...data, tidakNaikBBResult.row];

  // Prepare chart data - aggregate totals per status
  const chartData = dataWithTidakNaik.map(row => {
    const total = posyandus.reduce((sum, posyandu) => sum + (Number(row[posyandu]) || 0), 0);
    return {
      status: row.status,
      total: total,
      fill: STATUS_COLORS[row.status as string] || "hsl(var(--primary))"
    };
  });

  const handleCellClick = (posyandu: string, status: string) => {
    if (status === 'Tidak Naik BB') {
      // Filter children by posyandu
      const filtered = tidakNaikBBResult.children.filter(r => r.Posyandu === posyandu);
      setTidakNaikChildren(filtered);
      setSelectedPosyandu(posyandu);
      setSelectedStatus(status);
      setIsModalOpen(true);
    } else {
      setTidakNaikChildren([]);
      setSelectedPosyandu(posyandu);
      setSelectedStatus(status);
      setIsModalOpen(true);
    }
  };

  const getFilteredRecords = () => {
    if (!selectedPosyandu || !selectedStatus) return [];
    
    if (selectedStatus === 'Tidak Naik BB') {
      return tidakNaikChildren;
    }
    
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
          {dataWithTidakNaik.length === 0 || (data.length === 0) ? (
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
                    {dataWithTidakNaik.map((row) => {
                      const total = posyandus.reduce((sum, posyandu) => sum + (Number(row[posyandu]) || 0), 0);
                      const isTidakNaik = row.status === 'Tidak Naik BB';
                      return (
                        <tr key={row.status} className={`hover:bg-muted/30 transition-colors ${isTidakNaik ? 'border-t-2 border-t-destructive/30' : ''}`}>
                          <td className={`p-1.5 md:p-2 lg:p-3 border font-medium whitespace-nowrap text-[9px] sm:text-[10px] md:text-sm uppercase ${isTidakNaik ? 'text-destructive font-bold' : ''}`}>{row.status}</td>
                          {posyandus.map((posyandu) => (
                            <td 
                              key={posyandu} 
                              className={`p-1.5 md:p-2 lg:p-3 text-center border cursor-pointer hover:bg-muted/50 transition-colors text-[10px] sm:text-xs md:text-sm active:scale-95 ${isTidakNaik ? 'text-destructive font-semibold' : ''}`}
                              onClick={() => handleCellClick(posyandu, row.status)}
                            >
                              {row[posyandu] || 0}
                            </td>
                          ))}
                          <td className={`p-1.5 md:p-2 lg:p-3 text-center border font-bold text-[10px] sm:text-xs md:text-sm ${isTidakNaik ? 'text-destructive' : 'text-primary'}`}>
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
        showWeightComparison={selectedStatus === 'Tidak Naik BB'}
        allRecords={selectedStatus === 'Tidak Naik BB' ? yearData : []}
      />
    </>
  );
}