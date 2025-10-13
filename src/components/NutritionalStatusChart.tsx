import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface NutritionalStatusChartProps {
  data: { month: string; [key: string]: number | string }[];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function NutritionalStatusChart({ data }: NutritionalStatusChartProps) {
  const statuses = data.length > 0 
    ? Object.keys(data[0]).filter(key => key !== 'month')
    : [];

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-primary" />
          Grafik Status Gizi Balita (BB/TB)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--foreground))"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="hsl(var(--foreground))" fontSize={12} />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            {statuses.map((status, index) => (
              <Line
                key={status}
                type="monotone"
                dataKey={status}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ fill: COLORS[index % COLORS.length], r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}