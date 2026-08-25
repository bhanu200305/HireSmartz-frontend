import React, { useEffect, useRef, useState } from 'react';
import { Upload } from 'antd';
import {
  MdEdit,
  MdOutlineFileUpload,
  MdBusiness,
  MdLanguage,
  MdGroups,
  MdDescription,
  MdInfo,
  MdPhone,
} from 'react-icons/md';
import { Button, Input, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import { Badge, BadgeStatus } from '../shared/ui/badge';
import {
  useGetTenantProfileQuery,
  useRequestTenantLogoUploadMutation,
  useUpdateTenantProfileMutation,
  uploadTenantLogoFile,
} from '../../api/organization-service/Tenants/profile';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';
import {
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_FILE_SIZE_BYTES,
  LOGO_FILE_SIZE_ERROR_MESSAGE,
  LOGO_FILE_TYPE_ERROR_MESSAGE,
} from '../../constants/file.constants';

// Same mapping ViewCustomer (Super Admin's per-company view) uses, so a
// tenant's status reads identically everywhere it appears.
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
  profile: ReturnType<typeof useGetTenantProfileQuery>['data']
): ProfileFormState => ({
  name: profile?.company_name || '',
  description: profile?.description || '',
  website_url: profile?.website_url || '',
  culture_intro: profile?.culture_intro || '',
  company_size: profile?.company_size ? String(profile.company_size) : '',
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
  const [requestLogoUpload] = useRequestTenantLogoUploadMutation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(toFormState(undefined));
  const canEdit = useHasAccess(Authorities.COMPANY_SETTINGS_EDIT);
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

  const fields: {
    key: keyof ProfileFormState;
    label: string;
    icon: React.ReactNode;
    fullWidth?: boolean;
  }[] = [
    { key: 'name', label: 'Company name', icon: <MdBusiness size={16} /> },
    { key: 'website_url', label: 'Website', icon: <MdLanguage size={16} /> },
    { key: 'company_size', label: 'Company size', icon: <MdGroups size={16} /> },
    {
      key: 'description',
      label: 'Description',
      icon: <MdDescription size={16} />,
      fullWidth: true,
    },
    { key: 'culture_intro', label: 'About our culture', icon: <MdInfo size={16} />, fullWidth: true },
  ];

  const logoNode =
    logoPreview ? (
      <div
        className="relative w-20 h-20 shrink-0 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden group ring-4 ring-white shadow-sm"
        onMouseEnter={() => setIsLogoHovered(true)}
        onMouseLeave={() => setIsLogoHovered(false)}
      >
        <img
          src={logoPreview}
          alt="Company logo"
          className="w-full h-full object-cover"
          onError={() => setLogoPreview('')}
        />
        {isEditMode && canEdit && (
          <Upload
            beforeUpload={handleLogoUpload}
            showUploadList={false}
            className="hidden"
            accept="image/png, image/jpeg"
          >
            <button ref={logoUploadRef} className="hidden"></button>
          </Upload>
        )}
        {isEditMode && canEdit && isLogoHovered && !isUploadingLogo && (
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
    ) : isEditMode && canEdit ? (
      <Upload.Dragger
        beforeUpload={handleLogoUpload}
        listType="picture"
        maxCount={1}
        accept="image/png, image/jpeg"
        className="border-dashed border-gray-300 rounded-lg p-2 w-24 shrink-0"
        disabled={isUploadingLogo}
      >
        <MdOutlineFileUpload className="text-lg mb-0.5 text-primary mx-auto" />
        <p className="text-xs leading-tight">{isUploadingLogo ? 'Uploading…' : 'Upload'}</p>
      </Upload.Dragger>
    ) : (
      <div className="w-20 h-20 shrink-0 bg-gradient-to-br from-primary-600 to-accent-500 rounded-full flex items-center justify-center text-xl font-semibold text-white ring-4 ring-white shadow-sm">
        {form.name?.charAt(0).toUpperCase() || '-'}
      </div>
    );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-5">
        <Typography variant="h5">Company profile</Typography>
        {!isEditMode && canEdit && (
          <Button
            className="rounded-full border border-gray-300 px-4 py-1.5 flex items-center gap-1.5"
            onClick={() => setIsEditMode(true)}
          >
            <MdEdit size={14} /> Edit
          </Button>
        )}
      </div>

      {/* Identity strip — logo, name and status read as one unit instead of
          a lone centered avatar with the name buried in the grid below. */}
      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 mb-6 p-5 rounded-2xl border border-gray-100 bg-gradient-to-r from-primary-50/60 to-transparent">
        {logoNode}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <Typography variant="h4" className="font-semibold text-gray-900 truncate">
              {form.name || 'Untitled company'}
            </Typography>
            {profile.status && (
              <Badge status={STATUS_BADGE[profile.status] || 'neutral'}>{profile.status}</Badge>
            )}
          </div>
          {form.website_url && (
            <a
              href={form.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:underline break-all"
            >
              {form.website_url}
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(({ key, label, icon, fullWidth }) => (
          <div
            key={key}
            className={`p-4 rounded-xl border border-gray-100 bg-white ${fullWidth ? 'sm:col-span-2' : ''}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 shrink-0 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                {icon}
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {label}
              </p>
            </div>
            {isEditMode ? (
              <Input value={form[key]} onChange={handleField(key)} placeholder={label} />
            ) : (
              <Typography variant="body1" className="text-gray-800 whitespace-pre-line">
                {form[key] || '-'}
              </Typography>
            )}
          </div>
        ))}

        <div className="p-4 rounded-xl border border-gray-100 bg-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-7 h-7 shrink-0 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
              <MdPhone size={16} />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Admin contact
            </p>
          </div>
          <Typography variant="body1" className="text-gray-800">
            {profile.admin_contact || '-'}
          </Typography>
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
