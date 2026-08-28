import { jwtDecode } from 'jwt-decode';
import { LOCALSTORAGE_KEYS } from '../../../constants/webAPI';

const NIL_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TenantClaims = {
  tenant_id?: string;
  tenantId?: string;
};

const asTenantId = (value?: string | null): string | undefined => {
  const id = value?.trim();
  if (!id || id === NIL_TENANT_ID || !UUID_RE.test(id)) return undefined;
  return id;
};

const readStoredAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return (
    sessionStorage.getItem(LOCALSTORAGE_KEYS.ACCESS) ||
    localStorage.getItem(LOCALSTORAGE_KEYS.ACCESS)
  );
};

const readTenantIdFromToken = (token?: string | null): string | undefined => {
  if (!token) return undefined;
  try {
    const claims = jwtDecode<TenantClaims>(token);
    return asTenantId(claims.tenant_id || claims.tenantId);
  } catch {
    return undefined;
  }
};

/**
 * Tenant id for `/v1/tenants/{tenant_id}/...` calls. Prefers the value stored
 * at login, then falls back to the access token's `tenant_id` claim so a
 * persisted session from before LoginSlice.tenantId existed still hits the
 * department/office APIs.
 */
export const resolveSessionTenantId = (
  token?: string | null,
  storedTenantId?: string | null
): string | undefined =>
  asTenantId(storedTenantId) ||
  readTenantIdFromToken(token) ||
  readTenantIdFromToken(readStoredAccessToken());
