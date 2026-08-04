import { LiaExternalLinkAltSolid } from 'react-icons/lia';
import { CheckOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { NotificationItem } from '../../api/notification-service/Notifications/index';
import { formattedDateTime } from '../../shared/utils/methods';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const getRelativeTime = (dateString: string): string => {
  return dayjs(dateString).fromNow();
};

type NotificationSectionProps = {
  title: string;
  notifications: NotificationItem[];
  isToday?: boolean;
  getNotificationId: (notification: NotificationItem) => string;
  onMarkAsRead: (notification: NotificationItem) => void;
  onNotificationClick: (notification: NotificationItem) => void;
  onNavigateToCandidate: (notification: NotificationItem) => void;
};

const NotificationSection = ({
  title,
  notifications,
  isToday = false,
  getNotificationId,
  onMarkAsRead,
  onNotificationClick,
  onNavigateToCandidate,
}: NotificationSectionProps) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="mb-2">
      <h4 className="text-sm font-semibold text-gray-700 mb-2 px-0">{title}</h4>
      <div className="space-y-1">
        {notifications.map((notification) => {
          const id = getNotificationId(notification);
          const timeDisplay = isToday
            ? getRelativeTime(notification.createdAt)
            : formattedDateTime(notification.createdAt);

          return (
            <div
              key={id || `${notification.createdAt}-${notification.title}`}
              role="button"
              tabIndex={0}
              aria-label={`Notification: ${notification.title || notification.message || 'Notification'}`}
              className={`group w-full text-left rounded-md border px-3 py-2.5 transition-colors flex flex-col gap-1.5 relative cursor-pointer ${
                notification.isRead
                  ? 'border-gray-200 bg-white hover:bg-gray-50'
                  : 'border-l-4 border-l-[#165DCC] border-gray-300 bg-[#EEF4FF] hover:bg-[#E6EEFC]'
              }`}
              onClick={() => onNotificationClick(notification)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.repeat) {
                    return;
                  }

                  e.preventDefault();
                  onNotificationClick(notification);
                }

                if (e.key === ' ') {
                  // Match native button behavior: Space activates on keyup, not keydown.
                  e.preventDefault();
                }
              }}
              onKeyUp={(e) => {
                if (e.key === ' ') {
                  if (e.repeat) {
                    return;
                  }

                  e.preventDefault();
                  onNotificationClick(notification);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`text-sm leading-snug flex-1 ${notification.isRead ? 'text-gray-700 font-normal' : 'text-gray-900 font-semibold'}`}
                >
                  {notification.title || notification.message || 'Notification'}
                </p>
                {!notification.isRead ? (
                  <Tooltip title="Click to mark as read" placement="top" mouseEnterDelay={0.15}>
                    <button
                      type="button"
                      aria-label="Mark notification as read"
                      className="mark-read-button hidden h-4 w-4 rounded-full border border-gray-400 bg-transparent shrink-0 transition-colors cursor-pointer flex items-center justify-center group-hover:flex group-hover:border-gray-300 hover:bg-[#165DCC] hover:border-[#165DCC]"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkAsRead(notification);
                      }}
                    >
                      <CheckOutlined
                        style={{ fontSize: '10px', color: '#ffffff' }}
                        className="mark-read-tick opacity-0"
                      />
                    </button>
                  </Tooltip>
                ) : null}
              </div>
              <p className={`text-xs ${notification.isRead ? 'text-gray-500' : 'text-gray-600'}`}>
                {notification.message}
              </p>
              <div className="flex items-center justify-between gap-2">
                {notification.jobOpeningId && notification.candidateId ? (
                  <button
                    type="button"
                    aria-label="View candidate details"
                    className="cursor-pointer text-primary hover:text-primary/80 transition-colors text-xs font-medium flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToCandidate(notification);
                    }}
                  >
                    <LiaExternalLinkAltSolid className="text-sm" />
                  </button>
                ) : null}

                <span className="text-xs text-gray-500 whitespace-nowrap">{timeDisplay}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationSection;
