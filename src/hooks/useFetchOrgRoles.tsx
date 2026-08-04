import { useGetAllRolesQuery } from '../api/rbac-service/Roles/allRoles';
import { RootState } from '../redux/provider/store';
import { useSelector } from 'react-redux';

const useFetchOrgRoles = () => {
  const storedRoleType = localStorage.getItem('roleType');
  const roleType = useSelector((state: RootState) => state.LoginSlice.role.type) || storedRoleType;
  const isOwnerRole = roleType === 'owner' ? false : true;
  const { data: roles, error, isLoading } = useGetAllRolesQuery({ isOwnerRole });

  return {
    roles,
    loading: isLoading,
    error: error ? 'Failed to fetch roles' : null,
  };
};

export default useFetchOrgRoles;
