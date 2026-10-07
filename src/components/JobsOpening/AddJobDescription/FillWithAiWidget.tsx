import { useEffect, useRef, useState } from 'react';
import { Button, Textarea, showToast } from '../../shared';
import {
  useGetFieldSuggestionsQuery,
  useRequestFieldSuggestionsMutation,
} from '../../../api/job-service/JobOpening/SuggestJobFields';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import type { FieldSuggestions } from '../../../shared/utils/fieldSuggestions';

interface FillWithAiWidgetProps {
  jobOpeningId: string;
  /** Puts the suggestions on the form, blank fields only. Returns a short summary of what was filled. */
  onSuggestions: (suggestions: FieldSuggestions) => string;
}

// Matches the backend limit on the description.
const TEXT_MAX_LENGTH = 2000;
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 60_000;

/**
 * Floating helper on Job Details: describe the role and AI fills the empty fields it can
 * find. It never writes the job description and saves nothing; the user still reviews
 * the form and presses Save & Next.
 */
const FillWithAiWidget = ({ jobOpeningId, onSuggestions }: FillWithAiWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [requestSuggestions, { isLoading: isSubmitting }] = useRequestFieldSuggestionsMutation();
  const { data: result } = useGetFieldSuggestionsQuery(jobOpeningId, {
    skip: !isWaiting,
    pollingInterval: POLL_INTERVAL_MS,
    refetchOnMountOrArgChange: true,
  });
  const onSuggestionsRef = useRef(onSuggestions);
  onSuggestionsRef.current = onSuggestions;

  useEffect(() => {
    if (!isWaiting || !result) return;
    if (result.status === 'READY' && result.suggestions) {
      setIsWaiting(false);
      showToast({ message: onSuggestionsRef.current(result.suggestions), type: 'success' });
      setPromptText('');
      setIsOpen(false);
    } else if (result.status === 'FAILED') {
      setIsWaiting(false);
      showToast({ message: result.message || 'Could not read that description.', type: 'error' });
    }
  }, [isWaiting, result]);

  useEffect(() => {
    if (!isWaiting) return;
    const timeoutId = setTimeout(() => {
      setIsWaiting(false);
      showToast({ message: 'This is taking too long. Please try again.', type: 'warning' });
    }, POLL_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [isWaiting]);

  const handleSubmit = async () => {
    const trimmed = promptText.trim();
    if (!trimmed) return;
    try {
      await requestSuggestions({ jobOpeningId, text: trimmed }).unwrap();
      setIsWaiting(true);
    } catch (error) {
      showToast({
        message: getJobErrorMessage(error, 'Could not start. Please try again.'),
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
            Describe the role and AI fills the empty fields below it can find. Anything you have
            already typed stays as it is, and nothing is saved until you press Save &amp; Next.
          </p>
          <Textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="e.g. Senior Backend Engineer, 5+ years, 2 openings, hybrid in Bangalore, $90-130k..."
            rows={4}
            maxLength={TEXT_MAX_LENGTH}
            disabled={isSubmitting || isWaiting}
            noAutoCapitalize
            className="text-sm"
          />
          <Button
            className="w-full mt-3 text-white bg-button rounded-full py-2 flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || isWaiting || !promptText.trim()}
          >
            {isWaiting ? 'Reading…' : 'Fill Fields'}
          </Button>
        </div>
      )}

      <Button
        className="text-white bg-button rounded-full h-14 px-5 flex items-center gap-2 shadow-lg text-sm font-semibold cursor-pointer"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="text-base">✨</span>
        Fill With AI
      </Button>
    </div>
  );
};

export default FillWithAiWidget;
