// Intake Call placement rules for a job's interview sequence (job-service made
// the round optional 2026-10-05, migration 0011). Resume is mandatory; Intake
// Call is optional, at most once, and only ever round 1 (before Resume) or
// round 2 (right after Resume). job-service itself accepts Intake anywhere,
// so this position rule is enforced here, in the round setup screens.

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
