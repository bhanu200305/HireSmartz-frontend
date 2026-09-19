import { describe, it, expect } from 'vitest';
import type { Role } from '../../src/types';
import reducer, {
  loginStore,
  resetState,
  setAllowedAuthorities,
  setActiveLocation,
  setSessionTenant,
} from '../../src/redux/slices/loginSlice';

const initialState = reducer(undefined, { type: '@@INIT' });

const basePayload = {
  token: 'access-token',
  authorities: ['VIEW_JOBS'],
  rememberMe: true,
  role: { name: 'Recruiter', type: 'tenant' },
  userId: 'user-1',
  refreshToken: 'refresh-token',
};

const makeRole = (locationIds: string[]): Role => ({
  id: 'role-1',
  roleName: 'Recruiter',
  scope: 'tenant',
  isSystemRole: false,
  permissions: [],
  locationPermissions: locationIds.map((locationId) => ({
    locationId,
    permissions: [],
  })),
});

describe('loginSlice reducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(initialState.loginToken).toBe('');
    expect(initialState.authorities).toEqual([]);
    expect(initialState.activeLocationId).toBeNull();
  });

  describe('loginStore', () => {
    it('stores the login payload', () => {
      const state = reducer(initialState, loginStore(basePayload));

      expect(state.loginToken).toBe('access-token');
      expect(state.authorities).toEqual(['VIEW_JOBS']);
      expect(state.rememberMe).toBe(true);
      expect(state.role).toEqual({ name: 'Recruiter', type: 'tenant' });
      expect(state.userId).toBe('user-1');
    });

    it('defaults canManageCompanySettings to false when omitted', () => {
      const state = reducer(initialState, loginStore(basePayload));
      expect(state.canManageCompanySettings).toBe(false);
    });

    it('uses an explicit activeLocationId over the resolved role', () => {
      const state = reducer(
        initialState,
        loginStore({
          ...basePayload,
          activeLocationId: 'explicit-location',
          resolvedRole: makeRole(['role-location-1']),
        })
      );

      expect(state.activeLocationId).toBe('explicit-location');
    });

    it('falls back to the first location on the resolved role when none is given', () => {
      const state = reducer(
        initialState,
        loginStore({
          ...basePayload,
          resolvedRole: makeRole(['role-location-1', 'role-location-2']),
        })
      );

      expect(state.activeLocationId).toBe('role-location-1');
    });

    it('falls back to null when neither an explicit location nor a resolved role is given', () => {
      const state = reducer(initialState, loginStore(basePayload));
      expect(state.activeLocationId).toBeNull();
    });

    it('defaults tenantId and callerKind to null when omitted', () => {
      const state = reducer(initialState, loginStore(basePayload));
      expect(state.tenantId).toBeNull();
      expect(state.callerKind).toBeNull();
    });

    it('carries through an explicit tenantId and callerKind', () => {
      const state = reducer(
        initialState,
        loginStore({ ...basePayload, tenantId: 'tenant-1', callerKind: 'tenant' })
      );

      expect(state.tenantId).toBe('tenant-1');
      expect(state.callerKind).toBe('tenant');
    });
  });

  it('resetState restores the initial state', () => {
    const loggedIn = reducer(initialState, loginStore(basePayload));
    expect(reducer(loggedIn, resetState())).toEqual(initialState);
  });

  it('setAllowedAuthorities replaces the authorities list', () => {
    const state = reducer(initialState, setAllowedAuthorities(['VIEW_JOBS', 'EDIT_JOBS']));
    expect(state.authorities).toEqual(['VIEW_JOBS', 'EDIT_JOBS']);
  });

  it('setActiveLocation updates the active location, including clearing it to null', () => {
    const withLocation = reducer(initialState, setActiveLocation('loc-1'));
    expect(withLocation.activeLocationId).toBe('loc-1');

    const cleared = reducer(withLocation, setActiveLocation(null));
    expect(cleared.activeLocationId).toBeNull();
  });

  it('setSessionTenant sets the tenant id and marks the caller as tenant-scoped', () => {
    const state = reducer(initialState, setSessionTenant('tenant-42'));
    expect(state.tenantId).toBe('tenant-42');
    expect(state.callerKind).toBe('tenant');
  });
});
