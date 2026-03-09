import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ChildRecord,
} from "@/lib/googleSheets";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, User, TrendingUp, Calendar, Weight, Ruler,
  MapPin, Baby, FileText, ArrowUp, ArrowDown, Minus,
  ChevronRight, Activity,
} from "lucide-react";

const Analytics = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChildRecord[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { allRecords, error } = useData();

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Gagal mengambil data. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Debounce search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Filter results based on debounced query
  const filteredResults = useMemo(() => {
    if (!allRecords || !debouncedQuery.trim()) return [];
    const query = debouncedQuery.toLowerCase().trim();
    return allRecords.filter(record => {
      const nama = (record.Nama || '').toLowerCase().trim();
      const nik = (record.NIK || '').toString().toLowerCase().trim();
      return (nik && nik.includes(query)) || nama.includes(query);
    });
  }, [debouncedQuery, allRecords]);

  // Update search results and selected child
  useEffect(() => {
    setSearchResults(filteredResults);
    const uniqueNames = Array.from(new Set(filteredResults.map(r => r.Nama)));
    if (uniqueNames.length > 0) {
      if (!selectedChild || !uniqueNames.includes(selectedChild)) {
        setSelectedChild(uniqueNames[0]);
      }
    } else {
      setSelectedChild(null);
    }
  }, [filteredResults]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!allRecords || allRecords.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-xl font-semibold mb-2">Data Tidak Tersedia</p>
          <p className="text-muted-foreground">Belum ada data yang tersedia saat ini.</p>
        </div>
      </div>
    );
  }

  const parseDateDDMMYYYY = (dateStr: string): Date => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(0);
  };

  const childHistory = useMemo(() => selectedChild
    ? searchResults
        .filter(r => r.Nama === selectedChild)
        .sort((a, b) => {
          const dateA = parseDateDDMMYYYY(a['Tanggal Pengukuran']);
          const dateB = parseDateDDMMYYYY(b['Tanggal Pengukuran']);
          return dateA.getTime() - dateB.getTime();
        })
    : [], [selectedChild, searchResults]);

  const uniqueChildren = useMemo(() => Array.from(new Set(searchResults.map(r => r.Nama))).filter(Boolean), [searchResults]);

  const getStatusColor = (status: string) => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      "Gizi Buruk": { bg: "bg-red-500/10", text: "text-red-700 dark:text-red-400", border: "border-red-500/30" },
      "Gizi Kurang": { bg: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-400", border: "border-amber-500/30" },
      "Gizi Baik": { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/30" },
      "Berisiko Gizi Lebih": { bg: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-400", border: "border-sky-500/30" },
      "Gizi Lebih": { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-400", border: "border-purple-500/30" },
      "Obesitas": { bg: "bg-pink-500/10", text: "text-pink-700 dark:text-pink-400", border: "border-pink-500/30" },
    };
    return map[status] || { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
  };

  const getStatusDot = (status: string) => {
    const map: Record<string, string> = {
      "Gizi Buruk": "bg-red-500",
      "Gizi Kurang": "bg-amber-500",
      "Gizi Baik": "bg-emerald-500",
      "Berisiko Gizi Lebih": "bg-sky-500",
      "Gizi Lebih": "bg-purple-500",
      "Obesitas": "bg-pink-500",
    };
    return map[status] || "bg-muted-foreground";
  };

  // Get latest status for a child
  const getLatestRecord = (name: string) => {
    const records = searchResults
      .filter(r => r.Nama === name)
      .sort((a, b) => parseDateDDMMYYYY(b['Tanggal Pengukuran']).getTime() - parseDateDDMMYYYY(a['Tanggal Pengukuran']).getTime());
    return records[0];
  };

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-heading font-bold text-foreground flex items-center gap-2 md:gap-3">
          <Activity className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-primary flex-shrink-0" />
          Detail Riwayat Anak
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1">
          Cari dan lihat perjalanan status gizi balita dari waktu ke waktu
        </p>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary" />
            <Input
              type="text"
              placeholder="Ketik nama anak atau NIK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 md:h-14 text-sm md:text-base border-0 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0 bg-card"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {searchQuery.trim() && (
        <>
          {uniqueChildren.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 md:gap-6">
              {/* Left: Search results list */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  {uniqueChildren.length} anak ditemukan
                </p>
                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                  {uniqueChildren.map((name) => {
                    const latest = getLatestRecord(name);
                    const statusStyle = getStatusColor(latest?.['BB/TB'] || '');
                    const isSelected = selectedChild === name;
                    const recordCount = searchResults.filter(r => r.Nama === name).length;

                    return (
                      <button
                        key={name}
                        onClick={() => setSelectedChild(name)}
                        className={`w-full p-3 md:p-4 rounded-xl text-left transition-all duration-200 border group ${
                          isSelected
                            ? 'bg-primary/5 border-primary shadow-md'
                            : 'bg-card border-border hover:border-primary/40 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            <User className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(latest?.['BB/TB'] || '')}`} />
                                {latest?.['BB/TB'] || '-'}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{recordCount} data</span>
                            </div>
                          </div>
                          <ChevronRight className={`h-4 w-4 shrink-0 transition-colors ${
                            isSelected ? 'text-primary' : 'text-muted-foreground/40'
                          }`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Child detail */}
              {selectedChild && childHistory.length > 0 && (
                <div className="space-y-4 md:space-y-5 animate-fade-in">
                  {/* Child Info Card */}
                  <Card className="border-0 shadow-lg overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-secondary" />
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Baby className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg md:text-xl font-bold font-heading truncate">{childHistory[0].Nama}</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                            <InfoItem icon={FileText} label="NIK" value={childHistory[0].NIK || '-'} />
                            <InfoItem icon={MapPin} label="Desa" value={childHistory[0]['Desa/Kel'] || '-'} />
                            <InfoItem icon={User} label="Orang Tua" value={childHistory[0]['Nama Ortu'] || '-'} />
                            <InfoItem icon={Calendar} label="Total Ukur" value={`${childHistory.length} kali`} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* History Timeline */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader className="p-4 md:p-6 pb-2">
                      <CardTitle className="text-base md:text-lg font-heading flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
                        Riwayat Pengukuran
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Diurutkan dari yang terlama</p>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-2">
                      <div className="space-y-0">
                        {childHistory.map((record, index) => {
                          const isLatest = index === childHistory.length - 1;
                          const isFirst = index === 0;

                          let weightChange: 'up' | 'down' | 'same' | null = null;
                          let weightDiff = 0;
                          if (index > 0) {
                            const prev = parseFloat(childHistory[index - 1].Berat);
                            const curr = parseFloat(record.Berat);
                            if (!isNaN(prev) && !isNaN(curr)) {
                              weightDiff = curr - prev;
                              weightChange = weightDiff > 0 ? 'up' : weightDiff < 0 ? 'down' : 'same';
                            }
                          }

                          const statusStyle = getStatusColor(record['BB/TB'] || '');

                          return (
                            <div key={index} className="relative flex gap-3 md:gap-4">
                              {/* Timeline line */}
                              <div className="flex flex-col items-center shrink-0">
                                <div className={`w-3 h-3 md:w-3.5 md:h-3.5 rounded-full border-2 z-10 ${
                                  isLatest
                                    ? 'bg-primary border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.15)]'
                                    : 'bg-card border-muted-foreground/30'
                                }`} />
                                {!isLatest && (
                                  <div className="w-0.5 flex-1 bg-border my-1" />
                                )}
                              </div>

                              {/* Content */}
                              <div className={`flex-1 pb-4 md:pb-5 ${isLatest ? 'pb-0' : ''}`}>
                                {/* Date header */}
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs md:text-sm font-bold text-foreground">
                                    {record['Tanggal Pengukuran']}
                                  </span>
                                  <span className="text-[10px] md:text-xs text-muted-foreground">
                                    ({record['Bulan Pengukuran']})
                                  </span>
                                  {isLatest && (
                                    <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
                                      Terbaru
                                    </Badge>
                                  )}
                                  {isFirst && childHistory.length > 1 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      Pertama
                                    </Badge>
                                  )}
                                </div>

                                {/* Data card */}
                                <div className={`rounded-xl border p-3 md:p-4 transition-all ${
                                  isLatest ? 'border-primary/30 bg-primary/[0.02] shadow-sm' : 'border-border bg-card'
                                }`}>
                                  {/* Measurements row */}
                                  <div className="grid grid-cols-3 gap-2 md:gap-4">
                                    <MeasureItem
                                      icon={Calendar}
                                      label="Usia"
                                      value={record['Usia Saat Ukur'] || '-'}
                                    />
                                    <MeasureItem
                                      icon={Weight}
                                      label="Berat"
                                      value={`${record.Berat || '-'} kg`}
                                      change={weightChange}
                                      diff={weightDiff}
                                    />
                                    <MeasureItem
                                      icon={Ruler}
                                      label="Tinggi"
                                      value={`${record.Tinggi || '-'} cm`}
                                    />
                                  </div>

                                  {/* Status */}
                                  <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] md:text-xs text-muted-foreground">Status BB/TB:</span>
                                    <span className={`inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold px-2.5 py-1 rounded-lg border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                                      <span className={`w-2 h-2 rounded-full ${getStatusDot(record['BB/TB'] || '')}`} />
                                      {record['BB/TB'] || '-'}
                                    </span>
                                    {weightChange && (
                                      <span className={`inline-flex items-center gap-1 text-[10px] md:text-xs font-medium px-2 py-0.5 rounded-full ${
                                        weightChange === 'up' 
                                          ? 'bg-emerald-500/10 text-emerald-600' 
                                          : weightChange === 'down' 
                                            ? 'bg-red-500/10 text-red-600' 
                                            : 'bg-muted text-muted-foreground'
                                      }`}>
                                        {weightChange === 'up' ? <ArrowUp className="h-3 w-3" /> : weightChange === 'down' ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                        {weightChange === 'up' ? '+' : ''}{weightDiff.toFixed(1)} kg
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-12 px-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-semibold mb-1">Tidak ada hasil</p>
                  <p className="text-sm text-muted-foreground">
                    Data anak tidak ditemukan. Periksa kembali nama atau NIK.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!searchQuery.trim() && (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16 px-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center mx-auto mb-5">
                <Search className="h-10 w-10 text-primary/40" />
              </div>
              <p className="text-xl font-heading font-bold mb-2">Mulai Pencarian</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Masukkan nama atau NIK anak pada kolom pencarian untuk melihat riwayat status gizi lengkap
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Sub-components
function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3 shrink-0" />
        {label}
      </p>
      <p className="font-semibold text-xs md:text-sm truncate">{value}</p>
    </div>
  );
}

function MeasureItem({ icon: Icon, label, value, change, diff }: {
  icon: any; label: string; value: string;
  change?: 'up' | 'down' | 'same' | null;
  diff?: number;
}) {
  return (
    <div>
      <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
        <Icon className="h-3 w-3 shrink-0" />
        {label}
      </p>
      <p className="font-bold text-xs md:text-sm">{value}</p>
    </div>
  );
}

export default Analytics;
