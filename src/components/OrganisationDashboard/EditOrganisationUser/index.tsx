import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MdOutlineArrowBack } from 'react-icons/md';
import { Select } from 'antd';
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
import { useAssignRoleMutation } from '../../../api/organization-service/Roles/assignments';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
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
  // already does it. There is no endpoint to list a user's EXISTING
  // assignments (see assignments.ts's header comment), so this can only ADD
  // a role — it can't show or change whatever they already hold.
  const { data: roles } = useListRolesQuery({ scope: 'tenant', isMaster: false });
  const { data: offices } = useListTenantOfficesQuery(
    { tenantId: tenantId ?? '' },
    { skip: !tenantId }
  );
  const [assignRole, { isLoading: isAssigningRole }] = useAssignRoleMutation();
  const [assignRoleId, setAssignRoleId] = useState<string | undefined>(undefined);
  const [assignLocationId, setAssignLocationId] = useState<string | undefined>(undefined);

  const handleAssignRole = async () => {
    if (!assignRoleId) return;
    try {
      const result = await assignRole({
        user_id: userId,
        role_id: assignRoleId,
        location_id: assignLocationId ?? null,
      }).unwrap();
      showToast({ message: `"${result.role_name}" assigned.`, type: 'success' });
      setAssignRoleId(undefined);
      setAssignLocationId(undefined);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to assign role.'), type: 'error' });
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
    if (form.phone_no.trim() && !isPhoneValidForCountry(form.phone_no, form.country_code)) {
      showToast({ message: PHONE_VALIDATION_MESSAGE, type: 'error' });
      return;
    }
    try {
      await updateUser({
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
          Edit user
        </Typography>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <Typography variant="h6" className="block mb-4">
            Profile details
          </Typography>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <label htmlFor="edit-user-email" className="text-sm text-gray-600">
                Email
              </label>
              <Input
                id="edit-user-email"
                defaultValue={user.email}
                placeholder="Email"
                onBlur={handleEmailBlur}
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="edit-user-first-name" className="text-sm text-gray-600">
                First name <span className="required-asterisk">*</span>
              </label>
              <Input
                id="edit-user-first-name"
                placeholder="First name"
                className="mt-1"
                {...field('first_name')}
              />
            </div>
            <div>
              <label htmlFor="edit-user-last-name" className="text-sm text-gray-600">
                Last name
              </label>
              <Input
                id="edit-user-last-name"
                placeholder="Last name"
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
              <p className="text-sm text-gray-600">Phone number</p>
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
            Assign a role
          </Typography>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            This grants a real RBAC role via a separate action from the fields above.
            &quot;Title&quot; is just a label, not a permission. Adds a role in addition to whatever
            this person already holds; there&apos;s no way yet to view or remove an existing
            assignment from here.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <Select
                className="w-full mt-1"
                placeholder="Select a role"
                value={assignRoleId}
                onChange={(value) => setAssignRoleId(value)}
                options={(roles ?? []).map((role) => ({ label: role.name, value: role.role_id }))}
              />
            </div>
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <Select
                className="w-full mt-1"
                placeholder="Location (optional, applies everywhere if blank)"
                allowClear
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
            disabled={!assignRoleId || isAssigningRole}
          >
            {isAssigningRole ? 'Assigning…' : 'Assign role'}
          </Button>
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
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>

      {showEmailConfirm && (
        <ConfirmationModal
          title={`Change this user's login email to "${pendingEmail}"? This resets their email verification.`}
          confirmText="CHANGE EMAIL"
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
