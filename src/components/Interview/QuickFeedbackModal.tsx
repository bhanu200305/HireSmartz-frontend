import React, { useState, useCallback } from 'react';
import { Button, Rate, message } from 'antd';
import { useQuickSubmitFeedbackMutation } from '../../api/interview-service/InterviewFeedback/index';

interface QuickFeedbackModalProps {
  open: boolean;
  bookingId: number;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

/** Map star rating (1-5) to decision string */
const RATING_TO_DECISION: Record<number, string> = {
  1: 'STRONG_NO',
  2: 'NO',
  3: 'NEUTRAL',
  4: 'YES',
  5: 'STRONG_YES',
};

const MAX_NOTES_LENGTH = 1000;

/**
 * Quick Feedback Modal
 *
 * Lightweight feedback form for interviewers to submit a star rating
 * and optional notes immediately after an interview ends.
 *
 * Calls POST /v1/interview-feedback/quick-submit.
 */
const QuickFeedbackModal: React.FC<QuickFeedbackModalProps> = ({
  open,
  bookingId,
  onClose,
  onSubmitSuccess,
}) => {
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [quickSubmitFeedback, { isLoading: isSubmitting }] = useQuickSubmitFeedbackMutation();

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

    try {
      await quickSubmitFeedback({
        bookingId,
        rating,
        notes: notes.trim() || undefined,
        decision: RATING_TO_DECISION[rating] as any,
        actionSource: 'END_CALL_PROMPT',
        markAsCompleted: true,
      }).unwrap();

      message.success('Feedback submitted successfully');
      onSubmitSuccess();
    } catch (err: any) {
      const errorMsg = err?.data?.message || 'Failed to submit feedback';
      message.error(errorMsg);
      console.error('Quick feedback submission error:', err);
    }
  }, [rating, notes, bookingId, quickSubmitFeedback, onSubmitSuccess]);

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
          <span className="text-sm font-semibold text-blue-600">Final Rating</span>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder="Add your comments here..."
            rows={5}
            maxLength={MAX_NOTES_LENGTH}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
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
                : 'bg-blue-600 hover:!bg-blue-700 text-white'
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
