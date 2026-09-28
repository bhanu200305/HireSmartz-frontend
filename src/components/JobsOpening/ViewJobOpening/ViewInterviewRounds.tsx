import { HiOutlineMinus, HiOutlinePlus } from 'react-icons/hi';
import { MdInfoOutline } from 'react-icons/md';
import { Outlet, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Loader } from '../../shared/ui/loader';
import CollapseToggle from '../../shared/ui/CollapseToggle';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { useGetJobIntakeQuestionsQuery } from '../../../api/job-service/JobOpening/jobQuestions';
import { asJobId } from '../../../api/job-service/jobId';
import { getVariantBadge } from '../EditJobOpening/sortableInterviewRounds';
import RoundInfoModal from '../../shared/ui/RoundInfoModal';
import {
  getRoundInfoContent,
  getSpecialKindFromRoundName,
} from '../../../shared/utils/roundInfoContent';

const ViewInterviewRound = () => {
  const [collapsedRounds, setCollapsedRounds] = useState<string[]>([]);
  // Description starts open (membership = collapsed); Questions starts
  // closed (membership = expanded) - keeps the card compact by default
  // while still surfacing the description at a glance, same as before.
  const [collapsedDescriptions, setCollapsedDescriptions] = useState<string[]>([]);
  const [expandedQuestionSections, setExpandedQuestionSections] = useState<string[]>([]);
  const [infoRoundId, setInfoRoundId] = useState<string | null>(null);
  const { id } = useParams();
  const jobId = asJobId(id);
  const { data: jobData, isLoading } = useGetJobOpeningByIdQuery(
    { jobOpeningId: jobId },
    { skip: !jobId }
  );
  // Same endpoint the Edit screen's "Intake Call Questions" section
  // (JobIntakeQuestionsSection.tsx) reads and writes — `/intake-questions`,
  // not the older, write-less `/intake-call-questions` (getAudioQuestions)
  // this used to read from. Nothing in the app has ever written to that
  // endpoint, so whatever a recruiter actually set up under Edit never
  // showed up here.
  const { data: intakeData } = useGetJobIntakeQuestionsQuery(jobId, { skip: !jobId });
  const intakeQuestions = intakeData?.questions ?? [];
  const generalQuestions = jobData?.data.generalQuestions ?? [];

  const toggleRound = (roundId: string) => {
    setCollapsedRounds((prev) =>
      prev.includes(roundId) ? prev.filter((id) => id !== roundId) : [...prev, roundId]
    );
  };

  const toggleDescription = (roundId: string) => {
    setCollapsedDescriptions((prev) =>
      prev.includes(roundId) ? prev.filter((id) => id !== roundId) : [...prev, roundId]
    );
  };

  const toggleQuestions = (roundId: string) => {
    setExpandedQuestionSections((prev) =>
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
          const roundIdStr = round.id.toString();
          const specialKind = getSpecialKindFromRoundName(round.round?.name);
          // Intake Call's questions live behind a separate endpoint (they're
          // not part of the JD question bank), so source them from there
          // instead of `generalQuestions`.
          const isIntakeCall = specialKind === 'intake_call';
          // Resume Round is AI resume screening against the JD, not a Q&A
          // round — there's no question bank for it, so the section is
          // hidden below rather than always rendering an empty "Questions".
          const isResume = specialKind === 'resume';
          const roundQuestions = isIntakeCall
            ? intakeQuestions.map((q) => ({ id: q.job_intake_question_id, text: q.question_text }))
            : generalQuestions
                .filter((q) => String(q.interviewRoundId) === roundIdStr)
                .map((q) => ({ id: String(q.id), text: q.question }));
          const isDescriptionOpen = !collapsedDescriptions.includes(roundIdStr);
          const isQuestionsOpen = expandedQuestionSections.includes(roundIdStr);
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
                {!collapsedRounds.includes(roundIdStr) && (
                  <div className="mt-3 flex flex-col gap-3">
                    <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleDescription(roundIdStr)}
                        className="w-full flex items-center justify-between px-5 py-3 text-left cursor-pointer bg-neutral-50 hover:bg-neutral-100 transition-colors"
                        aria-expanded={isDescriptionOpen}
                      >
                        <span className="font-semibold text-sm text-gray-800">Description</span>
                        <CollapseToggle open={isDescriptionOpen} />
                      </button>
                      {isDescriptionOpen && (
                        <div className="px-5 py-4 text-sm text-gray-700 leading-relaxed">
                          {round.description || 'No description provided.'}
                        </div>
                      )}
                    </div>

                    {!isResume && (
                      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleQuestions(roundIdStr)}
                          className="w-full flex items-center justify-between px-5 py-3 text-left cursor-pointer bg-neutral-50 hover:bg-neutral-100 transition-colors"
                          aria-expanded={isQuestionsOpen}
                        >
                          <span className="font-semibold text-sm text-gray-800">
                            Questions
                            {roundQuestions.length > 0 ? ` (${roundQuestions.length})` : ''}
                          </span>
                          <CollapseToggle open={isQuestionsOpen} />
                        </button>
                        {isQuestionsOpen && (
                          <div className="px-5 py-4 flex flex-col gap-2">
                            {roundQuestions.map((q) => (
                              <div
                                key={q.id}
                                className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-700"
                              >
                                {q.text}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
