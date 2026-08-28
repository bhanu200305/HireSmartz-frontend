import { jobApi } from '../jobApi';

/**
 * Legacy file kept so imports resolve. Dropdown data now comes from
 * catalogs.ts / useJobOpeningDropdown — this inject is unused.
 */
const extendedApi = jobApi.injectEndpoints({
  endpoints: () => ({}),
});

export const useGetJobOpeningDropdownQuery = () => ({
  data: [],
  isLoading: false,
  error: undefined,
  refetch: () => undefined,
});

export default extendedApi;
