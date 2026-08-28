import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LOCALSTORAGE_KEYS } from '../constants/webAPI';
import type { RootState } from '../redux/provider/store';
import { setSessionTenant } from '../redux/slices/loginSlice';
import { resolveSessionTenantId } from '../shared/utils/auth/sessionTenant';

/**
 * Tenant id from the signed-in company session (LoginSlice or JWT
 * `tenant_id`). Does not invent a tenant for platform Super Admins — their
 * token has no `tenant_id` by design.
 */
export const useSessionTenantId = (): string | undefined => {
  const dispatch = useDispatch();
  const storedTenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const loginToken = useSelector((state: RootState) => state.LoginSlice.loginToken);
  const callerKind = useSelector((state: RootState) => state.LoginSlice.callerKind);
  const token =
    loginToken ||
    (typeof window !== 'undefined' ? sessionStorage.getItem(LOCALSTORAGE_KEYS.ACCESS) : null);
  const tenantId = resolveSessionTenantId(token, storedTenantId);

  useEffect(() => {
    if (tenantId && tenantId !== storedTenantId && callerKind !== 'platform') {
      dispatch(setSessionTenant(tenantId));
    }
  }, [callerKind, dispatch, storedTenantId, tenantId]);

  return tenantId;
};
