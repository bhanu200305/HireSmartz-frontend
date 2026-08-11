import React from 'react';
import { FaCheck } from 'react-icons/fa';

export type Step = {
  key: string;
  label: string;
  description?: string;
};

type StepIndicatorProps = {
  steps: Step[];
  /** 1-indexed — matches the existing `currentStep` convention used elsewhere in the app. */
  currentStep: number;
  /** Vertical, checklist-style layout (used for the MyCompany onboarding banner) instead of the default horizontal wizard rail. */
  orientation?: 'horizontal' | 'vertical';
  /** Vertical mode only — lets a completed/upcoming row be clicked to jump to it (e.g. deep-link into a tab). */
  onStepClick?: (step: Step, index: number) => void;
  className?: string;
};

const circleClasses = (state: 'done' | 'active' | 'upcoming') => {
  if (state === 'done') return 'bg-brand-600 border-brand-600 text-white';
  if (state === 'active') return 'bg-white border-brand-600 text-brand-600 font-semibold';
  return 'bg-white border-gray-300 text-gray-400';
};

/**
 * Labeled step tracker generalizing the numbered-circle pattern used in
 * JobsOpening/Candidates/InterviewSummary/Stepper.tsx — adds labels + a
 * completed-state check icon, and an optional vertical/checklist orientation.
 */
export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  orientation = 'horizontal',
  onStepClick,
  className = '',
}) => {
  if (orientation === 'vertical') {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const state: 'done' | 'active' | 'upcoming' =
            stepNumber < currentStep ? 'done' : stepNumber === currentStep ? 'active' : 'upcoming';
          const isClickable = Boolean(onStepClick);

          return (
            <button
              key={step.key}
              type="button"
              disabled={!isClickable}
              onClick={() => onStepClick?.(step, index)}
              className={`flex items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                isClickable ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs ${circleClasses(state)}`}
              >
                {state === 'done' ? <FaCheck className="h-3 w-3" /> : stepNumber}
              </span>
              <span>
                <span
                  className={`block text-sm ${state === 'upcoming' ? 'text-gray-500' : 'text-gray-900 font-medium'}`}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="block text-xs text-gray-400">{step.description}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex w-full items-start justify-center ${className}`}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const state: 'done' | 'active' | 'upcoming' =
          stepNumber < currentStep ? 'done' : stepNumber === currentStep ? 'active' : 'upcoming';

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-2">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm ${circleClasses(state)}`}
              >
                {state === 'done' ? <FaCheck className="h-3.5 w-3.5" /> : stepNumber}
              </span>
              <span
                className={`max-w-[7rem] text-center text-xs ${state === 'upcoming' ? 'text-gray-400' : 'text-gray-700 font-medium'}`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mt-4 h-0.5 w-10 shrink-0 sm:w-16 ${stepNumber < currentStep ? 'bg-brand-600' : 'bg-gray-200'}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepIndicator;
