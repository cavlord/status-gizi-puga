import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Clock } from "lucide-react";
import { useState } from "react";

interface AnimatedFilterProps {
  years?: string[];
  villages?: string[];
  months?: string[];
  selectedYear?: string;
  selectedVillage?: string;
  selectedMonth?: string;
  onYearChange?: (year: string) => void;
  onVillageChange?: (village: string) => void;
  onMonthChange?: (month: string) => void;
  showYear?: boolean;
  showVillage?: boolean;
  showMonth?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15
    }
  }
};

export function AnimatedFilter({
  years = [],
  villages = [],
  months = [],
  selectedYear = "",
  selectedVillage = "",
  selectedMonth = "",
  onYearChange = () => {},
  onVillageChange = () => {},
  onMonthChange = () => {},
  showYear = true,
  showVillage = false,
  showMonth = false,
}: AnimatedFilterProps) {
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isVillageOpen, setIsVillageOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4"
    >
      {showYear && years.length > 0 && (
        <motion.div variants={itemVariants} className="flex-1 min-w-full sm:min-w-[180px] md:min-w-[200px]">
          <div className="relative group">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 p-3 sm:p-4 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <motion.div
                  animate={{ rotate: isYearOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-1.5 sm:p-2 bg-blue-500/20 rounded-lg"
                >
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                </motion.div>
                <label className="text-xs sm:text-sm font-semibold text-foreground">
                  Filter Tahun
                </label>
              </div>
              <Select
                value={selectedYear}
                onValueChange={onYearChange}
                onOpenChange={setIsYearOpen}
              >
                <SelectTrigger className="w-full h-9 sm:h-10 text-sm bg-background/50 backdrop-blur-sm border-blue-200 dark:border-blue-800 hover:bg-background transition-colors">
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent className="bg-popover/95 backdrop-blur-sm">
                  <AnimatePresence>
                    {years.map((year, index) => (
                      <motion.div
                        key={year}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <SelectItem value={year} className="cursor-pointer">
                          {year}
                        </SelectItem>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </SelectContent>
              </Select>
            </motion.div>
          </div>
        </motion.div>
      )}

      {showVillage && villages.length > 0 && (
        <motion.div variants={itemVariants} className="flex-1 min-w-full sm:min-w-[180px] md:min-w-[200px]">
          <div className="relative group">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 p-3 sm:p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <motion.div
                  animate={{ rotate: isVillageOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-1.5 sm:p-2 bg-emerald-500/20 rounded-lg"
                >
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
                </motion.div>
                <label className="text-xs sm:text-sm font-semibold text-foreground">
                  Desa/Kelurahan
                </label>
              </div>
              <Select
                value={selectedVillage}
                onValueChange={onVillageChange}
                onOpenChange={setIsVillageOpen}
              >
                <SelectTrigger className="w-full h-9 sm:h-10 text-sm bg-background/50 backdrop-blur-sm border-emerald-200 dark:border-emerald-800 hover:bg-background transition-colors">
                  <SelectValue placeholder="Pilih desa" />
                </SelectTrigger>
                <SelectContent className="bg-popover/95 backdrop-blur-sm max-h-[300px]">
                  <AnimatePresence>
                    {villages.map((village, index) => (
                      <motion.div
                        key={village}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <SelectItem value={village} className="cursor-pointer">
                          {village}
                        </SelectItem>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </SelectContent>
              </Select>
            </motion.div>
          </div>
        </motion.div>
      )}

      {showMonth && months.length > 0 && (
        <motion.div variants={itemVariants} className="flex-1 min-w-full sm:min-w-[180px] md:min-w-[200px]">
          <div className="relative group">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 p-3 sm:p-4 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <motion.div
                  animate={{ rotate: isMonthOpen ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-1.5 sm:p-2 bg-amber-500/20 rounded-lg"
                >
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                </motion.div>
                <label className="text-xs sm:text-sm font-semibold text-foreground">
                  Bulan Pengukuran
                </label>
              </div>
              <Select
                value={selectedMonth}
                onValueChange={onMonthChange}
                onOpenChange={setIsMonthOpen}
              >
                <SelectTrigger className="w-full h-9 sm:h-10 text-sm bg-background/50 backdrop-blur-sm border-amber-200 dark:border-amber-800 hover:bg-background transition-colors">
                  <SelectValue placeholder="Pilih bulan" />
                </SelectTrigger>
                <SelectContent className="bg-popover/95 backdrop-blur-sm">
                  <AnimatePresence>
                    {months.map((month, index) => (
                      <motion.div
                        key={month}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <SelectItem value={month} className="cursor-pointer">
                          {month}
                        </SelectItem>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </SelectContent>
              </Select>
            </motion.div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
