import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { Loader } from '../../shared/ui/loader';
import { Typography } from '../../shared';
import { asJobId } from '../../../api/job-service/jobId';
import { useGetAudioQuestionsQuery } from '../../../api/job-service/JobOpening/jobQuestions';

const AiQuestions = () => {
  const { id } = useParams();
  const jobId = asJobId(id);

  const { data: jobData, isLoading } = useGetJobOpeningByIdQuery(
    { jobOpeningId: jobId },
    { skip: !jobId }
  );
  const { data: audioData } = useGetAudioQuestionsQuery(jobId, { skip: !jobId });

  const questions = useMemo(() => jobData?.data.generalQuestions ?? [], [jobData]);
  const audioQuestions = audioData?.questions ?? [];

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
          Intake Questions
        </Typography>
        <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-3 py-1">
          View only
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {audioQuestions.length === 0 ? (
          <p className="text-gray-400 italic text-sm px-4">No intake questions configured.</p>
        ) : (
          audioQuestions.map((question) => (
            <div
              key={question.question_id}
              className="bg-gray-50 border border-[var(--border)] px-6 py-4 rounded-full"
            >
              <Typography variant="body2" className="text-gray-850 m-0">
                {question.question_text}
              </Typography>
            </div>
          ))
        )}
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
