// Intake Call placement rules for a job's interview sequence (job-service made
// the round optional 2026-10-05, migration 0011). Resume is mandatory and is
// always round 1; the Intake Call is optional, at most once, and always round 2
// (right after Resume). The order a CANDIDATE goes through them is their own
// choice when applying (resume first, or the call first) and only changes
// their pipeline, never this setup. job-service itself accepts Intake as round
// 1 or 2, so the stricter Resume-first rule is enforced here, in the round
// setup screens.

export type IntakePosition = 'before_resume' | 'after_resume';

type RoundTypeLike = { id: string | number; special_kind?: string | null };
type JobRoundLike = { round?: { id?: string | number | null } | null; sequence: number };

export const roundTypeIdsOfKind = (roundTypes: RoundTypeLike[], kind: 'resume' | 'intake_call') =>
  new Set(roundTypes.filter((r) => r.special_kind === kind).map((r) => String(r.id)));

export const isRoundOfType = (round: JobRoundLike, typeIds: Set<string>) =>
  typeIds.has(String(round.round?.id ?? ''));

/** Inserts `intake` at round 1 or directly after the Resume round, and
 * renumbers every round's `sequence` to match the new order. */
export const placeIntakeRound = <T extends { sequence: number }>(
  existing: T[],
  intake: T,
  position: IntakePosition,
  isResume: (round: T) => boolean
): T[] => {
  const ordered = [...existing].sort((a, b) => a.sequence - b.sequence);
  const resumeIndex = ordered.findIndex(isResume);
  const insertAt = position === 'before_resume' ? 0 : resumeIndex === -1 ? 0 : resumeIndex + 1;
  ordered.splice(insertAt, 0, intake);
  return ordered.map((round, index) => ({ ...round, sequence: index + 1 }));
};

type TypeLike = { id: string | number; special_kind?: string | null };

/** Round types to offer when adding a round: Resume never (mandatory, already
 * there); Intake Call only while the job has none. */
export const addableRoundTypes = <T extends TypeLike>(roundTypes: T[], jobHasIntake: boolean) =>
  roundTypes.filter(
    (type) =>
      type.special_kind !== 'resume' && (type.special_kind !== 'intake_call' || !jobHasIntake)
  );

/** Round types to offer when editing a round. Its own type stays listed; Intake
 * Call is also offered while the job has none and the round is round 2 (the
 * only slot it may take, right after Resume). */
export const retypableRoundTypes = <T extends TypeLike>(
  roundTypes: T[],
  options: { currentTypeId?: string | number | null; jobHasIntake: boolean; position: number }
) =>
  roundTypes.filter((type) => {
    if (String(type.id) === String(options.currentTypeId ?? '')) return true;
    if (type.special_kind === 'resume') return false;
    if (type.special_kind === 'intake_call') return !options.jobHasIntake && options.position === 2;
    return true;
  });

/** Whether the job has a round that takes questions (one with a duration). */
export const hasQuestionRound = (
  jobRounds: JobRoundLike[],
  roundTypes: { id: string | number; requires_duration?: boolean }[]
) => {
  const ids = new Set(roundTypes.filter((t) => t.requires_duration).map((t) => String(t.id)));
  return jobRounds.some((round) => ids.has(String(round.round?.id ?? '')));
};

export const NO_QUESTION_ROUND_MESSAGE =
  'Add an AI Audio Screening, AI Video or Hiring Panel round before continuing to Questions.';
