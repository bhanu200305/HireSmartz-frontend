import React, { useEffect, useRef, useState } from 'react';
import { Upload } from 'antd';
import { MdEdit, MdOutlineFileUpload } from 'react-icons/md';
import { Button, Input, Textarea, Typography, showToast } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import { Badge, BadgeStatus } from '../../../shared/ui/badge';
import {
  useGetPlatformTenantProfileQuery,
  useUpdatePlatformTenantProfileMutation,
  useRequestPlatformTenantLogoUploadMutation,
} from '../../../../api/organization-service/Platform/tenantProfile';
import { uploadTenantLogoFile } from '../../../../api/organization-service/Tenants/profile';
import { getOrgErrorMessage } from '../../../../shared/utils/auth/orgError.helpers';
import {
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_FILE_SIZE_BYTES,
  LOGO_FILE_SIZE_ERROR_MESSAGE,
  LOGO_FILE_TYPE_ERROR_MESSAGE,
} from '../../../../constants/file.constants';

const STATUS_BADGE: Record<string, BadgeStatus> = {
  draft: 'neutral',
  pre_approved: 'warning',
  active: 'success',
  suspended: 'danger',
};

type ProfileFormState = {
  name: string;
  description: string;
  website_url: string;
  culture_intro: string;
  company_size: string;
};

const toFormState = (
  profile: ReturnType<typeof useGetPlatformTenantProfileQuery>['data']
): ProfileFormState => ({
  name: profile?.company_name || '',
  description: profile?.description || '',
  website_url: profile?.website_url || '',
  culture_intro: profile?.culture_intro || '',
  company_size: profile?.company_size ? String(profile.company_size) : '',
});

/** Label-above-field wrapper — same shape for every field in this form
 * (a required marker, then a pill-bordered box underneath) so the grid of
 * fields stays visually even regardless of what's inside the box. */
const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({
  label,
  required,
  children,
}) => (
  <div>
    <Typography variant="subtitle2" className="mb-1.5 block text-gray-700 font-semibold">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </Typography>
    {children}
  </div>
);

/** Non-editable pill box matching Input's own footprint — for values that
 * are never part of this form (status, admin contact) so they still line up
 * with the real fields around them instead of looking like a different kind
 * of thing. */
const ReadOnlyPill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full border rounded-3xl px-3 py-2 flex items-center bg-gray-50 text-gray-500 min-h-[42px]">
    {children}
  </div>
);

/**
 * Super Admin's mirror of MyCompany/CompanyProfileTab.tsx — same fields, same
 * PATCH-only-what-changed contract, GET/PATCH
 * /v1/platform/tenants/{tenant_id}/profile instead of the tenant's own
 * ambient-context route. Logo upload is the same real presigned-S3 flow that
 * tab uses too (POST /v1/platform/tenants/{tenant_id}/logo/upload-url), not
 * a free-text "Logo URL" field — the plain text input this used to have
 * couldn't produce a value organization-service could actually serve back.
 */
const CompanyProfilePanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data: profile, isLoading, refetch } = useGetPlatformTenantProfileQuery(tenantId);
  const [updateProfile, { isLoading: isSaving }] = useUpdatePlatformTenantProfileMutation();
  const [requestLogoUpload] = useRequestPlatformTenantLogoUploadMutation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(toFormState(undefined));
  const [logoPreview, setLogoPreview] = useState('');
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoUploadRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (profile) {
      setForm(toFormState(profile));
      setLogoPreview(profile.logo_url || '');
    }
  }, [profile]);

  if (isLoading) return <Loader />;
  if (!profile) {
    return <div className="p-6 text-gray-500">Company profile is not available.</div>;
  }

  const handleField =
    (field: keyof ProfileFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleCancel = () => {
    setForm(toFormState(profile));
    setIsEditMode(false);
  };

  const handleLogoUpload = async (file: File) => {
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      showToast({ message: LOGO_FILE_TYPE_ERROR_MESSAGE, type: 'error' });
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
      showToast({ message: LOGO_FILE_SIZE_ERROR_MESSAGE, type: 'error' });
      return Upload.LIST_IGNORE;
    }

    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
    setIsUploadingLogo(true);
    try {
      const target = await requestLogoUpload({
        tenantId,
        filename: file.name,
        content_type: file.type,
      }).unwrap();
      await uploadTenantLogoFile(target, file);
      await updateProfile({ tenantId, logo: target.storage_key }).unwrap();
      showToast({ message: 'Company logo updated.', type: 'success' });
      refetch();
    } catch (err) {
      setLogoPreview(profile?.logo_url || '');
      showToast({ message: getOrgErrorMessage(err, 'Failed to upload logo.'), type: 'error' });
    } finally {
      setIsUploadingLogo(false);
    }
    return false;
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

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-7">
        <Typography variant="h5">Company profile</Typography>
        {!isEditMode && (
          <Button
            className="rounded-full border border-gray-300 px-4 py-1.5 hover:bg-gray-50 transition-colors"
            onClick={() => setIsEditMode(true)}
          >
            Edit
          </Button>
        )}
      </div>

      <Typography variant="h6" className="mb-4 block font-bold text-gray-900">
        Company Info
      </Typography>

      <div className="mb-6 flex flex-col items-center">
        <Typography variant="subtitle2" className="mb-2">
          Company logo
        </Typography>
        {logoPreview ? (
          <div
            className="relative w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden group"
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
          >
            <img
              src={logoPreview}
              alt="Company logo"
              className="w-full h-full object-cover"
              onError={() => setLogoPreview('')}
            />
            {isEditMode && (
              <Upload
                beforeUpload={handleLogoUpload}
                showUploadList={false}
                className="hidden"
                accept="image/png, image/jpeg"
              >
                <button ref={logoUploadRef} className="hidden"></button>
              </Upload>
            )}
            {isEditMode && isLogoHovered && !isUploadingLogo && (
              <div
                onClick={() => logoUploadRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 cursor-pointer"
              >
                <MdEdit className="text-white text-xl" />
              </div>
            )}
            {isUploadingLogo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                <span className="text-white text-xs">Uploading…</span>
              </div>
            )}
          </div>
        ) : isEditMode ? (
          <Upload.Dragger
            beforeUpload={handleLogoUpload}
            listType="picture"
            maxCount={1}
            accept="image/png, image/jpeg"
            className="border-dashed border-gray-300 rounded-lg p-4 w-full max-w-xs"
            disabled={isUploadingLogo}
          >
            <MdOutlineFileUpload className="text-xl mb-1 text-primary mx-auto" />
            <p className="text-sm">{isUploadingLogo ? 'Uploading…' : 'Upload logo'}</p>
          </Upload.Dragger>
        ) : (
          <div className="w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center text-xl font-semibold text-white">
            {form.name?.charAt(0).toUpperCase() || '-'}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 mb-8">
        <Field label="Company name" required>
          <Input
            value={form.name}
            onChange={handleField('name')}
            placeholder="Company name"
            disabled={!isEditMode}
          />
        </Field>
        <Field label="Website">
          <Input
            value={form.website_url}
            onChange={handleField('website_url')}
            placeholder="Website"
            disabled={!isEditMode}
          />
        </Field>
        <Field label="Company size">
          <Input
            value={form.company_size}
            onChange={handleField('company_size')}
            placeholder="Company size"
            disabled={!isEditMode}
          />
        </Field>

        <Field label="Status">
          <ReadOnlyPill>
            <Badge status={STATUS_BADGE[profile.status] || 'neutral'}>{profile.status}</Badge>
          </ReadOnlyPill>
        </Field>
        <Field label="Admin contact">
          <ReadOnlyPill>
            <span className="truncate">{profile.admin_contact || '—'}</span>
          </ReadOnlyPill>
        </Field>
      </div>

      <Typography variant="h6" className="mb-4 block font-bold text-gray-900">
        About
      </Typography>
      <div className="grid grid-cols-1 gap-5">
        <Field label="Description">
          <Textarea
            value={form.description}
            onChange={handleField('description')}
            placeholder="Description"
            rows={3}
            disabled={!isEditMode}
            className="rounded-2xl text-sm"
          />
        </Field>
        <Field label="About our culture">
          <Textarea
            value={form.culture_intro}
            onChange={handleField('culture_intro')}
            placeholder="About our culture"
            rows={3}
            disabled={!isEditMode}
            className="rounded-2xl text-sm"
          />
        </Field>
      </div>

      {isEditMode && (
        <div className="flex gap-3 mt-7 pt-5 border-t border-gray-100">
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
