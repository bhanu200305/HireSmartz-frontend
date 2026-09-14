import { useState } from 'react';
import clsx from 'clsx';
import { MdClose, MdCheck, MdArrowForward, MdOutlineRocketLaunch } from 'react-icons/md';

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

type ChecklistStep = {
  key: keyof OnboardingChecklistStatus;
  label: string;
  description: string;
  tabKey: string;
};

// tabKey values match MyCompany/index.tsx's Tabs `items` keys — keep these
// two in sync if that list is ever reordered.
const CHECKLIST_STEPS: ChecklistStep[] = [
  {
    key: 'profileReviewed',
    label: 'Review your business profile',
    description: 'Confirm the pre-filled name, logo, and description.',
    tabKey: '1',
  },
  {
    key: 'hasOffice',
    label: 'Add your office locations',
    description: 'Needed before you can schedule interviews.',
    tabKey: '2',
  },
  {
    key: 'hasDepartment',
    label: 'Create your departments',
    description: 'Jobs and team members get assigned to these.',
    tabKey: '3',
  },
  {
    key: 'hasInvitedTeam',
    label: 'Invite your team',
    description: 'One at a time, or import a spreadsheet in bulk.',
    tabKey: '5',
  },
];

const dismissKey = (companyId: string) => `cfp_onboarding_checklist_dismissed_${companyId}`;

/**
 * Guided "Getting started" banner for a newly-onboarded Company Admin — Journey 6
 * (confirm profile -> add offices -> create departments -> invite team). It doesn't
 * rebuild those screens; it just tracks completion and deep-links into the existing
 * tabs in the right order. Every step now reads a real, backend-derived signal
 * (see MyCompany/index.tsx) — none of this is tracked in localStorage anymore,
 * only the user's dismissal of the banner itself is.
 */
const OnboardingChecklist = ({ companyId, status, onNavigateToTab }: OnboardingChecklistProps) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(
    () => localStorage.getItem(dismissKey(companyId)) === 'true'
  );

  const completedCount = CHECKLIST_STEPS.filter((step) => status[step.key]).length;
  const totalCount = CHECKLIST_STEPS.length;
  const allDone = completedCount === totalCount;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const firstIncompleteKey = CHECKLIST_STEPS.find((step) => !status[step.key])?.key;

  if (allDone || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(dismissKey(companyId), 'true');
    setIsDismissed(true);
  };

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-brand-100 bg-white">
      <div className="flex items-start justify-between gap-3 bg-brand-50/60 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-lg text-white">
            <MdOutlineRocketLaunch />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Getting started</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              {completedCount} of {totalCount} steps done, a few things left to finish setting up
              your workspace.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 cursor-pointer rounded-full p-1.5 text-gray-400 hover:bg-white hover:text-gray-600"
          aria-label="Dismiss getting-started checklist"
        >
          <MdClose />
        </button>
      </div>

      <div className="px-5 pt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 p-3 sm:p-4">
        {CHECKLIST_STEPS.map((step, index) => {
          const isDone = status[step.key];
          const isCurrent = !isDone && step.key === firstIncompleteKey;

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onNavigateToTab(step.tabKey)}
              className={clsx(
                'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                isCurrent ? 'bg-brand-50 hover:bg-brand-100' : 'hover:bg-gray-50'
              )}
            >
              <span
                className={clsx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  isDone && 'bg-success text-white',
                  !isDone && isCurrent && 'border-2 border-brand-600 bg-white text-brand-600',
                  !isDone && !isCurrent && 'border-2 border-gray-300 bg-white text-gray-400'
                )}
              >
                {isDone ? <MdCheck className="h-4 w-4" /> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={clsx(
                    'block text-sm font-medium',
                    isDone ? 'text-gray-400 line-through' : 'text-gray-900'
                  )}
                >
                  {step.label}
                </span>
                <span className="block text-xs text-gray-400">{step.description}</span>
              </span>
              {!isDone && (
                <MdArrowForward
                  className={clsx(
                    'shrink-0 text-base',
                    isCurrent ? 'text-brand-600' : 'text-gray-300'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingChecklist;
