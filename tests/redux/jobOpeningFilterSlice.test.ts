import { describe, expect, it } from 'vitest';
import reducer, {
  setJobOpeningFilters,
  resetJobOpeningFilters,
} from '../../src/redux/slices/jobOpeningFilterSlice';

const initialState = reducer(undefined, { type: '@@INIT' });

describe('jobOpeningFilterSlice reducer', () => {
  it('has draft/closed/all/status unset and pagination at page 0 by default', () => {
    expect(initialState.isDraft).toBeUndefined();
    expect(initialState.isClosed).toBeUndefined();
    expect(initialState.isAll).toBeUndefined();
    expect(initialState.status).toBe(true);
    expect(initialState.page).toBe(0);
    expect(initialState.size).toBe(10);
  });

  it('setJobOpeningFilters merges a partial update, leaving other fields untouched', () => {
    const withText = reducer(initialState, setJobOpeningFilters({ text: 'engineer' }));
    const state = reducer(withText, setJobOpeningFilters({ page: 2 }));

    expect(state.text).toBe('engineer');
    expect(state.page).toBe(2);
    expect(state.size).toBe(10);
  });

  it('setJobOpeningFilters can overwrite an existing field', () => {
    const state = reducer(initialState, setJobOpeningFilters({ isDraft: true }));
    expect(reducer(state, setJobOpeningFilters({ isDraft: false })).isDraft).toBe(false);
  });

  it('resetJobOpeningFilters restores the initial state', () => {
    const changed = reducer(
      initialState,
      setJobOpeningFilters({ text: 'engineer', page: 5, isAll: true })
    );
    expect(reducer(changed, resetJobOpeningFilters())).toEqual(initialState);
  });
});
