import { Select } from 'antd';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { get } from 'lodash-es';
import { Button, Input, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import { countryCodes } from '../../constants/countryCode';
import { sanitizeInput } from '../../shared/utils/validation/input.helpers';
import { restrictPhoneDigits } from '../../shared/utils/validation/phoneValidation';
import { cleanPhoneNumber, makeFirstLetterUpperCase } from '../../shared/utils/methods';
import { useListIndustriesQuery } from '../../api/organization-service/Platform/industries';
import { useCreateTenantMutation } from '../../api/organization-service/Tenants/tenants';
import { tenantDetailsSchema, type TenantDetailsFormValues } from './TenantOnboardingSchema';
import type { TenantDraft } from './index';

// Shape GuestOrganizations/index.tsx hands over via router state when a
// Super Admin clicks "Approve" on a Book a Demo lead. Deliberately narrow —
// only the fields this step's form actually has room for; website/industry
// aren't collected by the demo form, so they stay for the Super Admin to
// fill in here rather than being guessed at.
export type GuestOrgPrefill = {
  id: string;
  companyName: string;
  adminEmail: string;
  contactNumber: string;
};

// Best-effort only: the demo form collects one free-text phone field with no
// guaranteed format or known country, while this step's phone field is
// validated against whichever country is selected (defaults to US/Canada —
// see adminContactCountryCode's own default below). Rather than seed a
// value that fails that validation, this only prefills when the last 10
// digits look like a plausible US/Canada number; anything else is left
// blank for the Super Admin to type in themselves.
const formatPrefillPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? digits : '';
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
  const { data: industries, isLoading: loadingIndustries } = useListIndustriesQuery();

  const location = useLocation();
  const fromGuestOrg = (location.state as { fromGuestOrg?: GuestOrgPrefill } | null)?.fromGuestOrg;

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
        adminContactCountryCode:
          initialValues?.adminContactCountryCode ??
          countryCodes.find((code) => code.label === 'United States & Canada (+1)')?.value ??
          '+1',
        adminContactPhone:
          initialValues?.adminContactPhone ??
          (fromGuestOrg ? formatPrefillPhone(fromGuestOrg.contactNumber) : ''),
      },
      mode: 'onChange',
    });

  const { errors, isValid } = formState;

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
        <div className="mb-4 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm text-brand-900">
          Pre-filled from a Book a Demo lead. Add a website to trigger the branding scrape, and
          confirm the industry, before creating the tenant.
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
            className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
            error={errors.websiteUrl?.message}
            noAutoCapitalize
          />
        </div>

        <div>
          <p className="text-sm text-gray-600">Industry</p>
          <div className="industry-select-wrapper flex items-center bg-white w-full px-4 mt-1 border rounded-3xl border-[var(--border)]">
            <Select
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
            value={watch('adminEmail')}
            onChange={(e) => {
              setValue('adminEmail', e.target.value.replace(/\s/g, ''), { shouldDirty: true });
              trigger('adminEmail');
            }}
            placeholder="founder@acme.com"
            className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
            error={errors.adminEmail?.message}
          />
        </div>

        <div className="sm:col-span-2">
          <p className="text-sm text-gray-600">
            Company Admin Contact <span className="required-asterisk">*</span>
          </p>
          <div className="phone-input-wrapper flex items-center bg-white w-full px-4 mt-1 border rounded-3xl border-[var(--border)]">
            <Select
              value={watch('adminContactCountryCode')}
              onChange={(value) =>
                setValue('adminContactCountryCode', value, { shouldDirty: true })
              }
              className="border-none focus:ring-0 focus:outline-none bg-transparent"
              dropdownStyle={{ minWidth: '300px' }}
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
                setValue('adminContactPhone', restrictPhoneDigits(e.target.value), {
                  shouldDirty: true,
                  shouldValidate: true,
                });
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
        disabled={!isValid || isLoading}
        className="w-full mt-6 text-white bg-[var(--color-primary)] rounded-3xl py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Scraping website…' : 'Create Tenant & Scrape Profile'}
      </Button>
    </form>
  );
};

export default StepCompanyDetails;
