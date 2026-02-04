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
    queryFn: async () => {
      console.log('Fetching data from database for user:', user?.email);
      const data = await fetchSheetData();
      console.log('Fetched records count:', data?.length);
      if (data && data.length > 0) {
        // Log unique years found
        const years = new Set<string>();
        data.forEach(r => {
          if (r['Tanggal Pengukuran']) {
            const parts = r['Tanggal Pengukuran'].split('/');
            if (parts.length === 3 && parts[2].length === 4) {
              years.add(parts[2]);
            }
          }
        });
        console.log('Unique years in data:', Array.from(years).sort());
      }
      return data;
    },
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