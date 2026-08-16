import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetUnreadCountQuery } from '../../api/notification-service/Notifications/index';
import { RootState } from '../../redux/provider/store';
import { setUnreadCount } from '../../redux/slices/notificationSlice';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { getLocalStorageItem } from '../../shared/utils/auth/localstorage.helpers';

const UNREAD_COUNT_POLL_INTERVAL_MS = 30_000;

/**
 * Keeps the bell's unread badge current.
 *
 * notification-service has no push/SSE surface by design — see
 * docs/API.md's note on `/v1/notifications/unread-count`: "the bell icon
 * polls this every 30s; returning the full page for a badge would be the
 * single most-called query in the product doing a hundred times the work it
 * needs to." This mirrors that design exactly, replacing the previous SSE
 * listener that pointed at an endpoint (`/job-opening/notifications/stream`)
 * which never existed on any backend.
 *
 * The feed itself (`NotificationBell.tsx`) is fetched on demand, when the
 * panel is opened — this component only keeps the badge count in sync while
 * it's closed.
 */
const NotificationStreamListener = () => {
  const dispatch = useDispatch();
  const loginToken = useSelector((state: RootState) => state.LoginSlice.loginToken);
  const token = loginToken || getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
  const isPollingEnabled = Boolean(token);

  const { data } = useGetUnreadCountQuery(undefined, {
    skip: !isPollingEnabled,
    pollingInterval: UNREAD_COUNT_POLL_INTERVAL_MS,
  });

  useEffect(() => {
    if (data) {
      dispatch(setUnreadCount(data.unread_count));
    }
  }, [data, dispatch]);

  return null;
};

export default NotificationStreamListener;
