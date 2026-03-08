import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from "recharts";
import { ChildRecord } from "@/lib/googleSheets";
import { ChildDetailsModal } from "./ChildDetailsModal";
import { MapPin, Users, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VillageNutritionalStatusProps {
  yearData: ChildRecord[];
  monthData: ChildRecord[];
  year: string;
  notGainingWeightData?: { count: number; children: ChildRecord[] };
  onShowNotGainingModal?: () => void;
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

export function VillageNutritionalStatus({ yearData, monthData, year, notGainingWeightData, onShowNotGainingModal }: VillageNutritionalStatusProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeVillageIndex, setActiveVillageIndex] = useState<number | undefined>(undefined);
  const [activeStatusIndex, setActiveStatusIndex] = useState<number | undefined>(undefined);

  const renderActiveShape = useCallback((props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 4}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))', transition: 'all 0.3s ease' }}
        />
      </g>
    );
  }, []);

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

  // Group by village for pie chart - count unique children (Nama) per village from YEAR data
  const villageCountMap = new Map<string, Set<string>>();
  
  yearData.forEach(record => {
    const village = record['Desa/Kel'];
    const name = record.Nama;
    
    // Only count records with both village and name
    if (!village || village.trim() === '' || !name || name.trim() === '') return;
    
    if (!villageCountMap.has(village)) {
      villageCountMap.set(village, new Set());
    }
    
    // Count unique names (CountUnique on Nama)
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

  // Group by nutritional status from MONTH data - include all villages
  const statusMap = new Map<string, ChildRecord[]>();
  
  monthData.forEach(record => {
    const status = record['BB/TB'];
    const village = record['Desa/Kel'];
    
    // Include all records with valid status, regardless of village
    if (!status || status.trim() === '') return;
    
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

  // Prepare chart data for nutritional status
  const statusChartData = [
    { name: "Gizi Baik", value: totalGiziBaik, fill: STATUS_COLORS["Gizi Baik"] },
    { name: "Gizi Kurang", value: totalGiziKurang, fill: STATUS_COLORS["Gizi Kurang"] },
    { name: "Gizi Buruk", value: totalGiziBuruk, fill: STATUS_COLORS["Gizi Buruk"] },
  ].filter(item => item.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 transition-all duration-300">
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
          <ResponsiveContainer width="100%" height={280} className="md:h-[300px]">
            <PieChart>
              <Pie
                data={villageChartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={3}
                animationBegin={0}
                animationDuration={800}
                activeIndex={activeVillageIndex}
                activeShape={renderActiveShape}
                onMouseEnter={(_, index) => setActiveVillageIndex(index)}
                onMouseLeave={() => setActiveVillageIndex(undefined)}
                onClick={(_, index) => setActiveVillageIndex(prev => prev === index ? undefined : index)}
                label={({ percent, cx, cy, midAngle, outerRadius }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius + 18;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  const isMobile = window.innerWidth < 768;
                  
                  return (
                    <text 
                      x={x} 
                      y={y} 
                      fill="hsl(220 9% 46%)" 
                      textAnchor={x > cx ? 'start' : 'end'} 
                      dominantBaseline="central"
                      style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 600 }}
                    >
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
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
              <Legend 
                wrapperStyle={{ fontSize: '10px' }}
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Village Summary Cards */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {villageChartData.map((village, index) => (
              <div key={index} className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-card">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: village.fill }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium leading-tight">{village.name}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold" style={{ color: village.fill }}>
                      {village.value}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ({totalChildren > 0 ? ((village.value / totalChildren) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Gizi with Chart */}
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
          {/* Chart visualization */}
          {statusChartData.length > 0 && (
            <div className="mb-6">
              <ResponsiveContainer width="100%" height={300} className="md:h-[250px]">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    paddingAngle={3}
                    animationBegin={0}
                    animationDuration={800}
                    activeIndex={activeStatusIndex}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setActiveStatusIndex(index)}
                    onMouseLeave={() => setActiveStatusIndex(undefined)}
                    onClick={(_, index) => setActiveStatusIndex(prev => prev === index ? undefined : index)}
                    label={({ percent, cx, cy, midAngle, outerRadius }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 20;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      const isMobile = window.innerWidth < 768;
                      
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill="hsl(220 9% 46%)" 
                          textAnchor={x > cx ? 'start' : 'end'} 
                          dominantBaseline="central"
                          style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 600 }}
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {statusChartData.map((entry, index) => (
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
                  <Legend 
                    wrapperStyle={{ fontSize: '11px' }}
                    iconSize={10}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            {/* Gizi Baik */}
            <div 
              className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] text-center"
              style={{ borderTop: `3px solid ${STATUS_COLORS["Gizi Baik"]}` }}
              onClick={() => handleStatusClick("Gizi Baik")}
            >
              <p className="text-xs text-muted-foreground mb-1">Gizi Baik</p>
              <p className="text-2xl font-bold" style={{ color: STATUS_COLORS["Gizi Baik"] }}>
                {totalGiziBaik}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {grandTotal > 0 ? ((totalGiziBaik / grandTotal) * 100).toFixed(1) : 0}%
              </p>
            </div>

            {/* Gizi Kurang */}
            <div 
              className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] text-center"
              style={{ borderTop: `3px solid ${STATUS_COLORS["Gizi Kurang"]}` }}
              onClick={() => handleStatusClick("Gizi Kurang")}
            >
              <p className="text-xs text-muted-foreground mb-1">Gizi Kurang</p>
              <p className="text-2xl font-bold" style={{ color: STATUS_COLORS["Gizi Kurang"] }}>
                {totalGiziKurang}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {grandTotal > 0 ? ((totalGiziKurang / grandTotal) * 100).toFixed(1) : 0}%
              </p>
            </div>

            {/* Gizi Buruk */}
            <div 
              className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] text-center"
              style={{ borderTop: `3px solid ${STATUS_COLORS["Gizi Buruk"]}` }}
              onClick={() => handleStatusClick("Gizi Buruk")}
            >
              <p className="text-xs text-muted-foreground mb-1">Gizi Buruk</p>
              <p className="text-2xl font-bold" style={{ color: STATUS_COLORS["Gizi Buruk"] }}>
                {totalGiziBuruk}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {grandTotal > 0 ? ((totalGiziBuruk / grandTotal) * 100).toFixed(1) : 0}%
              </p>
            </div>

            {/* Tidak Naik BB */}
            {notGainingWeightData && (
              <div 
                className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] text-center"
                style={{ borderTop: '3px solid hsl(0 84% 60%)' }}
                onClick={() => onShowNotGainingModal?.()}
              >
                <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Tidak Naik BB
                </p>
                <p className="text-2xl font-bold" style={{ color: "hsl(0 84% 60%)" }}>
                  {notGainingWeightData.count}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  2 Bulan Berturut
                </p>
              </div>
            )}
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
