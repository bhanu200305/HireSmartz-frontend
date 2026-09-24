import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetUnreadCountQuery } from '../../api/notification-service/Notifications/index';
import { RootState } from '../../redux/provider/store';
import { setUnreadCount } from '../../redux/slices/notificationSlice';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { INACTIVITY_TIMEOUT_MS } from '../../constants/app.constants';
import { getLocalStorageItem } from '../../shared/utils/auth/localstorage.helpers';
import useNotificationStream from '../../hooks/useNotificationStream';
import useIdleTimeout from '../../hooks/useIdleTimeout';

const UNREAD_COUNT_POLL_INTERVAL_MS = 30_000;

/**
 * Keeps the bell's unread badge current, in two layers:
 *
 *  - a 30s poll of `GET /v1/notifications/unread-count` — the always-on
 *    baseline. It's the only path when the SSE feature is disabled
 *    (`NOTIFICATION_SSE_ENABLED=false`), and it closes any gap while the
 *    stream is reconnecting.
 *  - notification-service's SSE stream (`useNotificationStream`) — a real-time
 *    nudge that refetches the count the moment a notification is dispatched,
 *    so the badge updates without waiting for the next poll.
 *
 * The feed list itself (`NotificationBell.tsx`) is still fetched on demand when
 * the panel opens; this component only keeps the badge in sync while it's shut.
 *
 * BOTH LAYERS PAUSE ONCE THE TAB HAS BEEN GENUINELY IDLE
 * -------------------------------------------------------
 * This component is mounted at the app root (App.tsx), independently of
 * MainLayout's own per-page inactivity-logout timer — so without this, an
 * abandoned-but-open tab keeps polling every 30s forever. Once the short-
 * lived access token expires mid-poll, that 401 forces a token refresh
 * purely to keep polling alive, and that refresh is itself an authenticated
 * hit to auth-service — exactly the kind of ambient traffic that can make an
 * idle session's server-side "last activity" look fresh long after the
 * person left the tab. `useIdleTimeout` (real DOM input only, never a
 * background fetch) gates both the poll and the SSE reconnect so neither
 * keeps generating that traffic once nobody's there. Same 30-minute window
 * MainLayout's own inactivity logout already uses — one shared meaning of
 * "idle," not a second number to keep in sync.
 */
const NotificationStreamListener = () => {
  const dispatch = useDispatch();
  const loginToken = useSelector((state: RootState) => state.LoginSlice.loginToken);
  const token = loginToken || getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
  const isEnabled = Boolean(token);
  const isIdle = useIdleTimeout(INACTIVITY_TIMEOUT_MS);

  const { data, refetch } = useGetUnreadCountQuery(undefined, {
    skip: !isEnabled,
    pollingInterval: isIdle ? 0 : UNREAD_COUNT_POLL_INTERVAL_MS,
  });

  useNotificationStream({
    enabled: isEnabled && !isIdle,
    onActivity: () => {
      if (isEnabled) {
        void refetch();
      }
    },
  });

  useEffect(() => {
    if (data) {
      dispatch(setUnreadCount(data.unread_count));
    }
  }, [data, dispatch]);

  return null;
};

export default NotificationStreamListener;
