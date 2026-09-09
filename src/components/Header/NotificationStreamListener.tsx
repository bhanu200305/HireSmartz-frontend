import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useGetUnreadCountQuery } from '../../api/notification-service/Notifications/index';
import { RootState } from '../../redux/provider/store';
import { setUnreadCount } from '../../redux/slices/notificationSlice';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { getLocalStorageItem } from '../../shared/utils/auth/localstorage.helpers';
import useNotificationStream from '../../hooks/useNotificationStream';

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
 */
const NotificationStreamListener = () => {
  const dispatch = useDispatch();
  const loginToken = useSelector((state: RootState) => state.LoginSlice.loginToken);
  const token = loginToken || getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
  const isEnabled = Boolean(token);

  const { data, refetch } = useGetUnreadCountQuery(undefined, {
    skip: !isEnabled,
    pollingInterval: UNREAD_COUNT_POLL_INTERVAL_MS,
  });

  useNotificationStream({
    enabled: isEnabled,
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
