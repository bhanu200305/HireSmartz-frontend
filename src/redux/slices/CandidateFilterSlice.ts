import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type CandidateFiltersState = {
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
  statusId?: number | null;
  source: string | null;
};

const initialState: CandidateFiltersState = {
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
  source: '',
};

const candidateFilterSlice = createSlice({
  name: 'candidateFilter',
  initialState,
  reducers: {
    setCandidateFilters: (state, action: PayloadAction<Partial<CandidateFiltersState>>) => {
      return { ...state, ...action.payload };
    },
    resetCandidateFilters: () => initialState,
  },
});

export const { setCandidateFilters, resetCandidateFilters } = candidateFilterSlice.actions;
export default candidateFilterSlice.reducer;
