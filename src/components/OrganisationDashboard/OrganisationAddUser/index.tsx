import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MdOutlineArrowBack } from 'react-icons/md';
import { Select } from 'antd';
import MainLayout from '../../../layouts/MainLayout';
import { Button, Input, PhoneNumberField, Typography, showToast } from '../../shared';
import { RootState } from '../../../redux/provider/store';
import { useCreateUserMutation } from '../../../api/organization-service/Users/users';
import { useListTenantDepartmentsQuery } from '../../../api/organization-service/Tenants/departments';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';

type FormState = {
  email: string;
  first_name: string;
  last_name: string;
  title: string;
  country_code: string;
  phone_no: string;
  department_id: string | undefined;
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
};

/** §"Users": POST /v1/users. Email and first name are the only required
 * fields — everything else is optional, per docs/frontend_guide.txt. No
 * role picker here: organization-service has no endpoint to list the role
 * catalog, so a role can only be granted after creation, via a flow that
 * already knows a `role_id` (see RolesManagement's "not available yet"
 * note for why that's a real backend gap, not an oversight here). */
const AddOrganisationUser = () => {
  const navigate = useNavigate();
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [createUser, { isLoading }] = useCreateUserMutation();
  const { data: departments } = useListTenantDepartmentsQuery(tenantId ?? '', { skip: !tenantId });

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
    try {
      await createUser({
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || undefined,
        title: form.title.trim() || undefined,
        // Only sent alongside an actual number — a bare country code with no
        // digits isn't a phone number.
        country_code: form.phone_no.trim() ? form.country_code : undefined,
        phone_no: form.phone_no.trim() || undefined,
        department_id: form.department_id,
      }).unwrap();
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
