import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MdOutlineArrowBack } from 'react-icons/md';
import { Select } from 'antd';
import MainLayout from '../../../layouts/MainLayout';
import { Button, Input, Typography, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { RootState } from '../../../redux/provider/store';
import {
  useListUsersQuery,
  useUpdateUserMutation,
} from '../../../api/organization-service/Users/users';
import { useListTenantDepartmentsQuery } from '../../../api/organization-service/Tenants/departments';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';

type FormState = {
  first_name: string;
  last_name: string;
  title: string;
  phone_no: string;
  department_id: string | undefined;
};

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

  const [form, setForm] = useState<FormState>({
    first_name: '',
    last_name: '',
    title: '',
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
    try {
      await updateUser({
        userId,
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        title: form.title.trim() || undefined,
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input defaultValue={user.email} placeholder="Email" onBlur={handleEmailBlur} />
          <Input placeholder="First name *" {...field('first_name')} />
          <Input placeholder="Last name" {...field('last_name')} />
          <Input placeholder="Title" {...field('title')} />
          <Input placeholder="Phone number" {...field('phone_no')} />
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
