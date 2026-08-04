type VideoInterviewFeedbackProps = {
  evalResponse?: {
    feedback?: string;
  };
};

const VideoInterviewFeedback = ({ evalResponse }: VideoInterviewFeedbackProps) => {
  const hasFeedback = evalResponse?.feedback && evalResponse.feedback.trim().length > 0;

  if (!hasFeedback) {
    return (
      <div className="flex flex-col space-y-2 text-center p-4">
        <div className="bg-gray-100 rounded-lg p-4">
          <p className="text-gray-600 font-medium">
            No feedback available yet. Feedback will appear here once the interview is evaluated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="bg-white rounded-lg">
        <p className="text-gray-700 whitespace-pre-wrap">{evalResponse.feedback}</p>
      </div>
    </div>
  );
};

export default VideoInterviewFeedback;
