import React, { useEffect, useRef, useState } from 'react';
import { Upload } from 'antd';
import {
  MdEdit,
  MdOutlineFileUpload,
  MdBusiness,
  MdLanguage,
  MdGroups,
  MdDescription,
  MdPhone,
  MdAutorenew,
} from 'react-icons/md';
import { Button, Input, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import { Badge, BadgeStatus } from '../shared/ui/badge';
import {
  useGetTenantProfileQuery,
  useUploadTenantLogoMutation,
  useUpdateTenantProfileMutation,
} from '../../api/organization-service/Tenants/profile';
import {
  useGetTenantCultureIntroQuery,
  useUpdateTenantCultureIntroMutation,
} from '../../api/organization-service/Tenants/cultureIntro';
import {
  useTriggerOrgScrapeMutation,
  useLazyGetOrgScrapeResultQuery,
} from '../../api/ai-service/OrgScrape/orgScrape';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';
import {
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_FILE_SIZE_BYTES,
  LOGO_FILE_SIZE_ERROR_MESSAGE,
  LOGO_FILE_TYPE_ERROR_MESSAGE,
} from '../../constants/file.constants';

// Re-scrape polling: ai-service's own scrape run is bounded to ~15s
// server-side (see StepCompanyDetails.tsx's comment on the tenant-creation
// path); polling every 2s is frequent enough to feel responsive without
// hammering the endpoint.
const SCRAPE_POLL_INTERVAL_MS = 2000;
const SCRAPE_POLL_TIMEOUT_MS = 30000;

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
  profile: ReturnType<typeof useGetTenantProfileQuery>['data'],
  cultureIntro: string
): ProfileFormState => ({
  name: profile?.company_name || '',
  description: profile?.description || '',
  website_url: profile?.website_url || '',
  culture_intro: cultureIntro,
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
  const [uploadLogo] = useUploadTenantLogoMutation();
  // A tenant with no culture intro set yet 404s here (see cultureIntro.ts) —
  // that's the normal "nothing set" state, not a load failure, so it's read
  // through `error` rather than surfaced as a toast anywhere below.
  const {
    data: cultureIntroData,
    error: cultureIntroError,
    refetch: refetchCultureIntro,
  } = useGetTenantCultureIntroQuery(tenantId);
  const [updateCultureIntro] = useUpdateTenantCultureIntroMutation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(toFormState(undefined, ''));
  const canEdit = useHasAccess(Authorities.COMPANY_SETTINGS_EDIT);
  const [logoPreview, setLogoPreview] = useState('');
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoUploadRef = useRef<HTMLButtonElement>(null);

  // undefined while still loading (cultureIntroError also unset yet) — only
  // resolves to '' once the 404 has actually come back, so a slow load
  // doesn't get treated as "confirmed empty" and momentarily flash blank
  // over a real value.
  const cultureIntroValue = cultureIntroData?.intro_text ?? (cultureIntroError ? '' : undefined);

  useEffect(() => {
    if (profile && cultureIntroValue !== undefined) {
      setForm(toFormState(profile, cultureIntroValue));
      setLogoPreview(profile.logo_url || '');
    }
  }, [profile, cultureIntroValue]);

  // ai-service's org-website scrape — POST /ai/organization/scrape then poll
  // GET .../scrape/result (organization_id comes from the caller's own
  // session, so this is only ever "re-scrape MY OWN company", never
  // available on the Super Admin's per-tenant view). See orgScrape.ts.
  const [triggerScrape, { isLoading: isTriggeringScrape }] = useTriggerOrgScrapeMutation();
  const [pollScrapeResult] = useLazyGetOrgScrapeResultQuery();
  const [isScraping, setIsScraping] = useState(false);
  const [scrapePreview, setScrapePreview] = useState<{
    logo_reference: string | null;
    description: string | null;
    culture_text: string | null;
    colors: string[];
  } | null>(null);

  const handleRescrape = async () => {
    if (!form.website_url.trim()) {
      showToast({ message: 'Add a website URL before re-scraping.', type: 'error' });
      return;
    }
    setScrapePreview(null);
    setIsScraping(true);
    try {
      await triggerScrape({ website_url: form.website_url.trim() }).unwrap();
      const startedAt = Date.now();
      // The trigger only starts a background run — poll the result
      // endpoint until it leaves PROCESSING, same bounded ~15s window
      // StepCompanyDetails.tsx's synchronous version relies on server-side.
      for (;;) {
        await new Promise((resolve) => setTimeout(resolve, SCRAPE_POLL_INTERVAL_MS));
        const result = await pollScrapeResult().unwrap();
        if (result.status === 'READY') {
          setScrapePreview({
            logo_reference: result.logo_reference,
            description: result.description,
            culture_text: result.culture_text,
            colors: result.colors,
          });
          break;
        }
        if (result.status === 'FAILED') {
          showToast({
            message: result.reason || 'Could not scrape this website.',
            type: 'error',
          });
          break;
        }
        if (Date.now() - startedAt > SCRAPE_POLL_TIMEOUT_MS) {
          showToast({
            message: 'Scrape is taking longer than expected. Try again shortly.',
            type: 'error',
          });
          break;
        }
      }
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Could not scrape this website.'),
        type: 'error',
      });
    } finally {
      setIsScraping(false);
    }
  };

  const applyScrapeField = (field: 'description' | 'culture_text' | 'logo_reference') => {
    if (!scrapePreview) return;
    if (field === 'logo_reference' && scrapePreview.logo_reference) {
      setLogoPreview(scrapePreview.logo_reference);
    } else if (field === 'description' && scrapePreview.description) {
      setForm((prev) => ({ ...prev, description: scrapePreview.description! }));
    } else if (field === 'culture_text' && scrapePreview.culture_text) {
      setForm((prev) => ({ ...prev, culture_intro: scrapePreview.culture_text! }));
    }
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
      const { storage_key } = await uploadLogo({ tenantId, file }).unwrap();
      await updateProfile({ tenantId, logo: storage_key }).unwrap();
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
    setForm(toFormState(profile, cultureIntroValue ?? ''));
    setLogoPreview(profile?.logo_url || '');
    setScrapePreview(null);
    setIsEditMode(false);
  };

  const handleSave = async () => {
    const parsedSize = form.company_size ? Number(form.company_size) : undefined;
    if (form.company_size && (!Number.isFinite(parsedSize) || Number(parsedSize) < 1)) {
      showToast({ message: 'Company size must be a positive number.', type: 'error' });
      return;
    }
    try {
      // `logo` is only included here for a scraped-and-applied logo — a
      // disk upload already persists immediately in handleLogoUpload, and
      // `logoPreview` briefly holds an object-URL preview mid-upload that
      // must never be sent to the backend as a real value.
      const scrapedLogoApplied =
        logoPreview &&
        logoPreview !== (profile?.logo_url || '') &&
        !logoPreview.startsWith('blob:');
      await updateProfile({
        tenantId,
        name: form.name,
        description: form.description,
        website_url: form.website_url,
        company_size: parsedSize,
        ...(scrapedLogoApplied ? { logo: logoPreview } : {}),
      }).unwrap();
      // A genuinely separate resource from the rest of the profile (its own
      // endpoint, its own permission gate) — see cultureIntro.ts. Skipped
      // when unchanged or blank: the real endpoint has no "clear it back to
      // empty" call (`intro_text` is `min_length=1` server-side).
      if (form.culture_intro.trim() && form.culture_intro !== (cultureIntroValue ?? '')) {
        await updateCultureIntro({
          tenantId,
          intro_text: form.culture_intro.trim(),
        }).unwrap();
        refetchCultureIntro();
      }
      setScrapePreview(null);
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
  ];

  const logoNode = logoPreview ? (
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
              <div className={key === 'website_url' ? 'flex items-center gap-2' : ''}>
                <Input
                  value={form[key]}
                  onChange={handleField(key)}
                  placeholder={label}
                  noAutoCapitalize={key === 'website_url'}
                />
                {key === 'website_url' && (
                  <button
                    type="button"
                    onClick={() => void handleRescrape()}
                    disabled={isScraping || isTriggeringScrape || !form.website_url.trim()}
                    title="Re-scrape branding from this website"
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white"
                  >
                    <MdAutorenew size={16} className={isScraping ? 'animate-spin' : ''} />
                  </button>
                )}
              </div>
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

      {isEditMode && scrapePreview && (
        <div className="mt-4 p-4 rounded-xl border border-primary-100 bg-primary-50/40">
          <div className="flex items-center justify-between mb-3">
            <Typography variant="subtitle2" className="font-semibold text-gray-800">
              Scraped from {form.website_url} — review before applying
            </Typography>
            <button
              type="button"
              onClick={() => setScrapePreview(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-3">
            {scrapePreview.logo_reference && (
              <div className="flex items-center gap-3">
                <img
                  src={scrapePreview.logo_reference}
                  alt="Scraped logo"
                  className="w-10 h-10 rounded-lg border border-gray-200 object-contain bg-white"
                />
                <span className="flex-1 text-sm text-gray-600 truncate">Logo found on site</span>
                <button
                  type="button"
                  onClick={() => applyScrapeField('logo_reference')}
                  className="text-xs font-semibold text-primary-600 hover:underline shrink-0"
                >
                  Use this logo
                </button>
              </div>
            )}
            {scrapePreview.description && (
              <div className="flex items-start gap-3">
                <p className="flex-1 text-sm text-gray-600 line-clamp-2">
                  {scrapePreview.description}
                </p>
                <button
                  type="button"
                  onClick={() => applyScrapeField('description')}
                  className="text-xs font-semibold text-primary-600 hover:underline shrink-0"
                >
                  Use description
                </button>
              </div>
            )}
            {scrapePreview.culture_text && (
              <div className="flex items-start gap-3">
                <p className="flex-1 text-sm text-gray-600 line-clamp-2">
                  {scrapePreview.culture_text}
                </p>
                <button
                  type="button"
                  onClick={() => applyScrapeField('culture_text')}
                  className="text-xs font-semibold text-primary-600 hover:underline shrink-0"
                >
                  Use as culture intro
                </button>
              </div>
            )}
            {!scrapePreview.logo_reference &&
              !scrapePreview.description &&
              !scrapePreview.culture_text && (
                <p className="text-sm text-gray-500">Nothing usable was found on this website.</p>
              )}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Applied fields are staged into the form below — click Save changes to persist them.
          </p>
        </div>
      )}

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
