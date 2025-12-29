import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Mail, Send, Copy, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ManualOTP() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleGenerateAndSaveOTP = async () => {
    if (!email) {
      toast.error("Masukkan email terlebih dahulu");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Format email tidak valid");
      return;
    }

    setIsLoading(true);
    try {
      // Check if user exists
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('id, email, verified')
        .eq('email', email)
        .maybeSingle();

      if (fetchError) {
        throw new Error("Gagal memeriksa email");
      }

      if (!user) {
        toast.error("Email tidak ditemukan. User harus mendaftar terlebih dahulu.");
        return;
      }

      if (user.verified) {
        toast.info("Email sudah terverifikasi");
        return;
      }

      // Generate OTP
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Update user with new OTP
      const { error: updateError } = await supabase
        .from('users')
        .update({
          otp,
          otp_expiry: otpExpiry,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        throw new Error("Gagal menyimpan OTP");
      }

      setGeneratedOTP(otp);
      toast.success("OTP berhasil dibuat! Kirim kode ini ke user secara manual.");

    } catch (error: any) {
      console.error("Error generating OTP:", error);
      toast.error(error.message || "Gagal membuat OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyOTP = () => {
    if (generatedOTP) {
      navigator.clipboard.writeText(generatedOTP);
      setCopied(true);
      toast.success("OTP berhasil disalin!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setEmail("");
    setGeneratedOTP(null);
    setCopied(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-card/95 backdrop-blur">
        <CardHeader className="text-center space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-4"
            onClick={() => navigate("/auth")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Manual OTP Generator</CardTitle>
          <CardDescription>
            Buat OTP verifikasi secara manual untuk user yang tidak menerima email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!generatedOTP ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email User</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contoh@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleGenerateAndSaveOTP}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Generate OTP
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-2">Kode OTP untuk:</p>
                <p className="font-medium text-foreground mb-4">{email}</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-bold tracking-[0.5em] text-primary">
                    {generatedOTP}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyOTP}
                    className="ml-2"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Kode berlaku selama 10 menit
                </p>
              </div>
              
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  <strong>Instruksi:</strong> Kirim kode ini ke user melalui WhatsApp, SMS, atau media lain.
                </p>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleReset}
              >
                Generate OTP Lain
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
