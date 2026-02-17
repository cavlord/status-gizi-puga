const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[hsl(222,47%,31%)] via-[hsl(217,91%,35%)] to-[hsl(222,47%,31%)] flex items-center justify-center z-50">
      <div className="text-center space-y-8 px-4 animate-fade-in">
        {/* Logo/Icon Animation */}
        <div className="relative">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
            <div className="absolute inset-0 bg-white/30 rounded-full animate-pulse"></div>
            <div className="relative bg-white rounded-full w-24 h-24 flex items-center justify-center shadow-2xl">
              <svg className="w-12 h-12 text-[hsl(222,47%,31%)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Main Text */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] tracking-wide">
            UPT PUSKESMAS PULAU GADANG
          </h1>
          <h2 className="text-xl md:text-2xl font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
            XIII KOTO KAMPARS
          </h2>
        </div>

        {/* Loading Spinner */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-white/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-white text-base font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Memuat data...</p>
        </div>

        {/* Footer Credit */}
        <div className="pt-8">
          <p className="text-white text-sm md:text-base font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            Build & Design by Rossa Gusti Yolanda, S.Gz
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
