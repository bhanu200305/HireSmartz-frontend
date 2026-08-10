import { useSelector } from 'react-redux';
import { RootState } from '../redux/provider/store';
import type { RoleScope } from '../types';
import { getLocalStorageItem } from '../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../constants/webAPI';
import { safeDecodeToken } from '../shared/utils/methods';
import useEffectivePermissions from './useEffectivePermissions';

/**
 * The Roles & Permissions screens are one set of pages shared by the CFP
 * platform super admin and a company admin — this resolves which scope the
 * signed-in user is managing roles for (platform vs their own tenant), plus
 * the escalation ceiling they're allowed to grant.
 */
const useRoleManagementContext = () => {
  const { role, loginToken } = useSelector((state: RootState) => state.LoginSlice);
  const effectivePermissions = useEffectivePermissions();

  const scope: RoleScope = role?.type === 'owner' ? 'platform' : 'tenant';

  const token =
    loginToken || (getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) as string | null) || undefined;
  const decodedToken = safeDecodeToken<{ companyId?: number }>(token);
  const tenantId = decodedToken?.companyId;

  return { scope, tenantId, ceiling: effectivePermissions };
};

export default useRoleManagementContext;
