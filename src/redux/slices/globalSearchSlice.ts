import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface GlobalSearchState {
  query: string;
  lastSearchedQuery: string;
  selectedCategoryValue: string | null;
  selectedCategoryField: string;
}

const initialState: GlobalSearchState = {
  query: '',
  lastSearchedQuery: '',
  selectedCategoryValue: null,
  selectedCategoryField: '',
};

const globalSearchSlice = createSlice({
  name: 'globalSearch',
  initialState,
  reducers: {
    setGlobalSearchQuery: (state, action: PayloadAction<string>) => {
      state.query = action.payload;
    },
    setLastSearchedQuery: (state, action: PayloadAction<string>) => {
      state.lastSearchedQuery = action.payload;
    },
    setGlobalSearchCategorySelection: (
      state,
      action: PayloadAction<{ value: string | null; field: string }>
    ) => {
      state.selectedCategoryValue = action.payload.value;
      state.selectedCategoryField = action.payload.field;
    },
    clearGlobalSearchCategorySelection: (state) => {
      state.selectedCategoryValue = null;
      state.selectedCategoryField = '';
    },
    clearGlobalSearch: (state) => {
      state.query = '';
      state.selectedCategoryValue = null;
      state.selectedCategoryField = '';
    },
  },
});

export const {
  setGlobalSearchQuery,
  setLastSearchedQuery,
  setGlobalSearchCategorySelection,
  clearGlobalSearchCategorySelection,
  clearGlobalSearch,
} = globalSearchSlice.actions;
export default globalSearchSlice.reducer;
