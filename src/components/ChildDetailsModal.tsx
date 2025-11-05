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
    
    const childRecords = allRecords
      .filter(r => r.Nama === record.Nama)
      .sort((a, b) => new Date(a['Tanggal Pengukuran']).getTime() - new Date(b['Tanggal Pengukuran']).getTime());
    
    const currentIndex = childRecords.findIndex(
      r => r['Tanggal Pengukuran'] === record['Tanggal Pengukuran']
    );
    
    if (currentIndex > 0) {
      const previousRecord = childRecords[currentIndex - 1];
      const previousWeight = parseFloat(previousRecord.Berat);
      const currentWeight = parseFloat(record.Berat);
      
      if (!isNaN(previousWeight) && !isNaN(currentWeight)) {
        const diff = currentWeight - previousWeight;
        return { 
          ...record, 
          previousWeight, 
          previousDate: previousRecord['Tanggal Pengukuran'],
          weightDiff: diff 
        };
      }
    }
    
    return { ...record, previousWeight: null, weightDiff: null };
  };

  const recordsWithComparison = uniqueRecords.map(getRecordWithComparison);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-full md:max-w-7xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="p-3 md:p-6 pb-2 md:pb-3 border-b">
          <DialogTitle className="text-sm md:text-base lg:text-xl font-bold">
            Detail Data Anak - Posyandu {posyandu}
          </DialogTitle>
          <p className="text-xs md:text-sm text-muted-foreground">
            Total: {uniqueRecords.length} anak
          </p>
        </DialogHeader>
        <div className="overflow-auto max-h-[calc(95vh-100px)] md:max-h-[calc(95vh-120px)]">
          <div className="min-w-max">
            <table className="w-full border-collapse text-[9px] sm:text-[10px] md:text-xs lg:text-sm">
              <thead className="bg-muted sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-3 md:py-2.5 text-left border font-semibold">No</th>
                  <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[80px] sm:min-w-[100px] md:min-w-[120px] lg:min-w-[140px]">Nama</th>
                  <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-3 md:py-2.5 text-left border font-semibold">JK</th>
                  <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[50px] sm:min-w-[60px] md:min-w-[70px] lg:min-w-[80px]">Usia</th>
                  <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[60px] sm:min-w-[70px] md:min-w-[80px] lg:min-w-[100px]">Tgl Ukur</th>
                  <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[70px] sm:min-w-[80px] md:min-w-[90px] lg:min-w-[110px]">BB/TB</th>
                  <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[50px]">BB Saat Ini (kg)</th>
                  {showWeightComparison && (
                    <>
                      <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[60px]">BB Sebelumnya (kg)</th>
                      <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[50px]">Selisih (kg)</th>
                    </>
                  )}
                  <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[40px]">TB (cm)</th>
                  <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[70px] sm:min-w-[90px] md:min-w-[100px] lg:min-w-[120px]">Desa/Kel</th>
                  <th className="px-1.5 py-1.5 sm:px-2 sm:py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[80px] sm:min-w-[100px] md:min-w-[120px] lg:min-w-[140px]">Nama Ortu</th>
                </tr>
              </thead>
              <tbody>
                {recordsWithComparison.map((record, index) => (
                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                    <td className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 border text-center">{index + 1}</td>
                    <td className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 border font-medium">{record.Nama}</td>
                    <td className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 border text-center">{record.JK}</td>
                    <td className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 border text-[8px] sm:text-[9px] md:text-xs">{record['Usia Saat Ukur']}</td>
                    <td className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 border whitespace-nowrap text-[8px] sm:text-[9px] md:text-xs">{record['Tanggal Pengukuran']}</td>
                    <td className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 border">
                      <span
                        className={`inline-block px-1 py-0.5 sm:px-1.5 sm:py-0.5 md:px-2 md:py-1 rounded text-[8px] sm:text-[9px] md:text-xs font-semibold whitespace-nowrap ${
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
                    <td className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 border text-center font-semibold">{record.Berat}</td>
                    {showWeightComparison && (
                      <>
                        <td className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 border text-center">
                          {record.previousWeight !== null ? (
                            <div>
                              <div className="font-medium">{record.previousWeight}</div>
                              <div className="text-[7px] sm:text-[8px] md:text-[9px] text-muted-foreground">{record.previousDate}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 border text-center">
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
                    <td className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 border text-center">{record.Tinggi}</td>
                    <td className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 border text-[8px] sm:text-[9px] md:text-xs">{record['Desa/Kel']}</td>
                    <td className="px-1.5 py-1 sm:px-2 sm:py-1.5 md:px-3 md:py-2 border text-[8px] sm:text-[9px] md:text-xs">{record['Nama Ortu']}</td>
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