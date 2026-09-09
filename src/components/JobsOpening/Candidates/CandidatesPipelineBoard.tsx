import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Checkbox } from 'antd';
import { Button, Select, showToast, type BadgeStatus } from '../../shared';
import {
  useListCandidatesQuery,
  type CandidateView,
  type ListCandidatesArgs,
} from '../../../api/candidate-service/Candidates/CandidateLifecycle';
import {
  BULK_STATUS_FAILURE_LABELS,
  useBulkChangeCandidateStatusMutation,
  useChangeCandidateStatusMutation,
} from '../../../api/candidate-service/Candidates/status';
import type { CandidateStatusView } from '../../../api/candidate-service/Master/master';
import { getCandidateErrorMessage } from '../../../shared/utils/auth/candidateError.helpers';
import { candidateDisplayName } from './candidateDisplay';

// "Board" view for the within-a-job Candidates screen — one Kanban column per
// REAL `master_candidate_status` code (fetched via `useListCandidateStatusesQuery`
// in the parent, same source of truth the Table view's status filter already
// uses), never an invented stage. Reuses the exact same `useListCandidatesQuery`
// hook the Table view calls, just once per status instead of once with a
// `statusCode` filter — no new endpoints, no new mutations, and every card
// links to the same `/jobs/view/:id/candidates/:candidateId/details` route the
// Table row already does.
//
// Drag-and-drop (Jira-style) rides the same `changeCandidateStatus` /
// `bulkChangeCandidateStatus` mutations `CandidateDetails`'s status changer
// already calls (status.ts) — dropping a card just POSTs the target column's
// status code. A single card drags alone; dragging a card that's part of an
// active multi-select (checkbox, appears on hover) drags the whole selection
// together, same as Jira board multi-select drag. See the `moves` state below
// for how a card is kept visible mid-flight instead of vanishing until the
// column refetches.
//
// WHICH COLUMNS THIS BOARD SHOWS
// -----------------------------------------------------------------------------
// The backend's `master_candidate_status` has 14 codes and
// `GET /master/candidate-statuses` returns every one — there is no "board
// stages" concept server-side, and the status write endpoint accepts them all.
// This board deliberately renders only these 7, in this order, as a FRONTEND
// curation for a usable Kanban (product decision, 2026-09-09):
//   - `advanced` is a transient "passing through" status, not a resting
//     "where are they now" — it overlaps Interview Scheduled / In Progress.
//     Round-to-round movement is driven from the candidate's own Pipeline tab,
//     not this board.
//   - `resume_rejected` / `interview_rejected` are *reasons* for `rejected`,
//     not separate stages — folded into the one Rejected column; the exact
//     reason still shows on the candidate's own page.
//   - `resume_under_review`, `awaiting_resume_upload`, `resume_consistency_review`
//     are system-driven / transient — nobody drags a card into them.
//   - `no_show` is an exception flag that needs action, not a resting stage.
// A candidate currently in one of the 7 hidden statuses simply does not appear
// on the board — they're in the Table view. Setting those statuses still works
// everywhere else (candidate detail page, table, API).
const BOARD_STATUS_CODES = [
  'applied',
  'shortlisted',
  'interview_scheduled',
  'interview_in_progress',
  'selected',
  'rejected',
  'withdrawn',
] as const;

// Full master list → the board's 7, in board order. A code the backend no
// longer returns just doesn't render.
const toBoardColumns = (statuses: CandidateStatusView[]): CandidateStatusView[] => {
  const byCode = new Map(statuses.map((s) => [s.code, s]));
  return BOARD_STATUS_CODES.map((code) => byCode.get(code)).filter(
    (s): s is CandidateStatusView => s !== undefined
  );
};

// A shown column still only accepts a DROP if the backend will accept a manual
// move into that status — `is_manually_settable` is `false` only for
// `withdrawn` (withdrawal is the candidate's own self-service action). The
// Withdrawn column therefore renders (a self-withdrawn candidate stays visible)
// but nothing can be dragged into it, and it's absent from the multi-select
// "Move to…" picker. A recruiter takes a candidate out of the pipeline by
// dragging them to Rejected.
const canDropInto = (status: CandidateStatusView): boolean => status.is_manually_settable;

type StageKind = 'early' | 'active' | 'positive' | 'negative' | 'neutral';

// Keyed by the 7 board codes (see `BOARD_STATUS_CODES`); `kindForCode` falls
// back to 'neutral' for anything else.
const STAGE_KIND: Record<string, StageKind> = {
  applied: 'early',
  shortlisted: 'active',
  interview_scheduled: 'active',
  interview_in_progress: 'active',
  selected: 'positive',
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

// react-dnd item type shared by every card (drag source) and column (drop
// target) — a single string constant so `accept`/`type` can never drift apart.
const CANDIDATE_DRAG_TYPE = 'CANDIDATE_CARD';

type CandidateDragItem = {
  /** One card, unless the dragged card was part of an active multi-select —
   * then every selected candidate, so they all move together. */
  candidates: CandidateView[];
  sourceStatusCode: string;
};

/** A card mid-move: optimistically hidden from its old column and shown
 * (dimmed, pulsing) at the top of the target column until that column's
 * query actually reports it back — see `StatusColumn`'s landed-effect below. */
type MoveEntry = { candidate: CandidateView; targetStatusCode: string };

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
  const orderedStatuses = useMemo(() => toBoardColumns(statuses), [statuses]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const handleCount = useCallback((code: string, total: number) => {
    setCounts((prev) => (prev[code] === total ? prev : { ...prev, [code]: total }));
  }, []);

  const totalCount = orderedStatuses.reduce((sum, s) => sum + (counts[s.code] ?? 0), 0);

  // Selection (checkbox, appears on card hover) — Jira's "select several,
  // then move them together" path. Keyed by candidate id so membership and
  // drag-payload lookups are both a plain object read.
  const [selectedCandidates, setSelectedCandidates] = useState<Record<string, CandidateView>>({});
  const selectedCount = Object.keys(selectedCandidates).length;

  const toggleSelect = useCallback((candidate: CandidateView) => {
    setSelectedCandidates((prev) => {
      const next = { ...prev };
      if (next[candidate.id]) {
        delete next[candidate.id];
      } else {
        next[candidate.id] = candidate;
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedCandidates({}), []);

  // Cards currently in flight between columns — see `MoveEntry` above.
  const [moves, setMoves] = useState<Record<string, MoveEntry>>({});

  const clearMoveEntries = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setMoves((prev) => {
      let changed = false;
      const next = { ...prev };
      ids.forEach((id) => {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  const [changeCandidateStatus] = useChangeCandidateStatusMutation();
  const [bulkChangeCandidateStatus] = useBulkChangeCandidateStatusMutation();

  // Succeeded cards keep their ghost until the target column's own refetch
  // reports them back (8s safety net in case that column isn't mounted);
  // failed cards drop their ghost now so they snap straight back home.
  const settleMoves = useCallback(
    (succeededIds: string[], failedIds: string[]) => {
      clearMoveEntries(failedIds);
      if (succeededIds.length > 0) {
        window.setTimeout(() => clearMoveEntries(succeededIds), 8000);
      }
    },
    [clearMoveEntries]
  );

  const performMove = useCallback(
    async (candidates: CandidateView[], targetStatusCode: string) => {
      const toMove = candidates.filter((c) => c.status_code !== targetStatusCode);
      if (toMove.length === 0) return;
      const movingIds = toMove.map((c) => c.id);

      setMoves((prev) => {
        const next = { ...prev };
        toMove.forEach((c) => {
          next[c.id] = { candidate: c, targetStatusCode };
        });
        return next;
      });

      try {
        // ONE card: the `advanced`/`selected` guards come back as a real
        // 409/422 — surface the backend's own wording verbatim.
        if (toMove.length === 1) {
          await changeCandidateStatus({
            candidateId: toMove[0].id,
            body: { statusCode: targetStatusCode },
          }).unwrap();
          showToast({ message: `${candidateDisplayName(toMove[0])} moved.`, type: 'success' });
          clearSelection();
          settleMoves(movingIds, []);
          return;
        }

        // SEVERAL cards: `bulk-status` is partial-apply — a 200 whose
        // `results[]` says per candidate whether it moved. `updated` and
        // `unchanged` (already there) both count as done; `failed` carries a
        // `failure_reason` slug.
        const { results } = await bulkChangeCandidateStatus({
          candidateIds: movingIds,
          statusCode: targetStatusCode,
        }).unwrap();

        const failedIds = results.filter((r) => r.outcome === 'failed').map((r) => r.candidate_id);
        const succeededIds = movingIds.filter((id) => !failedIds.includes(id));
        settleMoves(succeededIds, failedIds);
        clearSelection();

        if (failedIds.length === 0) {
          showToast({ message: `${succeededIds.length} candidates moved.`, type: 'success' });
          return;
        }

        const reasons = [
          ...new Set(
            results
              .filter((r) => r.outcome === 'failed')
              .map(
                (r) =>
                  BULK_STATUS_FAILURE_LABELS[r.failure_reason ?? ''] ??
                  r.failure_reason ??
                  'could not be moved'
              )
          ),
        ].join('; ');
        showToast({
          message:
            succeededIds.length === 0
              ? `None moved — ${reasons}.`
              : `${succeededIds.length} moved, ${failedIds.length} skipped — ${reasons}.`,
          type: succeededIds.length === 0 ? 'error' : 'warning',
        });
      } catch (e) {
        // A thrown error is the whole-request kind: a bad status code (422),
        // job-service unreachable mid-batch (502), or the single-card guards.
        clearMoveEntries(movingIds);
        showToast({
          message: getCandidateErrorMessage(e, 'Could not move candidate'),
          type: 'error',
        });
      }
    },
    [
      changeCandidateStatus,
      bulkChangeCandidateStatus,
      clearSelection,
      clearMoveEntries,
      settleMoves,
    ]
  );

  const [moveTarget, setMoveTarget] = useState('');

  return (
    <DndProvider backend={HTML5Backend}>
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

        {selectedCount > 0 && (
          <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm">
            <span className="font-semibold text-primary-700">{selectedCount} selected</span>
            <span className="hidden text-xs text-primary-600 sm:inline">
              Drag any selected card to move them together, or
            </span>
            <div className="w-48">
              <Select
                appname="move-selected-to"
                placeholder="Move to…"
                value={moveTarget}
                onChange={(value) => {
                  setMoveTarget('');
                  void performMove(Object.values(selectedCandidates), value);
                }}
                options={orderedStatuses
                  .filter((s) => canDropInto(s))
                  .map((s) => ({ label: s.label, value: s.code }))}
              />
            </div>
            <Button
              type="button"
              onClick={clearSelection}
              className="rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              Clear selection
            </Button>
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
              selectedCandidates={selectedCandidates}
              onToggleSelect={toggleSelect}
              moves={moves}
              onDropCandidates={performMove}
              onLanded={clearMoveEntries}
            />
          ))}
        </div>
      </div>
    </DndProvider>
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
  selectedCandidates: Record<string, CandidateView>;
  onToggleSelect: (candidate: CandidateView) => void;
  moves: Record<string, MoveEntry>;
  onDropCandidates: (candidates: CandidateView[], targetStatusCode: string) => void;
  onLanded: (ids: string[]) => void;
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
  selectedCandidates,
  onToggleSelect,
  moves,
  onDropCandidates,
  onLanded,
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

  // Once a card we moved into this column actually comes back from the
  // server, drop its ghost — the real card (below) takes over its spot.
  useEffect(() => {
    const items = data?.items;
    if (!items || items.length === 0) return;
    const landedIds = items
      .filter((c) => moves[c.id]?.targetStatusCode === status.code)
      .map((c) => c.id);
    if (landedIds.length > 0) onLanded(landedIds);
  }, [data?.items, moves, status.code, onLanded]);

  const meta = KIND_META[kindForCode(status.code)];
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hiddenCount = Math.max(total - items.length, 0);

  // Cards mid-flight are hidden from whichever real column still has them
  // cached (their old column, pre-refetch) and shown as a ghost only in the
  // column they're headed to.
  const visibleItems = items.filter((c) => !moves[c.id]);
  const ghosts = Object.values(moves).filter(
    (m) => m.targetStatusCode === status.code && !items.some((c) => c.id === m.candidate.id)
  );

  // react-dnd's connector is a callable that returns an element/null, which
  // isn't assignable to React 19's stricter `ref` prop type. Connect a plain
  // ref object instead (the connector accepts one) — the documented
  // `drag(drop(ref))` pattern, minus a cast.
  const columnRef = useRef<HTMLDivElement>(null);
  const [{ isOver, canDrop }, connectDrop] = useDrop({
    accept: CANDIDATE_DRAG_TYPE,
    canDrop: (item: CandidateDragItem) =>
      canDropInto(status) && item.candidates.some((c) => c.status_code !== status.code),
    drop: (item: CandidateDragItem) => onDropCandidates(item.candidates, status.code),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });
  connectDrop(columnRef);

  return (
    <div
      ref={columnRef}
      className={`flex w-64 shrink-0 flex-col rounded-xl border border-neutral-200 border-t-4 bg-neutral-50 transition-colors ${meta.border} ${
        isOver && canDrop ? 'bg-primary-50 ring-2 ring-primary-300' : ''
      }`}
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
        ) : items.length === 0 && ghosts.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-400">
            {isOver && canDrop ? 'Drop here' : 'No candidates'}
          </div>
        ) : (
          <>
            {ghosts.map((g) => (
              <CandidateCard
                key={g.candidate.id}
                candidate={g.candidate}
                buildDetailsPath={buildDetailsPath}
                selectedCandidates={selectedCandidates}
                onToggleSelect={onToggleSelect}
                isGhost
              />
            ))}
            {visibleItems.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                buildDetailsPath={buildDetailsPath}
                selectedCandidates={selectedCandidates}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </>
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

type CandidateCardProps = {
  candidate: CandidateView;
  buildDetailsPath: (candidateId: string) => string;
  selectedCandidates: Record<string, CandidateView>;
  onToggleSelect: (candidate: CandidateView) => void;
  /** A card shown at the top of its (new) target column while its move is
   * still in flight — not draggable/selectable/clickable, just a preview. */
  isGhost?: boolean;
};

const CandidateCard = ({
  candidate,
  buildDetailsPath,
  selectedCandidates,
  onToggleSelect,
  isGhost = false,
}: CandidateCardProps) => {
  const isSelected = !!selectedCandidates[candidate.id];
  const hasSelection = Object.keys(selectedCandidates).length > 0;

  // Dragging a card that's part of an active multi-select carries every
  // selected candidate along with it — Jira's "select several, drag one"
  // behaviour. Dragging an unselected card only ever carries itself.
  // Same react-dnd-connector-vs-React-19-ref-type issue as StatusColumn's
  // drop target — connect a ref object rather than passing the connector as
  // `ref`.
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [{ isDragging }, connectDrag] = useDrag({
    type: CANDIDATE_DRAG_TYPE,
    item: (): CandidateDragItem => ({
      candidates:
        isSelected && Object.keys(selectedCandidates).length > 1
          ? Object.values(selectedCandidates)
          : [candidate],
      sourceStatusCode: candidate.status_code ?? '',
    }),
    canDrag: !isGhost,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });
  connectDrag(cardRef);

  const handleCardClick = (event: MouseEvent) => {
    // While a selection is active, clicking anywhere on a card toggles it
    // in/out of the selection instead of navigating away — same as Jira's
    // board once you've started multi-selecting.
    if (hasSelection) {
      event.preventDefault();
      onToggleSelect(candidate);
    }
  };

  const handleCheckboxClick = (event: MouseEvent) => {
    // Keep the checkbox independent of the card's own click/navigate handling.
    event.preventDefault();
    event.stopPropagation();
  };

  const cardBody = (
    <>
      {!isGhost && (
        <div
          onClick={handleCheckboxClick}
          className={`absolute left-1.5 top-1.5 z-10 leading-none transition-opacity ${
            isSelected
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}
        >
          <Checkbox checked={isSelected} onChange={() => onToggleSelect(candidate)} />
        </div>
      )}
      <div className={isGhost ? '' : 'pl-5'}>
        <div className="truncate text-sm font-semibold text-neutral-900">
          {candidateDisplayName(candidate)}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
          <span>
            {candidate.resume_score === null ? 'No score' : `Score ${candidate.resume_score}`}
          </span>
          <span>
            {dayjs(candidate.applied_date).isValid()
              ? dayjs(candidate.applied_date).format('MMM D')
              : ''}
          </span>
        </div>
      </div>
    </>
  );

  if (isGhost) {
    return (
      <div className="relative animate-pulse rounded-lg border border-primary-200 bg-white p-2.5 opacity-60 shadow-xs">
        {cardBody}
      </div>
    );
  }

  return (
    <Link
      ref={cardRef}
      to={buildDetailsPath(candidate.id)}
      onClick={handleCardClick}
      className={`group relative block cursor-grab rounded-lg border bg-white p-2.5 shadow-xs transition active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-md ${
        isSelected ? 'border-primary-400 ring-1 ring-primary-300' : 'border-neutral-200'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      {cardBody}
    </Link>
  );
};

export default CandidatesPipelineBoard;
