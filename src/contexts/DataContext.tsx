import { createContext, useContext, ReactNode, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSheetData, ChildRecord } from "@/lib/googleSheets";
import { useAuth } from "@/contexts/AuthContext";

export { type ChildRecord };

interface DataContextType {
  allRecords: ChildRecord[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  const { data: allRecords, isLoading, error, refetch } = useQuery<ChildRecord[]>({
    queryKey: ['sheetData', user?.email],
    queryFn: fetchSheetData,
    staleTime: 0, // Always consider data stale to ensure fresh fetch
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: isAuthenticated && !!user?.email,
    refetchOnMount: true, // Always refetch when component mounts
  });

  // Invalidate cache when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      queryClient.removeQueries({ queryKey: ['sheetData'] });
    }
  }, [isAuthenticated, queryClient]);

  const handleRefetch = () => {
    queryClient.invalidateQueries({ queryKey: ['sheetData'] });
    refetch();
  };

  return (
    <DataContext.Provider value={{ allRecords, isLoading: isAuthenticated && isLoading, error: error as Error | null, refetch: handleRefetch }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    // Return a safe default during HMR or when context is not available
    return {
      allRecords: undefined,
      isLoading: false,
      error: null,
      refetch: () => {},
    };
  }
  return context;
}