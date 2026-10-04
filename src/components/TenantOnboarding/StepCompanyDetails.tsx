import { useEffect, useRef, useState } from 'react';
import { Select } from 'antd';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { get } from 'lodash-es';
import { Button, Input, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import { countryCodes } from '../../constants/countryCode';
import { sanitizeInput } from '../../shared/utils/validation/input.helpers';
import { restrictPhoneDigitsForCountry } from '../../shared/utils/validation/phoneValidation';
import { cleanPhoneNumber, makeFirstLetterUpperCase } from '../../shared/utils/methods';
import { useListIndustriesQuery } from '../../api/organization-service/Platform/industries';
import {
  useCreateTenantMutation,
  useLazyCheckAdminEmailAvailabilityQuery,
} from '../../api/organization-service/Tenants/tenants';
import { tenantDetailsSchema, type TenantDetailsFormValues } from './TenantOnboardingSchema';
import type { TenantDraft } from './index';

// How long to wait after the operator stops typing before asking the
// server — same "don't fire on every keystroke" reasoning as any live
// search box. 409 on submit is still the real enforcement; this is purely
// an earlier heads-up.
const EMAIL_CHECK_DEBOUNCE_MS = 400;

// Shape GuestOrganizations/index.tsx hands over via router state when a
// Super Admin clicks "Approve" on a Book a Demo lead. `companyName`/
// `adminEmail`/`contactNumber` feed real form fields below; the rest
// (`location`/`companySize`/`jobTitle`/`referralSource`) have nowhere to go
// on the wire yet — `CreateTenantRequest` doesn't accept them, and this
// step's form has no fields for them either (website/industry are the only
// non-lead extras it collects). They're carried through anyway and shown as
// read-only reference context in the banner below, so a Super Admin can
// still see and act on them manually instead of the data silently
// vanishing the moment a lead is approved.
export type GuestOrgPrefill = {
  id: string;
  companyName: string;
  adminEmail: string;
  contactNumber: string;
  location: string;
  companySize: number;
  jobTitle: string;
  referralSource: string | null;
};

type StepCompanyDetailsProps = {
  onCreated: (draft: TenantDraft, formValues: TenantDetailsFormValues) => void;
  // What the rep last typed here, handed back by the wizard after a trip to
  // step 2 and Back — see index.tsx's `companyDetails` state. `null` on a
  // fresh visit.
  initialValues?: TenantDetailsFormValues | null;
};

// The industry catalog itself (add/edit/delete) is a Super Admin action —
// CompanySettings/IndustriesTab.tsx, its own real screen, gated on
// INDUSTRY_WRITE. Creating a company only needs to pick from what already
// exists there; it doesn't need (and the person doing it may not hold
// permission for) an inline "add a new industry" shortcut, which is also
// why this no longer reuses DropdownWithAddOption.
const StepCompanyDetails = ({ onCreated, initialValues }: StepCompanyDetailsProps) => {
  const [createTenant, { isLoading }] = useCreateTenantMutation();
  // includeInactive: false — a deactivated industry shouldn't be offered
  // when setting up a brand-new company. Industry has no separate picker
  // endpoint (unlike Department/Job Title/Office), so this list is shared
  // with IndustriesTab.tsx's own management table, which omits this to see
  // everything.
  const { data: industries, isLoading: loadingIndustries } = useListIndustriesQuery({
    includeInactive: false,
  });
  const [checkAdminEmailAvailability, { isFetching: isCheckingEmail }] =
    useLazyCheckAdminEmailAvailabilityQuery();
  const [emailTakenMessage, setEmailTakenMessage] = useState<string | null>(null);
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const location = useLocation();
  const fromGuestOrg = (location.state as { fromGuestOrg?: GuestOrgPrefill } | null)?.fromGuestOrg;

  // Resolved once, upfront, rather than inline in `defaultValues` below —
  // the phone prefill needs this same value to know which country to clamp
  // the demo lead's free-text number against.
  const defaultAdminContactCountryCode =
    initialValues?.adminContactCountryCode ??
    countryCodes.find((code) => code.label === 'United States & Canada (+1)')?.value ??
    '+1';

  const { register, handleSubmit, watch, setValue, trigger, formState } =
    useForm<TenantDetailsFormValues>({
      resolver: zodResolver(tenantDetailsSchema),
      // `initialValues` (what was typed before Back) wins over the
      // Book-a-Demo prefill, which only ever applies to a blank, first visit.
      defaultValues: {
        companyName: initialValues?.companyName ?? fromGuestOrg?.companyName ?? '',
        websiteUrl: initialValues?.websiteUrl ?? '',
        industryId: initialValues?.industryId ?? '',
        adminEmail: initialValues?.adminEmail ?? fromGuestOrg?.adminEmail ?? '',
        adminContactCountryCode: defaultAdminContactCountryCode,
        // The demo form collects one free-text phone field with no
        // guaranteed format or known country — this just clamps it to
        // whatever's a *plausible* length for the country the field defaults
        // to (same clamp `PhoneNumberField` applies on every keystroke), so
        // a too-long/garbled paste doesn't sail past validation as one long
        // digit string. It was previously an all-or-nothing US/Canada
        // 10-digit regex that silently dropped every other country's lead.
        adminContactPhone:
          initialValues?.adminContactPhone ??
          (fromGuestOrg
            ? restrictPhoneDigitsForCountry(
                fromGuestOrg.contactNumber,
                defaultAdminContactCountryCode
              )
            : ''),
      },
      mode: 'onChange',
    });

  const { errors, isValid } = formState;
  const adminEmailValue = watch('adminEmail');

  // Live check: ask the server once the operator pauses typing, but only
  // once the field is already a syntactically plausible email — no point
  // checking something the zod schema will reject on its own, and it
  // avoids firing on every partial keystroke.
  useEffect(() => {
    if (emailCheckTimer.current) {
      clearTimeout(emailCheckTimer.current);
    }

    if (!adminEmailValue || errors.adminEmail) {
      setEmailTakenMessage(null);
      return undefined;
    }

    emailCheckTimer.current = setTimeout(() => {
      checkAdminEmailAvailability(adminEmailValue)
        .unwrap()
        .then((result) => {
          setEmailTakenMessage(
            result.available ? null : 'This email is already registered to another company.'
          );
        })
        .catch(() => {
          // A failed availability check should never block typing or
          // submitting — the 409 on actual submit is still the real
          // enforcement either way, this is only an earlier heads-up.
          setEmailTakenMessage(null);
        });
    }, EMAIL_CHECK_DEBOUNCE_MS);

    return () => {
      if (emailCheckTimer.current) {
        clearTimeout(emailCheckTimer.current);
      }
    };
  }, [adminEmailValue, errors.adminEmail]);

  const onSubmit = async (data: TenantDetailsFormValues) => {
    try {
      const response = await createTenant({
        company_name: makeFirstLetterUpperCase(sanitizeInput(data.companyName)),
        // Both optional on the backend — send undefined rather than '' so an
        // unset field is actually absent, not a value that fails UUID/URL
        // parsing server-side. A website_url here triggers ai-service's
        // branding scrape (bounded to ~15s server-side — see
        // HttpAiScrapeClient in organization-service); leaving it unset means
        // Create Tenant returns immediately with no scraped_preview.
        website_url: data.websiteUrl?.trim() || undefined,
        industry_id: data.industryId || undefined,
        admin_email: data.adminEmail,
        admin_contact: `${data.adminContactCountryCode}${cleanPhoneNumber(data.adminContactPhone)}`,
        source_guest_organization_id: fromGuestOrg?.id,
      }).unwrap();

      onCreated(
        {
          tenantId: response.tenant_id,
          companyName: data.companyName,
          adminEmail: data.adminEmail,
          scrapedPreview: response.scraped_preview,
        },
        data
      );
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to create tenant. Please try again.'),
        type: 'error',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {isLoading && <Loader />}

      {fromGuestOrg && (
        <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <p>
            Pre-filled from a Book a Demo lead. Add a website to trigger the branding scrape, and
            confirm the industry, before creating the tenant.
          </p>
          {/* Reference only — none of these have a field on this form or a
              slot on the wire to create the tenant with (CreateTenantRequest
              doesn't accept them), so they're shown here rather than
              silently dropped the moment the lead is approved. */}
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-brand-800 sm:grid-cols-4">
            <div>
              <dt className="font-semibold uppercase tracking-wide text-brand-600">Location</dt>
              <dd>{fromGuestOrg.location || '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide text-brand-600">Company size</dt>
              <dd>{fromGuestOrg.companySize ? `${fromGuestOrg.companySize}+ employees` : '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide text-brand-600">
                Requester&apos;s job title
              </dt>
              <dd>{fromGuestOrg.jobTitle || '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide text-brand-600">
                Heard about us via
              </dt>
              <dd>{fromGuestOrg.referralSource || '—'}</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <div className="sm:col-span-2">
          <label htmlFor="companyName" className="text-sm text-gray-600">
            Company Name <span className="required-asterisk">*</span>
          </label>
          <Input
            id="companyName"
            {...register('companyName')}
            placeholder="Acme Inc"
            className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
            error={errors.companyName?.message}
          />
        </div>

        <div>
          <label htmlFor="websiteUrl" className="text-sm text-gray-600">
            Website
          </label>
          <Input
            id="websiteUrl"
            {...register('websiteUrl')}
            placeholder="https://acme.com"
            className="bg-white w-full h-11 px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
            error={errors.websiteUrl?.message}
            noAutoCapitalize
          />
        </div>

        <div>
          <label htmlFor="industryId" className="text-sm text-gray-600">
            Industry
          </label>
          <div className="industry-select-wrapper flex items-center bg-white w-full h-11 px-1 mt-1 border rounded-3xl border-[var(--border)]">
            <Select
              id="industryId"
              className="w-full custom-select-jobs placeholder-style"
              variant="borderless"
              value={watch('industryId') || undefined}
              onChange={(value) =>
                setValue('industryId', value ?? '', { shouldDirty: true, shouldValidate: true })
              }
              allowClear
              showSearch
              optionFilterProp="label"
              loading={loadingIndustries}
              placeholder="Select industry (optional)"
              options={(industries || []).map((industry) => ({
                label: industry.name,
                value: industry.industry_id,
              }))}
            />
          </div>
          {errors.industryId && (
            <p className="text-red-500 text-sm px-2 py-1">{errors.industryId.message}</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="adminEmail" className="text-sm text-gray-600">
            Company Admin Email <span className="required-asterisk">*</span>
          </label>
          <Input
            id="adminEmail"
            type="email"
            noAutoCapitalize
            value={watch('adminEmail')}
            onChange={(e) => {
              setValue('adminEmail', e.target.value.replace(/\s/g, ''), { shouldDirty: true });
              trigger('adminEmail');
            }}
            placeholder="founder@acme.com"
            className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
            error={errors.adminEmail?.message ?? emailTakenMessage ?? undefined}
          />
          {isCheckingEmail && !errors.adminEmail && (
            <p className="text-gray-400 text-xs px-2 py-1">Checking availability…</p>
          )}
        </div>

        <div className="sm:col-span-2">
          <p className="text-sm text-gray-600">
            Company Admin Contact <span className="required-asterisk">*</span>
          </p>
          <div className="phone-input-wrapper flex items-center bg-white w-full px-4 mt-1 border rounded-3xl border-[var(--border)]">
            <Select
              value={watch('adminContactCountryCode')}
              onChange={(value) => {
                setValue('adminContactCountryCode', value, { shouldDirty: true });
                setValue(
                  'adminContactPhone',
                  restrictPhoneDigitsForCountry(watch('adminContactPhone') ?? '', value),
                  { shouldDirty: true, shouldValidate: true }
                );
              }}
              className="border-none focus:ring-0 focus:outline-none bg-transparent"
              dropdownStyle={{ minWidth: 'min(300px, 92vw)' }}
              variant="borderless"
              style={{ width: '80px', fontSize: '14px' }}
              options={countryCodes.map(({ label, value, short }) => ({
                label: `${short} - ${label}`,
                value,
              }))}
              optionLabelProp="value"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              tabIndex={-1}
            />
            <div className="border-l-2 border-gray-300 h-6 mx-2" />
            <Input
              type="tel"
              placeholder="Phone number"
              value={watch('adminContactPhone')}
              onChange={(e) => {
                setValue(
                  'adminContactPhone',
                  restrictPhoneDigitsForCountry(
                    e.target.value,
                    watch('adminContactCountryCode') ?? ''
                  ),
                  { shouldDirty: true, shouldValidate: true }
                );
                trigger('adminContactPhone');
              }}
              maxLength={15}
              className="border-none focus:ring-0 focus:outline-none w-full"
            />
          </div>
          {errors.adminContactPhone && (
            <p className="text-red-500 text-sm px-2 py-1">{errors.adminContactPhone.message}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        Office locations, departments, and profile details are filled in later by the Company Admin
        after they accept the invite.
      </p>

      <Button
        type="submit"
        appname="create tenant"
        disabled={!isValid || isLoading || Boolean(emailTakenMessage)}
        className="w-full mt-6 text-white bg-[var(--color-primary)] rounded-3xl py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Scraping Website…' : 'Create Tenant & Fetch Profile'}
      </Button>
    </form>
  );
};

export default StepCompanyDetails;
