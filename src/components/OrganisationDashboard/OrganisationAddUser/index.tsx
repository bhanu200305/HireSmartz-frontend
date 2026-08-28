import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MdOutlineArrowBack } from 'react-icons/md';
import { Select } from 'antd';
import MainLayout from '../../../layouts/MainLayout';
import { Button, Input, PhoneNumberField, Typography, showToast } from '../../shared';
import { RootState } from '../../../redux/provider/store';
import {
  useCreateUserMutation,
  useAttachUserLocationMutation,
} from '../../../api/organization-service/Users/users';
import { useListTenantDepartmentsQuery } from '../../../api/organization-service/Tenants/departments';
import { useListTenantOfficesQuery } from '../../../api/organization-service/Tenants/offices';
import { useAssignRoleMutation } from '../../../api/organization-service/Roles/assignments';
import { useRolesCatalog } from '../../../hooks/useRolesCatalog';
import { getOrgErrorCode, getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
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
  const isLoading = isCreating || isAssigning;
  const { data: departments } = useListTenantDepartmentsQuery(tenantId ?? '', { skip: !tenantId });
  const { data: offices } = useListTenantOfficesQuery(
    { tenantId: tenantId ?? '', isMaster: false },
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
    if (!form.email.trim() || !form.first_name.trim()) {
      showToast({ message: 'Email and first name are required.', type: 'error' });
      return;
    }
    if (form.phone_no.trim() && !isPhoneValidForCountry(form.phone_no, form.country_code)) {
      showToast({ message: PHONE_VALIDATION_MESSAGE, type: 'error' });
      return;
    }
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
      showToast({ message: getOrgErrorMessage(err, 'Failed to create user.'), type: 'error' });
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
          Add user
        </Typography>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input placeholder="Email *" type="email" {...field('email')} />
          <Input placeholder="First name *" {...field('first_name')} />
          <Input placeholder="Last name" {...field('last_name')} />
          <Input placeholder="Title" {...field('title')} />
          <PhoneNumberField
            countryCode={form.country_code}
            onCountryCodeChange={(value) => setForm((prev) => ({ ...prev, country_code: value }))}
            phoneNumber={form.phone_no}
            onPhoneNumberChange={(value) => setForm((prev) => ({ ...prev, phone_no: value }))}
          />
          <Select
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

        <div className="mt-4">
          <RoleLocationPicker
            roles={roles}
            offices={offices ?? []}
            roleId={form.role_id}
            onRoleChange={(value) => setForm((prev) => ({ ...prev, role_id: value }))}
            locationIds={form.location_ids}
            onLocationIdsChange={(value) => setForm((prev) => ({ ...prev, location_ids: value }))}
            rolePlaceholder="Role (optional — can be assigned later)"
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
            {isLoading ? 'Creating…' : 'Create user'}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default AddOrganisationUser;
