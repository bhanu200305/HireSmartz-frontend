import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ActivityFiltersState = {
  text: string;
  searchQuery?: string;
  globalSearchRequestDto?: {
    text: string;
    field: string;
  };
  fromDate: string;
  toDate: string;
  entityType?: string;
  page: number;
  size: number;
};

const initialState: ActivityFiltersState = {
  text: '',
  searchQuery: '',
  globalSearchRequestDto: undefined,
  fromDate: '',
  toDate: '',
  entityType: 'JOB',
  page: 0,
  size: 10,
};

const activitySearchFilterSlice = createSlice({
  name: 'activitySearchFilter',
  initialState,
  reducers: {
    setActivitySearchFilters: (state, action: PayloadAction<Partial<ActivityFiltersState>>) => {
      return { ...state, ...action.payload };
    },
    resetActivitySearchFilters: () => initialState,
  },
});

export const { setActivitySearchFilters, resetActivitySearchFilters } =
  activitySearchFilterSlice.actions;
export default activitySearchFilterSlice.reducer;
