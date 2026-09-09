import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import '@livekit/components-styles';

import { Loader } from '../shared/ui/loader';
import {
  useJoinSessionQuery,
  useJoinSessionAsInterviewerQuery,
  getInterviewErrorAction,
  type InterviewApiError,
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
 */
const useSessionToken = (joinAs: JoinRole, token: string) => {
  const candidate = useJoinSessionQuery(token, { skip: !token || joinAs !== 'candidate' });
  const interviewer = useJoinSessionAsInterviewerQuery(token, {
    skip: !token || joinAs !== 'interviewer',
  });
  return joinAs === 'candidate' ? candidate : interviewer;
};

const CenteredMessage = ({ title, detail }: { title: string; detail?: string }) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-950 px-6 text-center">
    <h1 className="text-lg font-semibold text-white">{title}</h1>
    {detail && <p className="max-w-md text-sm text-neutral-400">{detail}</p>}
  </div>
);

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

  const { data, isLoading, isError, error } = useSessionToken(joinAs, token);

  const session = data as SessionTokenView | undefined;
  const apiError = error as InterviewApiError | undefined;

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
        detail="Open the link from your interview email — it needs to include the token."
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
    return <DeviceCheckLobby onReady={setDeviceChoice} />;
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
        onDisconnected={() => navigate('/interview-ended')}
      >
        <InterviewRoomLayout />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
};

export const CandidateJoinPage = () => <SessionJoinScreen joinAs="candidate" />;
export const InterviewerJoinPage = () => <SessionJoinScreen joinAs="interviewer" />;
