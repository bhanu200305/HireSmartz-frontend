import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../redux/provider/store';
import { Authorities, ROLE_AUTHORITIES } from '../constants/authorities.constant';
import { convertToCamelCase } from '../shared/utils/methods';

const useHasAccess = (requiredAuthority?: Authorities): boolean => {
  const dispatch = useDispatch();
  const { authorities, role } = useSelector((state: RootState) => state.LoginSlice);

  const camelCaseRoleName = useMemo(() => convertToCamelCase(role.name), [role.name]);
  const allowedAuthorities = useMemo(() => {
    try {
      return ROLE_AUTHORITIES[role.type]?.[camelCaseRoleName] || [];
    } catch {
      return [];
    }
  }, [role.type, camelCaseRoleName]);

  useEffect(() => {
    dispatch({
      type: 'SET_ROLE_AUTHORITIES',
      payload: allowedAuthorities,
    });
  }, [dispatch, allowedAuthorities]);

  if (!requiredAuthority) return false;

  return authorities.includes(requiredAuthority) || allowedAuthorities.includes(requiredAuthority);
};

export default useHasAccess;
