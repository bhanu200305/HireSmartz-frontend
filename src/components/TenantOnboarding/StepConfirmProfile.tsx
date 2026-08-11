import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { get } from 'lodash-es';
import { Button, Input, Textarea, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import { useConfirmTenantMutation } from '../../api/organization-service/Tenants/tenants';
import { tenantProfileSchema, type TenantProfileFormValues } from './TenantOnboardingSchema';
import type { TenantDraft } from './index';

type StepConfirmProfileProps = {
  draft: TenantDraft;
  onBack: () => void;
  onConfirmed: (invitationId: string) => void;
};

const StepConfirmProfile = ({ draft, onBack, onConfirmed }: StepConfirmProfileProps) => {
  const [confirmTenant, { isLoading }] = useConfirmTenantMutation();

  const { register, handleSubmit, watch, formState } = useForm<TenantProfileFormValues>({
    resolver: zodResolver(tenantProfileSchema),
    defaultValues: {
      name: draft.companyName,
      description: draft.scrapedPreview?.description || '',
      logoUrl: draft.scrapedPreview?.logo_url || '',
      colors: draft.scrapedPreview?.colors || [],
    },
    mode: 'onChange',
  });

  const { errors, isValid } = formState;
  const logoUrl = watch('logoUrl');
  const colors = draft.scrapedPreview?.colors || [];

  const onSubmit = async (data: TenantProfileFormValues) => {
    try {
      const response = await confirmTenant({
        tenantId: draft.tenantId,
        confirmed_profile_fields: {
          name: data.name,
          description: data.description,
          logo_url: data.logoUrl,
          colors,
        },
      }).unwrap();

      onConfirmed(response.invitation_id);
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to confirm tenant profile. Please try again.'),
        type: 'error',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {isLoading && <Loader />}

      <p className="text-sm text-gray-500 mb-4">
        We scraped a preview from{' '}
        <span className="font-medium text-gray-700">{draft.companyName}</span>
        &apos;s website. Review or edit it before the invite goes out.
      </p>

      <div className="flex items-center gap-4 mb-4">
        <div className="h-16 w-16 shrink-0 rounded-xl border border-[var(--border)] bg-white flex items-center justify-center overflow-hidden">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Scraped company logo"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-xs text-gray-400">No logo</span>
          )}
        </div>
        <div className="flex-1">
          <label htmlFor="logoUrl" className="text-sm text-gray-600">
            Logo URL
          </label>
          <Input
            id="logoUrl"
            {...register('logoUrl')}
            placeholder="https://acme.com/logo.png"
            className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
          />
        </div>
      </div>

      {colors.length > 0 && (
        <div className="mb-4">
          <span className="text-sm text-gray-600">Brand colors detected</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {colors.map((color) => (
              <span
                key={color}
                className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs"
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-black/10"
                  style={{ backgroundColor: color }}
                />
                {color}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="tenantProfileName" className="text-sm text-gray-600">
          Company Name <span className="required-asterisk">*</span>
        </label>
        <Input
          id="tenantProfileName"
          {...register('name')}
          className="bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
          error={errors.name?.message}
        />
      </div>

      <div className="mb-2">
        <label htmlFor="tenantProfileDescription" className="text-sm text-gray-600">
          Description
        </label>
        <Textarea
          id="tenantProfileDescription"
          rows={4}
          {...register('description')}
          className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-2xl text-gray-700 leading-6 resize-none"
          placeholder="What does this company do?"
        />
        {errors.description && (
          <p className="text-red-500 text-sm px-2 py-1">{errors.description.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2 mt-6">
        <Button
          type="button"
          appname="back"
          onClick={onBack}
          disabled={isLoading}
          className="w-full bg-white border text-black rounded-3xl py-3"
        >
          BACK
        </Button>
        <Button
          type="submit"
          appname="confirm tenant"
          disabled={!isValid || isLoading}
          className="w-full text-white bg-[var(--color-primary)] rounded-3xl py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Sending invite…' : 'Confirm & Send Invite'}
        </Button>
      </div>
    </form>
  );
};

export default StepConfirmProfile;
