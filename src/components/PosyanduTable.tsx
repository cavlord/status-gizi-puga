import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Calendar, TrendingDown, Users, ChevronRight } from "lucide-react";
import { ChildRecord } from "@/lib/googleSheets";
import { ChildDetailsModal } from "./ChildDetailsModal";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

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

const STATUS_CONFIG: Record<string, { color: string; bgClass: string; textClass: string; icon: string }> = {
  "Gizi Baik": { color: "hsl(142 71% 45%)", bgClass: "bg-green-50 dark:bg-green-950/30", textClass: "text-green-700 dark:text-green-400", icon: "✅" },
  "Gizi Kurang": { color: "hsl(38 92% 50%)", bgClass: "bg-amber-50 dark:bg-amber-950/30", textClass: "text-amber-700 dark:text-amber-400", icon: "⚠️" },
  "Gizi Buruk": { color: "hsl(0 84% 60%)", bgClass: "bg-red-50 dark:bg-red-950/30", textClass: "text-red-700 dark:text-red-400", icon: "🚨" },
  "Tidak Naik BB": { color: "hsl(0 84% 60%)", bgClass: "bg-red-50 dark:bg-red-950/30", textClass: "text-red-700 dark:text-red-400", icon: "📉" },
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

    const villageData = yearData.filter(r => r['Desa/Kel'] === selectedVillage);
    const monthOrder = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const currentMonthIdx = monthOrder.indexOf(selectedMonth);
    if (currentMonthIdx <= 0) {
      posyandus.forEach(p => { row[p] = 0; });
      return { row, children };
    }
    const prevMonthName = monthOrder[currentMonthIdx - 1];

    const childrenMap = new Map<string, ChildRecord[]>();
    villageData.forEach(record => {
      if (!record.Nama) return;
      if (!childrenMap.has(record.Nama)) {
        childrenMap.set(record.Nama, []);
      }
      childrenMap.get(record.Nama)!.push(record);
    });

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

  const chartData = dataWithTidakNaik.map(row => {
    const total = posyandus.reduce((sum, posyandu) => sum + (Number(row[posyandu]) || 0), 0);
    return {
      status: row.status,
      total: total,
      fill: STATUS_CONFIG[row.status as string]?.color || "hsl(var(--primary))"
    };
  });

  const handleCellClick = (posyandu: string, status: string) => {
    if (status === 'Tidak Naik BB') {
      const filtered = tidakNaikBBResult.children.filter(r => r.Posyandu === posyandu);
      setTidakNaikChildren(filtered);
    } else {
      setTidakNaikChildren([]);
    }
    setSelectedPosyandu(posyandu);
    setSelectedStatus(status);
    setIsModalOpen(true);
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
      <Card className="shadow-sm w-full overflow-hidden">
        <CardHeader className="p-3 md:p-4 lg:p-6 border-b border-border/50">
          <CardTitle className="text-sm md:text-base lg:text-lg flex items-center gap-2">
            <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Data Posyandu – Status Gizi
          </CardTitle>
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
                  <BarChart data={chartData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis 
                      dataKey="status" 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      stroke="hsl(var(--border))"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      stroke="hsl(var(--border))"
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px hsl(var(--foreground) / 0.1)',
                      }}
                      cursor={{ fill: 'hsl(var(--muted) / 0.5)', radius: 8 }}
                    />
                    <Bar 
                      dataKey="total" 
                      name="Total Anak"
                      animationBegin={0}
                      animationDuration={1000}
                      animationEasing="ease-out"
                      radius={[10, 10, 0, 0]}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Modern Card-based Table */}
              <div className="space-y-3">
                {dataWithTidakNaik.map((row, rowIdx) => {
                  const total = posyandus.reduce((sum, posyandu) => sum + (Number(row[posyandu]) || 0), 0);
                  const isTidakNaik = row.status === 'Tidak Naik BB';
                  const config = STATUS_CONFIG[row.status as string] || { bgClass: 'bg-muted/30', textClass: 'text-foreground', icon: '📊' };

                  return (
                    <div
                      key={row.status}
                      className={`rounded-xl border transition-all duration-300 animate-fade-in overflow-hidden ${
                        isTidakNaik 
                          ? 'border-destructive/30 shadow-[0_0_0_1px_hsl(var(--destructive)/0.1)]' 
                          : 'border-border/60 hover:shadow-md'
                      }`}
                      style={{ animationDelay: `${rowIdx * 100}ms`, animationFillMode: 'both' }}
                    >
                      {/* Status Header */}
                      <div className={`flex items-center justify-between px-3 md:px-4 py-2.5 md:py-3 ${config.bgClass}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-base md:text-lg">{config.icon}</span>
                          <span className={`text-xs md:text-sm font-bold uppercase tracking-wide ${config.textClass}`}>
                            {row.status}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs md:text-sm font-bold ${config.bgClass} ${config.textClass} border ${
                          isTidakNaik ? 'border-destructive/20' : 'border-current/10'
                        }`}>
                          <span>Total:</span>
                          <span className="text-sm md:text-base">{total}</span>
                        </div>
                      </div>

                      {/* Posyandu Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-px bg-border/30">
                        {posyandus.map((posyandu, idx) => {
                          const value = Number(row[posyandu]) || 0;
                          return (
                            <button
                              key={posyandu}
                              onClick={() => handleCellClick(posyandu, row.status as string)}
                              className={`group relative flex flex-col items-center justify-center p-2.5 md:p-3 bg-card hover:bg-muted/40 
                                transition-all duration-200 active:scale-[0.97] cursor-pointer`}
                              style={{ animationDelay: `${(rowIdx * 100) + (idx * 50)}ms` }}
                            >
                              <span className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate w-full text-center uppercase mb-1">
                                {posyandu}
                              </span>
                              <span className={`text-lg md:text-xl font-bold tabular-nums ${
                                value > 0 ? config.textClass : 'text-muted-foreground/50'
                              }`}>
                                {value}
                              </span>
                              <ChevronRight className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all duration-200" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
