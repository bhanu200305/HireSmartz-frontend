import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';

import { Loader } from '../shared/ui/loader';
import {
  useJoinSessionQuery,
  useRecordRecordingConsentMutation,
  useJoinSessionAsInterviewerQuery,
  getInterviewErrorAction,
  type InterviewApiError,
  type SessionNotYetStartedDetails,
  type SessionTokenView,
} from '../../api/interview-service/client';
import { DeviceCheckLobby } from './DeviceCheckLobby';
import { InterviewRoomLayout } from './InterviewRoomLayout';

type JoinRole = 'candidate' | 'interviewer';

/**
 * The page a one-click interview join link lands on.
 *
 * Interview Service emails `${CANDIDATE_JOIN_BASE_URL}?token=…` (and the
 * interviewer equivalent) when a video/panel round is scheduled — the link
 * carries a single opaque, signed booking-link token and nothing else
 * (see interview-service `_session_join_link.py`). This screen exchanges it
 * for a LiveKit access token via the matching token-only endpoint
 * (`GET /sessions/join/{token}` or `/sessions/join-as-interviewer/{token}` —
 * no bearer, the candidate/interviewer is not logged in) and drops straight
 * into the room.
 *
 * EARLY JOIN — added 2026-09-14
 * ------------------------------
 * A candidate opening the link before `session_early_join_window_minutes`
 * (interview-service, currently 15) gets `SessionNotYetStartedError` (425,
 * `starts_at` in the body — see that exception's own docstring, which
 * already described this exact countdown/auto-retry feature as the reason
 * `starts_at` exists, years before it was actually wired up here).
 * `useSessionToken` polls every 5s while in that state — cheap, and it's
 * what actually gets the candidate into the room the moment the window
 * opens, without them touching anything. The countdown UI below is purely
 * a display concern; the poll is what does the retrying.
 */
const EARLY_JOIN_POLL_MS = 5_000;

const useSessionToken = (
  joinAs: JoinRole,
  token: string,
  pollWhileEarly: boolean,
  hasConsented: boolean
) => {
  const candidate = useJoinSessionQuery(token, {
    // interview-service refuses to mint a candidate token until consent has
    // been recorded — don't even request one until the candidate has agreed
    // on the screen below, so the room never silently starts before that.
    skip: !token || joinAs !== 'candidate' || !hasConsented,
    pollingInterval: pollWhileEarly ? EARLY_JOIN_POLL_MS : 0,
  });
  const interviewer = useJoinSessionAsInterviewerQuery(token, {
    skip: !token || joinAs !== 'interviewer',
    pollingInterval: pollWhileEarly ? EARLY_JOIN_POLL_MS : 0,
  });
  return joinAs === 'candidate' ? candidate : interviewer;
};

/** Shown to the candidate only, once, before this screen ever requests a
 * LiveKit token — interview-service enforces this server-side too
 * (MintSessionTokenUseCase), this is just the UI half of that gate. Not
 * shown to the interviewer: they're the company's own agent, not the
 * person whose consent to being recorded is the actual legal question. */
const RecordingConsentScreen = ({ onAgree }: { onAgree: () => void }) => {
  const [recordConsent, { isLoading, error }] = useRecordRecordingConsentMutation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const handleAgree = async () => {
    try {
      await recordConsent(token).unwrap();
      onAgree();
    } catch {
      // error state below already renders from the mutation's own `error`
    }
  };

  // Same 410 = dead-link case the token-request states elsewhere on this
  // screen already distinguish — without this, an expired join link would
  // show a generic "please try again" that just 410s forever on retry,
  // never telling the candidate the actual link itself is the problem.
  const apiError = error as InterviewApiError | undefined;
  const isExpiredLink = apiError ? getInterviewErrorAction(apiError) === 'expired-link' : false;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950 px-6 text-center">
      <h1 className="text-lg font-semibold text-white">This interview will be recorded</h1>
      <p className="max-w-md text-sm text-neutral-400">
        Video and audio from this session are recorded and a transcript is generated so the hiring
        team can review your interview. By continuing, you agree to being recorded for this purpose.
      </p>
      {isExpiredLink ? (
        <p className="max-w-md text-sm text-red-400">
          This interview link has expired. Check your email for a fresh link closer to your
          interview&apos;s scheduled time.
        </p>
      ) : (
        error && (
          <p className="text-sm text-red-400">Could not record your response — please try again.</p>
        )
      )}
      <button
        type="button"
        disabled={isLoading || !token || isExpiredLink}
        onClick={() => void handleAgree()}
        className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-neutral-950 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isLoading ? 'Please wait…' : 'I agree, continue to my interview'}
      </button>
    </div>
  );
};

const CenteredMessage = ({
  title,
  detail,
  children,
}: {
  title: string;
  detail?: string;
  children?: React.ReactNode;
}) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-950 px-6 text-center">
    <h1 className="text-lg font-semibold text-white">{title}</h1>
    {detail && <p className="max-w-md text-sm text-neutral-400">{detail}</p>}
    {children}
  </div>
);

const formatCountdown = (remainingMs: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/** Ticks once a second so the parent re-renders with a fresh `Date.now()` —
 * the actual remaining time is always computed fresh from `startsAt`, this
 * just drives the re-render. */
const useNowTick = (enabled: boolean) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [enabled]);
};

const EarlyJoinCountdown = ({
  startsAt,
  earlyJoinWindowMinutes,
}: {
  startsAt: string;
  earlyJoinWindowMinutes?: number;
}) => {
  const startsAtMs = useMemo(() => new Date(startsAt).getTime(), [startsAt]);
  const hasValidStartsAt = !Number.isNaN(startsAtMs);
  useNowTick(hasValidStartsAt);

  if (!hasValidStartsAt) {
    return (
      <CenteredMessage
        title="Your interview hasn't started yet"
        detail="Please check back closer to your scheduled time."
      />
    );
  }

  const remainingMs = startsAtMs - Date.now();
  const startsAtLocal = new Date(startsAtMs).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <CenteredMessage title="Your interview hasn't started yet">
      <p className="text-sm text-neutral-400">Scheduled for {startsAtLocal}</p>
      <p className="text-4xl font-semibold tabular-nums text-white">
        {formatCountdown(remainingMs)}
      </p>
      {earlyJoinWindowMinutes != null && (
        <p className="text-sm text-neutral-400">
          You can join up to {earlyJoinWindowMinutes} minute
          {earlyJoinWindowMinutes === 1 ? '' : 's'} before your interview starts.
        </p>
      )}
      <p className="text-sm text-neutral-400">
        This page will take you into the interview automatically once it starts — no need to refresh
        or reopen the link.
      </p>
    </CenteredMessage>
  );
};

export const SessionJoinScreen = ({ joinAs }: { joinAs: JoinRole }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  // Device-check lobby gates the actual room connection — shown once the
  // session token has loaded (below), before `<LiveKitRoom connect>` ever
  // fires. `deviceChoice` carries whether the candidate/interviewer had
  // muted themselves in the lobby, so joining the room respects that
  // instead of always publishing both tracks regardless of what they chose.
  const [deviceChoice, setDeviceChoice] = useState<{
    micEnabled: boolean;
    cameraEnabled: boolean;
  } | null>(null);

  // Starts false (no error yet on first render) — flips true once the
  // backend actually reports "too early," which is what turns polling on
  // for the retry. See useSessionToken's own docstring.
  const [pollWhileEarly, setPollWhileEarly] = useState(false);

  // Interviewer never needs this screen — see RecordingConsentScreen's own
  // docstring on why the gate is candidate-only.
  const [hasConsented, setHasConsented] = useState(joinAs !== 'candidate');

  const { data, isLoading, isError, error } = useSessionToken(
    joinAs,
    token,
    pollWhileEarly,
    hasConsented
  );

  const session = data as SessionTokenView | undefined;
  const apiError = error as InterviewApiError | undefined;
  const errorAction = apiError ? getInterviewErrorAction(apiError) : null;

  useEffect(() => {
    setPollWhileEarly(errorAction === 'not-yet-started');
  }, [errorAction]);

  const errorCopy = useMemo(() => {
    if (!apiError) return null;
    const action = getInterviewErrorAction(apiError);
    if (action === 'expired-link') {
      return {
        title: 'This interview link has expired',
        detail:
          'Join links are only valid around the scheduled time. If your interview is still upcoming, check your email for a fresh link closer to the start time.',
      };
    }
    if (action === 'not-found') {
      return {
        title: 'Interview not found',
        detail: 'This link does not point to a valid interview.',
      };
    }
    if (action === 'not-authorized' || action === 'not-your-session') {
      return {
        title: 'You can’t join this session',
        detail: apiError.message,
      };
    }
    return { title: 'Could not connect', detail: apiError.message };
  }, [apiError]);

  if (!token) {
    return (
      <CenteredMessage
        title="Missing interview link"
        detail="Open the link from your interview email; it needs to include the token."
      />
    );
  }

  if (!hasConsented) {
    return <RecordingConsentScreen onAgree={() => setHasConsented(true)} />;
  }

  if (errorAction === 'not-yet-started') {
    const details = apiError?.details as SessionNotYetStartedDetails | undefined;
    return (
      <EarlyJoinCountdown
        startsAt={details?.starts_at ?? ''}
        earlyJoinWindowMinutes={details?.early_join_window_minutes}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-950">
        <Loader />
        <p className="text-sm text-neutral-400">Connecting to your interview…</p>
      </div>
    );
  }

  if (isError || !session) {
    return (
      <CenteredMessage
        title={errorCopy?.title ?? 'Could not connect'}
        detail={errorCopy?.detail ?? 'Please try opening the link again.'}
      />
    );
  }

  if (!deviceChoice) {
    return <DeviceCheckLobby onReady={setDeviceChoice} lockFullscreen={joinAs === 'candidate'} />;
  }

  return (
    <div className="h-screen w-screen bg-neutral-950" data-lk-theme="default">
      <LiveKitRoom
        token={session.access_token}
        serverUrl={session.livekit_url}
        connect
        audio={deviceChoice.micEnabled}
        video={deviceChoice.cameraEnabled}
        style={{ height: '100%' }}
        onDisconnected={() => {
          // Reuse the SAME session token for the post-round feedback step
          // (candidate only, and only once one is actually available — the
          // interviewer never gets a feedback form) — interview-service's
          // `/feedback/{token}` route deliberately accepts SESSION_PURPOSE
          // tokens for exactly this handoff, see its own docstring.
          // CandidateFeedbackPage handles the "booking not COMPLETED yet"
          // race (the room_finished webhook can lag a disconnect by a few
          // seconds) with its own short poll.
          if (joinAs === 'candidate') {
            navigate(`/feedback?token=${encodeURIComponent(token)}`);
          } else {
            navigate('/interview-ended');
          }
        }}
      >
        <InterviewRoomLayout isInterviewer={joinAs === 'interviewer'} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
};

export const CandidateJoinPage = () => <SessionJoinScreen joinAs="candidate" />;
export const InterviewerJoinPage = () => <SessionJoinScreen joinAs="interviewer" />;
