import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type CFPDashboardFiltersState = {
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

const initialState: CFPDashboardFiltersState = {
  searchQuery: '',
  globalSearchRequestDto: undefined,
  status: true,
  isArchived: undefined,
  startDateTime: '',
  endDateTime: '',
  page: 0,
  size: 5,
  sortBy: undefined,
  sortDir: undefined,
};

const cfpDashboardFiltersSlice = createSlice({
  name: 'cfpDashboardFilters',
  initialState,
  reducers: {
    setcfpDashboardFilters: (state, action: PayloadAction<Partial<CFPDashboardFiltersState>>) => {
      return { ...state, ...action.payload };
    },
    resetcfpDashboardFilters: () => initialState,
  },
});

export const { setcfpDashboardFilters, resetcfpDashboardFilters } =
  cfpDashboardFiltersSlice.actions;
export default cfpDashboardFiltersSlice.reducer;
