import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ChildRecord } from "@/lib/googleSheets";
import { ChildDetailsModal } from "./ChildDetailsModal";

interface NutritionalStatusSummaryProps {
  data: ChildRecord[];
}

const STATUS_COLORS = {
  "Gizi Buruk": "hsl(0 84% 60%)",
  "Gizi Kurang": "hsl(38 92% 50%)",
  "Gizi Baik": "hsl(142 71% 45%)",
  "Berisiko Gizi Lebih": "hsl(199 89% 48%)",
  "Gizi Lebih": "hsl(271 81% 56%)",
  "Obesitas": "hsl(340 82% 52%)",
};

export function NutritionalStatusSummary({ data }: NutritionalStatusSummaryProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Count unique names per status
  const statusCounts = new Map<string, Set<string>>();
  
  data.forEach(record => {
    const status = record['BB/TB'];
    const name = record.Nama;
    
    if (!status || !name) return;
    
    if (!statusCounts.has(status)) {
      statusCounts.set(status, new Set());
    }
    statusCounts.get(status)!.add(name);
  });

  const handleCardClick = (statusName: string) => {
    setSelectedStatus(statusName);
    setIsModalOpen(true);
  };

  const filteredRecords = selectedStatus 
    ? data.filter(record => record['BB/TB'] === selectedStatus)
    : [];

  const chartData = Array.from(statusCounts.entries()).map(([status, names], index) => ({
    name: status,
    value: names.size,
    fill: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || `hsl(${(index * 60) % 360} 70% 50%)`,
  }));

  const totalChildren = new Set(data.map(r => r.Nama).filter(Boolean)).size;

  return (
    <div className="space-y-4 transition-all duration-300">
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg md:text-xl">Distribusi Status Gizi</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                startAngle={180}
                endAngle={0}
                innerRadius={50}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
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
              <Legend wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
        {chartData.map((item) => {
          const percentage = totalChildren > 0 ? ((item.value / totalChildren) * 100).toFixed(1) : '0';
          
          return (
            <Card 
              key={item.name} 
              className="shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer hover:scale-105 active:scale-100"
              onClick={() => handleCardClick(item.name)}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                  <div 
                    className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: item.fill }}
                  />
                  <p className="text-[10px] sm:text-xs font-medium text-muted-foreground line-clamp-1">
                    {item.name}
                  </p>
                </div>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: item.fill }}>
                  {item.value}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  {percentage}% dari total
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ChildDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        records={filteredRecords}
        posyandu={selectedStatus || ''}
      />
    </div>
  );
}
