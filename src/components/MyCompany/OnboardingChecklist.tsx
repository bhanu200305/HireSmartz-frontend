import { useState } from 'react';
import { MdClose } from 'react-icons/md';
import { StepIndicator, type Step } from '../shared';

export type OnboardingChecklistStatus = {
  profileReviewed: boolean;
  hasOffice: boolean;
  hasDepartment: boolean;
  hasInvitedTeam: boolean;
};

type OnboardingChecklistProps = {
  companyId: string;
  status: OnboardingChecklistStatus;
  onNavigateToTab: (tabKey: string) => void;
};

const CHECKLIST_STEPS: (Step & { tabKey: string })[] = [
  {
    key: 'profile',
    label: 'Review your business profile',
    description: 'Confirm the pre-filled name, logo, and description.',
    tabKey: '1',
  },
  {
    key: 'offices',
    label: 'Add your office locations',
    description: 'Needed before you can schedule interviews.',
    tabKey: '2',
  },
  {
    key: 'departments',
    label: 'Create your departments',
    description: 'Jobs and team members get assigned to these.',
    tabKey: '3',
  },
  {
    key: 'team',
    label: 'Invite your team',
    description: 'One at a time, or import a spreadsheet in bulk.',
    tabKey: '8',
  },
];

const dismissKey = (companyId: string) => `cfp_onboarding_checklist_dismissed_${companyId}`;

/**
 * Guided "Getting started" banner for a newly-onboarded Company Admin — Journey 6
 * (confirm profile -> add offices -> create departments -> invite team). It doesn't
 * rebuild those screens; it just tracks completion and deep-links into the existing
 * tabs in the right order.
 */
const OnboardingChecklist = ({ companyId, status, onNavigateToTab }: OnboardingChecklistProps) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(
    () => localStorage.getItem(dismissKey(companyId)) === 'true'
  );

  const stepDoneMap: Record<string, boolean> = {
    profile: status.profileReviewed,
    offices: status.hasOffice,
    departments: status.hasDepartment,
    team: status.hasInvitedTeam,
  };
  const completedCount = CHECKLIST_STEPS.filter((step) => stepDoneMap[step.key]).length;
  const allDone = completedCount === CHECKLIST_STEPS.length;
  const currentStep =
    CHECKLIST_STEPS.findIndex((step) => !stepDoneMap[step.key]) + 1 || CHECKLIST_STEPS.length;

  if (allDone || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(dismissKey(companyId), 'true');
    setIsDismissed(true);
  };

  return (
    <div className="relative mb-6 rounded-2xl border border-brand-200 bg-brand-50/40 p-4 sm:p-5">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
        aria-label="Dismiss getting-started checklist"
      >
        <MdClose />
      </button>
      <div className="pr-6">
        <h3 className="text-sm font-semibold text-gray-800">
          Getting started ({completedCount}/{CHECKLIST_STEPS.length})
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          A few steps to finish setting up your workspace.
        </p>
      </div>
      <StepIndicator
        steps={CHECKLIST_STEPS}
        currentStep={currentStep}
        orientation="vertical"
        className="mt-3"
        onStepClick={(step) => onNavigateToTab((step as (typeof CHECKLIST_STEPS)[number]).tabKey)}
      />
    </div>
  );
};

export default OnboardingChecklist;
