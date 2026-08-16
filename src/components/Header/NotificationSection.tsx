import { CheckOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import {
  NotificationItem,
  isNotificationRead,
} from '../../api/notification-service/Notifications/index';
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
  onMarkAsRead: (notification: NotificationItem) => void;
  onNotificationClick: (notification: NotificationItem) => void;
};

const NotificationSection = ({
  title,
  notifications,
  isToday = false,
  onMarkAsRead,
  onNotificationClick,
}: NotificationSectionProps) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="mb-2">
      <h4 className="text-sm font-semibold text-gray-700 mb-2 px-0">{title}</h4>
      <div className="space-y-1">
        {notifications.map((notification) => {
          const isRead = isNotificationRead(notification);
          const timeDisplay = isToday
            ? getRelativeTime(notification.created_at)
            : formattedDateTime(notification.created_at);

          return (
            <div
              key={notification.id}
              role="button"
              tabIndex={0}
              aria-label={`Notification: ${notification.title || 'Notification'}`}
              className={`group w-full text-left rounded-md border px-3 py-2.5 transition-colors flex flex-col gap-1.5 relative cursor-pointer ${
                isRead
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
                {notification.title ? (
                  <p
                    className={`text-sm leading-snug flex-1 ${isRead ? 'text-gray-700 font-normal' : 'text-gray-900 font-semibold'}`}
                  >
                    {notification.title}
                  </p>
                ) : null}
                {!isRead ? (
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
              {notification.body ? (
                // `body` comes from `delivery.body_html`, already escaped/rendered
                // server-side — notification-service's own API docs are explicit
                // that the frontend inserts it as HTML (context values are
                // sandboxed and escaped at render time; see
                // docs/API.md#the-in-app-feed-v1notifications). For the in-app
                // channel `title` is normally null and this fragment carries the
                // heading itself, so this is the primary content, not a caption.
                <div
                  className={`text-xs [&_p]:m-0 [&_a]:text-primary [&_a]:underline ${isRead ? 'text-gray-500' : 'text-gray-600'}`}
                  dangerouslySetInnerHTML={{ __html: notification.body }}
                />
              ) : null}
              <div className="flex items-center justify-end gap-2">
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
