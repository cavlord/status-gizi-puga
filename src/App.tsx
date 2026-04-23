import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DataProvider, useData } from "./contexts/DataContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppLayout } from "./components/AppLayout";
import LoadingScreen from "./components/LoadingScreen";

// Lazy-loaded routes for code splitting (reduces initial JS bundle)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const DataRecords = lazy(() => import("./pages/DataRecords"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AuthPage = lazy(() => import("./pages/Auth"));
const UserManagement = lazy(() => import("./pages/UserManagement"));

// Create QueryClient instance that persists across renders
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Data is considered stale immediately
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
      refetchOnMount: true, // Always refetch when component mounts
      refetchOnWindowFocus: false,
    },
  },
});

// Export queryClient for use in AuthContext
export { queryClient };

// Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Auth Route wrapper (redirect to dashboard if already logged in)
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  const { isLoading: dataLoading } = useData();
  const { isAuthenticated } = useAuth();
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowLoading(false);
      return;
    }

    // Maximum loading timeout of 15 seconds to prevent infinite loading on mobile
    const maxTimeout = setTimeout(() => {
      setShowLoading(false);
    }, 15000);

    if (!dataLoading) {
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 2500);
      return () => {
        clearTimeout(timer);
        clearTimeout(maxTimeout);
      };
    }

    return () => clearTimeout(maxTimeout);
  }, [dataLoading, isAuthenticated]);

  // Show loading screen only for authenticated users while data loads
  if (isAuthenticated && (dataLoading || showLoading)) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route
          path="/auth"
          element={
            <AuthRoute>
              <AuthPage />
            </AuthRoute>
          }
        />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/data"
          element={
            <ProtectedRoute>
              <AppLayout>
                <DataRecords />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Analytics />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Settings />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <AppLayout>
                <UserManagement />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Toaster />
            <Sonner />
            <AppContent />
          </BrowserRouter>
        </TooltipProvider>
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
