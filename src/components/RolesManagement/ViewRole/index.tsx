import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MdOutlineArrowBack, MdEdit, MdDeleteOutline, MdPersonAddAlt } from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import { Button, showToast } from '../..';
import { Loader } from '../../shared/ui/loader';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { useGetRoleByIdQuery } from '../../../api/rbac-service/Roles/getRoleById';
import { useDeleteRoleMutation } from '../../../api/rbac-service/Roles/deleteRole';
import useHasAccess from '../../../hooks/useHasAccess';
import { Authorities, PERMISSION_CATALOG } from '../../../constants/authorities.constant';

const labelFor = (code: string) =>
  PERMISSION_CATALOG.find((entry) => entry.code === code)?.label || code;

const ViewRole = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleId = Number(searchParams.get('roleId'));

  const { data, isLoading } = useGetRoleByIdQuery({ roleId }, { skip: !roleId });
  const role = data?.data;
  const [deleteRole, { isLoading: isDeleting }] = useDeleteRoleMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canCreate = useHasAccess(Authorities.ROLE_CREATE);
  const canEdit = useHasAccess(Authorities.ROLE_EDIT);
  const canDelete = useHasAccess(Authorities.ROLE_DELETE);

  const handleDelete = async () => {
    if (!role) return;
    try {
      await deleteRole({ roleId: role.id }).unwrap();
      showToast({ message: `"${role.roleName}" was deleted.`, type: 'success' });
      navigate('/roles');
    } catch (err: any) {
      showToast({ message: err?.data?.message || 'Failed to delete role.', type: 'error' });
    } finally {
      setConfirmDelete(false);
    }
  };

  return (
    <MainLayout>
      <div className="w-full p-8 pt-16 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-gray-100 cursor-pointer"
              aria-label="Back"
            >
              <MdOutlineArrowBack size={20} />
            </button>
            <h2 className="text-xl font-semibold">{role?.roleName || 'Role'}</h2>
          </div>

          {role && (
            <div className="flex gap-3">
              {canCreate && (
                <Button
                  appname="invite user"
                  onClick={() => navigate(`/invite-user?roleId=${role.id}`)}
                  className="flex items-center gap-1 px-4 py-2 border border-primary text-primary rounded-3xl text-sm"
                >
                  <MdPersonAddAlt size={16} /> Invite user
                </Button>
              )}
              {!role.isSystemRole && canEdit && (
                <Button
                  appname="edit role"
                  onClick={() => navigate(`/edit-role?roleId=${role.id}`)}
                  className="flex items-center gap-1 px-4 py-2 border border-gray-300 rounded-3xl text-sm"
                >
                  <MdEdit size={16} /> Edit
                </Button>
              )}
              {!role.isSystemRole && canDelete && (
                <Button
                  appname="delete role"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 px-4 py-2 border border-red-200 text-red-600 rounded-3xl text-sm"
                >
                  <MdDeleteOutline size={16} /> Delete
                </Button>
              )}
            </div>
          )}
        </div>

        {isLoading && <Loader />}

        {!isLoading && role && (
          <div className="flex flex-col gap-y-6">
            <div className="flex gap-x-8 text-sm">
              <div>
                <span className="text-gray-500">Scope</span>
                <p className="font-medium capitalize">{role.scope}</p>
              </div>
              <div>
                <span className="text-gray-500">Type</span>
                <p className="font-medium">{role.isSystemRole ? 'System (fixed)' : 'Custom'}</p>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-800 mb-2">
                Baseline permissions ({role.permissions.length})
              </h3>
              <ul className="list-disc list-inside text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                {role.permissions.map((code) => (
                  <li key={code}>{labelFor(code)}</li>
                ))}
              </ul>
            </div>

            {role.locationPermissions?.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-gray-800 mb-2">Location overrides</h3>
                <div className="flex flex-col gap-y-4">
                  {role.locationPermissions.map((entry) => (
                    <div key={entry.locationId} className="border border-gray-200 rounded-lg p-4">
                      <p className="font-medium text-gray-800 mb-2">
                        {entry.locationName || `Location ${entry.locationId}`} (
                        {entry.permissions.length} permissions)
                      </p>
                      <ul className="list-disc list-inside text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                        {entry.permissions.map((code) => (
                          <li key={code}>{labelFor(code)}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmationModal
          title={`Delete role "${role?.roleName}"? Anyone currently assigned it will lose these permissions.`}
          confirmText="DELETE"
          isLoading={isDeleting}
          onClose={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </MainLayout>
  );
};

export default ViewRole;
