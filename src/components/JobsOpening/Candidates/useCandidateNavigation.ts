import { useLocation, useNavigate } from 'react-router-dom';
import {
  useListCandidatesQuery,
  type CandidateView,
  type ListCandidatesArgs,
} from '../../../api/candidate-service/Candidates/CandidateLifecycle';

// Previous / Next candidate on the details page. The listing hands over its
// current filters + sort (and the row's absolute position) in router state,
// so stepping follows exactly the order the recruiter was looking at. Opened
// without that state (deep link, activity feed, ...) it falls back to the
// listing's default order for the job.

export type CandidateListNavArgs = Omit<ListCandidatesArgs, 'limit' | 'offset'>;

export type CandidateNavState = {
  candidateNav: {
    args: CandidateListNavArgs;
    /** Absolute position in the full (unpaginated) list. */
    index: number;
  };
};

// GET /candidates caps `limit` at 200; fetch a window around the current row.
const WINDOW = 200;
const HALF_WINDOW = WINDOW / 2;

export const buildCandidateDetailsPath = (jobOpeningId: string, candidateId: string) =>
  `/jobs/view/${jobOpeningId}/candidates/${candidateId}/details`;

export const useCandidateNavigation = (candidateId?: string, jobOpeningId?: string) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as Partial<CandidateNavState> | null)?.candidateNav;

  const args: CandidateListNavArgs = navState?.args ?? {
    jobOpeningId,
    sortBy: 'applied_date',
    sortOrder: 'desc',
  };
  // Snap the window offset to a HALF_WINDOW grid so consecutive steps reuse
  // the same cached page instead of refetching on every click.
  const knownIndex = navState?.index ?? 0;
  const offset = Math.max(0, Math.floor(knownIndex / HALF_WINDOW) * HALF_WINDOW - HALF_WINDOW / 2);

  const hasScope = Boolean(args.jobOpeningId || navState);
  const { data, isFetching } = useListCandidatesQuery(
    { ...args, limit: WINDOW, offset },
    { skip: !candidateId || !hasScope }
  );

  const items = data?.items ?? [];
  const position = items.findIndex((c) => c.id === candidateId);
  const found = position >= 0;
  const absoluteIndex = found ? offset + position : -1;
  const total = data?.total ?? 0;

  const prev: CandidateView | undefined = found ? items[position - 1] : undefined;
  const next: CandidateView | undefined = found ? items[position + 1] : undefined;

  // `tab` keeps the recruiter on the same details tab while stepping.
  const goTo = (target: CandidateView | undefined, targetIndex: number, tab?: string) => {
    if (!target) return;
    const jobId = target.job_opening_id ?? args.jobOpeningId;
    if (!jobId) return;
    const state = {
      ...(location.state as object | null),
      candidateNav: { args, index: targetIndex },
    };
    // Replace, not push: stepping through candidates shouldn't make the
    // browser Back button walk back through every one of them.
    navigate(
      {
        pathname: buildCandidateDetailsPath(jobId, target.id),
        search: tab ? `?tab=${encodeURIComponent(tab)}` : '',
      },
      { state, replace: true }
    );
  };

  return {
    isReady: found,
    isFetching,
    position: found ? absoluteIndex + 1 : null,
    total,
    hasPrev: Boolean(prev),
    hasNext: Boolean(next),
    goPrev: (tab?: string) => goTo(prev, absoluteIndex - 1, tab),
    goNext: (tab?: string) => goTo(next, absoluteIndex + 1, tab),
  };
};
