import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { SortDirection } from '../types';
import {
  FilterState,
  parseSearchParams,
  updateSearchParams,
  getCurrentSortKey,
} from '../shared/utils/filters/filterService';
import { sanitizedPath } from '../shared/utils/business-logic';

export const useCandidateFilters = (initialFilters: Partial<FilterState> = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState<FilterState>({
    internalStatus: null,
    source: null,
    externalStatus: 'ACTIVE',
    searchQuery: '',
    page: 0,
    size: 10,
    sortBy: undefined,
    sortDir: undefined,
    ...initialFilters,
  });

  // Initialize filters from URL params
  useEffect(() => {
    const params = parseSearchParams(searchParams);
    setFilters((prev) => ({ ...prev, ...params }));
  }, [searchParams]);

  const updateFilters = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);

    const newSearchParams = updateSearchParams(searchParams, updatedFilters);
    let replace = true;
    if (
      searchParams.get('page') !== String(updatedFilters.page + 1) ||
      searchParams.get('size') !== String(updatedFilters.size)
    ) {
      replace = true;
    }

    navigate(`${sanitizedPath(location.pathname)}?${newSearchParams.toString()}`, { replace });
  };

  const handleSort = (key: string, direction: SortDirection) => {
    updateFilters({
      sortBy: direction ? key : undefined,
      sortDir: direction || undefined,
      page: 0,
    });
  };

  const handlePageChange = (page: number) => {
    updateFilters({ page });
  };

  const handleSearch = (query: string) => {
    updateFilters({ searchQuery: query, page: 0 });
  };

  const currentSortKey = getCurrentSortKey(filters.sortBy, filters.sortDir);

  return {
    filters,
    updateFilters,
    handleSort,
    handlePageChange,
    handleSearch,
    currentSortKey,
  };
};
