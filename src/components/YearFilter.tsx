import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

interface YearFilterProps {
  years: string[];
  selectedYear: string;
  onYearChange: (year: string) => void;
}

export function YearFilter({ years, selectedYear, onYearChange }: YearFilterProps) {
  return (
    <div className="flex items-center gap-3 bg-card p-4 rounded-lg border shadow-sm">
      <Calendar className="h-5 w-5 text-primary" />
      <div className="flex-1">
        <label className="text-sm font-medium text-muted-foreground mb-1 block">
          Filter Tahun
        </label>
        <Select value={selectedYear} onValueChange={onYearChange}>
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Pilih tahun" />
          </SelectTrigger>
          <SelectContent className="bg-popover z-50">
            {years.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}