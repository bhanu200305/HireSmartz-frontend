import { useGetAllRolesQuery } from '../api/rbac-service/Roles/allRoles';
import { RootState } from '../redux/provider/store';
import { useSelector } from 'react-redux';

const useFetchAllRoles = (ownerRole?: boolean) => {
  const storedRoleType = localStorage.getItem('roleType');
  const roleType = useSelector((state: RootState) => state.LoginSlice.role.type) || storedRoleType;
  const isOwnerRole = ownerRole === false ? false : roleType === 'owner';
  const { data: roles, error, isLoading } = useGetAllRolesQuery({ isOwnerRole });

  return {
    roles,
    loading: isLoading,
    error: error ? 'Failed to fetch roles' : null,
  };
};

export default useFetchAllRoles;
