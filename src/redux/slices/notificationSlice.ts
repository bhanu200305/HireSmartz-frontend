import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FeedPage, NotificationItem } from '../../api/notification-service/Notifications/index';

interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
  lastSyncedAt: number | null;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  lastSyncedAt: null,
};

const sortByNewest = (items: NotificationItem[]): NotificationItem[] => {
  return [...items].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
};

const clampUnreadCount = (value: number): number => {
  return Math.max(value, 0);
};

const notificationSlice = createSlice({
  name: 'notificationSlice',
  initialState,
  reducers: {
    setNotificationFeed: (state, action: PayloadAction<FeedPage>) => {
      state.items = sortByNewest(action.payload.items || []);
      state.unreadCount = clampUnreadCount(action.payload.unread_count || 0);
      state.lastSyncedAt = Date.now();
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = clampUnreadCount(action.payload);
    },
    markNotificationReadOptimistic: (state, action: PayloadAction<string>) => {
      const notificationId = action.payload;
      const target = state.items.find((item) => item.id === notificationId);
      if (target && target.read_at === null) {
        target.read_at = new Date().toISOString();
        state.unreadCount = clampUnreadCount(state.unreadCount - 1);
      }
    },
    markAllReadOptimistic: (state) => {
      const now = new Date().toISOString();
      state.items = state.items.map((item) =>
        item.read_at === null ? { ...item, read_at: now } : item
      );
      state.unreadCount = 0;
    },
    resetNotificationState: () => initialState,
  },
});

export const {
  setNotificationFeed,
  setUnreadCount,
  markNotificationReadOptimistic,
  markAllReadOptimistic,
  resetNotificationState,
} = notificationSlice.actions;

export default notificationSlice.reducer;
