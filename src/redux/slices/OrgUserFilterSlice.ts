import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type OrgUserFiltersState = {
  searchQuery: string;
  globalSearchRequestDto?: {
    text: string;
    field: string;
  };
  roleTypeMappingId: number | null;
  status: boolean | undefined;
  isArchived: boolean | undefined;
  isAll?: boolean | undefined;
  page: number;
  size: number;
  startDateTime: string;
  endDateTime: string;
  sortBy?: string;
  sortDir?: string;
};

const initialState: OrgUserFiltersState = {
  searchQuery: '',
  globalSearchRequestDto: undefined,
  roleTypeMappingId: null,
  status: true,
  isArchived: undefined,
  isAll: undefined,
  page: 0,
  size: 10,
  startDateTime: '',
  endDateTime: '',
  sortBy: undefined,
  sortDir: undefined,
};

const orgUserFilterSlice = createSlice({
  name: 'orgUserFilter',
  initialState,
  reducers: {
    setOrgUserFilters: (state, action: PayloadAction<Partial<OrgUserFiltersState>>) => {
      return { ...state, ...action.payload };
    },
    resetOrgUserFilters: () => initialState,
  },
});

export const { setOrgUserFilters, resetOrgUserFilters } = orgUserFilterSlice.actions;
export default orgUserFilterSlice.reducer;
