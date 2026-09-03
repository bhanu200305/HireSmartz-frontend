import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { type BadgeStatus } from '../../shared';
import {
  useListCandidatesQuery,
  type ListCandidatesArgs,
} from '../../../api/candidate-service/Candidates/CandidateLifecycle';
import type { CandidateStatusView } from '../../../api/candidate-service/Master/master';
import { candidateDisplayName } from './candidateDisplay';

// "Board" view for the within-a-job Candidates screen — one Kanban column per
// REAL `master_candidate_status` code (fetched via `useListCandidateStatusesQuery`
// in the parent, same source of truth the Table view's status filter already
// uses), never an invented stage. Reuses the exact same `useListCandidatesQuery`
// hook the Table view calls, just once per status instead of once with a
// `statusCode` filter — no new endpoints, no new mutations, and every card
// links to the same `/jobs/view/:id/candidates/:candidateId/details` route the
// Table row already does.

// Documented funnel order (see master.ts's own module comment) — used only to
// order the columns left-to-right; a status code this array doesn't know about
// (future backend addition) still renders, just appended at the end rather
// than dropped.
const FUNNEL_ORDER = [
  'applied',
  'resume_under_review',
  'shortlisted',
  'interview_scheduled',
  'interview_in_progress',
  'advanced',
  'selected',
  'resume_rejected',
  'interview_rejected',
  'rejected',
  'withdrawn',
];

const sortStatusesByFunnel = (statuses: CandidateStatusView[]): CandidateStatusView[] => {
  const rank = (code: string) => {
    const idx = FUNNEL_ORDER.indexOf(code);
    return idx === -1 ? FUNNEL_ORDER.length : idx;
  };
  return [...statuses].sort((a, b) => rank(a.code) - rank(b.code));
};

type StageKind = 'early' | 'active' | 'positive' | 'negative' | 'neutral';

const STAGE_KIND: Record<string, StageKind> = {
  applied: 'early',
  resume_under_review: 'early',
  shortlisted: 'active',
  interview_scheduled: 'active',
  interview_in_progress: 'active',
  advanced: 'active',
  selected: 'positive',
  resume_rejected: 'negative',
  interview_rejected: 'negative',
  rejected: 'negative',
  withdrawn: 'neutral',
};

const kindForCode = (code: string): StageKind => STAGE_KIND[code] ?? 'neutral';

const KIND_META: Record<StageKind, { border: string; dot: string; badge: BadgeStatus }> = {
  early: { border: 'border-t-neutral-300', dot: 'bg-neutral-300', badge: 'neutral' },
  active: { border: 'border-t-primary-500', dot: 'bg-primary-500', badge: 'info' },
  positive: { border: 'border-t-success', dot: 'bg-success', badge: 'success' },
  negative: { border: 'border-t-danger', dot: 'bg-danger', badge: 'danger' },
  neutral: { border: 'border-t-neutral-300', dot: 'bg-neutral-400', badge: 'neutral' },
};

const CARD_LIMIT = 6;

type CandidatesPipelineBoardProps = {
  jobOpeningId: string;
  statuses: CandidateStatusView[];
  search: string;
  source: string | undefined;
  sortBy: NonNullable<ListCandidatesArgs['sortBy']>;
  sortOrder: NonNullable<ListCandidatesArgs['sortOrder']>;
  buildDetailsPath: (candidateId: string) => string;
};

const CandidatesPipelineBoard = ({
  jobOpeningId,
  statuses,
  search,
  source,
  sortBy,
  sortOrder,
  buildDetailsPath,
}: CandidatesPipelineBoardProps) => {
  const orderedStatuses = useMemo(() => sortStatusesByFunnel(statuses), [statuses]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const handleCount = useCallback((code: string, total: number) => {
    setCounts((prev) => (prev[code] === total ? prev : { ...prev, [code]: total }));
  }, []);

  const totalCount = orderedStatuses.reduce((sum, s) => sum + (counts[s.code] ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      {totalCount > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="mb-2 text-xs font-semibold text-neutral-600">
            Pipeline · {totalCount} candidate{totalCount === 1 ? '' : 's'}
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-neutral-100">
            {orderedStatuses.map((s) => {
              const count = counts[s.code] ?? 0;
              if (count === 0) return null;
              const meta = KIND_META[kindForCode(s.code)];
              return (
                <div
                  key={s.code}
                  title={`${s.label} · ${count}`}
                  className={meta.dot}
                  style={{ width: `${(count / totalCount) * 100}%` }}
                />
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {orderedStatuses.map((s) => {
              const count = counts[s.code] ?? 0;
              if (count === 0) return null;
              const meta = KIND_META[kindForCode(s.code)];
              return (
                <span key={s.code} className="flex items-center gap-1.5 text-xs text-neutral-600">
                  <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                  {s.label} · {count}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-2">
        {orderedStatuses.map((status) => (
          <StatusColumn
            key={status.code}
            jobOpeningId={jobOpeningId}
            status={status}
            search={search}
            source={source}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onCount={handleCount}
            buildDetailsPath={buildDetailsPath}
          />
        ))}
      </div>
    </div>
  );
};

type StatusColumnProps = {
  jobOpeningId: string;
  status: CandidateStatusView;
  search: string;
  source: string | undefined;
  sortBy: NonNullable<ListCandidatesArgs['sortBy']>;
  sortOrder: NonNullable<ListCandidatesArgs['sortOrder']>;
  onCount: (code: string, total: number) => void;
  buildDetailsPath: (candidateId: string) => string;
};

const StatusColumn = ({
  jobOpeningId,
  status,
  search,
  source,
  sortBy,
  sortOrder,
  onCount,
  buildDetailsPath,
}: StatusColumnProps) => {
  const { data, isLoading } = useListCandidatesQuery(
    {
      jobOpeningId,
      statusCode: status.code,
      search: search || undefined,
      source,
      sortBy,
      sortOrder,
      limit: CARD_LIMIT,
      offset: 0,
    },
    { skip: !jobOpeningId }
  );

  useEffect(() => {
    onCount(status.code, data?.total ?? 0);
  }, [data?.total, status.code, onCount]);

  const meta = KIND_META[kindForCode(status.code)];
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hiddenCount = Math.max(total - items.length, 0);

  return (
    <div
      className={`flex w-64 shrink-0 flex-col rounded-xl border border-neutral-200 border-t-4 bg-neutral-50 ${meta.border}`}
    >
      <div className="flex items-center justify-between rounded-t-lg bg-white px-3.5 py-2.5">
        <span className="truncate text-sm font-semibold text-neutral-800" title={status.label}>
          {status.label}
        </span>
        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600">
          {isLoading ? '…' : total}
        </span>
      </div>
      <div className="flex min-h-16 flex-col gap-2 p-2.5">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-neutral-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-400">No candidates</div>
        ) : (
          items.map((c) => (
            <Link
              key={c.id}
              to={buildDetailsPath(c.id)}
              className="block rounded-lg border border-neutral-200 bg-white p-2.5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="truncate text-sm font-semibold text-neutral-900">
                {candidateDisplayName(c)}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
                <span>{c.resume_score === null ? 'No score' : `Score ${c.resume_score}`}</span>
                <span>
                  {dayjs(c.applied_date).isValid() ? dayjs(c.applied_date).format('MMM D') : ''}
                </span>
              </div>
            </Link>
          ))
        )}
        {hiddenCount > 0 && (
          <div className="pt-0.5 text-center text-xs font-semibold text-neutral-400">
            +{hiddenCount} more
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidatesPipelineBoard;
