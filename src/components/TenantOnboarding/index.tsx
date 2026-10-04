import BackButton from '../shared/ui/BackButton';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StepIndicator, type Step } from '../shared';
import MainLayout from '../../layouts/MainLayout';
import StepCompanyDetails from './StepCompanyDetails';
import StepConfirmProfile from './StepConfirmProfile';
import StepDone from './StepDone';
import type { ScrapedTenantPreview } from '../../api/organization-service/Tenants/tenants';
import type { TenantDetailsFormValues } from './TenantOnboardingSchema';

const WIZARD_STEPS: Step[] = [
  { key: 'details', label: 'Company details' },
  { key: 'confirm', label: 'Review & confirm' },
  { key: 'done', label: 'Invite sent' },
];

export type TenantDraft = {
  tenantId: string;
  companyName: string;
  adminEmail: string;
  scrapedPreview: ScrapedTenantPreview | null;
};

/**
 * Sales-led tenant onboarding wizard — Journey 5 (New company signs up).
 * Step 1 creates the tenant draft and triggers a website scrape;
 * step 2 lets the rep review/edit the scraped preview before the Company
 * Admin invite goes out; step 3 confirms the invite was sent.
 */
const TenantOnboardingWizard = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [draft, setDraft] = useState<TenantDraft | null>(null);
  const [invitationId, setInvitationId] = useState<string | null>(null);
  // Step 1 unmounts when we move to step 2, and remounts from scratch when
  // the rep clicks Back — react-hook-form's `defaultValues` only apply at
  // mount, so without this every field the rep typed reverts to blank on
  // Back. Keeping the last-submitted values here and handing them back in as
  // `initialValues` is what lets the remount pick up where it left off.
  const [companyDetails, setCompanyDetails] = useState<TenantDetailsFormValues | null>(null);

  const handleDraftCreated = (createdDraft: TenantDraft, formValues: TenantDetailsFormValues) => {
    setDraft(createdDraft);
    setCompanyDetails(formValues);
    setCurrentStep(2);
  };

  const handleConfirmed = (createdInvitationId: string) => {
    setInvitationId(createdInvitationId);
    setCurrentStep(3);
  };

  return (
    <MainLayout>
      <div className="flex flex-col items-center bg-white px-6 mt-6 pt-16 pb-10 relative">
        <div className="mb-4 self-start px-4 absolute top-6 left-0">
          <BackButton onClick={() => navigate(-1)} />
        </div>

        <div className="w-full max-w-2xl">
          <h2 className="text-center text-2xl font-semibold mb-1">New company onboarding</h2>
          <p className="text-center text-gray-500 mb-8">
            Create the tenant, confirm their profile, and send the Company Admin invite.
          </p>

          <StepIndicator steps={WIZARD_STEPS} currentStep={currentStep} className="mb-8" />

          <div className="bg-[#FAFAFA] p-8 rounded-2xl shadow-lg w-full">
            {currentStep === 1 && (
              <StepCompanyDetails onCreated={handleDraftCreated} initialValues={companyDetails} />
            )}
            {currentStep === 2 && draft && (
              <StepConfirmProfile
                draft={draft}
                onBack={() => setCurrentStep(1)}
                onConfirmed={handleConfirmed}
              />
            )}
            {currentStep === 3 && draft && (
              <StepDone
                companyName={draft.companyName}
                adminEmail={draft.adminEmail}
                invitationId={invitationId}
              />
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default TenantOnboardingWizard;
