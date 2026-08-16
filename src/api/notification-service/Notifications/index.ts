import { notifApi } from '../notifApi';

/**
 * One row in the signed-in user's in-app feed — matches notification-service's
 * `FeedItem` (app/modules/notifications/api/responses.py) field-for-field.
 *
 * There is no job/candidate/interview linking here, deliberately: the real
 * service has no concept of job-service's ids (it only ever sees a
 * `notification_type` + rendered `subject`/`body_html`), unlike the legacy
 * mock this replaces. See ORGANIZATION_SERVICE_INTEGRATION.md-style notes in
 * the integration plan for why that's a real, called-out product gap and not
 * an oversight here.
 */
export interface NotificationItem {
  id: string;
  notification_type: string;
  category: string;
  title: string | null;
  body: string | null;
  created_at: string;
  read_at: string | null;
}

export interface FeedPage {
  items: NotificationItem[];
  unread_count: number;
}

export interface UnreadCount {
  unread_count: number;
}

interface GetFeedParams {
  limit?: number;
  before?: string;
}

/** Backend max — `GET /v1/notifications` rejects anything above this. */
export const NOTIFICATION_FEED_MAX_LIMIT = 100;

export const isNotificationRead = (notification: NotificationItem): boolean =>
  notification.read_at !== null;

const notificationsApi = notifApi.injectEndpoints({
  endpoints: (build) => ({
    getNotificationFeed: build.query<FeedPage, GetFeedParams | void>({
      query: (params) => {
        const search = new URLSearchParams();
        search.set('limit', String(params?.limit ?? NOTIFICATION_FEED_MAX_LIMIT));
        if (params?.before) {
          search.set('before', params.before);
        }
        return {
          url: `/v1/notifications?${search.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['NotificationFeed'],
    }),
    getUnreadCount: build.query<UnreadCount, void>({
      query: () => ({
        url: '/v1/notifications/unread-count',
        method: 'GET',
      }),
      providesTags: ['UnreadCount'],
    }),
    markNotificationRead: build.mutation<void, string>({
      query: (deliveryId) => ({
        url: `/v1/notifications/${deliveryId}/read`,
        method: 'POST',
      }),
      invalidatesTags: ['UnreadCount'],
    }),
    markAllNotificationsRead: build.mutation<void, void>({
      query: () => ({
        url: '/v1/notifications/read-all',
        method: 'POST',
      }),
      invalidatesTags: ['UnreadCount'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useLazyGetNotificationFeedQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
