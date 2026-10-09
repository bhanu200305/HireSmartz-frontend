import { useEffect, useRef, useState } from 'react';
import { Select } from 'antd';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { get } from 'lodash-es';
import { Button, Input, NameTitleSelect, PhoneNumberField, showToast } from '../shared';
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
// (`location`/`jobTitle`/`referralSource`) have nowhere to go on the wire,
// and this step's form has no fields for them. They're carried through and
// shown as read-only reference context in the banner below, so a Super Admin
// can still see them instead of the data silently vanishing the moment a lead
// is approved. `companySize` is different: it prefills the Company Size field
// and is sent with the tenant.
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
        companySize:
          initialValues?.companySize ??
          (fromGuestOrg?.companySize ? String(fromGuestOrg.companySize) : ''),
        primaryContactFirstName: initialValues?.primaryContactFirstName ?? '',
        primaryContactLastName: initialValues?.primaryContactLastName ?? '',
        primaryContactTitle: initialValues?.primaryContactTitle ?? '',
        adminEmail: initialValues?.adminEmail ?? fromGuestOrg?.adminEmail ?? '',
        secondaryContactFirstName: initialValues?.secondaryContactFirstName ?? '',
        secondaryContactLastName: initialValues?.secondaryContactLastName ?? '',
        secondaryContactCountryCode:
          initialValues?.secondaryContactCountryCode ?? defaultAdminContactCountryCode,
        secondaryContactPhone: initialValues?.secondaryContactPhone ?? '',
        secondaryContactEmail: initialValues?.secondaryContactEmail ?? '',
        secondaryContactTitle: initialValues?.secondaryContactTitle ?? '',
        secondaryContactRole: initialValues?.secondaryContactRole ?? '',
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
        company_size: data.companySize ? Number(data.companySize) : undefined,
        admin_email: data.adminEmail,
        admin_contact: `${data.adminContactCountryCode}${cleanPhoneNumber(data.adminContactPhone)}`,
        primary_contact_first_name: sanitizeInput(data.primaryContactFirstName),
        primary_contact_last_name: sanitizeInput(data.primaryContactLastName),
        primary_contact_title: data.primaryContactTitle,
        // Secondary Contact: only what was filled in; a blank is left out.
        secondary_contact_first_name: data.secondaryContactFirstName?.trim() || undefined,
        secondary_contact_last_name: data.secondaryContactLastName?.trim() || undefined,
        secondary_contact_phone: data.secondaryContactPhone
          ? `${data.secondaryContactCountryCode}${cleanPhoneNumber(data.secondaryContactPhone)}`
          : undefined,
        secondary_contact_email: data.secondaryContactEmail?.trim() || undefined,
        secondary_contact_title: data.secondaryContactTitle || undefined,
        secondary_contact_role: data.secondaryContactRole?.trim() || undefined,
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
              <dt className="font-semibold tracking-wide text-brand-600">Location</dt>
              <dd>{fromGuestOrg.location || '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold tracking-wide text-brand-600">Company Size</dt>
              <dd>{fromGuestOrg.companySize ? `${fromGuestOrg.companySize}+ employees` : '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold tracking-wide text-brand-600">
                Requester&apos;s Job Title
              </dt>
              <dd>{fromGuestOrg.jobTitle || '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold tracking-wide text-brand-600">Heard About Us Via</dt>
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

        <div>
          <label htmlFor="companySize" className="text-sm text-gray-600">
            Company Size
          </label>
          <Input
            id="companySize"
            {...register('companySize')}
            inputMode="numeric"
            placeholder="Number of employees (optional)"
            className="bg-white w-full h-11 px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
            error={errors.companySize?.message}
            noAutoCapitalize
          />
        </div>

        <div className="sm:col-span-2 mt-2 border-t border-gray-200 pt-4">
          <h3 className="text-base font-semibold text-gray-800">Primary Contact</h3>
          <p className="text-xs text-gray-400">
            The company&apos;s main contact. They become the Company Admin and get the invite.
          </p>
        </div>

        <div>
          <label htmlFor="primaryContactFirstName" className="text-sm text-gray-600">
            First Name <span className="required-asterisk">*</span>
          </label>
          <Input
            id="primaryContactFirstName"
            {...register('primaryContactFirstName')}
            placeholder="First Name"
            className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
            error={errors.primaryContactFirstName?.message}
          />
        </div>

        <div>
          <label htmlFor="primaryContactLastName" className="text-sm text-gray-600">
            Last Name <span className="required-asterisk">*</span>
          </label>
          <Input
            id="primaryContactLastName"
            {...register('primaryContactLastName')}
            placeholder="Last Name"
            className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
            error={errors.primaryContactLastName?.message}
          />
        </div>

        <div>
          <label htmlFor="primaryContactTitle" className="text-sm text-gray-600">
            Title <span className="required-asterisk">*</span>
          </label>
          <NameTitleSelect
            id="primaryContactTitle"
            className="w-full mt-1"
            value={watch('primaryContactTitle')}
            onChange={(value) =>
              setValue('primaryContactTitle', value ?? '', {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          {errors.primaryContactTitle && (
            <p className="text-red-500 text-sm px-2 py-1">{errors.primaryContactTitle.message}</p>
          )}
        </div>

        <div>
          <p className="text-sm text-gray-600">Role</p>
          {/* Always Company Admin: this person becomes the new company's admin. */}
          <div className="flex h-11 items-center mt-1 rounded-3xl border border-[var(--border)] bg-gray-50 px-4 text-sm text-gray-600">
            Company Admin
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="adminEmail" className="text-sm text-gray-600">
            Email <span className="required-asterisk">*</span>
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
            Phone Number <span className="required-asterisk">*</span>
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
              placeholder="Phone Number"
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

        <div className="sm:col-span-2 mt-2 rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
          <h3 className="text-base font-semibold text-gray-800">Secondary Contact (optional)</h3>
          <p className="mb-3 text-xs text-gray-400">
            A backup contact for reference. They don&apos;t get a login.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="secondaryContactFirstName" className="text-sm text-gray-600">
                First Name
              </label>
              <Input
                id="secondaryContactFirstName"
                {...register('secondaryContactFirstName')}
                placeholder="First Name"
                className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              />
            </div>
            <div>
              <label htmlFor="secondaryContactLastName" className="text-sm text-gray-600">
                Last Name
              </label>
              <Input
                id="secondaryContactLastName"
                {...register('secondaryContactLastName')}
                placeholder="Last Name"
                className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              />
            </div>
            <div>
              <label htmlFor="secondaryContactTitle" className="text-sm text-gray-600">
                Title
              </label>
              <NameTitleSelect
                id="secondaryContactTitle"
                className="w-full mt-1"
                value={watch('secondaryContactTitle')}
                onChange={(value) =>
                  setValue('secondaryContactTitle', value ?? '', { shouldDirty: true })
                }
              />
            </div>
            <div>
              <label htmlFor="secondaryContactRole" className="text-sm text-gray-600">
                Role
              </label>
              <Input
                id="secondaryContactRole"
                {...register('secondaryContactRole')}
                placeholder="e.g. IT Admin"
                className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              />
            </div>
            <div>
              <label htmlFor="secondaryContactEmail" className="text-sm text-gray-600">
                Email
              </label>
              <Input
                id="secondaryContactEmail"
                type="email"
                noAutoCapitalize
                {...register('secondaryContactEmail')}
                placeholder="it@acme.com"
                className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                error={errors.secondaryContactEmail?.message}
              />
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone Number</p>
              <div className="mt-1">
                <PhoneNumberField
                  countryCode={watch('secondaryContactCountryCode')}
                  onCountryCodeChange={(value) =>
                    setValue('secondaryContactCountryCode', value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  phoneNumber={watch('secondaryContactPhone') ?? ''}
                  onPhoneNumberChange={(value) =>
                    setValue('secondaryContactPhone', value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              </div>
              {errors.secondaryContactPhone && (
                <p className="text-red-500 text-sm px-2 py-1">
                  {errors.secondaryContactPhone.message}
                </p>
              )}
            </div>
          </div>
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
