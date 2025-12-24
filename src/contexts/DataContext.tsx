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
    queryFn: () => fetchSheetData(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
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
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}