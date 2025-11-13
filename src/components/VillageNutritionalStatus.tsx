import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ChildRecord } from "@/lib/googleSheets";
import { ChildDetailsModal } from "./ChildDetailsModal";
import { MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VillageNutritionalStatusProps {
  data: ChildRecord[];
  year: string;
}

const STATUS_COLORS = {
  "Gizi Baik": "hsl(142 71% 45%)",
  "Gizi Kurang": "hsl(38 92% 50%)",
  "Gizi Buruk": "hsl(0 84% 60%)",
};

const VILLAGE_COLORS = [
  "hsl(199 89% 48%)",
  "hsl(271 81% 56%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(340 82% 52%)",
  "hsl(221 83% 53%)",
  "hsl(158 64% 52%)",
  "hsl(24 95% 53%)",
];

interface VillageStats {
  village: string;
  giziBaik: number;
  giziKurang: number;
  giziBuruk: number;
  total: number;
}

export function VillageNutritionalStatus({ data, year }: VillageNutritionalStatusProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper to format date to DD/MM/YYYY
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
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Group by village for pie chart
  const villageCountMap = new Map<string, Set<string>>();
  
  data.forEach(record => {
    const village = record['Desa/Kel'];
    const name = record.Nama;
    
    if (!village || !name) return;
    
    if (!villageCountMap.has(village)) {
      villageCountMap.set(village, new Set());
    }
    villageCountMap.get(village)!.add(name);
  });

  const villageChartData = Array.from(villageCountMap.entries())
    .map(([village, names], index) => ({
      name: village,
      value: names.size,
      fill: VILLAGE_COLORS[index % VILLAGE_COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  const totalChildren = Array.from(villageCountMap.values()).reduce((sum, set) => sum + set.size, 0);

  // Group by nutritional status for table
  const statusMap = new Map<string, ChildRecord[]>();
  
  data.forEach(record => {
    const status = record['BB/TB'];
    if (!status) return;
    
    if (["Gizi Baik", "Gizi Kurang", "Gizi Buruk"].includes(status)) {
      if (!statusMap.has(status)) {
        statusMap.set(status, []);
      }
      statusMap.get(status)!.push({
        ...record,
        'Tanggal Pengukuran': formatDate(record['Tanggal Pengukuran'])
      });
    }
  });

  const handleStatusClick = (status: string) => {
    setSelectedStatus(status);
    setIsModalOpen(true);
  };

  const filteredRecords = selectedStatus ? statusMap.get(selectedStatus) || [] : [];

  // Calculate totals
  const totalGiziBaik = statusMap.get("Gizi Baik")?.length || 0;
  const totalGiziKurang = statusMap.get("Gizi Kurang")?.length || 0;
  const totalGiziBuruk = statusMap.get("Gizi Buruk")?.length || 0;
  const grandTotal = totalGiziBaik + totalGiziKurang + totalGiziBuruk;

  return (
    <div className="space-y-4 transition-all duration-300">
      {/* Pie Chart - Sebaran Balita Per Desa */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Sebaran Data Balita Per Desa ({year})
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Jumlah balita berdasarkan desa/kelurahan
          </p>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={villageChartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={3}
                animationBegin={0}
                animationDuration={800}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {villageChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '12px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Village Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-4">
            {villageChartData.map((village, index) => (
              <Card key={index} className="shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: village.fill }}
                    />
                    <p className="text-[10px] sm:text-xs font-medium line-clamp-1">{village.name}</p>
                  </div>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold" style={{ color: village.fill }}>
                    {village.value}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {totalChildren > 0 ? ((village.value / totalChildren) * 100).toFixed(1) : 0}%
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Gizi Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Data Status Gizi (Bulan Terbaru)
          </CardTitle>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Klik pada kategori untuk melihat detail anak
          </p>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {/* Gizi Baik */}
            <Card 
              className="shadow-sm cursor-pointer hover:shadow-md transition-all hover:scale-105"
              style={{ borderTop: `4px solid ${STATUS_COLORS["Gizi Baik"]}` }}
              onClick={() => handleStatusClick("Gizi Baik")}
            >
              <CardContent className="p-3 md:p-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">Gizi Baik</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: STATUS_COLORS["Gizi Baik"] }}>
                  {totalGiziBaik}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                  {grandTotal > 0 ? ((totalGiziBaik / grandTotal) * 100).toFixed(1) : 0}%
                </p>
                <Badge variant="outline" className="mt-2 text-[10px]">
                  Klik untuk detail
                </Badge>
              </CardContent>
            </Card>

            {/* Gizi Kurang */}
            <Card 
              className="shadow-sm cursor-pointer hover:shadow-md transition-all hover:scale-105"
              style={{ borderTop: `4px solid ${STATUS_COLORS["Gizi Kurang"]}` }}
              onClick={() => handleStatusClick("Gizi Kurang")}
            >
              <CardContent className="p-3 md:p-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">Gizi Kurang</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: STATUS_COLORS["Gizi Kurang"] }}>
                  {totalGiziKurang}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                  {grandTotal > 0 ? ((totalGiziKurang / grandTotal) * 100).toFixed(1) : 0}%
                </p>
                <Badge variant="outline" className="mt-2 text-[10px]">
                  Klik untuk detail
                </Badge>
              </CardContent>
            </Card>

            {/* Gizi Buruk */}
            <Card 
              className="shadow-sm cursor-pointer hover:shadow-md transition-all hover:scale-105"
              style={{ borderTop: `4px solid ${STATUS_COLORS["Gizi Buruk"]}` }}
              onClick={() => handleStatusClick("Gizi Buruk")}
            >
              <CardContent className="p-3 md:p-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">Gizi Buruk</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: STATUS_COLORS["Gizi Buruk"] }}>
                  {totalGiziBuruk}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                  {grandTotal > 0 ? ((totalGiziBuruk / grandTotal) * 100).toFixed(1) : 0}%
                </p>
                <Badge variant="outline" className="mt-2 text-[10px]">
                  Klik untuk detail
                </Badge>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <ChildDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        records={filteredRecords}
        posyandu={selectedStatus || ''}
      />
    </div>
  );
}
