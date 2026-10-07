import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { RootState } from '../../../redux/provider/store';
import {
  useCreateUserMutation,
  useAttachUserLocationMutation,
  useReactivateUserMutation,
} from '../../../api/organization-service/Users/users';
import { useListTenantDepartmentsQuery } from '../../../api/organization-service/Tenants/departments';
import { useListTenantOfficesQuery } from '../../../api/organization-service/Tenants/offices';
import { useAssignRoleMutation } from '../../../api/organization-service/Roles/assignments';
import { useRolesCatalog } from '../../../hooks/useRolesCatalog';
import {
  getOrgErrorCode,
  getOrgErrorDetails,
  getOrgErrorMessage,
} from '../../../shared/utils/auth/orgError.helpers';
import {
  isPhoneValidForCountry,
  PHONE_VALIDATION_MESSAGE,
} from '../../../shared/utils/validation/phoneValidation';
import RoleLocationPicker from '../../CustomerDashboard/ViewCustomer/panels/RoleLocationPicker';

type FormState = {
  email: string;
  first_name: string;
  last_name: string;
  title: string;
  country_code: string;
  phone_no: string;
  department_id: string | undefined;
  role_id: string | undefined;
  location_ids: string[];
};

// Same default every other phone field in this app starts from (see
// EditCandidate.tsx/UserProfile) — kept a plain default rather than empty so
// the field always shows a code, not just once a user has typed a digit.
const DEFAULT_COUNTRY_CODE = '+1';

const emptyForm: FormState = {
  email: '',
  first_name: '',
  last_name: '',
  title: '',
  country_code: DEFAULT_COUNTRY_CODE,
  phone_no: '',
  department_id: undefined,
  role_id: undefined,
  location_ids: [],
};

/** §"Users": POST /v1/users. Email and first name are the only required
 * fields — everything else is optional, per docs/frontend_guide.txt.
 *
 * Role + location are folded into the same flow as UsersPanel's (Super
 * Admin's) mirror of this page: `CreateUserCommand.role_id` grants an
 * everywhere role in the same call as creation; a location-SCOPED grant has
 * no field on that command at all, so it's a second `assignRole` call
 * chained onto the same click when a location was also picked. Tenant-
 * ambient here (`useAssignRoleMutation`, not the platform mirror) since this
 * page only ever runs inside a real tenant session. */
const AddOrganisationUser = () => {
  const navigate = useNavigate();
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [assignRole, { isLoading: isAssigning }] = useAssignRoleMutation();
  const [attachLocation] = useAttachUserLocationMutation();
  const [reactivateUser, { isLoading: isReactivating }] = useReactivateUserMutation();
  const isLoading = isCreating || isAssigning;
  // Set only when creation fails with DEACTIVATED_USER_EMAIL_CONFLICT — this
  // email belongs to a previously-deactivated user (deactivating never frees
  // the email, only suspends it), so the fix isn't "pick another email," it's
  // "reactivate the existing account." Cleared on every new submit attempt.
  const [deactivatedConflict, setDeactivatedConflict] = useState<{
    userId: string;
    email: string;
  } | null>(null);
  const { data: departments } = useListTenantDepartmentsQuery(
    { tenantId: tenantId ?? '', includeInactive: false },
    { skip: !tenantId }
  );
  const { data: offices } = useListTenantOfficesQuery(
    { tenantId: tenantId ?? '', isMaster: false, includeInactive: false },
    { skip: !tenantId }
  );
  const { roles, createRole } = useRolesCatalog({
    scope: 'tenant',
    tenantId: tenantId ?? undefined,
    isMaster: false,
  });

  const field = (key: keyof FormState) => ({
    value: form[key] || '',
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const handleSubmit = async () => {
    if (!form.email.trim() || !form.first_name.trim() || !form.last_name.trim()) {
      showToast({ message: 'Email, first name and last name are required.', type: 'error' });
      return;
    }
    if (form.phone_no.trim() && !isPhoneValidForCountry(form.phone_no, form.country_code)) {
      showToast({ message: PHONE_VALIDATION_MESSAGE, type: 'error' });
      return;
    }
    setDeactivatedConflict(null);
    try {
      // A location-scoped role can't be granted in the same call as creation
      // — CreateUserCommand has no location_id at all, only role_id (an
      // everywhere grant). One or more locations picked means a separate
      // grant PER office — same reasoning as UsersPanel's identical
      // handleAdd (Super Admin's mirror of this page).
      const grantLocationScoped = Boolean(form.role_id && form.location_ids.length > 0);
      const user = await createUser({
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || undefined,
        title: form.title.trim() || undefined,
        // Only sent alongside an actual number — a bare country code with no
        // digits isn't a phone number.
        country_code: form.phone_no.trim() ? form.country_code : undefined,
        phone_no: form.phone_no.trim() || undefined,
        department_id: form.department_id,
        role_id: grantLocationScoped ? undefined : form.role_id,
      }).unwrap();

      if (grantLocationScoped && form.role_id) {
        const failedLocations: string[] = [];
        for (const locationId of form.location_ids) {
          try {
            await assignRole({
              user_id: user.user_id,
              role_id: form.role_id,
              location_id: locationId,
            }).unwrap();
            // The grant alone doesn't attach this new hire to the office —
            // organization_role and user_location_mapping are separate
            // tables (see ViewPlatformUserModal's handleAssign for the full
            // reasoning). Without this their OWN location switcher stays
            // empty for a spot they just gained a role at. Best-effort and
            // silent — a brand-new user can't already be attached anywhere.
            try {
              await attachLocation({
                userId: user.user_id,
                orgAddressLocationId: locationId,
              }).unwrap();
            } catch {
              // Not worth failing "Create user" over — can be attached
              // manually from their profile afterward.
            }
          } catch (err) {
            const label = offices?.find((o) => o.office_id === locationId)?.city ?? locationId;
            failedLocations.push(
              getOrgErrorCode(err) === 'DUPLICATE_ROLE_ASSIGNMENT'
                ? `${label} (already held)`
                : label
            );
          }
        }
        if (failedLocations.length > 0) {
          showToast({
            message: `${user.full_name} was created, but the role grant failed at: ${failedLocations.join(', ')}. Assign it from their profile instead.`,
            type: 'error',
          });
          navigate('/organisation-users');
          return;
        }
      }

      showToast({ message: 'User created.', type: 'success' });
      navigate('/organisation-users');
    } catch (err) {
      if (getOrgErrorCode(err) === 'DEACTIVATED_USER_EMAIL_CONFLICT') {
        const existingUserId = getOrgErrorDetails(err)?.existing_user_id;
        if (typeof existingUserId === 'string') {
          setDeactivatedConflict({ userId: existingUserId, email: form.email.trim() });
          return;
        }
      }
      showToast({ message: getOrgErrorMessage(err, 'Failed to create user.'), type: 'error' });
    }
  };

  const handleReactivateExisting = async () => {
    if (!deactivatedConflict) return;
    try {
      await reactivateUser(deactivatedConflict.userId).unwrap();
      showToast({ message: `${deactivatedConflict.email} was reactivated.`, type: 'success' });
      navigate('/organisation-users');
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to reactivate user.'),
        type: 'error',
      });
    }
  };

  return (
    <MainLayout>
      <div className="w-full max-w-2xl mx-auto p-8 pt-16">
        <button
          onClick={() => navigate('/organisation-users')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
        >
          <MdOutlineArrowBack className="mr-2" /> Back
        </button>
        <Typography variant="h4" className="mb-6 block">
          Add User
        </Typography>

        {deactivatedConflict && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-800">
              A deactivated user already exists with the email{' '}
              <span className="font-medium">{deactivatedConflict.email}</span>. Deactivating never
              frees the email, so reactivate that account instead of creating a new one.
            </p>
            <Button
              type="button"
              onClick={handleReactivateExisting}
              disabled={isReactivating}
              className="mt-3 rounded-3xl bg-button px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isReactivating ? 'Reactivating…' : 'Reactivate Existing User'}
            </Button>
          </div>
        )}

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <Typography variant="h6" className="block mb-4">
            Profile Details
          </Typography>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
            <div>
              <label htmlFor="add-user-first-name" className="text-sm text-gray-600">
                First Name <span className="required-asterisk">*</span>
              </label>
              <Input
                id="add-user-first-name"
                placeholder="First Name"
                className="mt-1"
                {...field('first_name')}
              />
            </div>
            <div>
              <label htmlFor="add-user-last-name" className="text-sm text-gray-600">
                Last Name <span className="required-asterisk">*</span>
              </label>
              <Input
                id="add-user-last-name"
                placeholder="Last Name"
                className="mt-1"
                {...field('last_name')}
              />
            </div>
            <div>
              <label htmlFor="add-user-email" className="text-sm text-gray-600">
                Email <span className="required-asterisk">*</span>
              </label>
              <Input
                id="add-user-email"
                type="email"
                placeholder="Email"
                className="mt-1"
                {...field('email')}
              />
            </div>
            <div>
              <label htmlFor="add-user-title" className="text-sm text-gray-600">
                Title
              </label>
              <NameTitleSelect
                id="add-user-title"
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
            Role &amp; access
          </Typography>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Optional — a role can also be assigned later from their profile.
          </p>
          <RoleLocationPicker
            roles={roles}
            offices={offices ?? []}
            roleId={form.role_id}
            onRoleChange={(value) => setForm((prev) => ({ ...prev, role_id: value }))}
            locationIds={form.location_ids}
            onLocationIdsChange={(value) => setForm((prev) => ({ ...prev, location_ids: value }))}
            rolePlaceholder="Role (optional, can be assigned later)"
            tenantId={tenantId ?? undefined}
            onCreateRole={createRole}
          />
        </div>

        <div className="flex gap-3 mt-8">
          <Button
            className="rounded-full border border-gray-300 px-6 py-2"
            onClick={() => navigate('/organisation-users')}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="rounded-full bg-button text-white px-6 py-2"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Creating…' : 'Create User'}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default AddOrganisationUser;
