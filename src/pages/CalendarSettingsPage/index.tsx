import BackButton from '../../components/shared/ui/BackButton';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Alert, Modal } from 'antd';
import { MdOutlineCalendarMonth } from 'react-icons/md';
import { RootState } from '../../redux/provider/store';
import MainLayout from '../../layouts/MainLayout';
import { Button, showToast } from '../../components/shared';
import { Loader } from '../../components/shared/ui/loader';
import { useModalCloseAttention } from '../../components/shared/ui/useModalCloseAttention';
import {
  useLazyGetNylasAuthUrlQuery,
  useGetNylasGrantStatusQuery,
  useDisconnectNylasGrantMutation,
} from '../../api/interview-service/Nylas/index';

/**
 * Self-service calendar connection — every organization user, any role.
 *
 * Two jobs in one page:
 *   1. The steady-state settings surface: show whether a calendar is
 *      connected (and which account), and let the user connect / switch /
 *      disconnect. Backed by interview-service's identity-scoped
 *      `/calendar/*` routes — the grant is keyed by the caller's own
 *      user_id, no role gate on the backend.
 *   2. The OAuth landing page: interview-service's `/calendar/callback`
 *      redirects the browser here with `?status=success|cancelled|failed`
 *      (and an optional `&reason=`) once Nylas is done. That's surfaced as a
 *      dismissible banner rather than a full-screen takeover — the user
 *      stays on the page and sees the now-connected state underneath.
 *
 * Gated to organization sessions with the Nylas feature flag on: a platform
 * (CFP staff) caller has no tenant for a grant to belong to.
 */

/**
 * `true` when `reason` is an HTTP status code string (e.g. "400_400
 * BAD_REQUEST") rather than a human-readable message we can show verbatim.
 */
const isHttpStatusReason = (reason: string): boolean => /^\d{3}_/.test(reason.trim());

type OAuthStatus = 'success' | 'cancelled' | 'failed';

const CalendarSettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const callerKind = useSelector((state: RootState) => state.LoginSlice.callerKind);
  const isPlatformCaller = callerKind === 'platform';
  const isNylasFeatureEnabled = import.meta.env.VITE_NYLAS_FEATURE === 'true';
  const isAvailable = isNylasFeatureEnabled && !isPlatformCaller;

  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const withCloseAttention = useModalCloseAttention();

  const {
    data: grantStatus,
    isLoading: isGrantStatusLoading,
    isError: isGrantStatusError,
  } = useGetNylasGrantStatusQuery(undefined, { skip: !isAvailable });
  const [triggerGetAuthUrl, { isFetching: isConnecting }] = useLazyGetNylasAuthUrlQuery();
  const [disconnectGrant, { isLoading: isDisconnecting }] = useDisconnectNylasGrantMutation();

  // -- OAuth return banner (from interview-service's /calendar/callback) ------
  const rawStatus = searchParams.get('status');
  const connectedParam = searchParams.get('connected'); // legacy ?connected=true
  const rawReason = searchParams.get('reason');
  const oauthStatus: OAuthStatus | null = (() => {
    if (rawStatus === 'success' || connectedParam === 'true') return 'success';
    if (rawStatus === 'cancelled') return 'cancelled';
    if (rawStatus === 'failed') return 'failed';
    return null;
  })();
  const decodedReason = rawReason ? decodeURIComponent(rawReason) : null;
  const showReasonDirectly = decodedReason !== null && !isHttpStatusReason(decodedReason);

  const dismissBanner = () => {
    searchParams.delete('status');
    searchParams.delete('connected');
    searchParams.delete('reason');
    setSearchParams(searchParams, { replace: true });
  };

  const isConnected = !!grantStatus?.connected;
  const grantStatusResolved = !isGrantStatusLoading && !isGrantStatusError;

  // The OAuth callback lands here with a `?status=` param that the browser
  // keeps until it's cleared. A `failed` / `cancelled` param sitting on top
  // of a live "Connected" grant is stale — usually an initial hiccup
  // followed by a successful retry — so once the backend confirms a grant
  // is connected, strip the contradicting param instead of showing both
  // states at once. `success` is left alone: it agrees with the panel.
  const bannerContradictsConnectedState =
    grantStatusResolved && isConnected && (oauthStatus === 'failed' || oauthStatus === 'cancelled');

  useEffect(() => {
    if (bannerContradictsConnectedState) {
      dismissBanner();
    }
  }, [bannerContradictsConnectedState]);

  // The "Calendar connected" success banner was removed per product
  // decision — the "Connected calendar" panel below already shows the
  // now-connected state. Still clear the `?status=success` param so it
  // doesn't linger in the URL with nothing left to dismiss it.
  useEffect(() => {
    if (oauthStatus === 'success') {
      dismissBanner();
    }
  }, [oauthStatus]);

  if (!isAvailable) {
    return <Navigate to="/profile" replace />;
  }

  const handleConnect = async () => {
    try {
      const { connect_url } = await triggerGetAuthUrl().unwrap();
      window.location.href = connect_url;
    } catch {
      showToast({
        message: 'Failed to start the calendar connection. Please try again.',
        type: 'error',
      });
    }
  };

  const confirmSwitch = async () => {
    setShowSwitchModal(false);
    try {
      await disconnectGrant().unwrap();
      const { connect_url } = await triggerGetAuthUrl().unwrap();
      window.location.href = connect_url;
    } catch (err: unknown) {
      showToast({
        message:
          (err as { data?: { message?: string } })?.data?.message ??
          'Failed to switch calendar. Please try again.',
        type: 'error',
      });
    }
  };

  const confirmDisconnect = async () => {
    setShowDisconnectModal(false);
    try {
      await disconnectGrant().unwrap();
      showToast({ message: 'Calendar disconnected.', type: 'success' });
    } catch (err: unknown) {
      showToast({
        message:
          (err as { data?: { message?: string } })?.data?.message ??
          'Failed to disconnect calendar. Please try again.',
        type: 'error',
      });
    }
  };

  const busy = isConnecting || isDisconnecting;

  return (
    <MainLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <BackButton onClick={() => navigate('/profile')} />

        <div className="flex items-center gap-2">
          <MdOutlineCalendarMonth className="text-xl text-brand-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
        </div>

        {oauthStatus === 'cancelled' && !bannerContradictsConnectedState && (
          <Alert
            type="warning"
            showIcon
            closable
            onClose={dismissBanner}
            message="Connection canceled"
            description="You can connect your calendar whenever you're ready."
          />
        )}
        {oauthStatus === 'failed' && !bannerContradictsConnectedState && (
          <Alert
            type="error"
            showIcon
            closable
            onClose={dismissBanner}
            message="Connection failed"
            description={
              showReasonDirectly
                ? decodedReason
                : 'We were unable to connect your calendar. Please try again.'
            }
          />
        )}

        {isGrantStatusLoading ? (
          <Loader />
        ) : isGrantStatusError ? (
          <p className="text-sm text-red-600">Could not load your calendar connection status.</p>
        ) : (
          <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Connected calendar</h2>
            <p className="mt-1 text-sm text-gray-500">
              Connect your Google or Microsoft calendar so interviews can be scheduled around your
              real availability and added to your calendar automatically. Panel interviews can only
              be scheduled once every panellist has connected one.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                    isConnected ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    {isConnected ? 'Connected' : 'Not connected'}
                  </span>
                  {isConnected && grantStatus?.email && (
                    <span className="text-xs text-gray-500">{grantStatus.email}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <Button
                      type="button"
                      onClick={() => setShowSwitchModal(true)}
                      disabled={busy}
                      className="rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 disabled:opacity-50"
                    >
                      {isConnecting ? 'Redirecting…' : 'Switch Calendar'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setShowDisconnectModal(true)}
                      disabled={busy}
                      className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
                    >
                      {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={handleConnect}
                    disabled={busy}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {isConnecting ? 'Redirecting…' : 'Connect Calendar'}
                  </Button>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      <Modal
        open={showSwitchModal}
        onCancel={withCloseAttention({ onClose: () => setShowSwitchModal(false) })}
        onOk={confirmSwitch}
        okText="Yes, Switch"
        cancelText="Cancel"
        okButtonProps={{ loading: isDisconnecting || isConnecting, danger: true }}
        title="Switch calendar"
        centered
        maskClosable
      >
        <p className="text-gray-600 text-sm">
          Your current calendar connection will be <strong>disconnected</strong> before linking a
          new one. Any scheduled interviews tied to the existing calendar may be affected.
        </p>
        <p className="text-gray-500 text-sm mt-2">Are you sure you want to continue?</p>
      </Modal>

      <Modal
        open={showDisconnectModal}
        onCancel={withCloseAttention({ onClose: () => setShowDisconnectModal(false) })}
        onOk={confirmDisconnect}
        okText="Yes, Disconnect"
        cancelText="Cancel"
        okButtonProps={{ loading: isDisconnecting, danger: true }}
        title="Disconnect calendar"
        centered
        maskClosable
      >
        <p className="text-gray-600 text-sm">
          Your calendar will be <strong>disconnected</strong>. Any scheduled interviews tied to this
          calendar may be affected.
        </p>
        <p className="text-gray-500 text-sm mt-2">Are you sure you want to disconnect?</p>
      </Modal>
    </MainLayout>
  );
};

export default CalendarSettingsPage;
