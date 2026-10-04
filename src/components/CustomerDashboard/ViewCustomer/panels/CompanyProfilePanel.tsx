import React, { useEffect, useRef, useState } from 'react';
import { Dropdown, Upload, type MenuProps } from 'antd';
import { MdEdit, MdOutlineFileUpload, MdOutlineCropRotate } from 'react-icons/md';
import { Button, Input, Textarea, Typography, showToast } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import ImageCropModal from '../../../shared/ui/ImageCropModal';
import { Badge, BadgeStatus } from '../../../shared/ui/badge';
import {
  useGetPlatformTenantProfileQuery,
  useUpdatePlatformTenantProfileMutation,
  useUploadPlatformTenantLogoMutation,
} from '../../../../api/organization-service/Platform/tenantProfile';
import {
  useGetPlatformTenantCultureIntroQuery,
  useUpdatePlatformTenantCultureIntroMutation,
} from '../../../../api/organization-service/Platform/cultureIntro';
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
  profile: ReturnType<typeof useGetPlatformTenantProfileQuery>['data'],
  cultureIntro: string
): ProfileFormState => ({
  name: profile?.company_name || '',
  description: profile?.description || '',
  website_url: profile?.website_url || '',
  culture_intro: cultureIntro,
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
 * ambient-context route. Logo upload is the same real server-mediated
 * multipart flow that tab uses too (POST
 * /v1/platform/tenants/{tenant_id}/logo/upload), not a free-text "Logo URL"
 * field — the plain text input this used to have couldn't produce a value
 * organization-service could actually serve back.
 */
const CompanyProfilePanel: React.FC<{ tenantId: string; readOnly?: boolean }> = ({
  tenantId,
  readOnly = false,
}) => {
  const { data: profile, isLoading, refetch } = useGetPlatformTenantProfileQuery(tenantId);
  const [updateProfile, { isLoading: isSaving }] = useUpdatePlatformTenantProfileMutation();
  const [uploadLogo] = useUploadPlatformTenantLogoMutation();
  // Same "own separate resource" situation as CompanyProfileTab.tsx — a
  // tenant with no culture intro set yet 404s here, which is the normal
  // "nothing set" state, not a load failure.
  const {
    data: cultureIntroData,
    error: cultureIntroError,
    refetch: refetchCultureIntro,
  } = useGetPlatformTenantCultureIntroQuery(tenantId);
  const [updateCultureIntro] = useUpdatePlatformTenantCultureIntroMutation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(toFormState(undefined, ''));
  const [logoPreview, setLogoPreview] = useState('');
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  // Controlled explicitly — see CompanyProfileTab.tsx's identical comment on
  // why tying the Dropdown's mount to hover state made the open menu
  // "vanish" the instant the mouse left the avatar circle on its way to a
  // menu item (the menu itself renders in a portal outside this div).
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoUploadRef = useRef<HTMLButtonElement>(null);
  // The crop step sits between "file picked" and "uploaded" — same
  // ImageCropModal every other logo/avatar upload in the app uses.
  const [isLogoCropModalOpen, setIsLogoCropModalOpen] = useState(false);
  const [logoCropImageSrc, setLogoCropImageSrc] = useState('');
  const [pendingCropFileName, setPendingCropFileName] = useState('company-logo.jpg');
  // Only set when THIS crop session created a fresh blob: URL for a
  // freshly-picked disk file — that's the only source that needs revoking
  // on cancel/confirm. Re-adjusting the already-displayed logoPreview (see
  // handleAdjustCurrentLogo) reuses that string as-is instead.
  const [logoCropObjectUrl, setLogoCropObjectUrl] = useState<string | null>(null);

  const cultureIntroValue = cultureIntroData?.intro_text ?? (cultureIntroError ? '' : undefined);

  useEffect(() => {
    if (profile && cultureIntroValue !== undefined) {
      setForm(toFormState(profile, cultureIntroValue));
      setLogoPreview(profile.logo_url || '');
    }
  }, [profile, cultureIntroValue]);

  if (isLoading) return <Loader />;
  if (!profile) {
    return <div className="p-6 text-gray-500">Company profile is not available.</div>;
  }

  const handleField =
    (field: keyof ProfileFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleCancel = () => {
    setForm(toFormState(profile, cultureIntroValue ?? ''));
    setIsEditMode(false);
  };

  const handleLogoFileSelected = (file: File) => {
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      showToast({ message: LOGO_FILE_TYPE_ERROR_MESSAGE, type: 'error' });
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
      showToast({ message: LOGO_FILE_SIZE_ERROR_MESSAGE, type: 'error' });
      return Upload.LIST_IGNORE;
    }

    const objectUrl = URL.createObjectURL(file);
    setLogoCropImageSrc(objectUrl);
    setLogoCropObjectUrl(objectUrl);
    setPendingCropFileName(file.name);
    setIsLogoCropModalOpen(true);
    return Upload.LIST_IGNORE;
  };

  // Re-opens the crop step on the logo ALREADY showing instead of requiring
  // a brand new file first — the "adjust" half of the logo's click menu
  // below ("Select new image" is the other).
  const handleAdjustCurrentLogo = () => {
    if (!logoPreview) return;
    setLogoCropImageSrc(logoPreview);
    setLogoCropObjectUrl(null);
    setPendingCropFileName(pendingCropFileName || 'company-logo.jpg');
    setIsLogoCropModalOpen(true);
  };

  const logoMenuItems: MenuProps['items'] = [
    { key: 'select', label: 'Select new image', icon: <MdOutlineFileUpload /> },
    { key: 'adjust', label: 'Adjust current logo', icon: <MdOutlineCropRotate /> },
  ];
  const handleLogoMenuClick: NonNullable<MenuProps['onClick']> = ({ key }) => {
    if (key === 'select') logoUploadRef.current?.click();
    if (key === 'adjust') handleAdjustCurrentLogo();
  };

  const handleLogoCropCancel = () => {
    if (logoCropObjectUrl) URL.revokeObjectURL(logoCropObjectUrl);
    setLogoCropImageSrc('');
    setLogoCropObjectUrl(null);
    setIsLogoCropModalOpen(false);
  };

  const handleLogoCropConfirm = async (croppedBlob: Blob) => {
    if (logoCropObjectUrl) URL.revokeObjectURL(logoCropObjectUrl);
    setLogoCropImageSrc('');
    setLogoCropObjectUrl(null);
    setIsLogoCropModalOpen(false);

    const croppedFile = new File([croppedBlob], pendingCropFileName || 'company-logo.jpg', {
      type: croppedBlob.type,
    });
    const previewUrl = URL.createObjectURL(croppedFile);
    setLogoPreview(previewUrl);
    setIsUploadingLogo(true);
    try {
      const { storage_key } = await uploadLogo({ tenantId, file: croppedFile }).unwrap();
      await updateProfile({ tenantId, logo: storage_key }).unwrap();
      showToast({ message: 'Company logo updated.', type: 'success' });
      refetch();
    } catch (err) {
      setLogoPreview(profile?.logo_url || '');
      showToast({ message: getOrgErrorMessage(err, 'Failed to upload logo.'), type: 'error' });
    } finally {
      setIsUploadingLogo(false);
    }
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
        company_size: parsedSize,
      }).unwrap();
      // Own separate resource/endpoint — see cultureIntro.ts. Skipped when
      // unchanged or blank: the real endpoint has no "clear it back to
      // empty" call (`intro_text` is `min_length=1` server-side).
      if (form.culture_intro.trim() && form.culture_intro !== (cultureIntroValue ?? '')) {
        await updateCultureIntro({
          tenantId,
          intro_text: form.culture_intro.trim(),
        }).unwrap();
        refetchCultureIntro();
      }
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
        {/* isEditMode can only ever become true via this button, so hiding
            it when readOnly (a cfp_support grant, which has no matching
            write route) keeps every other write control below — the logo
            upload/adjust menu, the editable fields, Cancel/Save — off too,
            for free. */}
        {!isEditMode && !readOnly && (
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
              // object-contain, not object-cover — see CompanyProfileTab.tsx's
              // identical fix for why cover was cropping most of a
              // non-square scraped logo away.
              className="w-full h-full object-contain p-2"
              onError={() => setLogoPreview('')}
            />
            {isEditMode && (
              <Upload
                beforeUpload={handleLogoFileSelected}
                showUploadList={false}
                className="hidden"
                accept="image/png, image/jpeg"
              >
                <button ref={logoUploadRef} className="hidden cursor-pointer"></button>
              </Upload>
            )}
            {isEditMode && !isUploadingLogo && (
              <Dropdown
                menu={{ items: logoMenuItems, onClick: handleLogoMenuClick }}
                trigger={['click']}
                open={isLogoMenuOpen}
                onOpenChange={setIsLogoMenuOpen}
              >
                <div
                  className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 cursor-pointer transition-opacity ${
                    isLogoHovered || isLogoMenuOpen ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <MdEdit className="text-white text-xl" />
                </div>
              </Dropdown>
            )}
            {isUploadingLogo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                <span className="text-white text-xs">Uploading…</span>
              </div>
            )}
          </div>
        ) : isEditMode ? (
          <Upload.Dragger
            beforeUpload={handleLogoFileSelected}
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
            noAutoCapitalize
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
            <span className="truncate">{profile.admin_contact || '-'}</span>
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
            {isSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )}
      <ImageCropModal
        open={isLogoCropModalOpen}
        imageSrc={logoCropImageSrc}
        onCancel={handleLogoCropCancel}
        onConfirm={handleLogoCropConfirm}
        isSaving={isUploadingLogo}
        title="Adjust your logo"
        subtitle="Drag to reposition, then zoom or rotate to fit the frame"
      />
    </div>
  );
};

export default CompanyProfilePanel;
