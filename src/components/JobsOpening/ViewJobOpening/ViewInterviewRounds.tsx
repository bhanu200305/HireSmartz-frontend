import { HiOutlineMinus, HiOutlinePlus } from 'react-icons/hi';
import { Outlet, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Loader } from '../../shared/ui/loader';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { asJobId } from '../../../api/job-service/jobId';

const ViewInterviewRound = () => {
  const [collapsedRounds, setCollapsedRounds] = useState<string[]>([]);
  const { id } = useParams();
  const jobId = asJobId(id);
  const { data: jobData, isLoading } = useGetJobOpeningByIdQuery(
    { jobOpeningId: jobId },
    { skip: !jobId }
  );

  const toggleRound = (roundId: string) => {
    setCollapsedRounds((prev) =>
      prev.includes(roundId) ? prev.filter((id) => id !== roundId) : [...prev, roundId]
    );
  };

  return (
    <>
      <div className="relative">
        {isLoading && <Loader />}
        {jobData?.data.interviewRounds?.map((round) => (
          <div key={round.id} className="relative mt-6">
            <div
              className="border shadow-lg rounded-lg p-6 bg-white relative"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between">
                <h3
                  className="text-lg cursor-pointer"
                  onClick={() => toggleRound(round.id.toString())}
                >
                  {round.round?.name}
                </h3>

                <div className="flex items-center space-x-4">
                  <button onClick={() => toggleRound(round.id.toString())}>
                    {collapsedRounds.includes(round.id.toString()) ? (
                      <HiOutlinePlus className="cursor-pointer" />
                    ) : (
                      <HiOutlineMinus className="cursor-pointer" />
                    )}
                  </button>
                </div>
              </div>
              {!collapsedRounds.includes(round.id.toString()) && (
                <div className="border border-[var(--border)] p-6 mt-2 rounded-lg shadow-md">
                  <p>{round.description}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        <Outlet />
      </div>
    </>
  );
};

export default ViewInterviewRound;
