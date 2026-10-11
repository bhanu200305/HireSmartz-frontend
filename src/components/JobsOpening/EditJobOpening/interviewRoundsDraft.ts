import { useOutletContext } from 'react-router-dom';
import type { InterviewRound } from '../../../types';

export type DraftInterviewRound = InterviewRound & { isNew?: boolean };

export type NewDraftRound = Pick<
  DraftInterviewRound,
  'round' | 'roundId' | 'roundName' | 'roundType' | 'description' | 'duration' | 'variant'
>;

export type InterviewRoundsDraft = {
  rounds: DraftInterviewRound[];
  addRound: (round: NewDraftRound, options?: { afterResume?: boolean }) => void;
  updateRound: (id: string | number, patch: Partial<DraftInterviewRound>) => void;
};

/** Present only inside the edit-flow Interview Setup tab; undefined elsewhere. */
export const useInterviewRoundsDraft = () => {
  const context = useOutletContext<Partial<InterviewRoundsDraft> | undefined>();
  return context?.addRound ? (context as InterviewRoundsDraft) : undefined;
};

const roundTypeId = (round: Partial<DraftInterviewRound>) =>
  String(round.roundId || round.round?.id || '');

const roundSettings = (round: Partial<DraftInterviewRound>) => [
  roundTypeId(round),
  round.description ?? '',
  round.duration ?? null,
  round.variant ?? null,
];

export const hasSameSettings = (a: Partial<DraftInterviewRound>, b: Partial<DraftInterviewRound>) =>
  JSON.stringify(roundSettings(a)) === JSON.stringify(roundSettings(b));

/** Order-sensitive value fingerprint: server id, type, position and editable settings. */
export const roundsSignature = (rounds: DraftInterviewRound[]) =>
  JSON.stringify(
    rounds.map((round, index) => [
      round.isNew ? null : String(round.uniqueRoundIdentifier || round.id),
      index + 1,
      ...roundSettings(round),
    ])
  );
