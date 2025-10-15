import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { ChildRecord } from "@/lib/googleSheets";

interface NutritionalStatusSummaryProps {
  data: ChildRecord[];
}

const STATUS_COLORS = {
  "Gizi Buruk": "hsl(var(--destructive))",
  "Gizi Kurang": "hsl(var(--warning))",
  "Gizi Baik": "hsl(var(--success))",
  "Berisiko Gizi Lebih": "hsl(var(--info))",
  "Gizi Lebih": "hsl(var(--chart-4))",
  "Obesitas": "hsl(var(--chart-5))",
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

  const chartData = Array.from(statusCounts.entries()).map(([status, names]) => ({
    name: status,
    value: names.size,
    fill: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || "hsl(var(--muted))",
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
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
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
