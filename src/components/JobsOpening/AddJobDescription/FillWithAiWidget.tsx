import { useEffect, useRef, useState } from 'react';
import { Button, Textarea, showToast } from '../../shared';
import { useEnhanceJdMutation } from '../../../api/job-service/JobOpening/JdUpload';
import { useJdStatusPolling } from '../../../hooks/useJdStatusPolling';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';

interface FillWithAiWidgetProps {
  jobOpeningId: string;
}

// Matches EnhanceJdRequest.instruction's `max_length=2000` on the backend
// (services/job-service/app/modules/jobs/api/requests.py) — no minimum
// there, so none enforced here either beyond "typed something".
const INSTRUCTION_MAX_LENGTH = 2000;

/**
 * Floating "fill with AI" affordance for the Job Details create wizard —
 * replaces the earlier separate AI-Prompt entry point/page. Every job here
 * is a normal Manual-entry draft; this is just a more discoverable way to
 * reach the same `/jd/enhance` capability the "GENERATE DESCRIPTION"/
 * "REFINE" box on the AI Job Description step already uses; see
 * enhance_jd.py's docstring — it composes the JD from scratch off whatever
 * Job Details fields already happen to be filled in (even none) plus this
 * instruction, so it works before or after any manual filling.
 */
const FillWithAiWidget = ({ jobOpeningId }: FillWithAiWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [enhanceJd, { isLoading: isSubmitting }] = useEnhanceJdMutation();
  const {
    data: jdStatus,
    timedOut: jdStatusTimedOut,
    isFetching: jdStatusFetching,
  } = useJdStatusPolling(jobOpeningId);
  const isGenerating =
    !jdStatusFetching &&
    !jdStatusTimedOut &&
    (jdStatus?.status === 'GENERATING' || jdStatus?.status === 'PROCESSING');
  // JobDescriptionPanel's FAILED handling doesn't mount here, so show our own
  // toast; track per-job id so switching jobs doesn't suppress a new failure.
  const failedToastShownForJobRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      jobOpeningId &&
      !jdStatusFetching &&
      jdStatus?.status === 'FAILED' &&
      failedToastShownForJobRef.current !== jobOpeningId
    ) {
      failedToastShownForJobRef.current = jobOpeningId;
      showToast({
        message: jdStatus.error_message || 'Failed to generate the job description.',
        type: 'error',
      });
    }
  }, [jobOpeningId, jdStatus?.status, jdStatus?.error_message, jdStatusFetching]);

  if (!jobOpeningId) return null;

  const handleSubmit = async () => {
    const trimmed = promptText.trim();
    if (!trimmed) return;
    try {
      await enhanceJd({ jobOpeningId, instruction: trimmed }).unwrap();
      showToast({
        message: 'Generating your job description with AI…',
        type: 'success',
      });
      setPromptText('');
      setIsOpen(false);
    } catch (error) {
      showToast({
        message: getJobErrorMessage(error, 'Failed to start AI generation. Please try again.'),
        type: 'error',
      });
    }
  };

  return (
    // z-[1101]: clears MainLayout's sticky Footer at z-[1100].
    <div className="fixed bottom-6 right-6 z-[1101] flex flex-col items-end gap-3">
      {isOpen && (
        <div className="w-80 bg-white rounded-2xl shadow-lg border border-[var(--border)] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
              <span className="text-base">✨</span>
              Fill with AI
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Describe the role - AI drafts the job description from this, and from anything
            you&apos;ve already filled in below.
          </p>
          <Textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="e.g. Senior Backend Engineer, 5+ years, Python and distributed systems, hybrid in Bangalore..."
            rows={4}
            maxLength={INSTRUCTION_MAX_LENGTH}
            disabled={isSubmitting || isGenerating}
            noAutoCapitalize
            className="text-sm"
          />
          <Button
            className="w-full mt-3 text-white bg-button rounded-full py-2 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || isGenerating || !promptText.trim()}
          >
            {isGenerating ? 'WRITING YOUR JD…' : 'GENERATE'}
          </Button>
        </div>
      )}

      <Button
        className="text-white bg-button rounded-full h-14 px-5 flex items-center gap-2 shadow-lg text-sm font-semibold cursor-pointer"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="text-base">✨</span>
        Fill with AI
      </Button>
    </div>
  );
};

export default FillWithAiWidget;
