import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MdOutlineArrowBack, MdEdit } from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import { Button, Typography, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { RootState } from '../../../redux/provider/store';
import {
  useListUsersQuery,
  useDeactivateUserMutation,
} from '../../../api/organization-service/Users/users';
import { useGetUserPermissionsQuery } from '../../../api/organization-service/Roles/permissions';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';

/** §"Users" + RBAC_API.md's "See what someone can do" — GET /v1/users (this
 * service has no single-user GET, so the row is read off the list) plus
 * GET /v1/roles/users/{id}/permissions for the real effective-permissions view. */
const ViewOrgUser = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('orgUserId') || '';
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);

  const { data, isLoading } = useListUsersQuery(
    { includeInactive: true, limit: 200 },
    { skip: !tenantId }
  );
  const user = data?.items.find((u) => u.user_id === userId);
  const { data: permissions, isLoading: isPermissionsLoading } = useGetUserPermissionsQuery(
    { userId },
    { skip: !userId }
  );
  const [deactivateUser, { isLoading: isDeactivating }] = useDeactivateUserMutation();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeactivate = async () => {
    try {
      await deactivateUser(userId).unwrap();
      showToast({ message: 'User deactivated.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to deactivate user.'), type: 'error' });
    } finally {
      setShowConfirm(false);
    }
  };

  if (isLoading) return <Loader />;
  if (!user) return <div className="p-8 text-gray-500">User not found.</div>;

  return (
    <MainLayout>
      <div className="w-full max-w-2xl mx-auto p-8 pt-16">
        <button
          onClick={() => navigate('/organisation-users')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
        >
          <MdOutlineArrowBack className="mr-2" /> Back
        </button>

        <div className="flex items-center justify-between mb-6">
          <Typography variant="h4">{user.full_name}</Typography>
          {user.is_active && (
            <Button
              className="rounded-full border border-gray-300 px-4 py-1.5 flex items-center gap-1"
              onClick={() => navigate(`/edit-organisation-user?orgUserId=${user.user_id}`)}
            >
              <MdEdit /> Edit
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div>
            <Typography variant="subtitle2">Email</Typography>
            <Typography variant="body1">{user.email}</Typography>
          </div>
          <div>
            <Typography variant="subtitle2">Phone</Typography>
            <Typography variant="body1">
              {user.phone_no ? `${user.country_code || ''}${user.phone_no}` : '-'}
            </Typography>
          </div>
          <div>
            <Typography variant="subtitle2">Title</Typography>
            <Typography variant="body1">{user.title || '-'}</Typography>
          </div>
          <div>
            <Typography variant="subtitle2">Status</Typography>
            <Typography variant="body1">{user.is_active ? 'Active' : 'Deactivated'}</Typography>
          </div>
        </div>

        <Typography variant="subtitle1" className="mb-2 block">
          Permissions
        </Typography>
        {isPermissionsLoading ? (
          <Loader />
        ) : permissions?.permissions.length ? (
          <div className="flex flex-wrap gap-2 mb-8">
            {permissions.permissions.map((permission) => (
              <span key={permission} className="text-xs bg-gray-100 rounded-full px-3 py-1">
                {permission}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-8">No permissions granted yet.</p>
        )}

        {user.is_active && (
          <Button
            className="rounded-full border border-red-300 text-red-600 px-6 py-2"
            onClick={() => setShowConfirm(true)}
          >
            Deactivate user
          </Button>
        )}
      </div>

      {showConfirm && (
        <ConfirmationModal
          title="Deactivate this user? This is reversible — their record and role history are kept, not deleted."
          confirmText="DEACTIVATE"
          isLoading={isDeactivating}
          onConfirm={handleDeactivate}
          onClose={() => setShowConfirm(false)}
        />
      )}
    </MainLayout>
  );
};

export default ViewOrgUser;
