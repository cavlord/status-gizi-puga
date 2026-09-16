import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedCounter } from './AnimatedCounter';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  /** Tailwind text-color class for the icon and accent, e.g. "text-blue-500" */
  accentColor?: string;
  /** Tailwind border-left-color class, e.g. "border-l-blue-500" */
  borderColor?: string;
  delay?: number;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accentColor = 'text-sky-500',
  borderColor = 'border-l-sky-400',
  onClick,
}: StatCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'border border-border border-l-4 bg-card rounded-xl transition-shadow duration-200',
        borderColor,
        onClick
          ? 'cursor-pointer hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
          : 'shadow-sm',
      )}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {title}
            </p>
            <div className="text-3xl font-bold text-foreground tabular-nums">
              <AnimatedCounter value={value} />
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
          </div>
          <div className={cn('p-2.5 rounded-lg bg-muted flex-shrink-0', accentColor)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
