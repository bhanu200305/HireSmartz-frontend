import React, { useState, useCallback } from 'react';
import { Button, Rate, message } from 'antd';
import {
  useSubmitFeedbackMutation,
  type FeedbackRecommendation,
} from '../../api/interview-service/client';

interface QuickFeedbackModalProps {
  open: boolean;
  bookingId: string;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

/**
 * Map the 5-star rating to the real backend's `recommendation` vocabulary
 * (`POST /bookings/{id}/feedback`, `strong_no | no | yes | strong_yes` —
 * see `SubmitFeedbackRequest` in interview-service). There is no "neutral"
 * value there, so a 3-star rating maps to `no` (a deliberate choice, not a
 * gap — flag to product if a different mapping is wanted).
 */
const RATING_TO_RECOMMENDATION: Record<number, FeedbackRecommendation> = {
  1: 'strong_no',
  2: 'no',
  3: 'no',
  4: 'yes',
  5: 'strong_yes',
};

const MAX_NOTES_LENGTH = 1000;

/**
 * Quick Feedback Modal
 *
 * Lightweight feedback form for interviewers to submit a star rating
 * and notes immediately after an interview ends.
 *
 * Calls POST /bookings/{bookingId}/feedback (SubmitInterviewFeedbackUseCase).
 */
const QuickFeedbackModal: React.FC<QuickFeedbackModalProps> = ({
  open,
  bookingId,
  onClose,
  onSubmitSuccess,
}) => {
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [submitFeedback, { isLoading: isSubmitting }] = useSubmitFeedbackMutation();

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_NOTES_LENGTH) {
      setNotes(value);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      message.warning('Please select a rating before submitting.');
      return;
    }
    const trimmedNotes = notes.trim();
    if (!trimmedNotes) {
      // The real endpoint requires non-empty notes (min_length=1) — this
      // modal used to treat notes as optional against the old, dead API.
      message.warning('Please add a note before submitting.');
      return;
    }

    try {
      await submitFeedback({
        bookingId,
        recommendation: RATING_TO_RECOMMENDATION[rating],
        notes: trimmedNotes,
      }).unwrap();

      message.success('Feedback submitted successfully');
      onSubmitSuccess();
    } catch (err: any) {
      const errorMsg = err?.data?.message || 'Failed to submit feedback';
      message.error(errorMsg);
      console.error('Quick feedback submission error:', err);
    }
  }, [rating, notes, bookingId, submitFeedback, onSubmitSuccess]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[560px] px-10 py-10 flex flex-col animate-[fadeIn_0.2s_ease-out]">
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Quick Feedback</h2>

        {/* Subtitle */}
        <p className="text-sm text-gray-500 mb-8 text-center">
          Fill the details given below to complete the feedback.
        </p>

        {/* Final Rating */}
        <div className="flex items-center justify-between border border-gray-200 rounded-lg px-5 py-4 mb-6">
          <span className="text-sm font-semibold text-brand-600">Final Rating</span>
          <Rate
            value={rating}
            onChange={setRating}
            count={5}
            style={{ fontSize: '24px' }}
            tooltips={['Strong No', 'No', 'Neutral', 'Yes', 'Strong Yes']}
          />
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label
            htmlFor="quick-feedback-notes"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Notes
          </label>
          <textarea
            id="quick-feedback-notes"
            value={notes}
            onChange={handleNotesChange}
            placeholder="Add your comments here..."
            rows={5}
            maxLength={MAX_NOTES_LENGTH}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
          />
          <div className="text-right text-xs text-gray-400 mt-1">
            {notes.length}/{MAX_NOTES_LENGTH} Characters
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center justify-center gap-4">
          <Button
            type="default"
            size="large"
            className="px-8 rounded-lg border-gray-300 text-gray-700 font-medium h-10"
            onClick={onClose}
            disabled={isSubmitting}
          >
            CANCEL
          </Button>
          <Button
            type="primary"
            size="large"
            className={`px-8 rounded-lg border-none font-medium h-10 transition-colors ${
              rating === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-brand-600 hover:!bg-brand-700 text-white'
            }`}
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={rating === 0}
          >
            SUBMIT
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickFeedbackModal;
