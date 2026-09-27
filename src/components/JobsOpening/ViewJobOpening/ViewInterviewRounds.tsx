import { HiOutlineMinus, HiOutlinePlus } from 'react-icons/hi';
import { MdInfoOutline } from 'react-icons/md';
import { Outlet, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Loader } from '../../shared/ui/loader';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { asJobId } from '../../../api/job-service/jobId';
import { getVariantBadge } from '../EditJobOpening/sortableInterviewRounds';
import RoundInfoModal from '../../shared/ui/RoundInfoModal';
import { getRoundInfoContent } from '../../../shared/utils/roundInfoContent';

const ViewInterviewRound = () => {
  const [collapsedRounds, setCollapsedRounds] = useState<string[]>([]);
  const [infoRoundId, setInfoRoundId] = useState<string | null>(null);
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
        {jobData?.data.interviewRounds?.map((round, index) => {
          const badge = getVariantBadge(round.variant);
          const BadgeIcon = badge?.icon;
          const summary = round.duration ? `${round.duration} min` : '';
          return (
            <div key={round.id} className="relative mt-6">
              <div
                className="border shadow-lg rounded-lg p-6 bg-white relative"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex items-center flex-wrap gap-2">
                    <h3 className="text-lg">
                      <button
                        type="button"
                        className="cursor-pointer border-none bg-transparent p-0 text-lg"
                        onClick={() => toggleRound(round.id.toString())}
                      >
                        {index + 1}. {round.round?.name}
                      </button>
                    </h3>
                    {badge && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full whitespace-nowrap">
                        {BadgeIcon && <BadgeIcon className="text-sm shrink-0" />}
                        {badge.label}
                      </span>
                    )}
                    {summary && <span className="text-sm text-neutral-500">{summary}</span>}
                    <button
                      type="button"
                      className="text-neutral-400 hover:text-primary-600 cursor-pointer p-0.5"
                      onClick={() => setInfoRoundId(round.id.toString())}
                      aria-label={`About the ${round.round?.name} round`}
                    >
                      <MdInfoOutline size={16} />
                    </button>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0">
                    <button
                      className="cursor-pointer"
                      onClick={() => toggleRound(round.id.toString())}
                    >
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
                    <p>{round.description || 'No description provided.'}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <Outlet />
      </div>
      {infoRoundId &&
        (() => {
          const activeRound = jobData?.data.interviewRounds?.find(
            (round) => round.id.toString() === infoRoundId
          );
          if (!activeRound) return null;
          const badge = getVariantBadge(activeRound.variant);
          return (
            <RoundInfoModal
              roundName={activeRound.round?.name ?? 'Interview round'}
              badgeLabel={badge?.label}
              content={getRoundInfoContent({
                variant: activeRound.variant,
                roundName: activeRound.round?.name,
              })}
              fallbackText={activeRound.description}
              onClose={() => setInfoRoundId(null)}
            />
          );
        })()}
    </>
  );
};

export default ViewInterviewRound;
