import dayjs from 'dayjs';
import { CommonCard } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import { useGetCandidateStatusHistoryQuery } from '../../../api/candidate-service/Candidates/status';
import { getCandidateErrorMessage } from '../../../shared/utils/auth/candidateError.helpers';

// New — `GET /candidates/{id}/status-history`, wired up for the first time.
// candidate-service's own doc calls this "the append-only funnel transition
// log" — every status change lands here regardless of what triggered it
// (Advance, Reject/Select, a bulk action), newest read via `changed_at`
// descending server-side (`sqlalchemy_candidate_status_history_repository.py`).
// No `total` on this response (unlike `PaginatedCandidates`), so this reads
// one page of up to 50 rather than paginating.

const formatWhen = (value: string) =>
  dayjs(value).isValid() ? dayjs(value).format('MMM DD, YYYY · h:mm A') : value;

type StatusHistoryTabProps = {
  candidateId: string;
};

const StatusHistoryTab = ({ candidateId }: StatusHistoryTabProps) => {
  const { data, isLoading, error } = useGetCandidateStatusHistoryQuery({
    candidateId,
    limit: 50,
    offset: 0,
  });

  if (isLoading) return <Loader />;
  if (error) {
    return (
      <p className="text-sm text-red-500">
        {getCandidateErrorMessage(error, 'Failed to load status history.')}
      </p>
    );
  }

  const items = data?.items ?? [];
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">No status changes recorded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <CommonCard key={item.id}>
          <div className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-sm font-semibold">{item.status_label || item.status_code}</div>
              {item.reason && <p className="mt-1 text-xs text-gray-500">{item.reason}</p>}
            </div>
            <div className="shrink-0 text-right text-xs text-gray-400">
              {formatWhen(item.changed_at)}
            </div>
          </div>
        </CommonCard>
      ))}
    </div>
  );
};

export default StatusHistoryTab;
