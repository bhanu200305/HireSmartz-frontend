import { useNavigate, useSearchParams } from 'react-router-dom';
import { MdOutlineArrowBack } from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import { showToast } from '../..';
import { Loader } from '../../shared/ui/loader';
import RoleForm from '../RoleForm';
import { RoleFormValues } from '../AddRole/AddRoleSchema';
import { useGetRoleByIdQuery } from '../../../api/rbac-service/Roles/getRoleById';
import { useUpdateRoleMutation } from '../../../api/rbac-service/Roles/updateRole';

const EditRole = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleId = Number(searchParams.get('roleId'));

  const { data, isLoading: isFetching } = useGetRoleByIdQuery({ roleId }, { skip: !roleId });
  const role = data?.data;
  const [updateRole, { isLoading: isSaving }] = useUpdateRoleMutation();

  const handleSubmit = async (values: RoleFormValues) => {
    try {
      await updateRole({
        roleId,
        roleName: values.roleName,
        permissions: values.permissions,
        locationPermissions: values.locationPermissions,
      }).unwrap();
      showToast({ message: `"${values.roleName}" was updated.`, type: 'success' });
      navigate(`/view-role?roleId=${roleId}`);
    } catch (err: any) {
      showToast({ message: err?.data?.message || 'Failed to update role.', type: 'error' });
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
          <h2 className="text-xl font-semibold">Edit Role</h2>
        </div>

        {isFetching && <Loader />}

        {!isFetching && role?.isSystemRole && (
          <p className="text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
            &quot;{role.roleName}&quot; is a system role and can&apos;t be edited.
          </p>
        )}

        {!isFetching && role && (
          <RoleForm
            key={role.id}
            initialValues={{
              roleName: role.roleName,
              permissions: role.permissions,
              locationPermissions: role.locationPermissions,
            }}
            readOnly={role.isSystemRole}
            submitLabel="SAVE CHANGES"
            isSubmitting={isSaving}
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default EditRole;
