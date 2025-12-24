import { createContext, useContext, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSheetData, ChildRecord } from "@/lib/googleSheets";

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
  
  // Get user email from localStorage to determine if user is authenticated
  const getUserEmail = (): string | undefined => {
    try {
      const authData = localStorage.getItem('posyandu_auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.email;
      }
    } catch {
      // Ignore parsing errors
    }
    return undefined;
  };

  const userEmail = getUserEmail();

  const { data: allRecords, isLoading, error, refetch } = useQuery<ChildRecord[]>({
    queryKey: ['sheetData'],
    queryFn: async () => {
      console.log('Fetching data from database...');
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!userEmail, // Only fetch when user is authenticated
  });

  const handleRefetch = () => {
    queryClient.invalidateQueries({ queryKey: ['sheetData'] });
    refetch();
  };

  return (
    <DataContext.Provider value={{ allRecords, isLoading: !!userEmail && isLoading, error: error as Error | null, refetch: handleRefetch }}>
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