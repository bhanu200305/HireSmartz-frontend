import { describe, expect, it } from 'vitest';
import type { FeedPage, NotificationItem } from '../../src/api/notification-service/Notifications';
import { isNotificationRead } from '../../src/api/notification-service/Notifications';
import reducer, {
  setNotificationFeed,
  setUnreadCount,
  markNotificationReadOptimistic,
  markAllReadOptimistic,
  resetNotificationState,
} from '../../src/redux/slices/notificationSlice';

const initialState = reducer(undefined, { type: '@@INIT' });

const makeItem = (overrides: Partial<NotificationItem> = {}): NotificationItem => ({
  id: 'notif-1',
  notification_type: 'JOB_UPDATE',
  category: 'jobs',
  title: 'Title',
  body: 'Body',
  created_at: '2026-01-01T00:00:00.000Z',
  read_at: null,
  ...overrides,
});

describe('notificationSlice reducer', () => {
  describe('setNotificationFeed', () => {
    it('sorts items newest-first regardless of input order', () => {
      const older = makeItem({ id: 'older', created_at: '2026-01-01T00:00:00.000Z' });
      const newer = makeItem({ id: 'newer', created_at: '2026-02-01T00:00:00.000Z' });
      const page: FeedPage = { items: [older, newer], unread_count: 2 };

      const state = reducer(initialState, setNotificationFeed(page));

      expect(state.items.map((item) => item.id)).toEqual(['newer', 'older']);
    });

    it('clamps a negative unread_count to 0', () => {
      const page: FeedPage = { items: [], unread_count: -3 };
      const state = reducer(initialState, setNotificationFeed(page));
      expect(state.unreadCount).toBe(0);
    });

    it('defaults items/unread_count when the feed page omits them', () => {
      const state = reducer(initialState, setNotificationFeed({} as FeedPage));
      expect(state.items).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('setUnreadCount', () => {
    it('clamps a negative value to 0', () => {
      const state = reducer(initialState, setUnreadCount(-5));
      expect(state.unreadCount).toBe(0);
    });

    it('accepts a positive value as-is', () => {
      const state = reducer(initialState, setUnreadCount(4));
      expect(state.unreadCount).toBe(4);
    });
  });

  describe('markNotificationReadOptimistic', () => {
    it('marks an unread item as read and decrements the unread count', () => {
      const unread = makeItem({ id: 'a', read_at: null });
      const seeded = {
        ...initialState,
        items: [unread],
        unreadCount: 1,
      };

      const state = reducer(seeded, markNotificationReadOptimistic('a'));

      expect(state.items[0].read_at).not.toBeNull();
      expect(state.unreadCount).toBe(0);
    });

    it('is a no-op for an item that is already read', () => {
      const read = makeItem({ id: 'a', read_at: '2026-01-01T00:00:00.000Z' });
      const seeded = { ...initialState, items: [read], unreadCount: 0 };

      const state = reducer(seeded, markNotificationReadOptimistic('a'));

      expect(state.unreadCount).toBe(0);
      expect(state.items[0].read_at).toBe('2026-01-01T00:00:00.000Z');
    });

    it('is a no-op when the notification id is not found', () => {
      const seeded = { ...initialState, items: [makeItem({ id: 'a' })], unreadCount: 1 };
      const state = reducer(seeded, markNotificationReadOptimistic('missing'));
      expect(state.unreadCount).toBe(1);
    });
  });

  it('markAllReadOptimistic marks every item read and zeroes the unread count', () => {
    const seeded = {
      ...initialState,
      items: [makeItem({ id: 'a', read_at: null }), makeItem({ id: 'b', read_at: null })],
      unreadCount: 2,
    };

    const state = reducer(seeded, markAllReadOptimistic());

    expect(state.items.every((item) => item.read_at !== null)).toBe(true);
    expect(state.unreadCount).toBe(0);
  });

  it('resetNotificationState restores the initial state', () => {
    const seeded = reducer(initialState, setUnreadCount(7));
    expect(reducer(seeded, resetNotificationState())).toEqual(initialState);
  });
});

describe('isNotificationRead', () => {
  it('returns false for an unread notification', () => {
    expect(isNotificationRead(makeItem({ read_at: null }))).toBe(false);
  });

  it('returns true once read_at is set', () => {
    expect(isNotificationRead(makeItem({ read_at: '2026-01-01T00:00:00.000Z' }))).toBe(true);
  });
});
