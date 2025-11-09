import { useState, useEffect } from "react";
import {
  filterUnderFiveYears,
  ChildRecord,
} from "@/lib/googleSheets";
import { useData } from "@/contexts/DataContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, User, TrendingUp, Calendar, Weight, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Analytics = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChildRecord[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  const { allRecords, error } = useData();

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
    if (!allRecords || !searchQuery.trim()) {
      setSearchResults([]);
      setSelectedChild(null);
      return;
    }

    const underFiveRecords = filterUnderFiveYears(allRecords);
    const query = searchQuery.toLowerCase().trim();
    
    // Search logic: full name or NIK (case-insensitive)
    const results = underFiveRecords.filter(record => {
      const nama = (record.Nama || '').toLowerCase().trim();
      const nik = (record.NIK || '').toString().toLowerCase().trim();
      
      // Search by NIK (partial match)
      if (nik && nik.includes(query)) return true;
      
      // Search by full name (partial match - can search any part of the name)
      if (nama.includes(query)) return true;
      
      return false;
    });

    const uniqueNames = Array.from(new Set(results.map(r => r.Nama)));
    
    if (uniqueNames.length > 0 && !selectedChild) {
      setSelectedChild(uniqueNames[0]);
    }

    setSearchResults(results);
  }, [searchQuery, allRecords, selectedChild]);

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

  const childHistory = selectedChild
    ? searchResults
        .filter(r => r.Nama === selectedChild)
        .sort((a, b) => 
          new Date(a['Tanggal Pengukuran']).getTime() - new Date(b['Tanggal Pengukuran']).getTime()
        )
    : [];

  const uniqueChildren = Array.from(new Set(searchResults.map(r => r.Nama))).filter(Boolean);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "Gizi Buruk": "bg-red-500",
      "Gizi Kurang": "bg-orange-500",
      "Gizi Baik": "bg-green-500",
      "Berisiko Gizi Lebih": "bg-blue-500",
      "Gizi Lebih": "bg-purple-500",
      "Obesitas": "bg-pink-500",
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <div className="w-full space-y-4 md:space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 md:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-heading font-bold text-foreground flex items-center gap-2 md:gap-3">
            <Search className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-primary flex-shrink-0" />
            Detail Riwayat Anak
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1">
            Cari dan lihat perjalanan status gizi balita dari waktu ke waktu
          </p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-3 md:p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari berdasarkan nama atau NIK..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 md:pl-10 h-10 md:h-12 text-sm md:text-base"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {searchQuery.trim() && (
        <>
          {uniqueChildren.length > 0 ? (
            <>
              {uniqueChildren.length > 1 && (
                <Card className="border-0 shadow-lg transition-all duration-300">
                  <CardHeader className="p-4 md:p-6">
                    <CardTitle className="text-base sm:text-lg md:text-xl">
                      Hasil Pencarian ({uniqueChildren.length} anak ditemukan)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                      {uniqueChildren.map((name) => (
                        <button
                          key={name}
                          onClick={() => setSelectedChild(name)}
                          className={`p-3 md:p-4 rounded-lg border-2 text-left transition-all duration-200 hover:shadow-md active:scale-95 ${
                            selectedChild === name
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                            <span className="font-medium text-sm md:text-base truncate">{name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedChild && childHistory.length > 0 && (
                <>
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 to-accent/10 transition-all duration-300">
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle className="text-lg sm:text-xl md:text-2xl font-heading flex items-center gap-2">
                        <User className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
                        Informasi Anak
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6 pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">Nama</p>
                          <p className="text-sm sm:text-base md:text-lg font-semibold truncate">{childHistory[0].Nama}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">NIK</p>
                          <p className="text-sm sm:text-base md:text-lg font-semibold">{childHistory[0].NIK || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">Desa/Kelurahan</p>
                          <p className="text-sm sm:text-base md:text-lg font-semibold truncate">{childHistory[0]['Desa/Kel']}</p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">Total Pengukuran</p>
                          <p className="text-sm sm:text-base md:text-lg font-semibold">{childHistory.length}x</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg transition-all duration-300">
                    <CardHeader className="p-4 md:p-6">
                      <CardTitle className="text-base sm:text-lg md:text-xl font-heading flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                        Riwayat Status Gizi (dari yang terlama)
                      </CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Perjalanan perkembangan status gizi dari waktu ke waktu
                      </p>
                    </CardHeader>
                    <CardContent className="p-4 md:p-6">
                      <div className="space-y-3 md:space-y-4">
                        {childHistory.map((record, index) => {
                          const isLatest = index === childHistory.length - 1;
                          
                          // Calculate actual weight gain
                          let actualWeightGain: 'Y' | 'T' | '-' = '-';
                          if (index > 0) {
                            const previousWeight = parseFloat(childHistory[index - 1].Berat);
                            const currentWeight = parseFloat(record.Berat);
                            if (!isNaN(previousWeight) && !isNaN(currentWeight)) {
                              actualWeightGain = currentWeight > previousWeight ? 'Y' : 'T';
                            }
                          }
                          
                          return (
                            <div
                              key={index}
                              className={`relative pl-6 md:pl-8 pb-4 md:pb-6 ${
                                index !== childHistory.length - 1 ? 'border-l-2 border-border' : ''
                              }`}
                            >
                              <div className={`absolute left-0 top-0 -translate-x-1/2 w-3 h-3 md:w-4 md:h-4 rounded-full transition-all duration-300 ${
                                isLatest ? 'bg-primary ring-4 ring-primary/20' : 'bg-muted'
                              }`} />

                              <Card className={`transition-all duration-300 ${isLatest ? 'border-2 border-primary shadow-lg' : ''}`}>
                                <CardContent className="p-3 md:p-4">
                                  <div className="flex flex-col gap-2 md:gap-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="font-semibold text-xs sm:text-sm md:text-base">
                                          {record['Tanggal Pengukuran']} ({record['Bulan Pengukuran']})
                                        </span>
                                        {isLatest && (
                                          <Badge className="bg-primary text-xs">Terbaru</Badge>
                                        )}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                                      <div>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                                          <Calendar className="h-3 w-3 flex-shrink-0" />
                                          Usia Saat Ukur
                                        </p>
                                        <p className="font-medium text-xs sm:text-sm md:text-base">{record['Usia Saat Ukur']}</p>
                                      </div>
                                       <div>
                                         <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                                           <Weight className="h-3 w-3 flex-shrink-0" />
                                           Berat Badan
                                         </p>
                                         <p className="font-medium text-xs sm:text-sm md:text-base">{record.Berat} kg</p>
                                       </div>
                                       <div>
                                         <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                                           <Ruler className="h-3 w-3 flex-shrink-0" />
                                           Tinggi Badan
                                         </p>
                                         <p className="font-medium text-xs sm:text-sm md:text-base">{record.Tinggi} cm</p>
                                       </div>
                                      <div>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground">Naik BB</p>
                                        {actualWeightGain === '-' ? (
                                          <Badge variant="outline" className="text-xs">Pertama Kali</Badge>
                                        ) : (
                                          <Badge variant={actualWeightGain === 'Y' ? 'default' : 'destructive'} className="text-xs">
                                            {actualWeightGain === 'Y' ? 'Ya' : 'Tidak'}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    <div className="border-t pt-2 md:pt-3 mt-1 md:mt-2">
                                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">Status Gizi (BB/TB)</p>
                                      <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${getStatusColor(record['BB/TB'] || '')}`} />
                                        <span className="font-semibold text-sm sm:text-base md:text-lg">{record['BB/TB'] || '-'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          ) : (
            <Card className="border-0 shadow-lg transition-all duration-300">
              <CardContent className="py-8 md:py-12 px-4 md:px-6">
                <div className="text-center">
                  <Search className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
                  <p className="text-base sm:text-lg font-semibold mb-2">Tidak ada hasil</p>
                  <p className="text-sm md:text-base text-muted-foreground">
                    Data anak tidak ditemukan, periksa kembali nama atau NIK
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!searchQuery.trim() && (
        <Card className="border-0 shadow-lg transition-all duration-300">
          <CardContent className="py-12 md:py-16 px-4 md:px-6">
            <div className="text-center">
              <Search className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-3 md:mb-4 opacity-50" />
              <p className="text-lg sm:text-xl font-semibold mb-2">Mulai Pencarian</p>
              <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
                Masukkan nama atau NIK anak pada kolom pencarian di atas untuk melihat riwayat status gizi lengkap
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Analytics;
