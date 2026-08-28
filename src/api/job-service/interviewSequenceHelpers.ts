import type { InterviewRoundRequest } from './types';

type RoundLike = {
  id?: string | number | null;
  uniqueRoundIdentifier?: string;
  roundId?: string;
  round?: { id?: string | number | null };
  sequence: number;
  description?: string | null;
  duration?: number | null;
  variant?: string | null;
};

/**
 * Map a UI interview-round row onto PUT /interview-sequence.
 * Existing rounds must keep `id` so the backend updates in place;
 * new rounds omit `id`.
 */
export const toInterviewRoundRequest = (
  round: RoundLike,
  options?: { isNew?: boolean }
): InterviewRoundRequest => {
  const existingId =
    round.uniqueRoundIdentifier ||
    (round.id != null && String(round.id) !== '0' ? String(round.id) : null);

  return {
    id: options?.isNew ? null : existingId,
    round_id: String(round.roundId || round.round?.id || ''),
    sequence: round.sequence,
    description: round.description ?? null,
    duration: round.duration ?? null,
    variant: round.variant ?? null,
  };
};

export const toInterviewSequencePayload = (rounds: RoundLike[]): InterviewRoundRequest[] =>
  rounds.map((round, index) =>
    toInterviewRoundRequest({ ...round, sequence: round.sequence || index + 1 })
  );
