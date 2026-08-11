import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, TooltipProps } from "recharts";
import { TrendingUp, Activity } from "lucide-react";

interface EnhancedNutritionalChartProps {
  data: { month: string; [key: string]: number | string }[];
}

const COLORS: Record<string, string> = {
  'Gizi Buruk': '#ef4444',
  'Gizi Kurang': '#f97316',
  'Gizi Baik': '#22c55e',
  'Berisiko Gizi Lebih': '#eab308',
  'Risiko Gizi Lebih': '#eab308',
  'Gizi Lebih': '#3b82f6',
  'Obesitas': '#8b5cf6',
  'Outlier': '#94a3b8',
};

// Fallback colors for any status not in COLORS
const FALLBACK_COLORS = ['#06b6d4', '#a855f7', '#ec4899', '#f59e0b', '#10b981'];

interface TooltipWithDataProps extends TooltipProps<number, string> {
  monthData?: Record<string, number>;
}

const CustomTooltip = ({ active, payload, label, monthData }: TooltipWithDataProps) => {
  if (active && payload && payload.length) {
    // Use monthData (all statuses for this month) for accurate total, not just payload entries
    const total = monthData
      ? Object.values(monthData).reduce((sum, v) => sum + v, 0)
      : payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

    // Merge payload entries with any missing statuses from monthData
    const payloadKeys = new Set(payload.map(e => e.name));
    const extraEntries = monthData
      ? Object.entries(monthData)
          .filter(([k]) => !payloadKeys.has(k) && monthData[k] > 0)
          .map(([name, value]) => ({ name, value, color: COLORS[name] || '#94a3b8' }))
      : [];
    const allEntries = [
      ...payload.map(e => ({ name: e.name, value: e.value, color: e.color })),
      ...extraEntries,
    ];

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3"
      >
        <p className="font-semibold mb-2 text-popover-foreground">{label}</p>
        {allEntries.map((entry, index) => (
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

const CustomLegend = ({ payload }: { payload?: { color: string; value: string }[] }) => {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-6">
      {payload.map((entry, index: number) => (
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
  // Collect all statuses across ALL months so every status gets a line
  const statuses = Array.from(
    data.reduce((set, row) => {
      Object.keys(row).forEach(k => { if (k !== 'month') set.add(k); });
      return set;
    }, new Set<string>())
  );

  // Build a lookup: month → { status: count } for accurate tooltip totals
  const monthDataMap = data.reduce<Record<string, Record<string, number>>>((acc, row) => {
    const counts: Record<string, number> = {};
    Object.entries(row).forEach(([k, v]) => {
      if (k !== 'month') counts[k] = Number(v) || 0;
    });
    acc[row.month as string] = counts;
    return acc;
  }, {});

  const getColor = (status: string, index: number) =>
    COLORS[status] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];

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
                <stop offset="5%" stopColor={getColor(status, index)} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={getColor(status, index)} stopOpacity={0.1}/>
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

          <Tooltip content={(props) => (
            <CustomTooltip
              {...props}
              monthData={props.label ? monthDataMap[props.label as string] : undefined}
            />
          )} />

          <Legend content={<CustomLegend />} />

          {statuses.map((status, index) => (
            <Line
              key={status}
              type="monotone"
              dataKey={status}
              stroke={getColor(status, index)}
              strokeWidth={2}
              dot={{
                fill: getColor(status, index),
                r: 3,
                strokeWidth: 1,
                stroke: 'hsl(var(--background))',
              }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
              animationDuration={1000}
              animationBegin={index * 100}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
