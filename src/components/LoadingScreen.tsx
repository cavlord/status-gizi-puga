const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50 overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/[0.02] rounded-full" />
      </div>

      <div className="relative text-center space-y-8 px-6 animate-fade-in">
        {/* Large logo */}
        <div className="flex justify-center">
          <img
            src="/icon/logos.svg"
            alt="Logo GiziX Dihati Kampar"
            className="w-52 h-52 md:w-64 md:h-64 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          />
        </div>

        {/* Loading text */}
        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-semibold text-foreground/80 tracking-wide">
            Loading Dashboard GiziX Dihati Kampar
          </h2>
          {/* Animated dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-primary/60 animate-[bounce_1s_ease-in-out_infinite]" />
            <span className="w-2 h-2 rounded-full bg-primary/60 animate-[bounce_1s_ease-in-out_0.15s_infinite]" />
            <span className="w-2 h-2 rounded-full bg-primary/60 animate-[bounce_1s_ease-in-out_0.3s_infinite]" />
          </div>
        </div>

        {/* Credit */}
        <p className="text-xs md:text-sm text-muted-foreground/60 font-medium pt-4">
          Build & Design By Rossa Gusti Yolanda, S.Gz
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;
