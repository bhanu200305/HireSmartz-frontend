import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type JobOpeningFiltersState = {
  text: string;
  searchQuery?: string;
  globalSearchRequestDto?: {
    text: string;
    field: string;
  };
  startDateTime: string;
  endDateTime: string;
  page: number;
  size: number;
  status?: boolean;
  sortBy?: string;
  sortDir?: string;
  isDraft: boolean | undefined;
  isClosed: boolean | undefined;
  isAll: boolean | undefined;
  locationIds?: string[];
};

const initialState: JobOpeningFiltersState = {
  text: '',
  searchQuery: '',
  globalSearchRequestDto: undefined,
  startDateTime: '',
  endDateTime: '',
  status: true,
  isDraft: undefined,
  page: 0,
  size: 10,
  sortBy: undefined,
  sortDir: undefined,
  isClosed: undefined,
  isAll: undefined,
};

const jobOpeningFilterSlice = createSlice({
  name: 'jobOpeningFilters',
  initialState,
  reducers: {
    setJobOpeningFilters: (state, action: PayloadAction<Partial<JobOpeningFiltersState>>) => {
      return { ...state, ...action.payload };
    },
    resetJobOpeningFilters: () => initialState,
  },
});

export const { setJobOpeningFilters, resetJobOpeningFilters } = jobOpeningFilterSlice.actions;

export default jobOpeningFilterSlice.reducer;
