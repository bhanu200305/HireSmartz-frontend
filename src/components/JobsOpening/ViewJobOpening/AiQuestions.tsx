import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { Loader } from '../../shared/ui/loader';
import { Typography } from '../../shared';

// Same fixed, view-only Sound Wave Round script as the create/edit wizard's
// Questions step (AiQuestionsSetup.tsx) — no backend concept of a "system"
// question set exists, so it's hardcoded identically in both places.
const SOUND_WAVE_ROUND_QUESTIONS = [
  "What's your current notice period or earliest available start date?",
  'Can you walk me through your resume at a high level?',
  'What are your salary expectations for this role?',
  'Why are you interested in this position?',
  'Are you authorized to work in the country where this role is based?',
  "What's driving you to look for a new opportunity right now?",
  'Do you have any scheduling constraints for interviews?',
];

const AiQuestions = () => {
  const { id } = useParams();
  const jobId = Number(id);

  const { data: jobData, isLoading } = useGetJobOpeningByIdQuery(
    { jobOpeningId: jobId },
    { skip: !jobId }
  );

  const questions = useMemo(() => jobData?.data.generalQuestions ?? [], [jobData]);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="width-full bg-[#E7E4E4] border border-[var(--border)] px-6 py-4 rounded-full mb-2 mt-6">
        <Typography variant="h6" className="text-gray-800 m-0">
          Questions
        </Typography>
      </div>

      <div className="flex items-center justify-between px-4">
        <Typography variant="subtitle1" className="font-bold text-gray-800 m-0">
          Sound Wave Round
        </Typography>
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-3 py-1">
          View only
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {SOUND_WAVE_ROUND_QUESTIONS.map((question, idx) => (
          <div
            key={idx}
            className="bg-gray-50 border border-[var(--border)] px-6 py-4 rounded-full"
          >
            <Typography variant="body2" className="text-gray-850 m-0">
              {question}
            </Typography>
          </div>
        ))}
      </div>

      <div className="px-4 mt-2">
        <Typography variant="subtitle1" className="font-bold text-gray-800 m-0">
          JD Questions ({questions.length})
        </Typography>
      </div>

      {questions.length === 0 ? (
        <p className="text-gray-400 font-medium italic text-sm pl-4">
          No JD questions configured for this job opening.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {questions.map((q: any) => (
            <div
              key={q.id}
              className="bg-white border border-[var(--border)] px-6 py-4 rounded-full shadow-sm"
            >
              <Typography variant="body2" className="text-gray-850 m-0">
                {q.question}
              </Typography>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AiQuestions;
