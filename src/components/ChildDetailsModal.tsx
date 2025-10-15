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
      <DialogContent className="max-w-[95vw] md:max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 md:p-6 pb-3">
          <DialogTitle className="text-base md:text-xl">
            Detail Data Anak - Posyandu {posyandu}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Total: {uniqueRecords.length} anak
          </p>
        </DialogHeader>
        <ScrollArea className="h-[calc(90vh-120px)] px-2 md:px-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs md:text-sm">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="p-1 md:p-2 text-left border font-semibold whitespace-nowrap">No</th>
                  <th className="p-1 md:p-2 text-left border font-semibold min-w-[120px]">Nama</th>
                  <th className="p-1 md:p-2 text-left border font-semibold whitespace-nowrap">JK</th>
                  <th className="p-1 md:p-2 text-left border font-semibold whitespace-nowrap">Usia</th>
                  <th className="p-1 md:p-2 text-left border font-semibold whitespace-nowrap">Tgl Ukur</th>
                  <th className="p-1 md:p-2 text-left border font-semibold min-w-[100px]">BB/TB</th>
                  <th className="p-1 md:p-2 text-left border font-semibold whitespace-nowrap">BB (kg)</th>
                  <th className="p-1 md:p-2 text-left border font-semibold whitespace-nowrap">TB (cm)</th>
                  <th className="p-1 md:p-2 text-left border font-semibold min-w-[100px]">Desa/Kel</th>
                  <th className="p-1 md:p-2 text-left border font-semibold min-w-[120px]">Nama Ortu</th>
                </tr>
              </thead>
              <tbody>
                {uniqueRecords.map((record, index) => (
                  <tr key={index} className="hover:bg-muted/50">
                    <td className="p-1 md:p-2 border whitespace-nowrap">{index + 1}</td>
                    <td className="p-1 md:p-2 border font-medium">{record.Nama}</td>
                    <td className="p-1 md:p-2 border whitespace-nowrap">{record.JK}</td>
                    <td className="p-1 md:p-2 border whitespace-nowrap">{record['Usia Saat Ukur']}</td>
                    <td className="p-1 md:p-2 border whitespace-nowrap">{record['Tanggal Pengukuran']}</td>
                    <td className="p-1 md:p-2 border">
                      <span
                        className={`inline-block px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs font-semibold whitespace-nowrap ${
                          record['BB/TB'] === 'Gizi Baik'
                            ? 'bg-secondary/20 text-secondary'
                            : record['BB/TB'] === 'Gizi Kurang'
                            ? 'bg-warning/20 text-warning'
                            : record['BB/TB'] === 'Gizi Buruk'
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-muted'
                        }`}
                      >
                        {record['BB/TB']}
                      </span>
                    </td>
                    <td className="p-1 md:p-2 border whitespace-nowrap">{record.Berat}</td>
                    <td className="p-1 md:p-2 border whitespace-nowrap">{record.Tinggi}</td>
                    <td className="p-1 md:p-2 border">{record['Desa/Kel']}</td>
                    <td className="p-1 md:p-2 border">{record['Nama Ortu']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}