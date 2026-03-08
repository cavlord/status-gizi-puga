const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="text-center space-y-6 px-4 animate-fade-in">
        {/* Logo with smooth spin animation */}
        <div className="relative flex items-center justify-center">
          <div className="w-32 h-32 mx-auto relative">
            {/* Subtle glow ring */}
            <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
            {/* Spinning logo */}
            <img
              src="/icon/logo.webp"
              alt="Logo"
              className="relative w-32 h-32 object-contain animate-[spin_3s_cubic-bezier(0.4,0,0.6,1)_infinite] drop-shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
            />
          </div>
        </div>

        {/* Loading text */}
        <div className="space-y-3">
          <p className="text-foreground/70 text-sm font-medium tracking-wide animate-pulse">
            Memuat data...
          </p>
          {/* Minimal loading bar */}
          <div className="w-48 h-1 mx-auto bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary/60 rounded-full animate-[loading_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
