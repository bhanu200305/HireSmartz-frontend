import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { NotificationItem } from '../../api/notification-service/Notifications/index';
import useEventSource from '../../hooks/useEventSource';
import { RootState } from '../../redux/provider/store';
import {
  mergeNotificationsFromStream,
  setUnreadCount,
  upsertNotificationFromStream,
} from '../../redux/slices/notificationSlice';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { getLocalStorageItem } from '../../shared/utils/auth/localstorage.helpers';

const toOptionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const parseUnreadCountFromEvent = (payload: unknown): number | null => {
  if (typeof payload === 'number') {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const source = payload as Record<string, unknown>;
    const nestedData = source.data as Record<string, unknown> | undefined;
    const possibleValues = [
      source.totalUnreadCount,
      source.unreadCount,
      nestedData?.totalUnreadCount,
      nestedData?.unreadCount,
    ];

    for (const value of possibleValues) {
      if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(value, 0);
      }
    }
  }

  return null;
};

const toNotification = (value: unknown): NotificationItem | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const source = value as Record<string, unknown>;
  const title = source.title || source.message;
  const createdAt = source.createdAt || source.created_at;

  if (typeof title !== 'string' || typeof createdAt !== 'string') {
    return null;
  }

  return {
    id:
      (source.id as number | string | undefined) ??
      (source.notificationId as number | string | undefined),
    notificationId:
      (source.notificationId as number | string | undefined) ??
      (source.id as number | string | undefined),
    title,
    message: typeof source.message === 'string' ? source.message : undefined,
    isRead: Boolean(source.isRead ?? source.read),
    createdAt,
    jobOpeningId: toOptionalNumber(source.jobOpeningId),
    candidateId: toOptionalNumber(source.candidateId),
    interviewBookingId: toOptionalNumber(source.interviewBookingId),
    interviewRoundId: toOptionalNumber(source.interviewRoundId),
  };
};

const extractGroupedNotificationsFromEvent = (
  payload: unknown
): { today?: NotificationItem[]; earlier?: NotificationItem[] } | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const source = payload as Record<string, unknown>;
  const data = (source.data as Record<string, unknown> | undefined) || source;

  const todayRaw = Array.isArray(data.today) ? data.today : undefined;
  const earlierRaw = Array.isArray(data.earlier) ? data.earlier : undefined;

  if (!todayRaw && !earlierRaw) {
    return null;
  }

  return {
    today: (todayRaw || []).map(toNotification).filter((item): item is NotificationItem => !!item),
    earlier: (earlierRaw || [])
      .map(toNotification)
      .filter((item): item is NotificationItem => !!item),
  };
};

const extractSingleNotificationFromEvent = (payload: unknown): NotificationItem | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const source = payload as Record<string, unknown>;
  const candidates = [source.notification, source.data, payload];

  for (const candidate of candidates) {
    const parsed = toNotification(candidate);
    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const NotificationStreamListener = () => {
  const dispatch = useDispatch();
  const loginToken = useSelector((state: RootState) => state.LoginSlice.loginToken);
  const token = loginToken || getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
  const isStreamEnabled = Boolean(token);
  const streamSessionRef = useRef<string>(
    `notification-stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  useEffect(() => {
    if (!isStreamEnabled) {
      return;
    }

    console.debug('[NotificationStream] listener mounted', {
      sessionId: streamSessionRef.current,
    });

    return () => {
      console.debug('[NotificationStream] listener unmounted', {
        sessionId: streamSessionRef.current,
      });
    };
  }, [isStreamEnabled]);

  useEventSource({
    type: 'candidate',
    restUrl: isStreamEnabled ? '/job-opening/notifications/stream' : '',
    token,
    onMessage: (eventData: unknown) => {
      const unreadCount = parseUnreadCountFromEvent(eventData);

      const groupedNotifications = extractGroupedNotificationsFromEvent(eventData);
      if (groupedNotifications) {
        dispatch(
          mergeNotificationsFromStream({
            ...groupedNotifications,
            totalUnreadCount: unreadCount === null ? undefined : unreadCount,
          })
        );
        return;
      }

      const singleNotification = extractSingleNotificationFromEvent(eventData);
      if (singleNotification) {
        dispatch(
          upsertNotificationFromStream({
            notification: singleNotification,
            totalUnreadCount: unreadCount === null ? undefined : unreadCount,
          })
        );
        return;
      }

      if (unreadCount !== null) {
        dispatch(setUnreadCount(unreadCount));
      }
    },
    onAbort: () => {
      if (isStreamEnabled) {
        console.debug('[NotificationStream] stream connection aborted', {
          sessionId: streamSessionRef.current,
        });
      }
    },
  });

  return null;
};

export default NotificationStreamListener;
