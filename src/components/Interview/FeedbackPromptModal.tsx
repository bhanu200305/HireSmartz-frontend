import React from 'react';
import { Button } from 'antd';
import { FaRegEdit } from 'react-icons/fa';
import { HiOutlineBolt } from 'react-icons/hi2';

interface FeedbackPromptModalProps {
  open: boolean;
  onSelectFullFeedback: () => void;
  onSelectQuickFeedback: () => void;
  onSkip: () => void;
  isSkipping?: boolean;
}

/**
 * Feedback Prompt Modal (Chooser)
 *
 * Shown to the interviewer after a video interview ends when the
 * should-prompt API returns true. Offers two feedback paths:
 * - Complete Full Feedback (navigates to candidate details page)
 * - Quick Feedback (opens inline quick feedback form)
 *
 * Also provides Skip and Cancel actions.
 */
const FeedbackPromptModal: React.FC<FeedbackPromptModalProps> = ({
  open,
  onSelectFullFeedback,
  onSelectQuickFeedback,
  onSkip,
  isSkipping = false,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[680px] px-10 py-10 flex flex-col items-center animate-[fadeIn_0.2s_ease-out]">
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Complete Feedback</h2>

        {/* Subtitle */}
        <p className="text-base text-gray-700 mb-1 text-center">
          Great job! How was the interview?
        </p>
        <p className="text-sm text-gray-500 mb-8 text-center max-w-md leading-relaxed">
          Your feedback is vital for the recruitment pipeline. Take a moment to record your thoughts
          while they&apos;re fresh.
        </p>

        {/* Option cards */}
        <div className="flex gap-5 mb-8 w-full max-w-md">
          {/* Complete Full Feedback card */}
          <button
            type="button"
            onClick={onSelectFullFeedback}
            className="flex-1 flex flex-col items-center justify-center gap-3 px-5 py-7 border-2 border-gray-200 rounded-xl cursor-pointer bg-white hover:border-brand-500 hover:shadow-lg transition-all duration-200 group"
          >
            <div className="w-12 h-12 rounded-lg bg-brand-600 flex items-center justify-center group-hover:bg-brand-700 transition-colors">
              <FaRegEdit className="text-white" size={22} />
            </div>
            <span className="text-sm font-semibold text-gray-800 text-center">
              Complete Full Feedback
            </span>
          </button>

          {/* Quick Feedback card */}
          <button
            type="button"
            onClick={onSelectQuickFeedback}
            className="flex-1 flex flex-col items-center justify-center gap-3 px-5 py-7 border-2 border-gray-200 rounded-xl cursor-pointer bg-white hover:border-brand-500 hover:shadow-lg transition-all duration-200 group"
          >
            <div className="w-12 h-12 rounded-lg bg-brand-600 flex items-center justify-center group-hover:bg-brand-700 transition-colors">
              <HiOutlineBolt className="text-white" size={24} />
            </div>
            <span className="text-sm font-semibold text-gray-800 text-center">Quick Feedback</span>
          </button>
        </div>

        {/* Bottom actions */}
        <div className="flex items-center gap-4">
          <Button
            type="primary"
            size="large"
            className="px-8 rounded-lg bg-brand-600 hover:!bg-brand-700 border-none font-medium h-10"
            onClick={onSkip}
            loading={isSkipping}
          >
            Skip For Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPromptModal;
