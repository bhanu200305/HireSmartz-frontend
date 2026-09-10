import type { CandidateView } from '../../../api/candidate-service/Candidates/CandidateLifecycle';

// Split out of CandidatesListing.tsx so other candidate views can reuse the
// exact same "First Last" formatting the Table view's rows use, without
// making CandidatesListing.tsx export a non-component value
// (react-refresh/only-export-components).
export const candidateDisplayName = (c: CandidateView) =>
  `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'N/A';
