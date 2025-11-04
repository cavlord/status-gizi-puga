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
    
    // Improved search: normalize and match multiple parts
    const results = underFiveRecords.filter(record => {
      const nama = record.Nama?.toLowerCase().replace(/\s+/g, ' ').trim() || '';
      const nik = record.NIK?.toLowerCase().trim() || '';
      
      // Exact match or contains for both fields
      return nama.includes(query) || 
             nik.includes(query) ||
             nama.split(' ').some(part => part.startsWith(query)) ||
             query.split(' ').every(part => nama.includes(part));
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <Search className="h-8 w-8 text-primary" />
            Detail Riwayat Anak
          </h2>
          <p className="text-muted-foreground mt-1">
            Cari dan lihat perjalanan status gizi balita dari waktu ke waktu
          </p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari berdasarkan nama atau NIK..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-lg"
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
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Hasil Pencarian ({uniqueChildren.length} anak ditemukan)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {uniqueChildren.map((name) => (
                        <button
                          key={name}
                          onClick={() => setSelectedChild(name)}
                          className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                            selectedChild === name
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            <span className="font-medium">{name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedChild && childHistory.length > 0 && (
                <>
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/10 to-accent/10">
                    <CardHeader>
                      <CardTitle className="text-2xl font-heading flex items-center gap-2">
                        <User className="h-6 w-6 text-primary" />
                        Informasi Anak
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Nama</p>
                          <p className="text-lg font-semibold">{childHistory[0].Nama}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">NIK</p>
                          <p className="text-lg font-semibold">{childHistory[0].NIK || '-'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Desa/Kelurahan</p>
                          <p className="text-lg font-semibold">{childHistory[0]['Desa/Kel']}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Pengukuran</p>
                          <p className="text-lg font-semibold">{childHistory.length}x</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-xl font-heading flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Riwayat Status Gizi (dari yang terlama)
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Perjalanan perkembangan status gizi dari waktu ke waktu
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
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
                              className={`relative pl-8 pb-6 ${
                                index !== childHistory.length - 1 ? 'border-l-2 border-border' : ''
                              }`}
                            >
                              <div className={`absolute left-0 top-0 -translate-x-1/2 w-4 h-4 rounded-full ${
                                isLatest ? 'bg-primary ring-4 ring-primary/20' : 'bg-muted'
                              }`} />

                              <Card className={`${isLatest ? 'border-2 border-primary shadow-lg' : ''}`}>
                                <CardContent className="p-4">
                                  <div className="flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-semibold">
                                          {record['Tanggal Pengukuran']} ({record['Bulan Pengukuran']})
                                        </span>
                                        {isLatest && (
                                          <Badge className="bg-primary">Terbaru</Badge>
                                        )}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      <div>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          Usia Saat Ukur
                                        </p>
                                        <p className="font-medium">{record['Usia Saat Ukur']}</p>
                                      </div>
                                       <div>
                                         <p className="text-xs text-muted-foreground flex items-center gap-1">
                                           <Weight className="h-3 w-3" />
                                           Berat Badan
                                         </p>
                                         <p className="font-medium">{record.Berat} kg</p>
                                       </div>
                                       <div>
                                         <p className="text-xs text-muted-foreground flex items-center gap-1">
                                           <Ruler className="h-3 w-3" />
                                           Tinggi Badan
                                         </p>
                                         <p className="font-medium">{record.Tinggi} cm</p>
                                       </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Naik BB</p>
                                        {actualWeightGain === '-' ? (
                                          <Badge variant="outline">Pertama Kali</Badge>
                                        ) : (
                                          <Badge variant={actualWeightGain === 'Y' ? 'default' : 'destructive'}>
                                            {actualWeightGain === 'Y' ? 'Ya' : 'Tidak'}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    <div className="border-t pt-3 mt-2">
                                      <p className="text-xs text-muted-foreground mb-2">Status Gizi (BB/TB)</p>
                                      <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${getStatusColor(record['BB/TB'] || '')}`} />
                                        <span className="font-semibold text-lg">{record['BB/TB'] || '-'}</span>
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
            <Card className="border-0 shadow-lg">
              <CardContent className="py-12">
                <div className="text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">Tidak ada hasil</p>
                  <p className="text-muted-foreground">
                    Tidak ditemukan anak dengan nama atau NIK "{searchQuery}"
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!searchQuery.trim() && (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16">
            <div className="text-center">
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-xl font-semibold mb-2">Mulai Pencarian</p>
              <p className="text-muted-foreground max-w-md mx-auto">
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
