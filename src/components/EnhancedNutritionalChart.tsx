import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from "recharts";
import { TrendingUp, Activity } from "lucide-react";

interface EnhancedNutritionalChartProps {
  data: { month: string; [key: string]: number | string }[];
}

const COLORS = {
  'Gizi Buruk': '#ef4444',
  'Gizi Kurang': '#f97316',
  'Gizi Baik': '#22c55e',
  'Berisiko Gizi Lebih': '#eab308',
  'Gizi Lebih': '#3b82f6',
  'Obesitas': '#8b5cf6',
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3"
      >
        <p className="font-semibold mb-2 text-popover-foreground">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1">
            <span className="flex items-center gap-2 text-popover-foreground">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="font-semibold text-popover-foreground">{entry.value}</span>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t border-border flex justify-between gap-4">
          <span className="font-semibold text-popover-foreground">Total:</span>
          <span className="font-semibold text-popover-foreground">{total}</span>
        </div>
      </motion.div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-6">
      {payload.map((entry: any, index: number) => (
        <motion.div
          key={`legend-${index}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs font-medium text-foreground">{entry.value}</span>
        </motion.div>
      ))}
    </div>
  );
};

export function EnhancedNutritionalChart({ data }: EnhancedNutritionalChartProps) {
  const statuses = data.length > 0 
    ? Object.keys(data[0]).filter(key => key !== 'month')
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full [&_.recharts-text]:fill-foreground [&_.recharts-cartesian-axis-line]:stroke-foreground [&_.recharts-cartesian-axis-tick-line]:stroke-foreground"
    >
      <ResponsiveContainer width="100%" height={350} className="sm:!h-[400px] md:!h-[450px]">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} className="sm:!mr-[30px] sm:!ml-[20px]">
          <defs>
            {statuses.map((status, index) => (
              <linearGradient key={`gradient-${status}`} id={`color-${status}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[status as keyof typeof COLORS] || '#3b82f6'} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={COLORS[status as keyof typeof COLORS] || '#3b82f6'} stopOpacity={0.1}/>
              </linearGradient>
            ))}
          </defs>
          
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#94a3b8"
            opacity={0.2}
          />
          
          <XAxis
            dataKey="month"
            stroke="#94a3b8"
            fontSize={10}
            angle={-45}
            textAnchor="end"
            height={70}
          />
          
          <YAxis
            stroke="#94a3b8"
            fontSize={10}
            width={35}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Legend content={<CustomLegend />} />
          
          {statuses.map((status, index) => (
            <Line
              key={status}
              type="monotone"
              dataKey={status}
              stroke={COLORS[status as keyof typeof COLORS] || '#3b82f6'}
              strokeWidth={2}
              dot={{
                fill: COLORS[status as keyof typeof COLORS] || '#3b82f6',
                r: 3,
                strokeWidth: 1,
                stroke: 'hsl(var(--background))',
                className: 'sm:!r-4 md:!r-5'
              }}
              activeDot={{
                r: 5,
                strokeWidth: 2,
                stroke: 'hsl(var(--background))',
                className: 'sm:!r-6 md:!r-8'
              }}
              className="sm:!stroke-[2.5px] md:!stroke-[3px]"
              animationDuration={1000}
              animationBegin={index * 100}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// Made with Bob
