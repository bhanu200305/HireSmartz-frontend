import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Select } from 'antd';
import { MdOutlineArrowBack, MdEdit, MdClose } from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import { Button, Typography, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { RootState } from '../../../redux/provider/store';
import {
  useListUsersQuery,
  useDeactivateUserMutation,
  useListUserLocationsQuery,
  useAttachUserLocationMutation,
  useDetachUserLocationMutation,
} from '../../../api/organization-service/Users/users';
import { useListTenantOfficesQuery } from '../../../api/organization-service/Tenants/offices';
import { useGetUserDashboardQuery } from '../../../api/organization-service/Roles/dashboard';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import AssignRoleModal from './AssignRoleModal';

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

  // Starts undefined only until the first load resolves available_locations
  // — no "everywhere combined" option is offered below; this always settles
  // on one specific location. `available_locations` sourced from this
  // person's own attached offices, not the company's full office list, so
  // the switcher only ever offers somewhere relevant to them.
  const [locationId, setLocationId] = useState<string | undefined>(undefined);
  const { data: dashboard, isLoading: isPermissionsLoading } = useGetUserDashboardQuery(
    { userId, locationId },
    { skip: !userId }
  );

  useEffect(() => {
    if (locationId === undefined && dashboard?.available_locations.length) {
      setLocationId(dashboard.available_locations[0].location_id);
    }
  }, [locationId, dashboard]);
  const [deactivateUser, { isLoading: isDeactivating }] = useDeactivateUserMutation();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAssignRole, setShowAssignRole] = useState(false);

  // Which offices this person is ATTACHED to (an HR fact) — distinct from
  // which offices their role APPLIES at (the dashboard/permissions section
  // above). This is what actually populates the location switcher's
  // available_locations list; a role's own location overrides do nothing
  // for a location nobody has attached this person to.
  const { data: userLocations } = useListUserLocationsQuery(userId, { skip: !userId });
  const { data: offices } = useListTenantOfficesQuery(
    { tenantId: tenantId ?? '' },
    {
      skip: !tenantId,
    }
  );
  const [attachLocation, { isLoading: isAttaching }] = useAttachUserLocationMutation();
  const [detachLocation, { isLoading: isDetaching }] = useDetachUserLocationMutation();
  const [pendingLocationId, setPendingLocationId] = useState<string | undefined>(undefined);

  const attachedOfficeIds = new Set(userLocations?.org_address_location_ids ?? []);
  const attachedOffices = (offices ?? []).filter((office) =>
    attachedOfficeIds.has(office.office_id)
  );
  const attachableOffices = (offices ?? []).filter(
    (office) => !attachedOfficeIds.has(office.office_id)
  );

  const handleAttachLocation = async () => {
    if (!pendingLocationId) return;
    try {
      await attachLocation({ userId, orgAddressLocationId: pendingLocationId }).unwrap();
      setPendingLocationId(undefined);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to attach location.'), type: 'error' });
    }
  };

  const handleDetachLocation = async (orgAddressLocationId: string) => {
    try {
      await detachLocation({ userId, orgAddressLocationId }).unwrap();
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to detach location.'), type: 'error' });
    }
  };

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

        <div className="mb-8">
          <Typography variant="subtitle1" className="mb-2">
            Locations
          </Typography>
          <p className="text-xs text-gray-500 mb-3">
            Offices this person is attached to. This is what the location switcher on their own
            dashboard offers — a role&apos;s per-location permissions only take effect at a location
            they&apos;re attached to here.
          </p>

          <div className="flex flex-wrap gap-2 mb-3">
            {attachedOffices.length === 0 ? (
              <p className="text-sm text-gray-400">Not attached to any office yet.</p>
            ) : (
              attachedOffices.map((office) => (
                <span
                  key={office.office_id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 pl-3 pr-1.5 py-1 text-sm text-gray-700"
                >
                  {/* City alone isn't unique — two offices in the same city
                      with no location_code read identically otherwise. */}
                  {office.city} — {office.address_line_1}
                  {user.is_active && (
                    <button
                      type="button"
                      aria-label={`Detach ${office.city} — ${office.address_line_1}`}
                      disabled={isDetaching}
                      onClick={() => handleDetachLocation(office.office_id)}
                      className="p-0.5 rounded-full hover:bg-gray-200 disabled:opacity-50"
                    >
                      <MdClose size={14} />
                    </button>
                  )}
                </span>
              ))
            )}
          </div>

          {user.is_active && (
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                allowClear
                className="w-full max-w-xs"
                placeholder={
                  attachableOffices.length === 0 ? 'No more offices to add' : 'Select an office…'
                }
                value={pendingLocationId}
                onChange={(value) => setPendingLocationId(value ?? undefined)}
                disabled={attachableOffices.length === 0}
                options={attachableOffices.map((office) => ({
                  label: `${office.city} — ${office.address_line_1}`,
                  value: office.office_id,
                }))}
              />
              <Button
                className="text-xs font-semibold text-primary-600 border border-primary-200 rounded-full px-3 py-2 disabled:opacity-40"
                onClick={handleAttachLocation}
                disabled={!pendingLocationId || isAttaching}
              >
                {isAttaching ? 'Attaching…' : '+ Attach location'}
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mb-2">
          <Typography variant="subtitle1">Permissions</Typography>
          {user.is_active && (
            <Button
              className="text-xs font-semibold text-primary-600 border border-primary-200 rounded-full px-3 py-1.5"
              onClick={() => setShowAssignRole(true)}
            >
              + Assign role
            </Button>
          )}
        </div>

        {!!dashboard?.available_locations.length && (
          <div className="mb-3">
            <label htmlFor="viewUserLocation" className="text-xs text-gray-500">
              Viewing permissions at
            </label>
            <Select
              id="viewUserLocation"
              className="w-full max-w-xs mt-1"
              value={locationId}
              onChange={(value) => setLocationId(value)}
              options={dashboard.available_locations.map((location) => ({
                label: location.label,
                value: location.location_id,
              }))}
            />
          </div>
        )}

        {isPermissionsLoading ? (
          <Loader />
        ) : dashboard?.permissions.length ? (
          <div className="flex flex-wrap gap-2 mb-8">
            {dashboard.permissions.map((permission) => (
              <span key={permission} className="text-xs bg-gray-100 rounded-full px-3 py-1">
                {permission}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-8">
            {locationId
              ? 'No permissions granted at this location.'
              : 'No permissions granted yet.'}
          </p>
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

      {showAssignRole && tenantId && (
        <AssignRoleModal
          open={showAssignRole}
          onClose={() => setShowAssignRole(false)}
          userId={userId}
          tenantId={tenantId}
          onAssigned={() => setShowAssignRole(false)}
        />
      )}
    </MainLayout>
  );
};

export default ViewOrgUser;
