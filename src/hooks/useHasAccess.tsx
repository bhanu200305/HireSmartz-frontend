import { Authorities } from '../constants/authorities.constant';
import useEffectivePermissions from './useEffectivePermissions';

/**
 * Whether the signed-in user currently holds `requiredAuthority`, resolved
 * dynamically (role + active location) via useEffectivePermissions — see
 * that hook for the dynamic/legacy-fallback split.
 */
const useHasAccess = (requiredAuthority?: Authorities): boolean => {
  const effectivePermissions = useEffectivePermissions();

  if (!requiredAuthority) return false;

  return effectivePermissions.includes(requiredAuthority);
};

export default useHasAccess;
