import { useGetCandidateQuery } from '../../api/candidate-service/Candidates/CandidateLifecycle';

/**
 * Resolves a booking's `candidate_id` (all interview-service ever returns) to
 * a real name + email. RTK Query dedupes the `getCandidate(id)` call across
 * every row that shares an id and caches it, so a table of N bookings for the
 * same candidate is one request, not N.
 */
export const CandidateNameCell = ({ candidateId }: { candidateId: string }) => {
  const { data, isLoading, isError } = useGetCandidateQuery(candidateId, {
    skip: !candidateId,
  });

  if (isLoading) {
    return <span className="inline-block h-3 w-24 animate-pulse rounded bg-neutral-200" />;
  }

  if (isError || !data) {
    return <span className="text-sm text-neutral-400">Unknown Candidate</span>;
  }

  const name = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();

  return (
    <div className="min-w-0">
      <div className="truncate font-medium text-neutral-900">
        {name || <span className="text-neutral-400">Unnamed Candidate</span>}
      </div>
      {data.email_id && <div className="truncate text-xs text-neutral-500">{data.email_id}</div>}
    </div>
  );
};
