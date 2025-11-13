import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChildRecord } from "@/lib/googleSheets";
import { ChildDetailsModal } from "./ChildDetailsModal";
import { MapPin } from "lucide-react";

interface VillageNutritionalStatusProps {
  data: ChildRecord[];
  year: string;
}

const STATUS_COLORS = {
  "Gizi Baik": "hsl(142 71% 45%)",
  "Gizi Kurang": "hsl(38 92% 50%)",
  "Gizi Buruk": "hsl(0 84% 60%)",
};

interface VillageStats {
  village: string;
  giziBaik: number;
  giziKurang: number;
  giziBuruk: number;
  total: number;
}

export function VillageNutritionalStatus({ data, year }: VillageNutritionalStatusProps) {
  const [selectedVillage, setSelectedVillage] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Group by village and count status
  const villageStats = new Map<string, { giziBaik: Set<string>; giziKurang: Set<string>; giziBuruk: Set<string> }>();

  data.forEach(record => {
    const village = record['Desa/Kel'];
    const status = record['BB/TB'];
    const name = record.Nama;

    if (!village || !status || !name) return;

    if (!villageStats.has(village)) {
      villageStats.set(village, {
        giziBaik: new Set(),
        giziKurang: new Set(),
        giziBuruk: new Set(),
      });
    }

    const stats = villageStats.get(village)!;
    if (status === "Gizi Baik") {
      stats.giziBaik.add(name);
    } else if (status === "Gizi Kurang") {
      stats.giziKurang.add(name);
    } else if (status === "Gizi Buruk") {
      stats.giziBuruk.add(name);
    }
  });

  const villageData: VillageStats[] = Array.from(villageStats.entries())
    .map(([village, stats]) => ({
      village,
      giziBaik: stats.giziBaik.size,
      giziKurang: stats.giziKurang.size,
      giziBuruk: stats.giziBuruk.size,
      total: stats.giziBaik.size + stats.giziKurang.size + stats.giziBuruk.size,
    }))
    .sort((a, b) => b.total - a.total);

  const handleStatusClick = (village: string, status: string) => {
    setSelectedVillage(village);
    setSelectedStatus(status);
    setIsModalOpen(true);
  };

  const filteredRecords = selectedVillage && selectedStatus
    ? data.filter(record => record['Desa/Kel'] === selectedVillage && record['BB/TB'] === selectedStatus)
    : [];

  // Calculate totals
  const totalGiziBaik = villageData.reduce((sum, v) => sum + v.giziBaik, 0);
  const totalGiziKurang = villageData.reduce((sum, v) => sum + v.giziKurang, 0);
  const totalGiziBuruk = villageData.reduce((sum, v) => sum + v.giziBuruk, 0);
  const grandTotal = totalGiziBaik + totalGiziKurang + totalGiziBuruk;

  return (
    <div className="space-y-4 transition-all duration-300">
      <Card className="border-0 shadow-lg">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Sebaran Data Balita Per Desa ({year})
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Data status gizi berdasarkan bulan terbaru
          </p>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
            <Card className="shadow-sm" style={{ borderTop: `4px solid ${STATUS_COLORS["Gizi Baik"]}` }}>
              <CardContent className="p-3 md:p-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Gizi Baik</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: STATUS_COLORS["Gizi Baik"] }}>
                  {totalGiziBaik}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  {grandTotal > 0 ? ((totalGiziBaik / grandTotal) * 100).toFixed(1) : 0}%
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm" style={{ borderTop: `4px solid ${STATUS_COLORS["Gizi Kurang"]}` }}>
              <CardContent className="p-3 md:p-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Gizi Kurang</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: STATUS_COLORS["Gizi Kurang"] }}>
                  {totalGiziKurang}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  {grandTotal > 0 ? ((totalGiziKurang / grandTotal) * 100).toFixed(1) : 0}%
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm" style={{ borderTop: `4px solid ${STATUS_COLORS["Gizi Buruk"]}` }}>
              <CardContent className="p-3 md:p-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Gizi Buruk</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: STATUS_COLORS["Gizi Buruk"] }}>
                  {totalGiziBuruk}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  {grandTotal > 0 ? ((totalGiziBuruk / grandTotal) * 100).toFixed(1) : 0}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Village Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 md:p-3 font-semibold text-xs md:text-sm">Desa/Kelurahan</th>
                  <th className="text-center p-2 md:p-3 font-semibold text-xs md:text-sm" style={{ color: STATUS_COLORS["Gizi Baik"] }}>Gizi Baik</th>
                  <th className="text-center p-2 md:p-3 font-semibold text-xs md:text-sm" style={{ color: STATUS_COLORS["Gizi Kurang"] }}>Gizi Kurang</th>
                  <th className="text-center p-2 md:p-3 font-semibold text-xs md:text-sm" style={{ color: STATUS_COLORS["Gizi Buruk"] }}>Gizi Buruk</th>
                  <th className="text-center p-2 md:p-3 font-semibold text-xs md:text-sm">Total</th>
                </tr>
              </thead>
              <tbody>
                {villageData.map((village, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="p-2 md:p-3 text-xs md:text-sm font-medium">{village.village}</td>
                    <td className="text-center p-2 md:p-3">
                      <button
                        onClick={() => handleStatusClick(village.village, "Gizi Baik")}
                        className="text-xs md:text-sm font-semibold hover:underline cursor-pointer transition-all"
                        style={{ color: STATUS_COLORS["Gizi Baik"] }}
                      >
                        {village.giziBaik}
                      </button>
                    </td>
                    <td className="text-center p-2 md:p-3">
                      <button
                        onClick={() => handleStatusClick(village.village, "Gizi Kurang")}
                        className="text-xs md:text-sm font-semibold hover:underline cursor-pointer transition-all"
                        style={{ color: STATUS_COLORS["Gizi Kurang"] }}
                      >
                        {village.giziKurang}
                      </button>
                    </td>
                    <td className="text-center p-2 md:p-3">
                      <button
                        onClick={() => handleStatusClick(village.village, "Gizi Buruk")}
                        className="text-xs md:text-sm font-semibold hover:underline cursor-pointer transition-all"
                        style={{ color: STATUS_COLORS["Gizi Buruk"] }}
                      >
                        {village.giziBuruk}
                      </button>
                    </td>
                    <td className="text-center p-2 md:p-3 text-xs md:text-sm font-bold">{village.total}</td>
                  </tr>
                ))}
                <tr className="bg-muted/50 font-bold">
                  <td className="p-2 md:p-3 text-xs md:text-sm">TOTAL</td>
                  <td className="text-center p-2 md:p-3 text-xs md:text-sm" style={{ color: STATUS_COLORS["Gizi Baik"] }}>{totalGiziBaik}</td>
                  <td className="text-center p-2 md:p-3 text-xs md:text-sm" style={{ color: STATUS_COLORS["Gizi Kurang"] }}>{totalGiziKurang}</td>
                  <td className="text-center p-2 md:p-3 text-xs md:text-sm" style={{ color: STATUS_COLORS["Gizi Buruk"] }}>{totalGiziBuruk}</td>
                  <td className="text-center p-2 md:p-3 text-xs md:text-sm">{grandTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ChildDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        records={filteredRecords}
        posyandu={`${selectedVillage} - ${selectedStatus}`}
      />
    </div>
  );
}
