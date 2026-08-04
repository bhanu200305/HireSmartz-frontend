import { api } from '../../index';

export interface NotificationItem {
  id?: number | string;
  notificationId?: number | string;
  title: string;
  message?: string;
  isRead: boolean;
  createdAt: string;
  jobOpeningId?: number;
  candidateId?: number;
  interviewBookingId?: number;
  interviewRoundId?: number;
}

export interface NotificationsResponse {
  today: NotificationItem[];
  earlier: NotificationItem[];
  totalUnreadCount: number;
}

interface GetAllNotificationsParams {
  limit?: number;
  readStatus?: 'ALL' | 'READ' | 'UNREAD';
}

type NotificationMarkId = number | string;

type MarkReadBody =
  | {
      markAll: true;
    }
  | {
      notificationIds: NotificationMarkId[];
    };

export interface MarkReadNotificationsPayload {
  markAll?: boolean;
  notificationIds?: NotificationMarkId[];
}

export const buildMarkReadRequestBody = ({
  markAll,
  notificationIds,
}: MarkReadNotificationsPayload): MarkReadBody => {
  if (markAll) {
    return { markAll: true };
  }

  const ids = (notificationIds || []).filter(
    (value): value is NotificationMarkId => value !== null && value !== undefined && value !== ''
  );

  return { notificationIds: ids };
};

const notificationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAllNotifications: build.query<NotificationsResponse, GetAllNotificationsParams | void>({
      query: (params) => {
        const limit = params?.limit ?? 1000;
        const readStatus = params?.readStatus ?? 'ALL';
        return {
          url: `/job-opening/notifications/getAll?limit=${limit}&readStatus=${readStatus}`,
          method: 'GET',
        };
      },
    }),
    markNotificationsAsRead: build.mutation<void, MarkReadNotificationsPayload>({
      query: (payload) => ({
        url: '/job-opening/notifications/mark-read',
        method: 'PUT',
        body: buildMarkReadRequestBody(payload),
      }),
    }),
  }),
});

export const { useLazyGetAllNotificationsQuery, useMarkNotificationsAsReadMutation } =
  notificationsApi;
