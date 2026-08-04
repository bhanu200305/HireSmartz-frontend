import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type OwnerDashboardFiltersState = {
  searchQuery: string;
  globalSearchRequestDto?: {
    text: string;
    field: string;
  };
  status: boolean | undefined;
  isArchived: boolean | undefined;
  startDateTime: string;
  endDateTime: string;
  page: number;
  size: number;
  sortBy?: string;
  sortDir?: string;
};

const initialState: OwnerDashboardFiltersState = {
  searchQuery: '',
  globalSearchRequestDto: undefined,
  status: undefined,
  isArchived: undefined,
  startDateTime: '',
  endDateTime: '',
  page: 0,
  size: 10,
  sortBy: undefined,
  sortDir: undefined,
};

const ownerDashboardFiltersSlice = createSlice({
  name: 'ownerDashboardFilters',
  initialState,
  reducers: {
    setownerDashboardFilters: (
      state,
      action: PayloadAction<Partial<OwnerDashboardFiltersState>>
    ) => {
      return { ...state, ...action.payload };
    },
    resetownerDashboardFilters: () => initialState,
  },
});

export const { setownerDashboardFilters, resetownerDashboardFilters } =
  ownerDashboardFiltersSlice.actions;
export default ownerDashboardFiltersSlice.reducer;
