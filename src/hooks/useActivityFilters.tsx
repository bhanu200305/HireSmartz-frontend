import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ActivityFilterState,
  parseActivitySearchParams,
  updateActivitySearchParams,
} from '../shared/utils/filters/activityFilterService';
import { sanitizedPath } from '../shared/utils/business-logic';

export const useActivityFilters = (initial: Partial<ActivityFilterState> = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [filters, setFilters] = useState<ActivityFilterState>(() => {
    const parsed = parseActivitySearchParams(searchParams);
    return {
      text: '',
      entityType: null,
      fromDate: '',
      toDate: '',
      page: 0,
      size: 10,
      ...initial,
      ...parsed,
    };
  });

  // useEffect(() => {
  //   const parsed = parseActivitySearchParams(searchParams)
  //   setFilters(prev => ({ ...prev, ...parsed }))
  // }, [searchParams])

  const updateFilters = (patch: Partial<ActivityFilterState>) => {
    const updated = { ...filters, ...patch };
    setFilters(updated);

    const newParams = updateActivitySearchParams(searchParams, updated);
    navigate(sanitizedPath(`${location.pathname}?${newParams.toString()}`), { replace: true });
  };

  return {
    filters,
    updateFilters,
  };
};
