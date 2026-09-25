import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';

interface InterviewEndedScreenProps {
  endedBy?: 'user' | 'recruiter' | 'ai';
}

/**
 * Interview Ended Screen
 *
 * Displays when an interview has concluded
 * Shows confirmation and provides navigation options
 */
export const InterviewEndedScreen: React.FC<InterviewEndedScreenProps> = ({ endedBy = 'user' }) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="text-center space-y-6 px-4">
        {/* Icon */}
        <div className="flex justify-center">
          <FaCheckCircle className="text-green-500" size={80} />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-white">
          {endedBy === 'ai'
            ? 'Your Interview Has Ended'
            : endedBy === 'recruiter'
              ? 'Interview Ended'
              : 'You Left the Meeting'}
        </h1>

        {/* Message */}
        <p className="text-lg text-gray-300 max-w-md mx-auto">
          {endedBy === 'ai'
            ? 'Your AI interview has ended. Thank you for participating — you may now leave this page.'
            : endedBy === 'recruiter'
              ? 'The interviewer has ended the call. Thank you for your participation.'
              : 'You have left the interview. Thank you for participating.'}
        </p>

        {/* Subtext */}
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          If you have any questions or concerns, please contact the hiring team.
        </p>

        {/* Footer */}
        <p className="text-xs text-gray-500 pt-8">
          Interview session closed at {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default InterviewEndedScreen;
