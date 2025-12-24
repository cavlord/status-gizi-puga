import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, RefreshCw, Info, Upload, Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { importFromGoogleSheets } from "@/lib/googleSheets";
import { useData } from "@/contexts/DataContext";

const Settings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { refetch } = useData();
  const [isImporting, setIsImporting] = useState(false);

  const handleRefreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['sheetData'] });
    refetch();
    toast({
      title: "Data Diperbarui",
      description: "Data berhasil dimuat ulang dari database",
    });
  };

  const handleImportFromSheets = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "Anda harus login untuk melakukan import",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const result = await importFromGoogleSheets(user.email);
      
      if (result.success) {
        toast({
          title: "Import Berhasil",
          description: result.message,
        });
        // Refresh data after import
        queryClient.invalidateQueries({ queryKey: ['sheetData'] });
        refetch();
      } else {
        toast({
          title: "Import Gagal",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat import data",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Section */}
      <div>
        <h2 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-primary" />
          Pengaturan
        </h2>
        <p className="text-muted-foreground mt-1">
          Konfigurasi dan pengaturan aplikasi dashboard
        </p>
      </div>

      {/* Data Management */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-heading flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Manajemen Data
          </CardTitle>
          <CardDescription>
            Kelola data dari database Lovable Cloud
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <h3 className="font-medium">Perbarui Data</h3>
              <p className="text-sm text-muted-foreground">
                Muat ulang data terbaru dari database
              </p>
            </div>
            <Button onClick={handleRefreshData} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border border-primary/20">
              <div>
                <h3 className="font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  Import dari Google Sheets
                </h3>
                <p className="text-sm text-muted-foreground">
                  Import data terbaru dari Google Sheets ke database (Admin only)
                </p>
              </div>
              <Button 
                onClick={handleImportFromSheets} 
                className="gap-2"
                disabled={isImporting}
                variant="default"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import Data
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Info */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-heading flex items-center gap-2">
            <Info className="h-5 w-5 text-accent" />
            Informasi Aplikasi
          </CardTitle>
          <CardDescription>
            Detail tentang dashboard dan sumber data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-2">Nama Aplikasi</h3>
              <p className="text-sm text-muted-foreground">
                Dashboard Status Gizi Balita
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-2">Instansi</h3>
              <p className="text-sm text-muted-foreground">
                UPT Puskesmas Pulau Gadang XIII Koto Kampar
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-2">Sumber Data</h3>
              <p className="text-sm text-muted-foreground">
                Database Lovable Cloud
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <h3 className="font-medium mb-2">Dikembangkan Oleh</h3>
              <p className="text-sm text-muted-foreground">
                Rossa Gusti Yolanda, S.Gz
              </p>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border border-primary/20">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Catatan Penting
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Data balita yang ditampilkan hanya untuk usia di bawah 5 tahun</li>
              <li>Data disimpan di database Lovable Cloud yang aman</li>
              <li>Gunakan filter tahun, desa, dan bulan untuk analisis spesifik</li>
              <li>Klik pada kartu status gizi untuk melihat detail anak per kategori</li>
              {isAdmin && <li>Admin dapat mengimport data terbaru dari Google Sheets</li>}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
