import { useState } from 'react';

interface InterviewConsentModalProps {
  title: string;
  description: string[] | React.ReactNode;
  disclaimer?: React.ReactNode;
  consentLabel?: string;
  onCancel: () => void;
  onContinue: () => void;
  cancelText?: string;
  continueText?: string;
  requireCheckbox?: boolean;
  panelClassName?: string;
}

const InterviewConsentModal = ({
  title,
  description,
  disclaimer,
  consentLabel,
  onCancel,
  onContinue,
  cancelText = 'Cancel',
  continueText = 'Continue',
  requireCheckbox = true,
  panelClassName = 'max-w-95',
}: InterviewConsentModalProps) => {
  const [isChecked, setIsChecked] = useState(false);
  const disableContinue = requireCheckbox ? !isChecked : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className={`w-full ${panelClassName} rounded-2xl bg-[#F2F2F2] p-7 shadow-2xl`}>
        <h2 className="leading-tight tracking-normal text-[#2D2D2D] text-center">
          <span className="block text-2xl sm:text-3xl font-semibold">{title}</span>
        </h2>

        <div className="mt-5 text-base leading-snug text-[#2D2D2D] sm:text-lg">
          {Array.isArray(description) ? (
            <div className="space-y-1">
              {description.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          ) : (
            description
          )}
        </div>

        {requireCheckbox && consentLabel ? (
          <label className="mt-6 flex cursor-pointer items-start gap-2 text-base leading-snug text-[#2D2D2D] sm:text-base">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(event) => setIsChecked(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#1D4ED8]"
            />
            <span>{consentLabel}</span>
          </label>
        ) : null}

        {disclaimer ? (
          <div className="mt-4 text-base leading-snug text-[#2D2D2D] sm:text-base">
            {disclaimer}
          </div>
        ) : null}

        <div className="mt-7 flex justify-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-w-30 rounded-lg border border-[#B8BDC4] bg-[#F2F2F2] px-5 py-2.5 text-xs font-semibold text-[#2D2D2D] transition hover:bg-[#E8EAED] cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={disableContinue}
            onClick={onContinue}
            className="min-w-30 rounded-lg px-5 py-2.5 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-[#B9BDC3] enabled:bg-linear-to-r enabled:from-[#3CB6EC] enabled:to-[#263DAA] enabled:hover:opacity-90"
          >
            {continueText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewConsentModal;
