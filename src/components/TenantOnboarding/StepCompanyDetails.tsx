import { Select } from 'antd';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { get } from 'lodash-es';
import { Button, Input, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import DropdownWithAddOption from '../shared/ui/DropdownWithAddOption';
import { countryCodes } from '../../constants/countryCode';
import {
  handlePhoneNumberChange,
  sanitizeInput,
} from '../../shared/utils/validation/input.helpers';
import { cleanPhoneNumber, makeFirstLetterUpperCase } from '../../shared/utils/methods';
import {
  useGetMasterIndustriesQuery,
  useAddMasterIndustryMutation,
  useUpdateMasterIndustryMutation,
} from '../../api/tenant-service/CompanySettings/industries';
import { useCreateTenantMutation } from '../../api/organization-service/Tenants/tenants';
import { tenantDetailsSchema, type TenantDetailsFormValues } from './TenantOnboardingSchema';
import type { TenantDraft } from './index';

type StepCompanyDetailsProps = {
  onCreated: (draft: TenantDraft) => void;
};

const StepCompanyDetails = ({ onCreated }: StepCompanyDetailsProps) => {
  const [createTenant, { isLoading }] = useCreateTenantMutation();
  const [addMasterIndustry] = useAddMasterIndustryMutation();
  const [updateMasterIndustry] = useUpdateMasterIndustryMutation();

  const {
    data: industriesData,
    isLoading: loadingIndustries,
    refetch: refetchIndustries,
  } = useGetMasterIndustriesQuery({
    status: 'all',
    page: 0,
    size: 1000,
    sortBy: 'name',
    sortDirection: 'ASC',
  });

  const industries = Array.isArray(industriesData)
    ? industriesData
    : ((industriesData as { content?: unknown })?.content as Array<{
        id: number;
        name: string;
        status: boolean;
      }>) || [];

  const { register, handleSubmit, watch, setValue, trigger, formState } =
    useForm<TenantDetailsFormValues>({
      resolver: zodResolver(tenantDetailsSchema),
      defaultValues: {
        companyName: '',
        websiteUrl: '',
        industryId: '',
        adminEmail: '',
        adminContactCountryCode:
          countryCodes.find((code) => code.label === 'United States & Canada (+1)')?.value || '+1',
        adminContactPhone: '',
      },
      mode: 'onChange',
    });

  const { errors, isValid } = formState;

  const handleAddIndustryOption = async (industryName: string): Promise<void> => {
    const trimmedName = industryName.trim();
    if (!trimmedName) {
      showToast({ message: 'Industry name cannot be empty.', type: 'error' });
      return;
    }
    try {
      const response = await addMasterIndustry({ name: trimmedName, status: true }).unwrap();
      await refetchIndustries();
      const newIndustryId = response?.data?.id;
      if (newIndustryId) {
        setValue('industryId', String(newIndustryId), { shouldDirty: true, shouldValidate: true });
      }
      showToast({ message: 'Industry created successfully.', type: 'success' });
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to create industry.'),
        type: 'error',
      });
    }
  };

  const handleEditIndustryOption = async (
    industryId: string | number,
    newName: string
  ): Promise<void> => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      showToast({ message: 'Industry name cannot be empty.', type: 'error' });
      return;
    }
    try {
      await updateMasterIndustry({
        id: Number(industryId),
        name: trimmedName,
        status: true,
      }).unwrap();
      await refetchIndustries();
      showToast({ message: 'Industry updated successfully.', type: 'success' });
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to update industry.'),
        type: 'error',
      });
    }
  };

  const onSubmit = async (data: TenantDetailsFormValues) => {
    try {
      const response = await createTenant({
        company_name: makeFirstLetterUpperCase(sanitizeInput(data.companyName)),
        website_url: data.websiteUrl,
        industry_id: data.industryId,
        admin_email: data.adminEmail,
        admin_contact: `${data.adminContactCountryCode}${cleanPhoneNumber(data.adminContactPhone)}`,
      }).unwrap();

      onCreated({
        tenantId: response.tenant_id,
        companyName: data.companyName,
        adminEmail: data.adminEmail,
        scrapedPreview: response.scraped_preview,
      });
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
            Website <span className="required-asterisk">*</span>
          </label>
          <Input
            id="websiteUrl"
            {...register('websiteUrl')}
            placeholder="https://acme.com"
            className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
            error={errors.websiteUrl?.message}
          />
        </div>

        <div>
          <p className="text-sm text-gray-600">
            Industry <span className="required-asterisk">*</span>
          </p>
          <div className="mt-1">
            <DropdownWithAddOption
              className="w-full custom-select-jobs placeholder-style"
              value={watch('industryId') || undefined}
              onChange={(value) =>
                setValue('industryId', String(value ?? ''), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              options={industries.map((industry) => ({
                id: String(industry.id),
                name: industry.name,
                isDeleted: industry.status === false,
              }))}
              loading={loadingIndustries}
              placeholder="Select Industry"
              label="Industry"
              type="industry"
              onAddOption={handleAddIndustryOption}
              onEditOption={handleEditIndustryOption}
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
              placeholder="(555) 123-4567"
              value={watch('adminContactPhone')}
              onChange={(e) => handlePhoneNumberChange(e, setValue, 'adminContactPhone', trigger)}
              maxLength={14}
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
