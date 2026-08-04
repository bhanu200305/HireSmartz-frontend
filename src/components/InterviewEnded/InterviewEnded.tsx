import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface InterviewEndedProps {
  open: boolean;
  onClose: () => void;
  isInterviewer?: boolean;
}

const InterviewEnded: React.FC<InterviewEndedProps> = ({ open, onClose, isInterviewer }) => {
  const location = useLocation();
  const isCandidate = location.pathname.toLowerCase().includes('candidate');

  const [timer, setTimer] = useState(5);

  useEffect(() => {
    if (!open || !isInterviewer) return;
    setTimer(5);
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 1 ? prev - 1 : 1));
    }, 1000);
    const timeout = setTimeout(() => {
      onClose();
    }, 5000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [open, isInterviewer, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 w-screen h-screen">
      <div className="bg-white rounded-lg shadow-lg p-8 min-w-[350px] max-w-full relative flex flex-col items-center">
        {isInterviewer ? (
          <div className="flex flex-col items-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Thank You</h1>
            <p className="text-lg text-gray-600 mb-4">
              The interview has ended. Please submit feedback.
            </p>
            <div className="text-2xl font-semibold text-blue-600 mb-4">
              Redirecting in {timer}...
            </div>
            <div className="flex gap-4 mt-4">
              <button
                className="w-[200px] h-[50px] px-4 py-2 cursor-pointer bg-button text-white rounded-full text-sm font-medium flex items-center justify-center space-x-2"
                type="button"
                onClick={onClose}
              >
                Submit Feedback
              </button>
            </div>
          </div>
        ) : isCandidate ? (
          <>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Thank You Candidate</h1>
            <p className="text-lg text-gray-600 mb-4">The interview has ended.</p>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Thank You</h1>
            <p className="text-lg text-gray-600 mb-4">The interview has ended.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default InterviewEnded;
