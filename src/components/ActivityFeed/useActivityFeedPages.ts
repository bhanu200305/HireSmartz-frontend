import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityFeedArgs,
  ActivityItem,
  ActivityScope,
  useLazyGetActivityFeedQuery,
} from '../../api/audit-service/Activity/activity';
import { isInitialStatusEcho } from './activityFormat';

export type ActivityFeedError = 'unavailable' | 'forbidden' | 'failed';

const visible = (items: ActivityItem[] | undefined): ActivityItem[] =>
  (items ?? []).filter((i) => !isInitialStatusEcho(i));

type State = {
  items: ActivityItem[];
  nextCursor: string | null;
  scope: ActivityScope | null;
  loading: boolean;
  loadingMore: boolean;
  error: ActivityFeedError | null;
};

const INITIAL: State = {
  items: [],
  nextCursor: null,
  scope: null,
  loading: true,
  loadingMore: false,
  error: null,
};

// 503 for a hiring manager/recruiter means "couldn't load your jobs right
// now" — that must read as an outage, never as an empty feed.
const toFeedError = (err: unknown): ActivityFeedError => {
  const status = (err as { status?: unknown })?.status;
  if (status === 503) return 'unavailable';
  if (status === 403) return 'forbidden';
  return 'failed';
};

/**
 * Cursor-paged activity feed: the first page replaces the list whenever the
 * filters change, "Load more" appends the next page. A response that arrives
 * after the filters changed again is dropped.
 */
export const useActivityFeedPages = (args: ActivityFeedArgs) => {
  const [trigger] = useLazyGetActivityFeedQuery();
  const [state, setState] = useState<State>(INITIAL);
  const requestId = useRef(0);
  const argsRef = useRef(args);
  argsRef.current = args;
  const argsKey = JSON.stringify(args);

  const loadFirstPage = useCallback(async () => {
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, loading: true, loadingMore: false, error: null }));
    try {
      const res = await trigger({ ...argsRef.current, cursor: null }, false).unwrap();
      if (id !== requestId.current) return;
      setState({
        items: visible(res.items),
        nextCursor: res.next_cursor ?? null,
        scope: res.scope,
        loading: false,
        loadingMore: false,
        error: null,
      });
    } catch (err) {
      if (id !== requestId.current) return;
      setState((prev) => ({
        ...prev,
        items: [],
        nextCursor: null,
        loading: false,
        error: toFeedError(err),
      }));
    }
  }, [trigger]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage, argsKey]);

  const loadMore = useCallback(async () => {
    const cursor = state.nextCursor;
    if (!cursor || state.loadingMore) return;
    const id = requestId.current;
    setState((prev) => ({ ...prev, loadingMore: true }));
    try {
      const res = await trigger({ ...argsRef.current, cursor }, false).unwrap();
      if (id !== requestId.current) return;
      setState((prev) => {
        const seen = new Set(prev.items.map((i) => i.id));
        return {
          ...prev,
          items: [...prev.items, ...visible(res.items).filter((i) => !seen.has(i.id))],
          nextCursor: res.next_cursor ?? null,
          scope: res.scope ?? prev.scope,
          loadingMore: false,
        };
      });
    } catch (err) {
      if (id !== requestId.current) return;
      setState((prev) => ({ ...prev, loadingMore: false, error: toFeedError(err) }));
    }
  }, [trigger, state.nextCursor, state.loadingMore]);

  return { ...state, loadMore, reload: loadFirstPage };
};
