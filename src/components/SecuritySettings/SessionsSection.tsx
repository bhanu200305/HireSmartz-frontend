import { MdOutlineDevices } from 'react-icons/md';
import { Badge, Button, showToast } from '..';
import type { BadgeStatus } from '../shared/ui/badge';
import {
  useGetSessionsQuery,
  useRevokeSessionMutation,
  type SessionStatus,
} from '../../api/authentication-service/Sessions/sessions';
import { useLogoutAllMutation } from '../../api/authentication-service/Logout/logout';
import { getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';

const STATUS_BADGE: Record<SessionStatus, BadgeStatus> = {
  active: 'success',
  logged_out: 'neutral',
  expired: 'neutral',
  revoked: 'danger',
  locked: 'warning',
};

const formatDateTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const SessionRow = ({
  sessionId,
  deviceType,
  browser,
  operatingSystem,
  ipAddress,
  city,
  country,
  lastActivity,
  status,
  isCurrent,
}: {
  sessionId: string;
  deviceType: string | null;
  browser: string | null;
  operatingSystem: string | null;
  ipAddress: string | null;
  city: string | null;
  country: string | null;
  lastActivity: string;
  status: SessionStatus;
  isCurrent: boolean;
}) => {
  const [revokeSession, { isLoading }] = useRevokeSessionMutation();

  const handleRevoke = async () => {
    try {
      await revokeSession(sessionId).unwrap();
      showToast({ message: 'Session signed out.', type: 'success' });
    } catch (err) {
      showToast({
        message: getAuthErrorMessage(err, 'Could not sign out that session.'),
        type: 'error',
      });
    }
  };

  const location = [city, country].filter(Boolean).join(', ');
  const deviceLine = [deviceType, browser, operatingSystem].filter(Boolean).join(' · ');

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] p-4">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900">{deviceLine || 'Unknown device'}</p>
          {isCurrent && <Badge status="info">This device</Badge>}
          <Badge status={STATUS_BADGE[status]}>{status}</Badge>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {[ipAddress, location].filter(Boolean).join(' · ')}
        </p>
        <p className="text-xs text-gray-400">Last active {formatDateTime(lastActivity)}</p>
      </div>

      {/* Revoking your OWN current session here would kill the token this
          page is running on without the app's regular logout cleanup
          (localStorage, Redux, RTK Query cache) ever running — that's what
          the Logout page/button is for. This list only ends OTHER sessions. */}
      {!isCurrent && (
        <Button
          type="button"
          appname="revoke session"
          onClick={handleRevoke}
          disabled={isLoading}
          className="rounded-3xl border border-red-200 px-4 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Signing out…' : 'Sign out'}
        </Button>
      )}
    </div>
  );
};

/** The /api/v1/auth/sessions surface: every device currently signed in, and the
 * "log out everywhere else" bulk action (docs/authentication_service/API_CONTRACT.md
 * §7, §5 "POST /logout-all"). */
const SessionsSection = () => {
  const { data, isLoading, isError } = useGetSessionsQuery();
  const [logoutAll, { isLoading: isLoggingOutAll }] = useLogoutAllMutation();

  const otherSessionCount = data ? data.items.filter((s) => !s.is_current).length : 0;

  const handleLogoutAll = async () => {
    try {
      const result = await logoutAll({ keep_current_session: true }).unwrap();
      showToast({
        message: `Signed out of ${result.revoked_count} other device${result.revoked_count === 1 ? '' : 's'}.`,
        type: 'success',
      });
    } catch (err) {
      showToast({
        message: getAuthErrorMessage(err, 'Could not sign out other devices.'),
        type: 'error',
      });
    }
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MdOutlineDevices className="text-xl text-brand-700" />
          <h3 className="text-lg font-semibold text-gray-900">Active sessions</h3>
        </div>
        {otherSessionCount > 0 && (
          <Button
            type="button"
            appname="logout all other sessions"
            onClick={handleLogoutAll}
            disabled={isLoggingOutAll}
            className="rounded-3xl border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoggingOutAll
              ? 'Signing out…'
              : `Sign out ${otherSessionCount} other device${otherSessionCount === 1 ? '' : 's'}`}
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {isError && <p className="text-sm text-red-600">Could not load your sessions.</p>}

      <div className="flex flex-col gap-3">
        {data?.items.map((session) => (
          <SessionRow
            key={session.session_id}
            sessionId={session.session_id}
            deviceType={session.device_type}
            browser={session.browser}
            operatingSystem={session.operating_system}
            ipAddress={session.ip_address}
            city={session.city}
            country={session.country}
            lastActivity={session.last_activity}
            status={session.status}
            isCurrent={session.is_current}
          />
        ))}
      </div>
    </section>
  );
};

export default SessionsSection;
