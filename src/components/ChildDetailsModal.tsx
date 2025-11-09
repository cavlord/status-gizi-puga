import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChildRecord, deduplicateByName } from "@/lib/googleSheets";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChildDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: ChildRecord[];
  posyandu: string;
  showWeightComparison?: boolean;
  allRecords?: ChildRecord[];
}

type RecordWithComparison = ChildRecord & {
  previousWeight: number | null;
  previousDate?: string;
  weightDiff: number | null;
};

export function ChildDetailsModal({ 
  isOpen, 
  onClose, 
  records, 
  posyandu,
  showWeightComparison = false,
  allRecords = []
}: ChildDetailsModalProps) {
  const uniqueRecords = deduplicateByName(records);

  // Get previous month's weight for each child if showing weight comparison
  const getRecordWithComparison = (record: ChildRecord): RecordWithComparison => {
    if (!showWeightComparison || !allRecords.length) {
      return { ...record, previousWeight: null, weightDiff: null };
    }
    
    // Helper function to parse DD/MM/YYYY date
    const parseDate = (dateStr: string): Date => {
      if (dateStr.includes('/')) {
        const [day, month, year] = dateStr.split('/').map(Number);
        return new Date(year, month - 1, day);
      }
      return new Date(dateStr);
    };
    
    // Helper function to format date to DD/MM/YYYY
    const formatDate = (dateStr: string) => {
      if (dateStr.includes('/')) return dateStr;
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    // Get current record's month and year
    const currentDate = parseDate(record['Tanggal Pengukuran']);
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // Calculate previous month
    const prevDate = new Date(currentYear, currentMonth - 1, 1);
    const previousMonth = prevDate.getMonth();
    const previousYear = prevDate.getFullYear();
    
    // Get all records for this child
    const childRecords = allRecords.filter(r => r.Nama === record.Nama);
    
    // Find records ONLY from the previous month (bulan sebelumnya)
    const previousMonthRecords = childRecords.filter(r => {
      const d = parseDate(r['Tanggal Pengukuran']);
      return d.getMonth() === previousMonth && d.getFullYear() === previousYear;
    });
    
    // If no data from previous month, return null
    if (previousMonthRecords.length === 0) {
      return { ...record, previousWeight: null, weightDiff: null };
    }
    
    // Get latest record from previous month
    const previousRecord = previousMonthRecords.reduce((latest, r) => {
      return parseDate(r['Tanggal Pengukuran']) > parseDate(latest['Tanggal Pengukuran']) ? r : latest;
    });
    
    const previousWeight = parseFloat(previousRecord.Berat);
    const currentWeight = parseFloat(record.Berat);
    
    if (!isNaN(previousWeight) && !isNaN(currentWeight)) {
      const diff = currentWeight - previousWeight;
      return { 
        ...record, 
        previousWeight, 
        previousDate: formatDate(previousRecord['Tanggal Pengukuran']),
        weightDiff: diff 
      };
    }
    
    return { ...record, previousWeight: null, weightDiff: null };
  };

  const recordsWithComparison = uniqueRecords.map(getRecordWithComparison);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-full sm:max-w-[95vw] md:max-w-6xl lg:max-w-7xl max-h-[90vh] md:max-h-[95vh] p-0 overflow-hidden animate-scale-in">
        <DialogHeader className="p-3 md:p-4 lg:p-6 pb-2 md:pb-3 border-b">
          <DialogTitle className="text-xs sm:text-sm md:text-base lg:text-xl font-bold">
            Detail Data Anak - Posyandu {posyandu}
          </DialogTitle>
          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">
            Total: {uniqueRecords.length} anak
          </p>
        </DialogHeader>
        <div className="overflow-auto max-h-[calc(90vh-80px)] md:max-h-[calc(95vh-120px)]">
          <div className="min-w-max">
            <table className="w-full border-collapse text-[8px] sm:text-[9px] md:text-[10px] lg:text-xs">
              <thead className="bg-muted sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 text-left border font-semibold">No</th>
                  <th className="px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 text-left border font-semibold min-w-[60px] sm:min-w-[80px] md:min-w-[100px] lg:min-w-[120px]">Nama</th>
                  <th className="px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 text-left border font-semibold">JK</th>
                  <th className="px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 text-left border font-semibold min-w-[40px] sm:min-w-[50px] md:min-w-[60px] lg:min-w-[70px]">Usia</th>
                  <th className="px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 text-left border font-semibold min-w-[50px] sm:min-w-[60px] md:min-w-[70px] lg:min-w-[80px]">Tgl Ukur</th>
                  <th className="px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 text-left border font-semibold min-w-[60px] sm:min-w-[70px] md:min-w-[80px] lg:min-w-[90px]">BB/TB</th>
                  <th className="px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 text-left border font-semibold min-w-[40px] sm:min-w-[50px]">BB Saat Ini (kg)</th>
                  {showWeightComparison && (
                    <>
                      <th className="px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 text-left border font-semibold min-w-[50px] sm:min-w-[60px]">BB Sebelumnya (kg)</th>
                      <th className="px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 text-left border font-semibold min-w-[40px] sm:min-w-[50px]">Selisih (kg)</th>
                    </>
                  )}
                  <th className="px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 text-left border font-semibold min-w-[30px] sm:min-w-[40px]">TB (cm)</th>
                  <th className="px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 text-left border font-semibold min-w-[60px] sm:min-w-[70px] md:min-w-[90px] lg:min-w-[100px]">Desa/Kel</th>
                  <th className="px-1 py-1 sm:px-1.5 sm:py-1.5 md:px-2 md:py-2 text-left border font-semibold min-w-[70px] sm:min-w-[80px] md:min-w-[100px] lg:min-w-[120px]">Nama Ortu</th>
                </tr>
              </thead>
              <tbody>
                {recordsWithComparison.map((record, index) => (
                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                    <td className="px-1 py-0.5 sm:px-1.5 sm:py-1 md:px-2 md:py-1.5 border text-center">{index + 1}</td>
                    <td className="px-1 py-0.5 sm:px-1.5 sm:py-1 md:px-2 md:py-1.5 border font-medium">{record.Nama}</td>
                    <td className="px-1 py-0.5 sm:px-1.5 sm:py-1 md:px-2 md:py-1.5 border text-center">{record.JK}</td>
                    <td className="px-1 py-0.5 sm:px-1.5 sm:py-1 md:px-2 md:py-1.5 border text-[7px] sm:text-[8px] md:text-[9px]">{record['Usia Saat Ukur']}</td>
                    <td className="px-1 py-0.5 sm:px-1.5 sm:py-1 md:px-2 md:py-1.5 border whitespace-nowrap text-[7px] sm:text-[8px] md:text-[9px]">{record['Tanggal Pengukuran']}</td>
                    <td className="px-1 py-0.5 sm:px-1.5 sm:py-1 md:px-2 md:py-1.5 border">
                      <span
                        className={`inline-block px-0.5 py-0.5 sm:px-1 sm:py-0.5 md:px-1.5 md:py-1 rounded text-[7px] sm:text-[8px] md:text-[9px] font-semibold whitespace-nowrap ${
                          record['BB/TB'] === 'Gizi Baik'
                            ? 'bg-secondary/20 text-secondary-foreground'
                            : record['BB/TB'] === 'Gizi Kurang'
                            ? 'bg-warning/20 text-foreground'
                            : record['BB/TB'] === 'Gizi Buruk'
                            ? 'bg-destructive/20 text-destructive-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {record['BB/TB']}
                      </span>
                    </td>
                    <td className="px-1 py-0.5 sm:px-1.5 sm:py-1 md:px-2 md:py-1.5 border text-center font-semibold">{record.Berat}</td>
                    {showWeightComparison && (
                      <>
                        <td className="px-1 py-0.5 sm:px-1.5 sm:py-1 md:px-2 md:py-1.5 border text-center">
                          {record.previousWeight !== null ? (
                            <div>
                              <div className="font-medium">{record.previousWeight}</div>
                              <div className="text-[6px] sm:text-[7px] md:text-[8px] text-muted-foreground">{record.previousDate}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-1 py-0.5 sm:px-1.5 sm:py-1 md:px-2 md:py-1.5 border text-center">
                          {record.weightDiff !== null ? (
                            <span className={`font-bold ${
                              record.weightDiff > 0 
                                ? 'text-green-600' 
                                : record.weightDiff < 0 
                                ? 'text-red-600' 
                                : 'text-muted-foreground'
                            }`}>
                              {record.weightDiff > 0 ? '+' : ''}{record.weightDiff.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      </>
                    )}
                    <td className="px-1 py-0.5 sm:px-1.5 sm:py-1 md:px-2 md:py-1.5 border text-center">{record.Tinggi}</td>
                    <td className="px-1 py-0.5 sm:px-1.5 sm:py-1 md:px-2 md:py-1.5 border text-[7px] sm:text-[8px] md:text-[9px]">{record['Desa/Kel']}</td>
                    <td className="px-1 py-0.5 sm:px-1.5 sm:py-1 md:px-2 md:py-1.5 border text-[7px] sm:text-[8px] md:text-[9px]">{record['Nama Ortu']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}