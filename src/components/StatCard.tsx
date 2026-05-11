import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { AnimatedCounter } from './AnimatedCounter';

interface StatCardProps {
  title: string;
  value: number;
  description: string;
  icon: LucideIcon;
  gradient: string;
  delay?: number;
  onClick?: () => void;
}

export function StatCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  gradient,
  delay = 0,
  onClick 
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={onClick ? 'cursor-pointer' : ''}
    >
      <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`} />
        <CardContent className="relative p-4 sm:p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-white/80 truncate">{title}</p>
              <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                <AnimatedCounter value={value} />
              </div>
              <p className="text-[10px] sm:text-xs text-white/70 line-clamp-2">{description}</p>
            </div>
            <motion.div
              className="p-2 sm:p-2.5 md:p-3 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm flex-shrink-0"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring" as const, stiffness: 400 }}
            >
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Made with Bob
