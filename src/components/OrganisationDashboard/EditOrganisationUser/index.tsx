import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MdClose, MdOutlineArrowBack } from 'react-icons/md';
import { Select, Tooltip } from 'antd';
import MainLayout from '../../../layouts/MainLayout';
import {
  Button,
  Input,
  NameTitleSelect,
  PhoneNumberField,
  Typography,
  showToast,
} from '../../shared';
import { Loader } from '../../shared/ui/loader';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { RootState } from '../../../redux/provider/store';
import {
  useListUsersQuery,
  useUpdateUserMutation,
} from '../../../api/organization-service/Users/users';
import { useListTenantDepartmentsQuery } from '../../../api/organization-service/Tenants/departments';
import { useListRolesQuery } from '../../../api/organization-service/Roles/roles';
import { useListTenantOfficesQuery } from '../../../api/organization-service/Tenants/offices';
import {
  useAssignRoleMutation,
  useListUserRoleAssignmentsQuery,
  useRevokeRoleMutation,
} from '../../../api/organization-service/Roles/assignments';
import { getOrgErrorCode, getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import { systemRoleLabel } from '../../RolesManagement/data/roleTemplates';
import {
  isPhoneValidForCountry,
  PHONE_VALIDATION_MESSAGE,
} from '../../../shared/utils/validation/phoneValidation';

type FormState = {
  first_name: string;
  last_name: string;
  title: string;
  country_code: string;
  phone_no: string;
  department_id: string | undefined;
};

// Same default every other phone field in this app starts from (see
// EditCandidate.tsx/UserProfile) when this user has no country_code on file
// yet.
const DEFAULT_COUNTRY_CODE = '+1';

/**
 * §"Users": PATCH /v1/users/{user_id}. Email is deliberately its own
 * confirmed action, not a field in this general save — per
 * docs/frontend_guide.txt: "Changing their email is a bigger deal (it
 * resets verification)". There's no GET /v1/users/{id} single-user
 * endpoint, so this reads the user out of the list page organization-service
 * does expose.
 */
const EditOrgUser = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('orgUserId') || '';
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);

  const { data, isLoading } = useListUsersQuery(
    { includeInactive: true, limit: 200 },
    { skip: !tenantId }
  );
  const user = data?.items.find((u) => u.user_id === userId);
  const { data: departments } = useListTenantDepartmentsQuery(tenantId ?? '', { skip: !tenantId });
  const [updateUser, { isLoading: isSaving }] = useUpdateUserMutation();

  // Role assignment — a separate mutation from the profile fields above (a
  // real RBAC grant via POST /v1/roles/assignments, not a form field on this
  // user's record). Kept as its own action with its own button rather than
  // folded into "Save changes", same as ViewOrganisationUser/AssignRoleModal
  // already does it. GET /v1/roles/users/{user_id}/assignments (below) is
  // what makes "change a role" possible now — revoke the old assignment,
  // then grant the new one — instead of only ever adding a second one.
  const { data: roles } = useListRolesQuery({ scope: 'tenant', isMaster: false });
  const { data: offices } = useListTenantOfficesQuery(
    { tenantId: tenantId ?? '' },
    { skip: !tenantId }
  );
  const { data: currentAssignments } = useListUserRoleAssignmentsQuery(
    { userId },
    { skip: !userId }
  );
  const [assignRole, { isLoading: isAssigningRole }] = useAssignRoleMutation();
  const [revokeRole, { isLoading: isRevokingRole }] = useRevokeRoleMutation();
  const [revokingAssignmentId, setRevokingAssignmentId] = useState<string | null>(null);
  const [assignRoleId, setAssignRoleId] = useState<string | undefined>(undefined);
  const [assignLocationId, setAssignLocationId] = useState<string | undefined>(undefined);

  const roleName = (roleId: string) =>
    systemRoleLabel(roles?.find((r) => r.role_id === roleId)?.name ?? roleId);
  const locationLabel = (locationId: string | null) => {
    if (!locationId) return 'Everywhere';
    const office = offices?.find((o) => o.office_id === locationId);
    return office ? `${office.city}, ${office.address_line_1}` : locationId;
  };

  // Shows the role the person already holds (the first one) until someone
  // picks another, so reopening this page doesn't read "Select a Role" for
  // someone who has a role.
  const selectedRoleId = assignRoleId ?? currentAssignments?.[0]?.role_id;
  const isAlreadyHeld =
    Boolean(selectedRoleId) &&
    Boolean(
      currentAssignments?.some(
        (a) =>
          a.role_id === selectedRoleId && (a.location_id ?? null) === (assignLocationId ?? null)
      )
    );

  const handleAssignRole = async () => {
    if (!selectedRoleId || isAlreadyHeld) return;
    try {
      const result = await assignRole({
        user_id: userId,
        role_id: selectedRoleId,
        location_id: assignLocationId ?? null,
      }).unwrap();
      showToast({ message: `"${result.role_name}" assigned.`, type: 'success' });
      setAssignRoleId(undefined);
      setAssignLocationId(undefined);
    } catch (err) {
      // The backend's own message for this is a bare user id + role id.
      showToast({
        message:
          getOrgErrorCode(err) === 'DUPLICATE_ROLE_ASSIGNMENT'
            ? `"${roleName(selectedRoleId)}" is already assigned to this user.`
            : getOrgErrorMessage(err, 'Failed to assign role.'),
        type: 'error',
      });
    }
  };

  const handleRevokeRole = async (assignmentId: string) => {
    setRevokingAssignmentId(assignmentId);
    try {
      await revokeRole({ assignmentId, userId }).unwrap();
      showToast({ message: 'Role removed.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to remove role.'), type: 'error' });
    } finally {
      setRevokingAssignmentId(null);
    }
  };

  const [form, setForm] = useState<FormState>({
    first_name: '',
    last_name: '',
    title: '',
    country_code: DEFAULT_COUNTRY_CODE,
    phone_no: '',
    department_id: undefined,
  });
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name,
        last_name: user.last_name || '',
        title: user.title || '',
        country_code: user.country_code || DEFAULT_COUNTRY_CODE,
        phone_no: user.phone_no || '',
        department_id: user.department_id || undefined,
      });
    }
  }, [user]);

  const field = (key: keyof FormState) => ({
    value: form[key] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const save = async (email?: string) => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      showToast({ message: 'First Name and Last Name are required.', type: 'error' });
      return;
    }
    if (form.phone_no.trim() && !isPhoneValidForCountry(form.phone_no, form.country_code)) {
      showToast({ message: PHONE_VALIDATION_MESSAGE, type: 'error' });
      return;
    }
    try {
      const updated = await updateUser({
        userId,
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        title: form.title.trim() || undefined,
        // Only sent alongside an actual number — a bare country code with no
        // digits isn't a phone number.
        country_code: form.phone_no.trim() ? form.country_code : undefined,
        phone_no: form.phone_no.trim() || undefined,
        department_id: form.department_id,
        ...(email ? { email } : {}),
      }).unwrap();
      showToast({ message: 'User updated.', type: 'success' });
      // null when email wasn't touched. true/false only appear alongside an
      // email change — true means they still had a pending, un-accepted
      // invite and a fresh one just went to the corrected address, so the
      // admin knows the corrected address actually got a working link.
      if (updated.invite_resent === true) {
        showToast({ message: 'Invitation resent to the new email.', type: 'success' });
      }
      navigate(`/view-organisation-user?orgUserId=${userId}`);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to update user.'), type: 'error' });
    }
  };

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newEmail = e.target.value.trim();
    if (newEmail && user && newEmail !== user.email) {
      setPendingEmail(newEmail);
      setShowEmailConfirm(true);
    }
  };

  if (isLoading) return <Loader />;
  if (!user) return <div className="p-8 text-gray-500">User not found.</div>;

  return (
    <MainLayout>
      <div className="w-full max-w-2xl mx-auto p-8 pt-16">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
        >
          <MdOutlineArrowBack className="mr-2" /> Back
        </button>
        <Typography variant="h4" className="mb-6 block">
          Edit User
        </Typography>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <Typography variant="h6" className="block mb-4">
            Profile Details
          </Typography>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <label htmlFor="edit-user-email" className="text-sm text-gray-600">
                Email
              </label>
              <Input
                id="edit-user-email"
                type="email"
                noAutoCapitalize
                defaultValue={user.email}
                placeholder="Email"
                onBlur={handleEmailBlur}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="edit-user-first-name" className="text-sm text-gray-600">
                First Name <span className="required-asterisk">*</span>
              </label>
              <Input
                id="edit-user-first-name"
                placeholder="First Name"
                className="mt-1"
                {...field('first_name')}
              />
            </div>
            <div>
              <label htmlFor="edit-user-last-name" className="text-sm text-gray-600">
                Last Name <span className="required-asterisk">*</span>
              </label>
              <Input
                id="edit-user-last-name"
                placeholder="Last Name"
                className="mt-1"
                {...field('last_name')}
              />
            </div>
            <div>
              <label htmlFor="edit-user-title" className="text-sm text-gray-600">
                Title
              </label>
              <NameTitleSelect
                id="edit-user-title"
                className="w-full mt-1"
                value={form.title}
                onChange={(value) => setForm((prev) => ({ ...prev, title: value ?? '' }))}
              />
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone Number</p>
              <PhoneNumberField
                className="mt-1"
                countryCode={form.country_code}
                onCountryCodeChange={(value) =>
                  setForm((prev) => ({ ...prev, country_code: value }))
                }
                phoneNumber={form.phone_no}
                onPhoneNumberChange={(value) => setForm((prev) => ({ ...prev, phone_no: value }))}
              />
            </div>
            <div>
              <p className="text-sm text-gray-600">Department</p>
              <Select
                className="w-full mt-1"
                placeholder="Department (optional)"
                value={form.department_id}
                onChange={(value) => setForm((prev) => ({ ...prev, department_id: value }))}
                allowClear
                showSearch
                optionFilterProp="label"
                options={(departments || []).map((d) => ({
                  label: d.name,
                  value: d.org_department_id,
                }))}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <Typography variant="h6" className="block">
            Assign a Role
          </Typography>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            This grants a real RBAC role via a separate action from the fields above.
            &quot;Title&quot; is just a label, not a permission. To change a role, remove the
            current one below and assign the new one.
          </p>

          {!!currentAssignments?.length && (
            <div className="flex flex-wrap gap-2 mb-4">
              {currentAssignments.map((assignment) => (
                <span
                  key={assignment.assignment_id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 pl-3 pr-1.5 py-1 text-sm text-gray-700"
                >
                  {roleName(assignment.role_id)}
                  <span className="text-gray-400">· {locationLabel(assignment.location_id)}</span>
                  <Tooltip title={`Remove ${roleName(assignment.role_id)}`}>
                    <button
                      type="button"
                      aria-label={`Remove ${roleName(assignment.role_id)}`}
                      disabled={isRevokingRole}
                      onClick={() => handleRevokeRole(assignment.assignment_id)}
                      className="p-0.5 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {revokingAssignmentId === assignment.assignment_id ? (
                        <span className="block h-3.5 w-3.5 animate-pulse rounded-full bg-gray-400" />
                      ) : (
                        <MdClose size={14} />
                      )}
                    </button>
                  </Tooltip>
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <Select
                className="w-full mt-1"
                placeholder="Select a Role"
                value={selectedRoleId}
                onChange={(value) => setAssignRoleId(value)}
                showSearch
                optionFilterProp="label"
                options={(roles ?? []).map((role) => ({
                  label: systemRoleLabel(role.name),
                  value: role.role_id,
                }))}
              />
            </div>
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <Select
                className="w-full mt-1"
                placeholder="Location (optional, applies everywhere if blank)"
                allowClear
                showSearch
                optionFilterProp="label"
                value={assignLocationId}
                onChange={(value) => setAssignLocationId(value ?? undefined)}
                options={(offices ?? []).map((office) => ({
                  // City alone isn't unique — two offices in the same city
                  // read identically otherwise.
                  label: `${office.city}, ${office.address_line_1}`,
                  value: office.office_id,
                }))}
              />
            </div>
          </div>
          <Button
            className="mt-4 rounded-full bg-button text-white px-6 py-2 disabled:opacity-60"
            onClick={handleAssignRole}
            disabled={!selectedRoleId || isAlreadyHeld || isAssigningRole}
          >
            {isAssigningRole ? 'Assigning…' : 'Assign Role'}
          </Button>
          {isAlreadyHeld && (
            <p className="mt-2 mb-0 text-xs text-gray-500">
              This user already has this role there. Pick another role or location to add one.
            </p>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          <Button
            className="rounded-full border border-gray-300 px-6 py-2"
            onClick={() => navigate(-1)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            className="rounded-full bg-button text-white px-6 py-2"
            onClick={() => save()}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {showEmailConfirm && (
        <ConfirmationModal
          title={`Change this user's login email to "${pendingEmail}"? This resets their email verification.`}
          confirmText="Change Email"
          isLoading={isSaving}
          onConfirm={() => {
            setShowEmailConfirm(false);
            save(pendingEmail);
          }}
          onClose={() => setShowEmailConfirm(false)}
        />
      )}
    </MainLayout>
  );
};

export default EditOrgUser;
