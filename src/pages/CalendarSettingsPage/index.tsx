import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { CALENDAR_CONNECT_REDIRECT_DELAY_MS } from '../../constants/app.constants';

/**
 * Detects whether the `reason` param is an HTTP status code string (case 5)
 * rather than a human-readable message (case 6).
 * e.g. "400_400 BAD_REQUEST" → true
 *      "This email (...) is already connected..." → false
 */
const isHttpStatusReason = (reason: string): boolean => /^\d{3}_/.test(reason.trim());

type StatusType = 'success' | 'cancelled' | 'failed';

const CalendarSettingsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // New backend contract: ?status=success|cancelled|failed&reason=<optional>
  // Backwards-compat: old ?connected=true still treated as success
  const rawStatus = searchParams.get('status');
  const connected = searchParams.get('connected');
  const rawReason = searchParams.get('reason');

  const status: StatusType = (() => {
    if (rawStatus === 'success') return 'success';
    if (rawStatus === 'cancelled') return 'cancelled';
    if (rawStatus === 'failed') return 'failed';
    // Backwards-compat: old ?connected=true still treated as success
    if (connected === 'true') return 'success';
    return 'failed';
  })();

  // Decode reason; only show it directly when it's a human-readable message (case 6)
  const decodedReason = rawReason ? decodeURIComponent(rawReason) : null;
  const showReasonDirectly = decodedReason !== null && !isHttpStatusReason(decodedReason);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/');
    }, CALENDAR_CONNECT_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#EBF0ED]">
      <div className="bg-white rounded-2xl shadow-lg p-10 flex flex-col items-center gap-6 max-w-md w-full mx-4">
        {status === 'success' && (
          <>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#22c55e' }} />
            <h2 className="text-2xl font-semibold text-gray-800 text-center">
              Calendar Connected Successfully ✅
            </h2>
            <p className="text-gray-500 text-center text-sm">
              Your calendar has been connected. You can now schedule interviews seamlessly.
            </p>
          </>
        )}

        {status === 'cancelled' && (
          <>
            <WarningOutlined style={{ fontSize: 64, color: '#f59e0b' }} />
            <h2 className="text-2xl font-semibold text-gray-800 text-center">
              Connection Cancelled
            </h2>
            <p className="text-gray-500 text-center text-sm">
              You cancelled the calendar connection. You can try again anytime from the profile
              menu.
            </p>
          </>
        )}

        {status === 'failed' && (
          <>
            <CloseCircleOutlined style={{ fontSize: 64, color: '#ef4444' }} />
            <h2 className="text-2xl font-semibold text-gray-800 text-center">Connection Failed</h2>
            {showReasonDirectly ? (
              <p className="text-gray-600 text-center text-sm">{decodedReason}</p>
            ) : (
              <p className="text-gray-500 text-center text-sm">
                We were unable to connect your calendar. Please try again from the profile menu.
              </p>
            )}
          </>
        )}

        <div className="flex items-center gap-2 text-gray-400 text-xs mt-2">
          <LoadingOutlined />
          <span>Redirecting to dashboard...</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarSettingsPage;
