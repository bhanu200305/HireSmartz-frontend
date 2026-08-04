import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type CompanyFiltersState = {
  searchQuery: string;
  globalSearchRequestDto?: {
    text: string;
    field: string;
  };
  status: boolean | undefined;
  isArchived: boolean | undefined;
  isAll?: boolean | undefined;
  startDateTime: string;
  endDateTime: string;
  page: number;
  size: number;
  sortBy?: string;
  sortDir?: string;
};

const initialState: CompanyFiltersState = {
  searchQuery: '',
  globalSearchRequestDto: undefined,
  status: true,
  isArchived: undefined,
  isAll: undefined,
  startDateTime: '',
  endDateTime: '',
  page: 0,
  size: 10,
  sortBy: undefined,
  sortDir: undefined,
};

const companyFilterSlice = createSlice({
  name: 'companyFilter',
  initialState,
  reducers: {
    setCompanyFilters: (state, action: PayloadAction<Partial<CompanyFiltersState>>) => {
      return { ...state, ...action.payload };
    },
    resetCompanyFilters: () => initialState,
  },
});

export const { setCompanyFilters, resetCompanyFilters } = companyFilterSlice.actions;
export default companyFilterSlice.reducer;
