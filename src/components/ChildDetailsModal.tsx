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
      <DialogContent className="max-w-6xl max-h-[80vh] bg-popover">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Detail Data Anak - Posyandu {posyandu}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Total: {uniqueRecords.length} anak
          </p>
        </DialogHeader>
        <ScrollArea className="h-[600px] pr-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-muted sticky top-0 z-10">
                <tr>
                  <th className="p-2 text-left border font-semibold">No</th>
                  <th className="p-2 text-left border font-semibold">Nama</th>
                  <th className="p-2 text-left border font-semibold">JK</th>
                  <th className="p-2 text-left border font-semibold">Usia</th>
                  <th className="p-2 text-left border font-semibold">Tgl Pengukuran</th>
                  <th className="p-2 text-left border font-semibold">BB/TB</th>
                  <th className="p-2 text-left border font-semibold">Berat (kg)</th>
                  <th className="p-2 text-left border font-semibold">Tinggi (cm)</th>
                  <th className="p-2 text-left border font-semibold">Desa/Kel</th>
                  <th className="p-2 text-left border font-semibold">Nama Ortu</th>
                </tr>
              </thead>
              <tbody>
                {uniqueRecords.map((record, index) => (
                  <tr key={index} className="hover:bg-muted/50">
                    <td className="p-2 border">{index + 1}</td>
                    <td className="p-2 border font-medium">{record.Nama}</td>
                    <td className="p-2 border">{record.JK}</td>
                    <td className="p-2 border">{record['Usia Saat Ukur']}</td>
                    <td className="p-2 border">{record['Tanggal Pengukuran']}</td>
                    <td className="p-2 border">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
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
                    <td className="p-2 border">{record.Berat}</td>
                    <td className="p-2 border">{record.Tinggi}</td>
                    <td className="p-2 border">{record['Desa/Kel']}</td>
                    <td className="p-2 border">{record['Nama Ortu']}</td>
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