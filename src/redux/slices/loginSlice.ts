import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Role } from '../../types';

type LoginState = {
  loginToken?: string;
  authorities: string[];
  rememberMe: boolean;
  canManageCompanySettings: boolean;
  role: {
    name: string;
    type: string;
  };
  userId?: string | undefined | null;
  refreshToken?: string;
  /**
   * The full dynamic Role record (baseline + per-location permission
   * overrides) resolved for the signed-in user, when the backend/dev-bypass
   * provides one. Absent for sessions still running on the legacy
   * ROLE_AUTHORITIES fallback — see useEffectivePermissions.
   */
  resolvedRole?: Role;
  /** The location whose permission set is currently in effect (multi-location
   * users) — a real organization-service location UUID (same id
   * TenantOffice.office_id carries), or null for the all-locations union. */
  activeLocationId?: string | null;
  /**
   * The signed-in user's tenant, decoded from the access token's `tenant_id`
   * claim (authentication-service docs/API_CONTRACT.md's JWT-claims table).
   * `null` for a platform caller (Super Admin / internal staff — their token
   * carries no `tenant_id` at all, by design). Every organization-service
   * tenant-scoped call (`/v1/tenants/{tenant_id}/...`) reads this rather than
   * re-decoding the token locally.
   */
  tenantId?: string | null;
  /** Derived the same way authentication-service itself derives it: `tenant_id`
   * present -> 'tenant', absent -> 'platform'. Decides which admin surface
   * (Company Admin vs Super Admin) a session sees. */
  callerKind?: 'tenant' | 'platform' | null;
};

type LoginPayload = {
  token?: string;
  authorities: string[];
  rememberMe: boolean;
  canManageCompanySettings?: boolean;
  role: {
    name: string;
    type: string;
  };
  userId?: string | undefined | null;
  refreshToken?: string;
  resolvedRole?: Role;
  activeLocationId?: string | null;
  tenantId?: string | null;
  callerKind?: 'tenant' | 'platform' | null;
};

const initialState: LoginState = {
  loginToken: '',
  authorities: [],
  rememberMe: false,
  canManageCompanySettings: false,
  role: {
    name: '',
    type: '',
  },
  userId: undefined,
  refreshToken: '',
  resolvedRole: undefined,
  activeLocationId: null,
  tenantId: null,
  callerKind: null,
};

const loginSlice = createSlice({
  name: 'LoginSlice',
  initialState,
  reducers: {
    loginStore: (state, action: PayloadAction<LoginPayload>) => {
      const defaultLocationId =
        action.payload.activeLocationId ??
        action.payload.resolvedRole?.locationPermissions?.[0]?.locationId ??
        null;

      return {
        ...state,
        loginToken: action.payload.token,
        authorities: action.payload.authorities,
        rememberMe: action.payload.rememberMe,
        canManageCompanySettings: Boolean(action.payload.canManageCompanySettings),
        role: {
          name: action.payload.role.name,
          type: action.payload.role.type,
        },
        userId: action.payload.userId,
        refreshToken: action.payload.refreshToken,
        resolvedRole: action.payload.resolvedRole,
        activeLocationId: defaultLocationId,
        tenantId: action.payload.tenantId ?? null,
        callerKind: action.payload.callerKind ?? null,
      };
    },
    resetState: () => {
      return initialState;
    },
    setAllowedAuthorities: (state, action: PayloadAction<string[]>) => {
      state.authorities = action.payload;
    },
    setActiveLocation: (state, action: PayloadAction<string | null>) => {
      state.activeLocationId = action.payload;
    },
  },
});

export const { loginStore, resetState, setAllowedAuthorities, setActiveLocation } =
  loginSlice.actions;
export default loginSlice.reducer;
