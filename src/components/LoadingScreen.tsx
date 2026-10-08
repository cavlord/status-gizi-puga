import { Loader2 } from "lucide-react";

const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center space-y-5 px-6">
        {/* Logo */}
        <div className="flex justify-center">
          <img
            src="/icon/logos.svg"
            alt="GiziX"
            className="w-16 h-16 object-contain"
          />
        </div>

        {/* Brand name */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">Dashboard GiziX</h2>
          <p className="text-sm text-muted-foreground mt-1">Memuat data status gizi balita…</p>
        </div>

        {/* Progress bar */}
        <div className="w-48 mx-auto">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]"
              style={{
                backgroundImage: "linear-gradient(90deg, transparent 0%, hsl(var(--primary)) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.5s linear infinite",
              }}
            />
          </div>
        </div>

        {/* Spinner */}
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs">Mohon tunggu sebentar</span>
        </div>

        <p className="text-[10px] text-muted-foreground/60 pt-2">
          Build &amp; Design by Rossa Gusti Yolanda, S.Gz
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
