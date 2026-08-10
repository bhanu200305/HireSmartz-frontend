import { useNavigate } from 'react-router-dom';
import { MdOutlineArrowBack } from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import { showToast } from '../..';
import RoleForm from '../RoleForm';
import { RoleFormValues } from './AddRoleSchema';
import { useCreateRoleMutation } from '../../../api/rbac-service/Roles/createRole';
import useRoleManagementContext from '../../../hooks/useRoleManagementContext';

const AddRole = () => {
  const navigate = useNavigate();
  const { scope, tenantId } = useRoleManagementContext();
  const [createRole, { isLoading }] = useCreateRoleMutation();

  const handleSubmit = async (values: RoleFormValues) => {
    try {
      await createRole({
        roleName: values.roleName,
        scope,
        ...(scope === 'tenant' && tenantId ? { tenantId } : {}),
        permissions: values.permissions,
        locationPermissions: values.locationPermissions,
      }).unwrap();
      showToast({ message: `"${values.roleName}" was created.`, type: 'success' });
      navigate('/roles');
    } catch (err: any) {
      showToast({ message: err?.data?.message || 'Failed to create role.', type: 'error' });
    }
  };

  return (
    <MainLayout>
      <div className="w-full p-8 pt-16">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 cursor-pointer"
            aria-label="Back"
          >
            <MdOutlineArrowBack size={20} />
          </button>
          <h2 className="text-xl font-semibold">Create Role</h2>
        </div>

        <RoleForm
          submitLabel="CREATE ROLE"
          isSubmitting={isLoading}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
        />
      </div>
    </MainLayout>
  );
};

export default AddRole;
