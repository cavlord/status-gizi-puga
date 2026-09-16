import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Clock } from "lucide-react";

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
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3">
      {showYear && years.length > 0 && (
        <div className="flex items-center gap-2 flex-1 min-w-[160px] max-w-xs">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Tahun</label>
            <Select value={selectedYear} onValueChange={onYearChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Pilih tahun" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {showVillage && villages.length > 0 && (
        <div className="flex items-center gap-2 flex-1 min-w-[160px] max-w-xs">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Desa/Kelurahan</label>
            <Select value={selectedVillage} onValueChange={onVillageChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Pilih desa" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {villages.map((village) => (
                  <SelectItem key={village} value={village}>{village}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {showMonth && months.length > 0 && (
        <div className="flex items-center gap-2 flex-1 min-w-[160px] max-w-xs">
          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <label className="text-xs text-muted-foreground block mb-1">Bulan Pengukuran</label>
            <Select value={selectedMonth} onValueChange={onMonthChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Pilih bulan" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
