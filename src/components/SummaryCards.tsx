import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

interface SummaryCardsProps {
  data: { village: string; count: number }[];
  totalCount: number;
}

export function SummaryCards({ data, totalCount }: SummaryCardsProps) {
  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary to-accent border-0 text-primary-foreground shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            Total Data Aktif
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{totalCount}</div>
          <p className="text-sm opacity-90 mt-1">Balita Terdaftar</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Data Per Desa/Kelurahan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.map((item) => (
              <div
                key={item.village}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <span className="font-medium text-foreground">{item.village}</span>
                <span className="text-2xl font-bold text-primary">{item.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}