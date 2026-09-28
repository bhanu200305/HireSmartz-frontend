import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { Provider } from 'react-redux';
import { renderHook } from '@testing-library/react';

import loginReducer from '../../src/redux/slices/loginSlice';

function makeApi() {
  return createApi({
    reducerPath: 'api',
    baseQuery: fakeBaseQuery(),
    tagTypes: ['UserPermissions'],
    endpoints: (b) => ({
      getUserDashboard: b.query<{ permissions: string[] }, { userId: string; locationId?: string }>({
        queryFn: async () => ({ data: { permissions: ['job:read'] } }),
      }),
    }),
  });
}

const testApi = vi.hoisted(() => ({ current: null as unknown as ReturnType<typeof makeApi> }));

vi.mock('../../src/api/organization-service/Roles/dashboard', () => ({
  useGetUserDashboardQuery: (...args: unknown[]) =>
    (testApi.current.useGetUserDashboardQuery as (...a: unknown[]) => unknown)(...args),
}));

import { useEffectivePermissionsRefetch } from '../../src/hooks/useEffectivePermissions';

function setup(loginState: Record<string, unknown>) {
  testApi.current = makeApi();
  const api = testApi.current;
  const rootReducer = combineReducers({ api: api.reducer, LoginSlice: loginReducer });
  const store = configureStore({
    reducer: rootReducer,
    middleware: (g) => g().concat(api.middleware),
    preloadedState: {
      LoginSlice: {
        authorities: [],
        rememberMe: false,
        canManageCompanySettings: false,
        role: { name: 'hiringmanager', type: 'hiringmanager' },
        ...loginState,
      },
    } as Partial<ReturnType<typeof rootReducer>>,
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return { wrapper };
}

describe('useEffectivePermissionsRefetch', () => {
  it('does not throw when called for a non-live-tenant session (dev-bypass/legacy)', () => {
    // Query is skipped here - refetch() throws synchronously if unguarded.
    const { wrapper } = setup({ userId: undefined, callerKind: null });
    const { result } = renderHook(() => useEffectivePermissionsRefetch(), { wrapper });

    expect(() => result.current()).not.toThrow();
  });

  it('does not throw for an unscoped role (company_admin) either', () => {
    const { wrapper } = setup({
      userId: 'user-1',
      callerKind: 'tenant',
      role: { name: 'companyadmin', type: 'companyadmin' },
    });
    const { result } = renderHook(() => useEffectivePermissionsRefetch(), { wrapper });

    expect(() => result.current()).not.toThrow();
  });

  it('does not throw for a live tenant session (the query has actually started)', () => {
    const { wrapper } = setup({ userId: 'user-1', callerKind: 'tenant' });
    const { result } = renderHook(() => useEffectivePermissionsRefetch(), { wrapper });

    expect(() => result.current()).not.toThrow();
  });
});
