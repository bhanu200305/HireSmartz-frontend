import React, { useEffect, useState } from 'react';
import { Button, Input, Typography, showToast } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import {
  useGetPlatformTenantProfileQuery,
  useUpdatePlatformTenantProfileMutation,
} from '../../../../api/organization-service/Platform/tenantProfile';
import { getOrgErrorMessage } from '../../../../shared/utils/auth/orgError.helpers';

type ProfileFormState = {
  name: string;
  description: string;
  website_url: string;
  culture_intro: string;
  company_size: string;
  logo: string;
};

const toFormState = (
  profile: ReturnType<typeof useGetPlatformTenantProfileQuery>['data']
): ProfileFormState => ({
  name: profile?.company_name || '',
  description: profile?.description || '',
  website_url: profile?.website_url || '',
  culture_intro: profile?.culture_intro || '',
  company_size: profile?.company_size ? String(profile.company_size) : '',
  logo: profile?.logo_url || '',
});

/**
 * Super Admin's mirror of MyCompany/CompanyProfileTab.tsx — same fields, same
 * PATCH-only-what-changed contract, GET/PATCH
 * /v1/platform/tenants/{tenant_id}/profile instead of the tenant's own
 * ambient-context route.
 */
const CompanyProfilePanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data: profile, isLoading, refetch } = useGetPlatformTenantProfileQuery(tenantId);
  const [updateProfile, { isLoading: isSaving }] = useUpdatePlatformTenantProfileMutation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(toFormState(undefined));

  useEffect(() => {
    if (profile) setForm(toFormState(profile));
  }, [profile]);

  if (isLoading) return <Loader />;
  if (!profile) {
    return <div className="p-6 text-gray-500">Company profile is not available.</div>;
  }

  const handleField = (field: keyof ProfileFormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleCancel = () => {
    setForm(toFormState(profile));
    setIsEditMode(false);
  };

  const handleSave = async () => {
    const parsedSize = form.company_size ? Number(form.company_size) : undefined;
    if (form.company_size && (!Number.isFinite(parsedSize) || Number(parsedSize) < 1)) {
      showToast({ message: 'Company size must be a positive number.', type: 'error' });
      return;
    }
    try {
      await updateProfile({
        tenantId,
        name: form.name,
        description: form.description,
        website_url: form.website_url,
        culture_intro: form.culture_intro,
        company_size: parsedSize,
        logo: form.logo,
      }).unwrap();
      showToast({ message: 'Company profile updated.', type: 'success' });
      setIsEditMode(false);
      refetch();
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to update company profile.'),
        type: 'error',
      });
    }
  };

  const fields: { key: keyof ProfileFormState; label: string }[] = [
    { key: 'name', label: 'Company name' },
    { key: 'website_url', label: 'Website' },
    { key: 'company_size', label: 'Company size' },
    { key: 'logo', label: 'Logo URL' },
    { key: 'description', label: 'Description' },
    { key: 'culture_intro', label: 'About our culture' },
  ];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Typography variant="h5">Company profile</Typography>
        {!isEditMode && (
          <Button
            className="rounded-full border border-gray-300 px-4 py-1.5"
            onClick={() => setIsEditMode(true)}
          >
            Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(({ key, label }) => (
          <div
            key={key}
            className={key === 'description' || key === 'culture_intro' ? 'sm:col-span-2' : ''}
          >
            <Typography variant="subtitle2" className="mb-1 block">
              {label}
            </Typography>
            {isEditMode ? (
              <Input value={form[key]} onChange={handleField(key)} placeholder={label} />
            ) : (
              <Typography variant="body1">{form[key] || '-'}</Typography>
            )}
          </div>
        ))}
        <div>
          <Typography variant="subtitle2" className="mb-1 block">
            Status
          </Typography>
          <Typography variant="body1">{profile.status}</Typography>
        </div>
        <div>
          <Typography variant="subtitle2" className="mb-1 block">
            Admin contact
          </Typography>
          <Typography variant="body1">{profile.admin_contact || '-'}</Typography>
        </div>
      </div>

      {isEditMode && (
        <div className="flex gap-3 mt-6">
          <Button
            className="rounded-full border border-gray-300 px-6 py-2"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            className="rounded-full bg-button text-white px-6 py-2"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CompanyProfilePanel;
