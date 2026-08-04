type InterviewScoreProps = {
  evalResponse?: {
    overallScore: number | null;
    feedback?: string;
  };
};

const VideoInterviewScoreCard = ({ evalResponse }: InterviewScoreProps) => {
  return (
    <div className="border border-gray-300 rounded-lg p-4 mt-4 bg-white">
      <div className="flex justify-between items-center mb-2">
        <span className="text-gray-800 font-semibold whitespace-nowrap">
          Interview Score (Max 5):
        </span>
        <span className="text-gray-800  text-md">
          {evalResponse?.overallScore !== null && evalResponse?.overallScore !== undefined
            ? evalResponse.overallScore
            : 'Not scored yet'}
        </span>
      </div>
    </div>
  );
};

export default VideoInterviewScoreCard;
