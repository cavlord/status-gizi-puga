import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ChildRecord } from "@/lib/googleSheets";

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

  const chartData = Array.from(statusCounts.entries()).map(([status, names], index) => ({
    name: status,
    value: names.size,
    fill: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || `hsl(${(index * 60) % 360} 70% 50%)`,
  }));

  const totalChildren = new Set(data.map(r => r.Nama).filter(Boolean)).size;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribusi Status Gizi</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                startAngle={180}
                endAngle={0}
                innerRadius={60}
                outerRadius={100}
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
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {chartData.map((item) => {
          const percentage = totalChildren > 0 ? ((item.value / totalChildren) * 100).toFixed(1) : '0';
          
          return (
            <Card key={item.name} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.fill }}
                  />
                  <p className="text-xs font-medium text-muted-foreground line-clamp-1">
                    {item.name}
                  </p>
                </div>
                <p className="text-2xl font-bold" style={{ color: item.fill }}>
                  {item.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {percentage}% dari total
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
