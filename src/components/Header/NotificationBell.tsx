import { Badge, Button, Dropdown, Empty, Spin, Select } from 'antd';
const { Option } = Select;
import { BellOutlined } from '@ant-design/icons';
import { FilterSelectIcon } from '../shared/ui/FilterSelectIcon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  NOTIFICATION_FEED_MAX_LIMIT,
  NotificationItem,
  isNotificationRead,
  useLazyGetNotificationFeedQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../../api/notification-service/Notifications/index';
import { RootState } from '../../redux/provider/store';
import {
  markAllReadOptimistic,
  markNotificationReadOptimistic,
  setNotificationFeed,
  setUnreadCount,
} from '../../redux/slices/notificationSlice';
import { showToast } from '../shared';
import NotificationSection from './NotificationSection';

type NotificationBellProps = {
  disabled?: boolean;
};

type NotificationFilterValue = 'all' | 'read' | 'unread';

const PANEL_REFRESH_DEBOUNCE_MS = 300;

const isToday = (dateValue: string): boolean => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return true;
  }

  return date.toDateString() === new Date().toDateString();
};

const applyFilter = (
  items: NotificationItem[],
  filter: NotificationFilterValue
): NotificationItem[] => {
  if (filter === 'read') {
    return items.filter(isNotificationRead);
  }

  if (filter === 'unread') {
    return items.filter((item) => !isNotificationRead(item));
  }

  return items;
};

const NotificationBell = ({ disabled = false }: NotificationBellProps) => {
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingPanel, setIsLoadingPanel] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilterValue>('all');
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const lastPanelOpenFetchRef = useRef<number>(0);
  const { items, unreadCount } = useSelector((state: RootState) => state.notificationSlice);

  const [getNotificationFeed] = useLazyGetNotificationFeedQuery();
  const [markNotificationRead] = useMarkNotificationReadMutation();
  const [markAllNotificationsRead] = useMarkAllNotificationsReadMutation();

  const fetchNotifications = useCallback(
    async (options?: { silent?: boolean }) => {
      if (disabled) {
        return;
      }

      try {
        if (!options?.silent) {
          setIsLoadingPanel(true);
        }
        const response = await getNotificationFeed(
          { limit: NOTIFICATION_FEED_MAX_LIMIT },
          false
        ).unwrap();
        dispatch(setNotificationFeed(response));
      } catch {
        if (!options?.silent) {
          showToast({
            message: 'Unable to load notifications. Please try again.',
            type: 'error',
          });
        }
      } finally {
        if (!options?.silent) {
          setIsLoadingPanel(false);
        }
      }
    },
    [disabled, getNotificationFeed, dispatch]
  );

  // While the panel is open, the unread count is kept live by
  // NotificationStreamListener (SSE, falling back to a 30s poll). If it rises
  // it means a notification landed that isn't in the open list yet — pull the
  // feed again, without the loading spinner so an open panel doesn't flicker.
  const lastUnreadCountRef = useRef(unreadCount);
  useEffect(() => {
    if (isOpen && unreadCount > lastUnreadCountRef.current) {
      void fetchNotifications({ silent: true });
    }
    lastUnreadCountRef.current = unreadCount;
  }, [isOpen, unreadCount, fetchNotifications]);

  const handleOpenPanel = async () => {
    if (disabled) {
      setIsOpen(false);
      return;
    }

    const now = Date.now();
    if (now - lastPanelOpenFetchRef.current < PANEL_REFRESH_DEBOUNCE_MS) {
      setIsOpen(true);
      return;
    }

    lastPanelOpenFetchRef.current = now;
    setIsOpen(true);
    await fetchNotifications();
  };

  const markOneRead = async (notification: NotificationItem) => {
    if (isNotificationRead(notification)) {
      return;
    }

    dispatch(markNotificationReadOptimistic(notification.id));

    try {
      await markNotificationRead(notification.id).unwrap();
    } catch {
      // Roll back by re-syncing with the server rather than hand-reversing
      // the optimistic patch — simpler and always correct.
      dispatch(setUnreadCount(unreadCount));
      await fetchNotifications();
      showToast({ message: 'Failed to mark notification as read.', type: 'error' });
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    // notification-service's feed carries no job/candidate/interview linking
    // (it has no concept of job-service's ids) — clicking a notification only
    // marks it read, the same way opening a message in a plain notification
    // centre does. There is nowhere for it to navigate to.
    await markOneRead(notification);
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount <= 0) {
      return;
    }

    setIsMarkingAll(true);
    const previousUnreadCount = unreadCount;
    dispatch(markAllReadOptimistic());

    try {
      await markAllNotificationsRead().unwrap();
    } catch {
      dispatch(setUnreadCount(previousUnreadCount));
      await fetchNotifications();
      showToast({ message: 'Failed to mark all notifications as read.', type: 'error' });
    } finally {
      setIsMarkingAll(false);
    }
  };

  const unreadBadgeCount = useMemo(() => {
    if (disabled || unreadCount <= 0) {
      return 0;
    }

    return unreadCount > 99 ? '99+' : unreadCount;
  }, [disabled, unreadCount]);

  const { panelToday, panelEarlier } = useMemo(() => {
    const filtered = applyFilter(items, notificationFilter);
    return {
      panelToday: filtered.filter((item) => isToday(item.created_at)),
      panelEarlier: filtered.filter((item) => !isToday(item.created_at)),
    };
  }, [items, notificationFilter]);

  const hasNotifications = panelToday.length + panelEarlier.length > 0;

  return (
    <>
      <Dropdown
        placement="bottomRight"
        onOpenChange={(open) => {
          if (disabled) {
            setIsOpen(false);
            return;
          }

          if (open) {
            handleOpenPanel();
          } else {
            setIsOpen(false);
            setNotificationFilter('all');
          }
        }}
        open={isOpen}
        trigger={disabled ? [] : ['click']}
        dropdownRender={() => (
          <div
            className="notification-dropdown"
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
              width: 'min(500px, calc(100vw - 24px))',
              maxWidth: '100vw',
              overflow: 'hidden',
            }}
          >
            {/* Header with title and actions */}
            <div className="px-5 py-2 border-b border-gray-200 sticky top-0 bg-white flex items-center justify-between rounded-t-lg">
              <span className="font-semibold text-sm">Notifications</span>
              <div className="flex items-center gap-2">
                {/* Mark all as read link */}
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAll || unreadCount <= 0}
                  className="text-primary hover:text-[#0B5ED7] disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed whitespace-nowrap cursor-pointer transition-colors"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 500,
                    fontSize: '14px',
                    lineHeight: '14px',
                    letterSpacing: '0',
                    textDecorationLine: 'underline',
                    textDecorationStyle: 'solid',
                    textUnderlineOffset: '2px',
                    textDecorationThickness: '1px',
                    textDecorationSkipInk: 'auto',
                  }}
                >
                  Mark All As Read
                </button>
                {/* Filter dropdown */}
                <div className="cfp-dropdown-trigger notification-filter-wrapper">
                  <FilterSelectIcon />
                  <Select<NotificationFilterValue>
                    placeholder="All"
                    value={notificationFilter}
                    onSelect={setNotificationFilter}
                    allowClear={false}
                    style={{ width: 100 }}
                    className="custom-select notification-filter-select"
                    variant="borderless"
                  >
                    <Option value="all">All</Option>
                    <Option value="read">Read</Option>
                    <Option value="unread">Unread</Option>
                  </Select>
                </div>
              </div>
            </div>

            {isLoadingPanel ? (
              <div className="h-44 flex items-center justify-center">
                <Spin />
              </div>
            ) : !hasNotifications ? (
              <div className="h-44 flex items-center justify-center">
                <Empty
                  description={
                    notificationFilter === 'all'
                      ? 'No notifications yet'
                      : 'No notifications match filters'
                  }
                />
              </div>
            ) : (
              <>
                <div className="max-h-[calc(100vh-280px)] overflow-y-auto px-5 py-2">
                  <NotificationSection
                    title="Today"
                    notifications={panelToday}
                    isToday={true}
                    onMarkAsRead={markOneRead}
                    onNotificationClick={handleNotificationClick}
                  />

                  <NotificationSection
                    title="Older"
                    notifications={panelEarlier}
                    isToday={false}
                    onMarkAsRead={markOneRead}
                    onNotificationClick={handleNotificationClick}
                  />

                  {items.length >= NOTIFICATION_FEED_MAX_LIMIT && (
                    <p className="text-center text-xs text-gray-500 mt-4 mb-3">
                      Showing latest notifications
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      >
        <Button
          aria-label={disabled ? 'Notifications unavailable' : 'Open notifications'}
          type="text"
          disabled={disabled}
          className={`notification-bell-button ${disabled ? 'notification-bell-button--disabled' : ''} ${isOpen ? 'notification-bell-button--active' : ''} flex items-center justify-center`}
        >
          <Badge
            count={unreadBadgeCount}
            size="small"
            offset={[6, 0]}
            className={`notification-bell-badge ${typeof unreadBadgeCount === 'string' && unreadBadgeCount.includes('+') ? 'notification-bell-badge--pill' : 'notification-bell-badge--circular'}`}
          >
            <BellOutlined className="notification-bell-icon text-2xl" />
          </Badge>
        </Button>
      </Dropdown>
    </>
  );
};

export default NotificationBell;
