import { Outlet, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Loader } from '../../shared/ui/loader';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import {
  useGetJobIntakeQuestionsQuery,
  useGetJobQuestionsQuery,
} from '../../../api/job-service/JobOpening/jobQuestions';
import AiAnswerBadge from '../AddJobDescription/AiAnswerBadge';
import { asJobId } from '../../../api/job-service/jobId';
import { getVariantBadge } from '../EditJobOpening/sortableInterviewRounds';
import useJobOpeningDropdown from '../../../hooks/useJobOpeningDropdown';
import {
  getRoundInfoSections,
  getSpecialKindFromRoundName,
} from '../../../shared/utils/roundInfoContent';
import RoundInfoButton from '../../shared/ui/RoundInfoButton';

const ViewInterviewRound = () => {
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const { id } = useParams();
  const jobId = asJobId(id);
  const { data: jobData, isLoading } = useGetJobOpeningByIdQuery(
    { jobOpeningId: jobId },
    { skip: !jobId }
  );
  // Same endpoint the Edit screen's "Intake Call Questions" section reads and writes.
  const { data: intakeData } = useGetJobIntakeQuestionsQuery(jobId, { skip: !jobId });
  // The round's own question list: it carries the answer and the round's order.
  const { data: questionsData } = useGetJobQuestionsQuery(
    { jobOpeningId: jobId },
    { skip: !jobId }
  );
  const { jobOpeningDropdown: roundTypes } = useJobOpeningDropdown('ROUNDS', 'view');
  const variantLabelOverrides = useMemo(
    () => Object.assign({}, ...roundTypes.map((round) => round.variant_labels ?? {})),
    [roundTypes]
  );

  const rounds = useMemo(() => {
    const intakeQuestions = intakeData?.questions ?? [];
    const generalQuestions = jobData?.data.generalQuestions ?? [];
    const questionsByRound = new Map(
      (questionsData?.rounds ?? []).map((r) => [String(r.round_instance_id), r.questions ?? []])
    );
    return (jobData?.data.interviewRounds ?? []).map((round, index) => {
      const roundIdStr = round.id.toString();
      // Kind from the round type; name lookup is a fallback.
      const specialKind =
        roundTypes.find((type) => String(type.id) === String(round.round?.id))?.special_kind ??
        getSpecialKindFromRoundName(round.round?.name);
      // Intake questions come from their own endpoint; Resume has none.
      const isIntakeCall = specialKind === 'intake_call';
      const isResume = specialKind === 'resume';
      type RoundQuestion = {
        id: string;
        text: string;
        answer?: string | null;
        isAiAnswer?: boolean;
        isAsked?: boolean;
      };
      const ownQuestions = questionsByRound.get(roundIdStr);
      const questions: RoundQuestion[] = isIntakeCall
        ? intakeQuestions.map((q) => ({ id: q.job_intake_question_id, text: q.question_text }))
        : ownQuestions
          ? ownQuestions.map((q) => ({
              id: q.id,
              text: q.question_text,
              answer: q.answer_text,
              isAiAnswer: q.is_answer_ai_generated,
              isAsked: q.is_selected !== false,
            }))
          : generalQuestions
              .filter((q) => String(q.interviewRoundId) === roundIdStr)
              .map((q) => ({ id: String(q.id), text: q.question }));
      const typeDescription = roundTypes.find(
        (type) => String(type.id) === String(round.round?.id)
      )?.description;
      return { round, index, roundIdStr, isResume, specialKind, typeDescription, questions };
    });
  }, [jobData, intakeData, questionsData, roundTypes]);

  const active = rounds.find((r) => r.roundIdStr === selectedRoundId) ?? rounds[0];
  const activeBadge = active ? getVariantBadge(active.round.variant, variantLabelOverrides) : null;
  const ActiveBadgeIcon = activeBadge?.icon;
  const activeName = active?.round.round?.name ?? 'Interview Round';

  return (
    <>
      <div className="relative flex flex-col gap-4 py-2">
        {isLoading && <Loader />}
        {rounds.length > 0 && (
          <nav aria-label="Interview rounds" className="flex flex-wrap gap-2">
            {rounds.map(({ round, index, roundIdStr }) => {
              const isActive = active?.roundIdStr === roundIdStr;
              return (
                <button
                  key={roundIdStr}
                  type="button"
                  onClick={() => setSelectedRoundId(roundIdStr)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-200 ${
                    isActive
                      ? 'border-primary-200 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {index + 1}. {round.round?.name}
                </button>
              );
            })}
          </nav>
        )}

        {active && (
          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h3 className="m-0 text-base font-bold text-neutral-900">{activeName}</h3>
              {activeBadge && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                  {ActiveBadgeIcon && <ActiveBadgeIcon className="shrink-0 text-sm" />}
                  {activeBadge.label}
                </span>
              )}
              {active.round.duration ? (
                <span className="text-sm text-neutral-500">{active.round.duration} min</span>
              ) : null}
              <RoundInfoButton
                roundName={activeName}
                badgeLabel={activeBadge?.label}
                description={active.round.description}
                sections={getRoundInfoSections({
                  specialKind: active.specialKind,
                  roundName: activeName,
                  variants: [active.round.variant],
                  description: active.typeDescription,
                })}
                ariaLabel={`About the ${activeName} round`}
              />
            </div>

            {active.round.description && (
              <p className="m-0 mt-2 text-sm leading-relaxed text-gray-600">
                {active.round.description}
              </p>
            )}

            {!active.isResume && (
              <div className="mt-4">
                <div className="mb-2 text-sm font-semibold text-gray-800">
                  Questions{active.questions.length > 0 ? ` (${active.questions.length})` : ''}
                </div>
                {active.questions.length > 0 ? (
                  <ol className="m-0 max-h-[50vh] list-none divide-y divide-gray-100 overflow-y-auto rounded-xl bg-gray-50 p-0">
                    {active.questions.map((q, questionIndex) => (
                      <li
                        key={q.id}
                        className="flex gap-3 px-4 py-2.5 text-sm leading-relaxed text-gray-700"
                      >
                        <span className="w-5 shrink-0 text-right font-semibold text-gray-400">
                          {questionIndex + 1}.
                        </span>
                        <div className="min-w-0 flex-1">
                          <span>{q.text}</span>
                          {q.isAsked === false && (
                            <span className="ml-2 whitespace-nowrap rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                              Not asked
                            </span>
                          )}
                          {q.answer && (
                            <div className="mt-1.5 flex flex-wrap items-start gap-x-2 gap-y-1">
                              <p className="m-0 min-w-0 flex-1 basis-48 break-words text-xs leading-relaxed text-gray-500">
                                <span className="font-semibold text-gray-600">Answer: </span>
                                {q.answer}
                              </p>
                              {q.isAiAnswer && <AiAnswerBadge />}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-400">
                    No questions added.
                  </div>
                )}
              </div>
            )}
          </section>
        )}
        <Outlet />
      </div>
    </>
  );
};

export default ViewInterviewRound;
