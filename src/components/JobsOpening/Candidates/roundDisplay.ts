import type { CandidateInterviewRoundView } from '../../../api/candidate-service/Candidates/interviewRounds';

// Shared by PipelineBoard.tsx (the pipeline cards) and CandidateDetails.tsx
// (the round drill-down a card click opens) so a round is never labeled one
// thing on the card and something else once you're inside it — both used to
// compute this independently ("Resume Screening" on the card vs. the raw
// backend name "Resume Review" as the drill-down's title).
export const roundLabel = (round: CandidateInterviewRoundView) =>
  round.stage_type === 'resume' ? 'Resume Screening' : round.round_name || 'Round';

export const formatRoundStatus = (status: string) =>
  status
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';
