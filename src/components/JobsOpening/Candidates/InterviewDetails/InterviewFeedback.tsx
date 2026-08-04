import { EvaluationResponseDto } from '../../../../types';

type InterviewFeedbackProps = {
  evalResponse?: EvaluationResponseDto;
};

const InterviewFeedback = ({ evalResponse }: InterviewFeedbackProps) => (
  <p>
    {evalResponse?.interview_feedback ? (
      evalResponse?.interview_feedback
    ) : (
      <p className="font-black">No feedback from managers yet</p>
    )}
  </p>
);

export default InterviewFeedback;
