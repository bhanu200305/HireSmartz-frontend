import { useGetRolesQuery } from '../api/rbac-service/Roles/roles';
import { RootState } from '../redux/provider/store';
import { useSelector } from 'react-redux';

const useFetchRoles = () => {
  const storedRoleType = localStorage.getItem('roleType');
  const roleType = useSelector((state: RootState) => state.LoginSlice.role.type) || storedRoleType;
  const isOwnerRole = roleType === 'owner';
  const {
    data: roles,
    error,
    isLoading,
  } = useGetRolesQuery({ isOwnerRole }, { refetchOnMountOrArgChange: true });

  return {
    roles,
    loading: isLoading,
    error: error ? 'Failed to fetch roles' : null,
  };
};

export default useFetchRoles;
