import React, { useEffect, useRef, useState } from 'react';
import { Dropdown, Upload, type MenuProps } from 'antd';
import {
  MdEdit,
  MdOutlineFileUpload,
  MdOutlineCropRotate,
  MdBusiness,
  MdLanguage,
  MdGroups,
  MdDescription,
  MdPhone,
  MdAutorenew,
} from 'react-icons/md';
import { Button, Input, Textarea, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import ImageCropModal from '../shared/ui/ImageCropModal';
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

// ai-service's ResilientWebsiteScraper reports one of three specific reasons
// on FAILED (see that module's docstring) — none of them are a certain
// diagnosis, just the best inference available (e.g. "blocked or
// inaccessible" also fires for a page that's simply very sparse), so this
// deliberately hedges rather than asserting a cause, and always steers the
// admin to fill the fields in by hand either way.
const getScrapeFailureMessage = (reason: string | null): string => {
  if (!reason) return 'Could not scrape this website. Please fill in the details manually.';
  if (reason.startsWith('site unreachable')) {
    return "Couldn't reach this website — check the URL, or try again in a moment.";
  }
  if (reason.startsWith('site blocked or inaccessible')) {
    return "Couldn't load this site automatically — it may be blocking automated access. Please fill in the details manually.";
  }
  if (reason.startsWith('insufficient content')) {
    return "This page didn't have enough content to pull details from. Please fill in the details manually.";
  }
  return 'Could not scrape this website. Please fill in the details manually.';
};

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
  admin_contact: string;
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
  admin_contact: profile?.admin_contact || '',
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
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormState>(toFormState(undefined, ''));
  const canEdit = useHasAccess(Authorities.COMPANY_SETTINGS_EDIT);
  const [logoPreview, setLogoPreview] = useState('');
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  // Controlled explicitly (not left to antd's own hover/click default) so
  // the open menu survives the mouse leaving the avatar circle on its way
  // down to a menu item — the menu itself renders in a portal outside this
  // div, so that transit is a real mouseleave on the avatar. Tying the
  // Dropdown's MOUNT (not just its visual overlay) to isLogoHovered used to
  // unmount the whole trigger — menu included — the instant that happened,
  // which is what made it "vanish" before a click could land.
  const [isLogoMenuOpen, setIsLogoMenuOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  // Set once handleLogoCropConfirm's upload call resolves, cleared once Save (or
  // Cancel) resolves it. Uploading only stages a storage key server-side —
  // see request_tenant_logo_upload.py, which never touches the tenant row —
  // so this is what lets handleSave apply it, instead of the upload handler
  // applying it itself the instant a file is picked.
  const [pendingLogoStorageKey, setPendingLogoStorageKey] = useState<string | null>(null);
  const logoUploadRef = useRef<HTMLButtonElement>(null);
  // The crop step sits between "logo candidate picked" (a disk file, an
  // applied scrape preview, or the CURRENT logo re-opened for adjustment —
  // see handleLogoFileSelected/handleAdjustScrapedLogo/
  // handleAdjustCurrentLogo below) and "uploaded" — same shape as
  // UserProfile's avatar crop flow (ImageCropModal is the same component).
  // Nothing here survives past confirm/cancel, so it doesn't need to reset
  // on every open.
  const [isLogoCropModalOpen, setIsLogoCropModalOpen] = useState(false);
  const [logoCropImageSrc, setLogoCropImageSrc] = useState('');
  const [pendingCropFileName, setPendingCropFileName] = useState('company-logo.jpg');
  // Only set when THIS crop session created a fresh blob: URL for a
  // freshly-picked disk file — that's the only source that needs revoking
  // on cancel/confirm. Re-adjusting the already-displayed logoPreview
  // reuses that string as-is (it's still needed for the avatar afterward,
  // successful crop or not), so tracking "did we create this" separately
  // from "does it look like a blob: URL" avoids revoking a URL something
  // else still owns.
  const [logoCropObjectUrl, setLogoCropObjectUrl] = useState<string | null>(null);

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
            message: getScrapeFailureMessage(result.reason),
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
      // A scraped logo replaces whatever a disk upload had staged — only
      // one of the two should ever reach handleSave's payload.
      setPendingLogoStorageKey(null);
    } else if (field === 'description' && scrapePreview.description) {
      setForm((prev) => ({ ...prev, description: scrapePreview.description! }));
    } else if (field === 'culture_text' && scrapePreview.culture_text) {
      setForm((prev) => ({ ...prev, culture_intro: scrapePreview.culture_text! }));
    }
  };

  // Separate from applyScrapeField('logo_reference') above: that one applies
  // the scraped image exactly as ai-service found it (the reliable path — a
  // third-party URL that a same-origin canvas read can't always process, see
  // CrossOriginCropError), while this opens the same crop step a disk
  // upload goes through, so the user can reframe a scraped logo that's a
  // wide/short wordmark rather than a square mark before it goes into the
  // circular avatar this app displays it in. Ends up going through
  // handleLogoCropConfirm exactly like a freshly picked file.
  const handleAdjustScrapedLogo = () => {
    if (!scrapePreview?.logo_reference) return;
    setLogoCropImageSrc(scrapePreview.logo_reference);
    setLogoCropObjectUrl(null);
    setPendingCropFileName('company-logo.jpg');
    setIsLogoCropModalOpen(true);
  };

  // Re-opens the crop step on the logo ALREADY showing (whichever way it
  // got there — upload or "Use this logo") instead of requiring a brand new
  // file first. This is the "adjust" half of the logo's click menu below
  // ("Select new image" is the other). Reuses logoPreview directly rather
  // than creating a new object URL — see logoCropObjectUrl's own comment.
  const handleAdjustCurrentLogo = () => {
    if (!logoPreview) return;
    setLogoCropImageSrc(logoPreview);
    setLogoCropObjectUrl(null);
    setPendingCropFileName(pendingCropFileName || 'company-logo.jpg');
    setIsLogoCropModalOpen(true);
  };

  // Clicking the logo avatar (in edit mode) opens this instead of jumping
  // straight to the file picker — there are now two different things
  // "click the logo" can mean (pick a different image, or just reframe the
  // one already showing), so it asks rather than assuming.
  const logoMenuItems: MenuProps['items'] = [
    { key: 'select', label: 'Select new image', icon: <MdOutlineFileUpload /> },
    { key: 'adjust', label: 'Adjust current logo', icon: <MdOutlineCropRotate /> },
  ];
  const handleLogoMenuClick: NonNullable<MenuProps['onClick']> = ({ key }) => {
    if (key === 'select') logoUploadRef.current?.click();
    if (key === 'adjust') handleAdjustCurrentLogo();
  };

  // Picking a file no longer uploads it straight away — it opens the crop
  // step first (handleLogoCropConfirm below does the actual upload once the
  // user applies their adjustment), same flow as UserProfile's avatar
  // upload. LIST_IGNORE, not `false`: antd's own upload list/behavior is
  // never used, cropping owns the rest of the flow.
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
      // Upload only — stages a storage key, doesn't touch the tenant row.
      // Applying it is handleSave's job, same as every other field here, so
      // picking/adjusting a logo and leaving without saving no longer
      // changes anything (see pendingLogoStorageKey's own comment above).
      // This is now the ONLY way `logo` reaches handleSave's payload —
      // applyScrapeField used to set logoPreview to the scraped URL
      // directly and let handleSave send that URL as-is; routing it
      // through this same crop+upload step instead means a scraped logo
      // becomes an owned storage key too, not a third-party URL persisted
      // verbatim.
      const { storage_key } = await uploadLogo({ tenantId, file: croppedFile }).unwrap();
      setPendingLogoStorageKey(storage_key);
      showToast({ message: 'Logo selected. Save changes to apply.', type: 'success' });
    } catch (err) {
      setLogoPreview(profile?.logo_url || '');
      showToast({ message: getOrgErrorMessage(err, 'Failed to upload logo.'), type: 'error' });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (isLoading) return <Loader />;
  if (!profile) {
    return <div className="p-6 text-gray-500">Company profile is not available.</div>;
  }

  const handleField =
    (field: keyof ProfileFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (field === 'description' && descriptionError) setDescriptionError(null);
    };

  const handleCancel = () => {
    setForm(toFormState(profile, cultureIntroValue ?? ''));
    setLogoPreview(profile?.logo_url || '');
    setScrapePreview(null);
    setPendingLogoStorageKey(null);
    setDescriptionError(null);
    setIsEditMode(false);
  };

  const handleSave = async () => {
    const parsedSize = form.company_size ? Number(form.company_size) : undefined;
    if (form.company_size && (!Number.isFinite(parsedSize) || Number(parsedSize) < 1)) {
      showToast({ message: 'Company size must be a positive number.', type: 'error' });
      return;
    }
    setDescriptionError(null);
    try {
      // `logo` is included for either a staged disk/cropped upload
      // (pendingLogoStorageKey — the common case, and also where a scraped
      // logo lands once it's been through the "Adjust" crop step; see
      // handleLogoCropConfirm) or a scraped logo applied AS-IS via "Use
      // this logo" (`logoPreview` holds ai-service's logo_reference URL
      // unmodified in that case — kept as a fallback specifically because
      // that URL is a third-party asset the crop step's canvas read can
      // fail against if its host doesn't send permissive CORS headers; see
      // CrossOriginCropError). The two are mutually exclusive — applying
      // either one clears the other's state — so this never sends both.
      // `logoPreview` alone is never trusted here when it's a `blob:` URL:
      // that's only ever a local upload preview, never a real value to
      // persist.
      const scrapedLogoAppliedAsIs =
        !pendingLogoStorageKey &&
        logoPreview &&
        logoPreview !== (profile?.logo_url || '') &&
        !logoPreview.startsWith('blob:');
      await updateProfile({
        tenantId,
        name: form.name,
        description: form.description,
        website_url: form.website_url,
        company_size: parsedSize,
        admin_contact: form.admin_contact,
        ...(pendingLogoStorageKey
          ? { logo: pendingLogoStorageKey }
          : scrapedLogoAppliedAsIs
            ? { logo: logoPreview }
            : {}),
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
      setPendingLogoStorageKey(null);
      showToast({ message: 'Company profile updated.', type: 'success' });
      setIsEditMode(false);
      refetch();
    } catch (err) {
      const message = getOrgErrorMessage(err, 'Failed to update company profile.');
      setDescriptionError(message);
      showToast({ message, type: 'error' });
    }
  };

  const fields: {
    key: keyof ProfileFormState;
    label: string;
    icon: React.ReactNode;
    fullWidth?: boolean;
    // Mirrors TenantModel's own column widths (organization_models.py) — no
    // upper bound would let a value type past what the backend can store,
    // which the PATCH would otherwise only reject after a round trip.
    maxLength?: number;
  }[] = [
    { key: 'name', label: 'Company name', icon: <MdBusiness size={16} />, maxLength: 200 },
    { key: 'website_url', label: 'Website', icon: <MdLanguage size={16} />, maxLength: 2048 },
    { key: 'company_size', label: 'Company size', icon: <MdGroups size={16} /> },
    {
      key: 'admin_contact',
      label: 'Admin contact',
      icon: <MdPhone size={16} />,
      maxLength: 40,
    },
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
        // object-contain + a little padding, not object-cover: a scraped
        // logo is frequently a wide/short wordmark, not a square mark, and
        // `cover` was filling this circle by cropping most of it away
        // (see the crop step above for how the user can now fix the
        // FRAMING themselves instead of just getting whatever `cover`
        // picked). The padding keeps a contained image off the circle's
        // clipped corners.
        className="w-full h-full object-contain p-2"
        onError={() => setLogoPreview('')}
      />
      {isEditMode && canEdit && (
        <Upload
          beforeUpload={handleLogoFileSelected}
          showUploadList={false}
          className="hidden"
          accept="image/png, image/jpeg"
        >
          <button ref={logoUploadRef} className="hidden cursor-pointer"></button>
        </Upload>
      )}
      {isEditMode && canEdit && !isUploadingLogo && (
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
  ) : isEditMode && canEdit ? (
    <Upload.Dragger
      beforeUpload={handleLogoFileSelected}
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
            <Typography variant="h4" className="min-w-0 truncate font-semibold text-gray-900">
              {form.name || 'Untitled company'}
            </Typography>
            {profile.status && (
              <Badge status={STATUS_BADGE[profile.status] || 'neutral'} className="shrink-0">
                {profile.status}
              </Badge>
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
        {fields.map(({ key, label, icon, fullWidth, maxLength }) => (
          <div
            key={key}
            className={`min-w-0 p-4 rounded-xl border border-gray-100 bg-white ${fullWidth ? 'sm:col-span-2' : ''}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 shrink-0 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                {icon}
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
            </div>
            {isEditMode ? (
              <div className={key === 'website_url' ? 'flex items-center gap-2' : ''}>
                {fullWidth ? (
                  <>
                    <Textarea
                      value={form[key]}
                      onChange={handleField(key)}
                      placeholder={label}
                      rows={4}
                      error={key === 'description' ? (descriptionError ?? undefined) : undefined}
                    />
                    {key === 'description' && (
                      <p className="mt-1 text-xs text-gray-400">
                        Do not include discriminatory, abusive, or hateful language.
                      </p>
                    )}
                  </>
                ) : (
                  <Input
                    value={form[key]}
                    onChange={handleField(key)}
                    placeholder={label}
                    maxLength={maxLength}
                    noAutoCapitalize={key === 'website_url'}
                  />
                )}
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
              <Typography variant="body1" className="whitespace-pre-line break-words text-gray-800">
                {form[key] || '-'}
              </Typography>
            )}
          </div>
        ))}
      </div>

      {isEditMode && scrapePreview && (
        <div className="mt-4 p-4 rounded-xl border border-primary-100 bg-primary-50/40">
          <div className="flex items-center justify-between mb-3">
            <Typography variant="subtitle2" className="font-semibold text-gray-800">
              Scraped from {form.website_url}, review before applying
            </Typography>
            <button
              type="button"
              onClick={() => setScrapePreview(null)}
              className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
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
                  onClick={handleAdjustScrapedLogo}
                  className="text-xs font-semibold text-gray-600 hover:underline shrink-0 cursor-pointer"
                >
                  Adjust &amp; use
                </button>
                <button
                  type="button"
                  onClick={() => applyScrapeField('logo_reference')}
                  className="text-xs font-semibold text-primary-600 hover:underline shrink-0 cursor-pointer"
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
                  className="text-xs font-semibold text-primary-600 hover:underline shrink-0 cursor-pointer"
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
                  className="text-xs font-semibold text-primary-600 hover:underline shrink-0 cursor-pointer"
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
            Applied fields are staged into the form below. Click Save changes to persist them.
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

export default CompanyProfileTab;
