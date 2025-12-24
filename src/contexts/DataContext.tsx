import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSheetData, ChildRecord } from "@/lib/googleSheets";

export { type ChildRecord };

interface DataContextType {
  allRecords: ChildRecord[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const { data: allRecords, isLoading, error } = useQuery<ChildRecord[]>({
    queryKey: ['sheetData'],
    queryFn: () => fetchSheetData(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });

  return (
    <DataContext.Provider value={{ allRecords, isLoading, error: error as Error | null }}>
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
