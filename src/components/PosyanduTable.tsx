import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Calendar, Users, TrendingDown, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { ChildRecord } from "@/lib/googleSheets";
import { ChildDetailsModal } from "./ChildDetailsModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; rowClass: string; badgeClass: string }> = {
  "Gizi Baik": {
    icon: <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
    rowClass: "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  },
  "Gizi Kurang": {
    icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    rowClass: "hover:bg-amber-50/50 dark:hover:bg-amber-950/20",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  },
  "Gizi Buruk": {
    icon: <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />,
    rowClass: "hover:bg-red-50/50 dark:hover:bg-red-950/20",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
  "Tidak Naik BB": {
    icon: <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />,
    rowClass: "hover:bg-red-50/50 dark:hover:bg-red-950/20 border-t-2 border-dashed border-border",
    badgeClass: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  },
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

  // Compute "Tidak Naik BB" per posyandu
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
      <Card className="shadow-sm w-full overflow-hidden animate-fade-in">
        <CardHeader className="p-3 md:p-4 lg:p-6 border-b border-border/50">
          <CardTitle className="text-sm md:text-base lg:text-lg flex items-center gap-2">
            <Users className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Status Gizi Per Posyandu
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
        <CardContent className="p-0">
          {dataWithTidakNaik.length === 0 || (data.length === 0) ? (
            <div className="text-center py-6 md:py-8 text-xs sm:text-sm md:text-base text-muted-foreground">
              Tidak ada data untuk filter yang dipilih
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs md:text-sm font-semibold text-foreground w-[160px] md:w-[200px] sticky left-0 bg-muted/30 z-10">
                      STATUS
                    </TableHead>
                    {posyandus.map((posyandu) => (
                      <TableHead 
                        key={posyandu} 
                        className="text-xs md:text-sm font-semibold text-foreground text-center uppercase min-w-[80px]"
                      >
                        {posyandu}
                      </TableHead>
                    ))}
                    <TableHead className="text-xs md:text-sm font-semibold text-foreground text-center min-w-[70px] bg-muted/50">
                      TOTAL
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataWithTidakNaik.map((row) => {
                    const total = posyandus.reduce((sum, posyandu) => sum + (Number(row[posyandu]) || 0), 0);
                    const config = STATUS_CONFIG[row.status as string] || {
                      icon: <Users className="h-4 w-4 text-muted-foreground" />,
                      rowClass: "",
                      badgeClass: "bg-muted text-muted-foreground",
                    };

                    return (
                      <TableRow
                        key={row.status}
                        className={`transition-colors duration-150 ${config.rowClass}`}
                      >
                        <TableCell className="sticky left-0 bg-card z-10">
                          <div className="flex items-center gap-2">
                            {config.icon}
                            <span className="text-xs md:text-sm font-medium uppercase tracking-wide">
                              {row.status}
                            </span>
                          </div>
                        </TableCell>
                        {posyandus.map((posyandu) => {
                          const value = Number(row[posyandu]) || 0;
                          return (
                            <TableCell
                              key={posyandu}
                              className="text-center p-2 md:p-3"
                            >
                              <button
                                onClick={() => handleCellClick(posyandu, row.status as string)}
                                className={`inline-flex items-center justify-center min-w-[32px] h-7 md:h-8 px-2 rounded-md text-xs md:text-sm font-semibold tabular-nums transition-all duration-150 
                                  ${value > 0 
                                    ? `${config.badgeClass} hover:opacity-80 cursor-pointer active:scale-95` 
                                    : 'text-muted-foreground/40 cursor-pointer hover:bg-muted/50'
                                  }`}
                              >
                                {value}
                              </button>
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center bg-muted/20">
                          <span className={`inline-flex items-center justify-center min-w-[36px] h-7 md:h-8 px-2.5 rounded-md text-xs md:text-sm font-bold tabular-nums ${config.badgeClass}`}>
                            {total}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
