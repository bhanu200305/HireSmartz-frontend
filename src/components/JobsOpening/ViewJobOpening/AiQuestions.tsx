import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { Loader } from '../../shared/ui/loader';
import { Typography } from '../../shared';

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
          General Questions ({questions.length})
        </Typography>
      </div>

      {questions.length === 0 ? (
        <p className="text-gray-400 font-medium italic text-sm pl-4">
          No general questions configured for this job opening.
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
