import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type RoleFiltersState = {
  searchQuery: string;
  page: number;
  size: number;
};

const initialState: RoleFiltersState = {
  searchQuery: '',
  page: 0,
  size: 10,
};

const roleFilterSlice = createSlice({
  name: 'roleFilter',
  initialState,
  reducers: {
    setRoleFilters: (state, action: PayloadAction<Partial<RoleFiltersState>>) => {
      return { ...state, ...action.payload };
    },
    resetRoleFilters: () => initialState,
  },
});

export const { setRoleFilters, resetRoleFilters } = roleFilterSlice.actions;
export default roleFilterSlice.reducer;
