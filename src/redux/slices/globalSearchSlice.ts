import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface GlobalSearchState {
  query: string;
  lastSearchedQuery: string;
  selectedCategoryValue: string | null;
  selectedCategoryField: string;
  /**
   * Bumped (not toggled) by the global Ctrl/Cmd+K shortcut so Header.tsx can
   * focus/open the search box from anywhere. A counter rather than a
   * boolean: a plain toggle would silently no-op the second time Ctrl+K is
   * pressed while the panel is already open (same value in, no state
   * change, no re-render).
   */
  focusRequestId: number;
}

const initialState: GlobalSearchState = {
  query: '',
  lastSearchedQuery: '',
  selectedCategoryValue: null,
  selectedCategoryField: '',
  focusRequestId: 0,
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
    requestGlobalSearchFocus: (state) => {
      state.focusRequestId += 1;
    },
  },
});

export const {
  setGlobalSearchQuery,
  setLastSearchedQuery,
  setGlobalSearchCategorySelection,
  clearGlobalSearchCategorySelection,
  clearGlobalSearch,
  requestGlobalSearchFocus,
} = globalSearchSlice.actions;
export default globalSearchSlice.reducer;
