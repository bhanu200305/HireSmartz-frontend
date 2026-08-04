import { useState, useCallback } from 'react';

interface UseMasterTableOptions<T> {
  initialPageSize?: number;
  onDataFetch?: (page: number, pageSize: number, filters: Record<string, string>) => Promise<T[]>;
}

interface UseMasterTableState {
  current: number;
  pageSize: number;
  total: number;
  searchTerm: string;
  filters: Record<string, string>;
}

export const useMasterTable = <T>({
  initialPageSize = 10,
  onDataFetch,
}: UseMasterTableOptions<T>) => {
  const [state, setState] = useState<UseMasterTableState>({
    current: 1,
    pageSize: initialPageSize,
    total: 0,
    searchTerm: '',
    filters: {},
  });

  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const handlePageChange = useCallback((page: number): void => {
    setState((prev) => ({ ...prev, current: page }));
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number): void => {
    setState((prev) => ({ ...prev, pageSize, current: 1 }));
  }, []);

  const handleSearch = useCallback((searchTerm: string): void => {
    setState((prev) => ({ ...prev, searchTerm, current: 1 }));
  }, []);

  const handleFilterChange = useCallback((filterKey: string, value: string): void => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, [filterKey]: value },
      current: 1,
    }));
  }, []);

  const fetchData = useCallback(async (): Promise<void> => {
    if (!onDataFetch) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await onDataFetch(state.current, state.pageSize, state.filters);
      setData(result);
      setState((prev) => ({ ...prev, total: result.length }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  }, [state.current, state.pageSize, state.filters, onDataFetch]);

  return {
    state,
    data,
    isLoading,
    error,
    handlePageChange,
    handlePageSizeChange,
    handleSearch,
    handleFilterChange,
    fetchData,
  };
};
