import React, { useEffect, useState } from 'react';
import { Button, Input, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  useGetTenantProfileQuery,
  useUpdateTenantProfileMutation,
} from '../../api/organization-service/Tenants/profile';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

type ProfileFormState = {
  name: string;
  description: string;
  website_url: string;
  culture_intro: string;
  company_size: string;
  logo: string;
};

const toFormState = (
  profile: ReturnType<typeof useGetTenantProfileQuery>['data']
): ProfileFormState => ({
  name: profile?.company_name || '',
  description: profile?.description || '',
  website_url: profile?.website_url || '',
  culture_intro: profile?.culture_intro || '',
  company_size: profile?.company_size ? String(profile.company_size) : '',
  logo: profile?.logo_url || '',
});

/**
 * Company Admin's own profile — GET/PATCH /v1/tenants/{tenant_id}/profile
 * (TenantProfileView/UpdateTenantProfileRequest). Every PATCH field is
 * optional and omitted-means-unchanged on the wire — only fields the admin
 * actually edited are sent, never the full form state, so an untouched
 * field can never accidentally overwrite a value set elsewhere.
 */
const CompanyProfileTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data: profile, isLoading, refetch } = useGetTenantProfileQuery(tenantId);
  const [updateProfile, { isLoading: isSaving }] = useUpdateTenantProfileMutation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(toFormState(undefined));
  const canEdit = useHasAccess(Authorities.COMPANY_SETTINGS_EDIT);

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
        {!isEditMode && canEdit && (
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

export default CompanyProfileTab;
