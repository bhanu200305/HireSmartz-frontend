import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  NotificationItem,
  NotificationsResponse,
} from '../../api/notification-service/Notifications/index';

interface NotificationState {
  today: NotificationItem[];
  earlier: NotificationItem[];
  totalUnreadCount: number;
  lastSyncedAt: number | null;
}

interface StreamNotificationPayload {
  notification: NotificationItem;
  totalUnreadCount?: number;
}

interface StreamNotificationsPayload {
  today?: NotificationItem[];
  earlier?: NotificationItem[];
  totalUnreadCount?: number;
}

const initialState: NotificationState = {
  today: [],
  earlier: [],
  totalUnreadCount: 0,
  lastSyncedAt: null,
};

const sortByNewest = (items: NotificationItem[]): NotificationItem[] => {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
};

const getNotificationId = (notification: NotificationItem): string => {
  return String(notification.notificationId ?? notification.id ?? '');
};

const isToday = (dateValue: string): boolean => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return true;
  }

  return date.toDateString() === new Date().toDateString();
};

const clampUnreadCount = (value: number): number => {
  return Math.max(value, 0);
};

const findNotificationById = (
  state: NotificationState,
  id: string
): { group: 'today' | 'earlier'; notification: NotificationItem } | null => {
  const inToday = state.today.find((item) => getNotificationId(item) === id);
  if (inToday) {
    return { group: 'today', notification: inToday };
  }

  const inEarlier = state.earlier.find((item) => getNotificationId(item) === id);
  if (inEarlier) {
    return { group: 'earlier', notification: inEarlier };
  }

  return null;
};

const removeNotificationById = (items: NotificationItem[], id: string): NotificationItem[] => {
  return items.filter((item) => getNotificationId(item) !== id);
};

const upsertToGroup = (
  state: NotificationState,
  notification: NotificationItem,
  preferredGroup?: 'today' | 'earlier'
): { previousIsRead?: boolean } => {
  const id = getNotificationId(notification);
  const existing = id ? findNotificationById(state, id) : null;

  if (id) {
    state.today = removeNotificationById(state.today, id);
    state.earlier = removeNotificationById(state.earlier, id);
  }

  const group = preferredGroup || (isToday(notification.createdAt) ? 'today' : 'earlier');
  const next = { ...existing?.notification, ...notification };

  if (group === 'today') {
    state.today = sortByNewest([next, ...state.today]);
  } else {
    state.earlier = sortByNewest([next, ...state.earlier]);
  }

  return { previousIsRead: existing?.notification.isRead };
};

const notificationSlice = createSlice({
  name: 'notificationSlice',
  initialState,
  reducers: {
    setNotifications: (state, action: PayloadAction<NotificationsResponse>) => {
      state.today = sortByNewest(action.payload.today || []);
      state.earlier = sortByNewest(action.payload.earlier || []);
      state.totalUnreadCount = Math.max(action.payload.totalUnreadCount || 0, 0);
      state.lastSyncedAt = Date.now();
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.totalUnreadCount = clampUnreadCount(action.payload);
    },
    upsertNotificationFromStream: (state, action: PayloadAction<StreamNotificationPayload>) => {
      const { notification, totalUnreadCount } = action.payload;
      const { previousIsRead } = upsertToGroup(state, notification);

      if (typeof totalUnreadCount === 'number') {
        state.totalUnreadCount = clampUnreadCount(totalUnreadCount);
      } else {
        const isNewUnread = previousIsRead === undefined && !notification.isRead;
        const becameUnread = previousIsRead === true && !notification.isRead;
        const becameRead = previousIsRead === false && notification.isRead;

        if (isNewUnread || becameUnread) {
          state.totalUnreadCount = clampUnreadCount(state.totalUnreadCount + 1);
        } else if (becameRead) {
          state.totalUnreadCount = clampUnreadCount(state.totalUnreadCount - 1);
        }
      }

      state.lastSyncedAt = Date.now();
    },
    mergeNotificationsFromStream: (state, action: PayloadAction<StreamNotificationsPayload>) => {
      const { today = [], earlier = [], totalUnreadCount } = action.payload;

      today.forEach((item) => {
        upsertToGroup(state, item, 'today');
      });

      earlier.forEach((item) => {
        upsertToGroup(state, item, 'earlier');
      });

      if (typeof totalUnreadCount === 'number') {
        state.totalUnreadCount = clampUnreadCount(totalUnreadCount);
      }

      state.lastSyncedAt = Date.now();
    },
    markNotificationReadOptimistic: (state, action: PayloadAction<string>) => {
      const notificationId = action.payload;
      let changed = false;

      const markAsRead = (items: NotificationItem[]) =>
        items.map((item) => {
          if (getNotificationId(item) === notificationId && !item.isRead) {
            changed = true;
            return { ...item, isRead: true };
          }
          return item;
        });

      state.today = markAsRead(state.today);
      state.earlier = markAsRead(state.earlier);

      if (changed) {
        state.totalUnreadCount = Math.max(state.totalUnreadCount - 1, 0);
      }
    },
    markAllReadOptimistic: (state) => {
      state.today = state.today.map((item) => ({ ...item, isRead: true }));
      state.earlier = state.earlier.map((item) => ({ ...item, isRead: true }));
      state.totalUnreadCount = 0;
    },
    resetNotificationState: () => initialState,
  },
});

export const {
  setNotifications,
  setUnreadCount,
  upsertNotificationFromStream,
  mergeNotificationsFromStream,
  markNotificationReadOptimistic,
  markAllReadOptimistic,
  resetNotificationState,
} = notificationSlice.actions;

export default notificationSlice.reducer;
