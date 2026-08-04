import { Badge, Button, Dropdown, Empty, Spin, Select } from 'antd';
const { Option } = Select;
import { BellOutlined } from '@ant-design/icons';
import { MdOutlineFilterAlt } from 'react-icons/md';
import { useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  NotificationItem,
  useLazyGetAllNotificationsQuery,
  useMarkNotificationsAsReadMutation,
} from '../../api/notification-service/Notifications/index';
import { RootState } from '../../redux/provider/store';
import {
  markAllReadOptimistic,
  markNotificationReadOptimistic,
  setNotifications,
  setUnreadCount,
} from '../../redux/slices/notificationSlice';
import { showToast } from '../shared';
import NotificationSection from './NotificationSection';

type NotificationBellProps = {
  disabled?: boolean;
};

type NotificationFilterValue = 'all' | 'read' | 'unread';

type ReadStatus = 'ALL' | 'READ' | 'UNREAD';

const FETCH_LIMIT = 1000;
const PANEL_REFRESH_DEBOUNCE_MS = 300;

const getNotificationId = (notification: NotificationItem): string => {
  return String(notification.notificationId ?? notification.id ?? '');
};

const getNotificationTargetPath = (notification: NotificationItem): string => {
  const { jobOpeningId, candidateId, interviewBookingId, interviewRoundId } = notification;

  if (jobOpeningId && candidateId) {
    return `/jobs/view/${jobOpeningId}/candidates/${candidateId}/details?tab=3`;
  }

  if (jobOpeningId && interviewRoundId) {
    return `/jobs/view/${jobOpeningId}/interview?interviewRoundId=${interviewRoundId}`;
  }

  if (interviewBookingId) {
    return `/ai-call-booking?interviewBookingId=${interviewBookingId}`;
  }

  if (jobOpeningId) {
    return `/jobs/view/${jobOpeningId}/details`;
  }

  return '/';
};

const getReadStatusFromFilter = (filter: NotificationFilterValue): ReadStatus => {
  switch (filter) {
    case 'read':
      return 'READ';
    case 'unread':
      return 'UNREAD';
    default:
      return 'ALL';
  }
};

const markNotificationReadInPanel = (
  items: NotificationItem[],
  notificationId: string,
  filter: NotificationFilterValue
): NotificationItem[] => {
  return items
    .map((item) => {
      if (getNotificationId(item) === notificationId && !item.isRead) {
        return { ...item, isRead: true };
      }

      return item;
    })
    .filter((item) => (filter === 'unread' ? !item.isRead : true));
};

const markAllReadInPanel = (
  items: NotificationItem[],
  filter: NotificationFilterValue
): NotificationItem[] => {
  if (filter === 'unread') {
    return [];
  }

  return items.map((item) => ({ ...item, isRead: true }));
};

const NotificationBell = ({ disabled = false }: NotificationBellProps) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingPanel, setIsLoadingPanel] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<NotificationFilterValue>('all');
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [panelToday, setPanelToday] = useState<NotificationItem[]>([]);
  const [panelEarlier, setPanelEarlier] = useState<NotificationItem[]>([]);
  const lastPanelOpenFetchRef = useRef<number>(0);
  const { today, earlier, totalUnreadCount } = useSelector(
    (state: RootState) => state.notificationSlice
  );

  const [getAllNotifications] = useLazyGetAllNotificationsQuery();
  const [markNotificationsAsRead] = useMarkNotificationsAsReadMutation();

  const fetchNotifications = async (filter: NotificationFilterValue = notificationFilter) => {
    if (disabled) {
      return;
    }

    try {
      setIsLoadingPanel(true);
      const response = await getAllNotifications(
        { limit: FETCH_LIMIT, readStatus: getReadStatusFromFilter(filter) },
        false
      ).unwrap();

      const apiToday = response.today || [];
      const apiEarlier = response.earlier || [];

      setPanelToday(apiToday);
      setPanelEarlier(apiEarlier);
      dispatch(setUnreadCount(response.totalUnreadCount ?? totalUnreadCount));

      if (filter === 'all') {
        dispatch(
          setNotifications({
            today: apiToday,
            earlier: apiEarlier,
            totalUnreadCount: response.totalUnreadCount ?? totalUnreadCount,
          })
        );
      }
    } catch {
      showToast({
        message: 'Unable to load notifications. Please try again.',
        type: 'error',
      });
    } finally {
      setIsLoadingPanel(false);
    }
  };

  const handleFilterSelection = (value: NotificationFilterValue) => {
    setNotificationFilter(value);

    if (!isOpen || disabled) {
      return;
    }

    void fetchNotifications(value);
  };

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
    await fetchNotifications(notificationFilter);
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    const notificationId = getNotificationId(notification);
    const snapshot = {
      today,
      earlier,
      totalUnreadCount,
    };
    const panelSnapshot = {
      today: panelToday,
      earlier: panelEarlier,
    };

    if (!notification.isRead && notificationId) {
      dispatch(markNotificationReadOptimistic(notificationId));
      setPanelToday((current) =>
        markNotificationReadInPanel(current, notificationId, notificationFilter)
      );
      setPanelEarlier((current) =>
        markNotificationReadInPanel(current, notificationId, notificationFilter)
      );

      try {
        await markNotificationsAsRead({ notificationIds: [notificationId] }).unwrap();
      } catch {
        dispatch(setNotifications(snapshot));
        setPanelToday(panelSnapshot.today);
        setPanelEarlier(panelSnapshot.earlier);
        showToast({ message: 'Failed to mark notification as read.', type: 'error' });
      }
    }

    setIsOpen(false);
    navigate(getNotificationTargetPath(notification), {
      state: {
        notificationContext: {
          jobOpeningId: notification.jobOpeningId,
          candidateId: notification.candidateId,
          interviewBookingId: notification.interviewBookingId,
          interviewRoundId: notification.interviewRoundId,
        },
      },
    });
  };

  const handleMarkAllAsRead = async () => {
    if (totalUnreadCount <= 0) {
      return;
    }

    setIsMarkingAll(true);

    const snapshot = {
      today,
      earlier,
      totalUnreadCount,
    };
    const panelSnapshot = {
      today: panelToday,
      earlier: panelEarlier,
    };

    dispatch(markAllReadOptimistic());
    setPanelToday((current) => markAllReadInPanel(current, notificationFilter));
    setPanelEarlier((current) => markAllReadInPanel(current, notificationFilter));

    try {
      await markNotificationsAsRead({ markAll: true }).unwrap();
    } catch {
      dispatch(setNotifications(snapshot));
      setPanelToday(panelSnapshot.today);
      setPanelEarlier(panelSnapshot.earlier);
      showToast({ message: 'Failed to mark all notifications as read.', type: 'error' });
    } finally {
      setIsMarkingAll(false);
    }
  };

  const unreadBadgeCount = useMemo(() => {
    if (disabled) {
      return 0;
    }

    if (totalUnreadCount <= 0) {
      return 0;
    }

    return totalUnreadCount > 99 ? '99+' : totalUnreadCount;
  }, [disabled, totalUnreadCount]);

  const allNotifications = [...panelToday, ...panelEarlier];
  const hasNotifications = allNotifications.length > 0;

  const handleNavigateToCandidate = (notification: NotificationItem) => {
    setIsOpen(false);
    navigate(
      `/jobs/view/${notification.jobOpeningId}/candidates/${notification.candidateId}/details?tab=3`
    );
  };

  const handleCircleMarkAsRead = async (notification: NotificationItem) => {
    if (notification.isRead) {
      return;
    }

    const notificationId = getNotificationId(notification);
    if (!notificationId) {
      return;
    }

    const snapshot = {
      today,
      earlier,
      totalUnreadCount,
    };
    const panelSnapshot = {
      today: panelToday,
      earlier: panelEarlier,
    };

    dispatch(markNotificationReadOptimistic(notificationId));
    setPanelToday((current) =>
      markNotificationReadInPanel(current, notificationId, notificationFilter)
    );
    setPanelEarlier((current) =>
      markNotificationReadInPanel(current, notificationId, notificationFilter)
    );

    try {
      await markNotificationsAsRead({ notificationIds: [notificationId] }).unwrap();
    } catch {
      dispatch(setNotifications(snapshot));
      setPanelToday(panelSnapshot.today);
      setPanelEarlier(panelSnapshot.earlier);
      showToast({ message: 'Failed to mark notification as read.', type: 'error' });
    }
  };

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
              <span className="font-semibold text-sm">NOTIFICATIONS</span>
              <div className="flex items-center gap-2">
                {/* Mark all as read link */}
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAll || totalUnreadCount <= 0}
                  className="text-primary hover:text-[#0B5ED7] disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed whitespace-nowrap cursor-pointer transition-colors"
                  style={{
                    fontFamily: 'Roboto, sans-serif',
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
                  Mark all as read
                </button>
                {/* Filter dropdown */}
                <div className="notification-filter-wrapper">
                  <Select<NotificationFilterValue>
                    placeholder="All"
                    value={notificationFilter}
                    onSelect={handleFilterSelection}
                    prefix={<MdOutlineFilterAlt className="notification-filter-icon" />}
                    allowClear={false}
                    style={{ width: 100 }}
                    className="custom-select notification-filter-select"
                    popupClassName="rounded-3xl"
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
                {/* Checkbox bar */}

                <div className="max-h-[calc(100vh-280px)] overflow-y-auto px-5 py-2">
                  <NotificationSection
                    title="Today"
                    notifications={panelToday}
                    isToday={true}
                    getNotificationId={getNotificationId}
                    onMarkAsRead={handleCircleMarkAsRead}
                    onNotificationClick={handleNotificationClick}
                    onNavigateToCandidate={handleNavigateToCandidate}
                  />

                  <NotificationSection
                    title="Older"
                    notifications={panelEarlier}
                    isToday={false}
                    getNotificationId={getNotificationId}
                    onMarkAsRead={handleCircleMarkAsRead}
                    onNotificationClick={handleNotificationClick}
                    onNavigateToCandidate={handleNavigateToCandidate}
                  />

                  {allNotifications.length >= FETCH_LIMIT && (
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
