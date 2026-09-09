import { useEffect, useRef } from 'react';
import { useMintNotificationStreamTicketMutation } from '../api/notification-service/Notifications/index';

// notification-service is its own deployable — the SSE stream lives on the same
// host as the rest of its API, just outside the `/v1` prefix (see that
// service's stream_router.py: ResponseEnvelopeMiddleware would otherwise buffer
// the stream and never flush it).
const NOTIFICATION_SERVICE_BASE_URL = import.meta.env.VITE_NOTIFICATION_SERVICE_ENDPOINT as string;

// Backoff for reconnecting after an error, capped so a long outage still
// retries every 30s. The unread-count poll in NotificationStreamListener
// covers the gaps, so there is no urgency to reconnect aggressively.
const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

interface UseNotificationStreamOptions {
  /** Only connect while the user is authenticated. */
  enabled: boolean;
  /**
   * Fired whenever the server signals feed activity — a `sync` event on every
   * (re)connect, or a `notification` event for a new delivery. The caller
   * should refetch the unread count (and the feed, if it's on screen).
   *
   * Deliberately carries no payload: the stream event has no title or body,
   * exactly as notification-service's redis_event_publisher documents — the
   * client is expected to re-read its feed, not render the event directly.
   */
  onActivity: () => void;
}

/**
 * Opens notification-service's Server-Sent Events stream so the bell reacts to
 * new notifications immediately, instead of only on the 30s unread-count poll.
 *
 * Flow (notification-service stream_router.py / tickets.py):
 *   1. POST /v1/notifications/stream-ticket   (bearer auth) -> one-time ticket
 *   2. GET  /realtime/notifications/stream?ticket=...        (EventSource)
 *   3. named events: `sync` (every connect), `notification` (new delivery);
 *      `: heartbeat` comment lines are swallowed by EventSource for us.
 *
 * The ticket is consumed on first use, so native EventSource auto-reconnect
 * (same URL, now-dead ticket) is useless — on any error we close and reconnect
 * ourselves with a fresh ticket and a capped backoff. A 404 from the mint
 * means SSE is disabled in this environment (`NOTIFICATION_SSE_ENABLED=false`);
 * we stop and leave the badge to the poll.
 */
export const useNotificationStream = ({
  enabled,
  onActivity,
}: UseNotificationStreamOptions): void => {
  const [mintTicket] = useMintNotificationStreamTicketMutation();

  // Keep the latest callback without re-running the effect (and tearing down
  // the connection) on every parent render.
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  useEffect(() => {
    if (!enabled || !NOTIFICATION_SERVICE_BASE_URL) {
      return;
    }

    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let stopped = false;

    const scheduleReconnect = () => {
      if (stopped || reconnectTimer) return;
      const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, delay);
    };

    const connect = async () => {
      if (stopped) return;

      let ticket: string;
      try {
        const result = await mintTicket().unwrap();
        ticket = result.ticket;
      } catch (error) {
        const status = (error as { status?: number | string })?.status;
        if (status === 404) {
          // SSE isn't enabled here — stop; the poll keeps the badge current.
          stopped = true;
          return;
        }
        scheduleReconnect();
        return;
      }

      if (stopped) return;

      const url =
        `${NOTIFICATION_SERVICE_BASE_URL.replace(/\/$/, '')}` +
        `/realtime/notifications/stream?ticket=${encodeURIComponent(ticket)}`;
      source = new EventSource(url);
      const openedAt = Date.now();

      const handleActivity = () => {
        onActivityRef.current();
      };

      source.addEventListener('sync', handleActivity);
      source.addEventListener('notification', handleActivity);

      source.onerror = () => {
        // EventSource would keep retrying this single-use ticket forever — take
        // over: close, then reconnect with a fresh ticket on a backoff. A
        // connection that stayed up a while was healthy, so reset the backoff;
        // a connect→error loop keeps backing off instead of hammering the
        // ticket endpoint.
        if (Date.now() - openedAt > 30_000) {
          attempt = 0;
        }
        source?.close();
        source = null;
        scheduleReconnect();
      };
    };

    void connect();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.close();
      source = null;
    };
  }, [enabled, mintTicket]);
};

export default useNotificationStream;
