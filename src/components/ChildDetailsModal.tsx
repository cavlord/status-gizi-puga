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
}

export function ChildDetailsModal({ isOpen, onClose, records, posyandu }: ChildDetailsModalProps) {
  const uniqueRecords = deduplicateByName(records);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-full md:max-w-7xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="p-3 md:p-6 pb-2 md:pb-3 border-b">
          <DialogTitle className="text-sm md:text-xl font-bold">
            Detail Data Anak - Posyandu {posyandu}
          </DialogTitle>
          <p className="text-xs md:text-sm text-muted-foreground">
            Total: {uniqueRecords.length} anak
          </p>
        </DialogHeader>
        <div className="overflow-auto max-h-[calc(95vh-100px)] md:max-h-[calc(95vh-120px)]">
          <div className="min-w-max">
            <table className="w-full border-collapse text-[10px] md:text-sm">
              <thead className="bg-muted sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-2 py-2 md:px-3 md:py-2.5 text-left border font-semibold">No</th>
                  <th className="px-2 py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[100px] md:min-w-[140px]">Nama</th>
                  <th className="px-2 py-2 md:px-3 md:py-2.5 text-left border font-semibold">JK</th>
                  <th className="px-2 py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[60px] md:min-w-[80px]">Usia</th>
                  <th className="px-2 py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[70px] md:min-w-[100px]">Tgl Ukur</th>
                  <th className="px-2 py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[80px] md:min-w-[110px]">BB/TB</th>
                  <th className="px-2 py-2 md:px-3 md:py-2.5 text-left border font-semibold">BB (kg)</th>
                  <th className="px-2 py-2 md:px-3 md:py-2.5 text-left border font-semibold">TB (cm)</th>
                  <th className="px-2 py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[90px] md:min-w-[120px]">Desa/Kel</th>
                  <th className="px-2 py-2 md:px-3 md:py-2.5 text-left border font-semibold min-w-[100px] md:min-w-[140px]">Nama Ortu</th>
                </tr>
              </thead>
              <tbody>
                {uniqueRecords.map((record, index) => (
                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                    <td className="px-2 py-1.5 md:px-3 md:py-2 border text-center">{index + 1}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 border font-medium">{record.Nama}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 border text-center">{record.JK}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 border">{record['Usia Saat Ukur']}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 border whitespace-nowrap">{record['Tanggal Pengukuran']}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 border">
                      <span
                        className={`inline-block px-1.5 py-0.5 md:px-2 md:py-1 rounded text-[9px] md:text-xs font-semibold whitespace-nowrap ${
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
                    <td className="px-2 py-1.5 md:px-3 md:py-2 border text-center">{record.Berat}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 border text-center">{record.Tinggi}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 border">{record['Desa/Kel']}</td>
                    <td className="px-2 py-1.5 md:px-3 md:py-2 border">{record['Nama Ortu']}</td>
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