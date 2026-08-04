import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type UserFiltersState = {
  searchQuery: string;
  globalSearchRequestDto?: {
    text: string;
    field: string;
  };
  status: boolean | undefined;
  isArchived: boolean | undefined;
  isAll: boolean | undefined;
  startDateTime: string;
  endDateTime: string;
  page: number;
  size: number;
  sortBy?: string | undefined;
  sortDir?: string | undefined;
};

const initialState: UserFiltersState = {
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

const userFiltersSlice = createSlice({
  name: 'userFilters',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<UserFiltersState>>) => {
      return { ...state, ...action.payload };
    },
    resetFilters: () => initialState,
  },
});

export const { setFilters, resetFilters } = userFiltersSlice.actions;
export default userFiltersSlice.reducer;
