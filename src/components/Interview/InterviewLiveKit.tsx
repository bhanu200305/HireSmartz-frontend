/**
 * Interview Component - LiveKit Integration
 *
 * Manages real-time video interviews with LiveKit SDK
 * Replaces Agora-based Interview.tsx with simplified LiveKit architecture
 *
 * Responsibilities:
 * - Token generation for room access
 * - LiveKitRoom wrapper setup
 * - Recording start/stop controls
 * - Assessment sidebar management
 * - WebSocket participant tracking
 * - Interview state management
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { LiveKitRoom, useRoomContext, useRemoteParticipants } from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, type RoomOptions, type RoomConnectOptions } from 'livekit-client';

import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhone,
  FaCircle,
  FaStopCircle,
  FaChevronDown,
  FaClipboardList,
  FaRegCommentDots,
} from 'react-icons/fa';
import {
  MdScreenShare,
  MdStopScreenShare,
  MdChatBubbleOutline,
  MdOutlineSettings,
  MdOutlineQuestionAnswer,
} from 'react-icons/md';
import { Tooltip, Button, Spin, message, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { jwtDecode } from 'jwt-decode';

// LiveKit integration
import { useLiveKit } from '../../hooks/useLiveKit';
import type { LiveKitTokenResponse } from '../../types/LiveKit';
import {
  useEditAiQuestionForScoringMutation,
  useLazyGetAiQuestionsByUserIdQuery,
} from '../../api/ai-service/AiQuestion/AiQuestion';
import {
  useGenerateLiveKitTokenMutation,
  useStopRecordingMutation,
  useEndInterviewForAllMutation,
} from '../../api/interview-service/VideoIntegration/index';

// UI Components
import { showToast } from '../shared';
import VideoGrid from './VideoGridLiveKit';
import Sidebar from '../InterviewUser/Sidebar';
import { ChatPanel, useUnreadChatCount } from './shared/ChatPanel';
import { SettingsPanel } from './shared/SettingsPanel';
import InterviewEndedScreen from './InterviewEndedScreen';
import FeedbackPromptModal from './FeedbackPromptModal';
import QuickFeedbackModal from './QuickFeedbackModal';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import InterviewConsentModal from '../shared/ui/InterviewConsentModal';
import InterviewSmsPanel from './InterviewSmsPanel';

// Auth & Storage
import { getLocalStorageItem } from '../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import clsx from 'clsx';

/**
 * Interview component main state
 */
interface InterviewState {
  token: LiveKitTokenResponse | null;
  joined: boolean;
  loading: boolean;
  error: string | null;
  recording: boolean;
  egressId: string | null;
  showLeavingModal: boolean;
  isRecordingModalVisible: boolean;
  activeSidebar:
    | 'info'
    | 'participants'
    | 'assessment'
    | 'panel-questions'
    | 'chat'
    | 'settings'
    | null;
  interviewToken: string | null;
  hasEnded: boolean;
  endedBy?: 'user' | 'recruiter' | 'ai';
  interviewEndedByRecruiter: boolean;
  categorizedQuestions?: any;
  /** Tracks the post-interview feedback flow step. No server-side
   * dedup check exists (the old `/interview-feedback/should-prompt`
   * endpoint never existed on the real backend — it always resolved
   * `Number(<a UUID string>)` to `NaN`), so this goes straight from
   * `idle` to `chooser` once the conditions below are met. */
  feedbackFlow: 'idle' | 'chooser' | 'quick';
}

/**
 * A Hiring Panel round's reference question set, pushed over the LiveKit
 * data channel by ai-service once the room opens — distinct from the
 * `{ role: ... }` presence message every participant broadcasts (see
 * `handleDataReceived` below, which tells the two apart by shape:
 * `resume_based`/`instructions` only ever appear on this one). Read-only —
 * unlike `categorizedQuestions`/`assessmentScores` above, nothing here is
 * scored or saved back.
 */
type PanelQuestionItem = {
  question_text: string;
  scoring_sections?: string[];
};

type PanelQuestionsMessage = {
  resume_based: PanelQuestionItem[];
  jd_based: PanelQuestionItem[];
  instructions: string;
};

type InterviewTokenPayload = {
  role?: string;
  userId?: string | number;
  candidateName?: string;
  name?: string;
  bookingId?: string;
  sessionId?: string;
  jobId?: string | number;
  candidateId?: string | number;
  interviewRoundId?: string | number;
};

const VIDEO_CONSENT_COPY = {
  title: 'Consent for AI-Assisted Video Interview',
  label:
    'I have read and agree to the above, and I consent to this recorded, AI-assisted interview.',
  cancel: 'CANCEL',
  continue: 'CONTINUE',
};

const videoConsentDescription = (
  <div className="space-y-4 text-left">
    <p>Before proceeding, please review and confirm the following:</p>
    <p>
      This interview will be conducted using AI-assisted video interview technology. By checking the
      box below, you agree to:
    </p>
    <ul className="list-disc pl-6 space-y-1">
      <li>
        Have your video and audio responses <strong>recorded</strong>
      </li>
      <li>
        Have your responses <strong>analyzed using AI-based tools</strong> as part of the evaluation
        process
      </li>
      <li>
        Allow the recording to be <strong>stored and reviewed</strong> by authorized personnel
        and/or hiring partners
      </li>
    </ul>
  </div>
);

const videoConsentDisclaimer = (
  <p className="mt-4">
    You may decline without affecting your candidacy. An alternative interview option (e.g., live
    call with a recruiter) is available upon request. Please contact the hiring manager directly.
  </p>
);

/**
 * Static room configuration — defined at module level to avoid
 * recreating objects on every render (which could cause LiveKitRoom
 * to detect prop changes and reconnect unnecessarily).
 */
const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  webAudioMix: true, // helps with browser audio autoplay policy issues
};

const CONNECT_OPTIONS: RoomConnectOptions = {
  autoSubscribe: true,
};

/**
 * Interview Component
 *
 * Top-level component for video interview experience
 * Wraps all content in LiveKitRoom for video/audio functionality
 */
const Interview: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const interviewTokenFromQuery = searchParams.get('token') || '';

  const decodedInterviewToken = useMemo<InterviewTokenPayload | null>(() => {
    if (!interviewTokenFromQuery) return null;
    try {
      return jwtDecode<InterviewTokenPayload>(interviewTokenFromQuery);
    } catch {
      return null;
    }
  }, [interviewTokenFromQuery]);

  const isVideoConsentFeatureEnabled = import.meta.env.VITE_VIDEO_CONSENT_FEATURE === 'true';
  const isCandidateEntry = (decodedInterviewToken?.role || '').toUpperCase() === 'CANDIDATE';
  const isConsentRequired = isCandidateEntry && isVideoConsentFeatureEnabled;
  const [hasConsent, setHasConsent] = useState(!isConsentRequired);

  useEffect(() => {
    setHasConsent(!isConsentRequired);
  }, [isConsentRequired, interviewTokenFromQuery]);

  // State Management
  const [state, setState] = useState<InterviewState>({
    token: null,
    joined: false,
    loading: true,
    error: null,
    recording: false,
    egressId: null,
    showLeavingModal: false,
    isRecordingModalVisible: false,
    activeSidebar: null,
    interviewToken: null,
    hasEnded: false,
    endedBy: undefined,
    interviewEndedByRecruiter: false,
    categorizedQuestions: undefined,
    feedbackFlow: 'idle',
  });

  // Modal state for end interview confirmation
  const [showEndInterviewModal, setShowEndInterviewModal] = useState(false);

  /**
   * Ref to prevent the `disconnected` event handler from racing with
   * `handleEndInterview`. When the interviewer explicitly ends the interview,
   * this ref is set to true so `handleLeaveInterview` (fired by the
   * `disconnected` event) simply marks `hasEnded` without starting its own
   * competing feedback-prompt flow.
   */
  const interviewEndingRef = useRef(false);

  // RTK Query mutations
  const [generateLiveKitToken] = useGenerateLiveKitTokenMutation();
  const [stopRecording] = useStopRecordingMutation();
  const [endInterviewForAll] = useEndInterviewForAllMutation();
  const [getAiQuestionsByUserId] = useLazyGetAiQuestionsByUserIdQuery();

  const clearSessionStorage = useCallback(() => {
    sessionStorage.removeItem('livekit_booking_id');
    sessionStorage.removeItem('livekit_session_id');
    sessionStorage.removeItem('livekit_interview_token');
  }, []);

  /**
   * Auto-detect recording status on join
   * Recording is started automatically by backend when INTERVIEWER/RECRUITER joins
   * Show recording status to all participants when an interviewer/recruiter joins
   */
  useEffect(() => {
    if (state.joined && state.token) {
      const isInterviewer = state.token.role === 'RECRUITER' || state.token.role === 'INTERVIEWER';
      if (isInterviewer) {
        setState((prev) => ({
          ...prev,
          recording: true,
        }));
      }
    }
  }, [state.joined, state.token]);

  /**
   * Callback to update recording state from InterviewContent
   * This is needed because room context is only available inside LiveKitRoom
   */
  const handleUpdateRecordingState = useCallback((isRecording: boolean) => {
    setState((prev) => ({
      ...prev,
      recording: isRecording,
    }));
  }, []);

  /**
   * Initialize interview: fetch token and join room
   */
  useEffect(() => {
    const initializeInterview = async () => {
      if (!hasConsent) {
        return;
      }

      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        // Get interview token from URL params
        const interviewToken = interviewTokenFromQuery;
        if (!interviewToken) {
          throw new Error('Interview token missing from URL');
        }

        // Decode token to get user details
        const decoded = jwtDecode<InterviewTokenPayload>(interviewToken);
        const { role, candidateName, userId, bookingId, sessionId } = decoded;

        if (!role || !userId) {
          throw new Error('Invalid interview token structure');
        }

        // Validate interviewer login state
        const isInterviewerRole = role === 'RECRUITER' || role === 'INTERVIEWER';
        const hasAuthToken = !!getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);

        if (isInterviewerRole && !hasAuthToken) {
          navigate('/login', {
            replace: true,
            state: { from: { pathname, search: window.location.search } },
          });
          return;
        }

        const participantName = candidateName || decoded.name || 'Unknown';

        // Generate LiveKit token from backend
        const response = await generateLiveKitToken({
          interviewToken,
          participantName,
          participantIdentity: String(userId),
          role: role.toUpperCase() as 'CANDIDATE' | 'RECRUITER' | 'INTERVIEWER',
        }).unwrap();

        let finalCategorizedQuestions = response.categorizedQuestions;

        if (isInterviewerRole && hasAuthToken) {
          try {
            const authToken = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) as string;
            const decodedAuth = jwtDecode<{ userId?: string | number }>(authToken);
            const authUserId = Number(decodedAuth.userId);
            const jobOpeningId = Number(decoded.jobId);
            const candidateId = Number(decoded.candidateId);
            const interviewRoundId =
              decoded.interviewRoundId !== undefined ? Number(decoded.interviewRoundId) : undefined;

            if (
              Number.isFinite(authUserId) &&
              Number.isFinite(jobOpeningId) &&
              Number.isFinite(candidateId)
            ) {
              const savedQuestions = await getAiQuestionsByUserId({
                userId: authUserId,
                jobOpeningId,
                candidateId,
                interviewRoundId: Number.isFinite(interviewRoundId) ? interviewRoundId : undefined,
              }).unwrap();

              if (savedQuestions && savedQuestions.categorizedQuestions) {
                finalCategorizedQuestions = savedQuestions.categorizedQuestions;
              }
            }
          } catch (err) {
            console.error('Failed to fetch saved answers:', err);
          }
        }

        // Store token and join room
        setState((prev) => ({
          ...prev,
          token: response,
          joined: true,
          loading: false,
          interviewToken,
          categorizedQuestions: finalCategorizedQuestions,
        }));

        // Store metadata for recording
        const tokenBookingId =
          bookingId ||
          (decoded as any).interviewBookingId ||
          (decoded as any).bookingID ||
          (decoded as any).booking_id ||
          response.bookingId ||
          (response as any).interviewBookingId;

        if (tokenBookingId !== undefined && tokenBookingId !== null) {
          sessionStorage.setItem('livekit_booking_id', String(tokenBookingId));
        }
        if (sessionId !== undefined) {
          sessionStorage.setItem('livekit_session_id', String(sessionId));
        }
        sessionStorage.setItem('livekit_interview_token', interviewToken);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to initialize interview';
        setState((prev) => ({
          ...prev,
          error: errorMsg,
          loading: false,
        }));
        showToast({ message: errorMsg, type: 'error' });
        console.error('Interview initialization error:', err);
      }
    };

    initializeInterview();
  }, [
    generateLiveKitToken,
    getAiQuestionsByUserId,
    hasConsent,
    interviewTokenFromQuery,
    navigate,
    pathname,
  ]);

  /**
   * Handle start recording
   */
  const handleStartRecording = useCallback(async () => {
    try {
      if (!state.token) throw new Error('No interview token');

      setState((prev) => ({ ...prev, isRecordingModalVisible: true }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start recording';
      showToast({ message: errorMsg, type: 'error' });
      console.error('Recording start error:', err);
    }
  }, [state.token]);
  /**
   * Handle stop recording
   */
  const handleStopRecording = useCallback(async () => {
    try {
      const interviewToken =
        state.interviewToken || sessionStorage.getItem('livekit_interview_token');

      if (!interviewToken) {
        throw new Error('Missing interview token for stopping recording');
      }

      // Stop recording
      const response = await stopRecording({
        interviewToken,
      }).unwrap();

      setState((prev) => ({
        ...prev,
        recording: false,
        egressId: null,
      }));

      showToast({ message: response.message || 'Recording stopped', type: 'success' });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to stop recording';
      showToast({ message: errorMsg, type: 'error' });
      console.error('Recording stop error:', err);
    }
  }, [state.interviewToken, stopRecording]);

  /**
   * Handle leave interview
   * @param endedBy - Who ended the interview ('user' for manual leave, 'recruiter' for
   * API end, 'ai' for the AI interviewer disconnecting on an AI Video round — see
   * InterviewContent's own remote-participant-count effect)
   *
   * NOTE: When the interviewer explicitly clicks "End Interview",
   * `handleEndInterview` sets `interviewEndingRef` to true. In that case this
   * function (which fires from the LiveKit `disconnected` event) must NOT start
   * its own feedback-prompt flow — it simply marks the interview as ended and
   * lets `handleEndInterview` own the shouldPrompt check.
   */
  const handleLeaveInterview = useCallback(
    async (endedBy: 'user' | 'recruiter' | 'ai' = 'user') => {
      // If handleEndInterview is already managing the feedback flow,
      // just mark as ended and bail — no competing shouldPrompt call.
      if (interviewEndingRef.current) {
        setState((prev) => {
          // Only set hasEnded if handleEndInterview hasn't done it yet
          if (prev.hasEnded) return prev;
          return { ...prev, hasEnded: true, endedBy };
        });
        return;
      }

      // Grab bookingId before clearing session storage
      const resolvedBookingId =
        state.token?.bookingId ||
        (state.token as any)?.interviewBookingId ||
        decodedInterviewToken?.bookingId ||
        (decodedInterviewToken as any)?.interviewBookingId ||
        (decodedInterviewToken as any)?.bookingID ||
        (decodedInterviewToken as any)?.booking_id ||
        sessionStorage.getItem('livekit_booking_id');

      const isFeedbackFeatureEnabled = import.meta.env.VITE_INTERVIEW_FEEDBACK_FEATURE === 'true';
      const isInterviewer =
        state.token?.role === 'RECRUITER' || state.token?.role === 'INTERVIEWER';

      const willPromptFeedback =
        isFeedbackFeatureEnabled && endedBy === 'recruiter' && isInterviewer && resolvedBookingId;

      if (!willPromptFeedback) {
        // Clear session data since we won't show feedback flow
        clearSessionStorage();
      }

      // Prompt when interview was not intentionally left by user — i.e. a
      // network drop (endedBy === 'recruiter' without explicit end). No
      // server-side dedup check exists (see feedbackFlow's own comment on
      // InterviewState), so this goes straight to the chooser.
      if (willPromptFeedback) {
        setState((prev) => ({
          ...prev,
          hasEnded: true,
          endedBy,
          feedbackFlow: 'chooser',
        }));
        return;
      }

      // Default: show ended screen (user left intentionally, or non-interviewer)
      setState((prev) => ({
        ...prev,
        hasEnded: true,
        endedBy,
        feedbackFlow: 'idle',
      }));
    },
    [state.recording, state.token, handleStopRecording, decodedInterviewToken, clearSessionStorage]
  );

  /**
   * Handle end interview (recruiter only)
   * Stops recording and drops call for all participants
   */
  const handleEndInterview = useCallback(async () => {
    // Signal that WE own the feedback flow — the `disconnected` event handler
    // in InterviewContent must NOT start a competing shouldPrompt call.
    interviewEndingRef.current = true;

    const resolvedBookingId =
      state.token?.bookingId ||
      (state.token as any)?.interviewBookingId ||
      decodedInterviewToken?.bookingId ||
      (decodedInterviewToken as any)?.interviewBookingId ||
      (decodedInterviewToken as any)?.bookingID ||
      (decodedInterviewToken as any)?.booking_id ||
      sessionStorage.getItem('livekit_booking_id');

    try {
      // Stop recording if active
      if (state.recording) {
        await handleStopRecording();
      }

      // Get interview token from state or session storage
      const interviewToken =
        state.interviewToken || sessionStorage.getItem('livekit_interview_token');

      if (!interviewToken) {
        throw new Error('Missing interview token');
      }

      // End interview for all participants (drop the call)
      const response = await endInterviewForAll({
        interviewToken,
      }).unwrap();

      // Show success message with booking details
      showToast({
        message: response.message || 'Interview ended for all participants',
        type: 'success',
      });

      // Show the feedback chooser — no server-side dedup check exists (see
      // feedbackFlow's own comment on InterviewState).
      const isFeedbackFeatureEnabled = import.meta.env.VITE_INTERVIEW_FEEDBACK_FEATURE === 'true';

      if (isFeedbackFeatureEnabled && resolvedBookingId) {
        // Keep session storage for the feedback prompt flow.
        setState((prev) => ({
          ...prev,
          hasEnded: true,
          endedBy: 'recruiter',
          interviewEndedByRecruiter: true,
          feedbackFlow: 'chooser',
        }));
      } else {
        // No bookingId available or feature disabled — clear session data and show ended screen directly
        console.warn(
          '[handleEndInterview] bookingId not found or feedback feature disabled, skipping feedback prompt'
        );
        clearSessionStorage();
        setState((prev) => ({
          ...prev,
          hasEnded: true,
          endedBy: 'recruiter',
          interviewEndedByRecruiter: true,
          feedbackFlow: 'idle',
        }));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to end interview';
      showToast({ message: errorMsg, type: 'error' });
      console.error('[handleEndInterview] End interview error:', err);
      // Still show ended screen even if API call fails
      clearSessionStorage();
      setState((prev) => ({
        ...prev,
        hasEnded: true,
        endedBy: 'recruiter',
        interviewEndedByRecruiter: true,
        feedbackFlow: 'idle',
      }));
    } finally {
      interviewEndingRef.current = false;
    }
  }, [
    state.recording,
    state.token,
    state.interviewToken,
    handleStopRecording,
    endInterviewForAll,
    decodedInterviewToken,
    clearSessionStorage,
  ]);

  /**
   * Handler to show end interview confirmation modal
   */
  const handleShowEndInterviewModal = useCallback(() => {
    setShowEndInterviewModal(true);
  }, []);

  // --- Feedback flow handlers ---

  /** "Complete Full Feedback" → navigate to candidate details page */
  const handleFeedbackFullSelect = useCallback(() => {
    const jobId = decodedInterviewToken?.jobId;
    const candId = decodedInterviewToken?.candidateId;
    const roundId = decodedInterviewToken?.interviewRoundId;
    if (jobId && candId) {
      // 'summary' = CandidateDetails.tsx's Interview Summary tab. Used to be
      // the numeric `tab=3`, which that page silently stopped honoring once
      // its tab strip was rewritten to string keys — every "Complete Full
      // Feedback" click was landing on the unrelated Assessment tab instead.
      const url = `/jobs/view/${jobId}/candidates/${candId}/details?tab=summary${roundId ? `&interviewRoundId=${roundId}` : ''}`;
      window.open(url, '_blank');
    }
    // Clear session data and dismiss prompt
    clearSessionStorage();
    setState((prev) => ({ ...prev, feedbackFlow: 'idle' }));
  }, [decodedInterviewToken, clearSessionStorage]);

  /** "Quick Feedback" → show quick feedback form */
  const handleFeedbackQuickSelect = useCallback(() => {
    setState((prev) => ({ ...prev, feedbackFlow: 'quick' }));
  }, []);

  /** "Skip For Now" → dismiss prompt and show ended screen. No server-side
   * skip-logging capability exists (see feedbackFlow's own comment on
   * InterviewState) — this is purely a local UI dismissal. */
  const handleFeedbackSkip = useCallback(() => {
    clearSessionStorage();
    setState((prev) => ({ ...prev, feedbackFlow: 'idle' }));
  }, [clearSessionStorage]);

  /** "Cancel" → dismiss modal and show ended screen */
  const handleFeedbackCancel = useCallback(() => {
    clearSessionStorage();
    setState((prev) => ({ ...prev, feedbackFlow: 'idle' }));
  }, [clearSessionStorage]);

  /** Called after quick feedback is submitted successfully */
  const handleQuickFeedbackSuccess = useCallback(() => {
    clearSessionStorage();
    setState((prev) => ({ ...prev, feedbackFlow: 'idle' }));
  }, [clearSessionStorage]);

  // --- Resolve bookingId and candidateName for feedback modals ---
  // A real UUID string — never cast through Number(), which is exactly
  // the bug that made the old should-prompt/skip endpoints silently
  // resolve every bookingId to NaN.
  const feedbackBookingId: string =
    decodedInterviewToken?.bookingId ||
    (decodedInterviewToken as any)?.interviewBookingId ||
    (decodedInterviewToken as any)?.bookingID ||
    (decodedInterviewToken as any)?.booking_id ||
    sessionStorage.getItem('livekit_booking_id') ||
    '';
  // Interview ended state — with feedback flow branching
  if (state.hasEnded) {
    // Show feedback chooser modal
    if (state.feedbackFlow === 'chooser') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <FeedbackPromptModal
            open
            onSelectFullFeedback={handleFeedbackFullSelect}
            onSelectQuickFeedback={handleFeedbackQuickSelect}
            onSkip={handleFeedbackSkip}
          />
        </div>
      );
    }

    // Show quick feedback modal
    if (state.feedbackFlow === 'quick') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <QuickFeedbackModal
            open
            bookingId={feedbackBookingId}
            onClose={handleFeedbackCancel}
            onSubmitSuccess={handleQuickFeedbackSuccess}
          />
        </div>
      );
    }

    // Default: show ended screen
    return <InterviewEndedScreen endedBy={state.endedBy} />;
  }

  if (isConsentRequired && !hasConsent) {
    return (
      <div className="min-h-screen bg-[#4D4D4D]">
        <InterviewConsentModal
          title={VIDEO_CONSENT_COPY.title}
          description={videoConsentDescription}
          disclaimer={videoConsentDisclaimer}
          consentLabel={VIDEO_CONSENT_COPY.label}
          cancelText={VIDEO_CONSENT_COPY.cancel}
          continueText={VIDEO_CONSENT_COPY.continue}
          onCancel={() => window.close()}
          onContinue={() => setHasConsent(true)}
          requireCheckbox={true}
          panelClassName="max-w-2xl"
        />
      </div>
    );
  }

  // Loading state
  if (state.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Spin size="large" />
      </div>
    );
  }

  // Error state
  if (state.error || !state.token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Interview Link Expired / Invalid</h1>
          <p className="text-gray-300 mb-6">{state.error || 'Failed to load interview'}</p>
          <Button type="primary" onClick={() => navigate('/')}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  // Render interview room
  // NOTE: audio/video/screen are all set to false — none of these are auto-published.
  // `audio={true}` would publish the mic immediately on join (unmuted by default — bug!).
  // Users control their own mic/camera via the toggleMic/toggleCam buttons.
  // Remote audio playback is handled by <RoomAudioRenderer> inside VideoGrid, which is
  // independent of these props.
  return (
    <LiveKitRoom
      token={state.token.token}
      serverUrl={state.token.serverUrl}
      options={ROOM_OPTIONS}
      connectOptions={CONNECT_OPTIONS}
      audio={false}
      data-lk-theme="dark"
      style={{ height: '100vh' }}
    >
      <InterviewContent
        token={state.token}
        recording={state.recording}
        activeSidebar={state.activeSidebar}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
        onLeaveInterview={handleLeaveInterview}
        onEndInterview={handleShowEndInterviewModal}
        onUpdateRecordingState={handleUpdateRecordingState}
        interviewEndedByRecruiter={state.interviewEndedByRecruiter}
        categorizedQuestions={state.categorizedQuestions}
        onSidebarChange={(sidebar) => setState((prev) => ({ ...prev, activeSidebar: sidebar }))}
      />

      {state.showLeavingModal && (
        <ConfirmationModal
          title="Leave Interview?"
          confirmText="Leave"
          onConfirm={handleLeaveInterview}
          onClose={() => setState((prev) => ({ ...prev, showLeavingModal: false }))}
        />
      )}

      {showEndInterviewModal && (
        <ConfirmationModal
          title="End Interview?"
          confirmText="End"
          onConfirm={handleEndInterview}
          onClose={() => setShowEndInterviewModal(false)}
        />
      )}
    </LiveKitRoom>
  );
};

/**
 * Interview Content Component
 *
 * Renders inside LiveKitRoom context
 * Contains video grid, controls, sidebar
 */
type SidebarKey =
  | 'info'
  | 'participants'
  | 'assessment'
  | 'panel-questions'
  | 'chat'
  | 'settings'
  | null;

interface InterviewContentProps {
  token: LiveKitTokenResponse;
  recording: boolean;
  activeSidebar: SidebarKey;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onLeaveInterview: (endedBy?: 'user' | 'recruiter' | 'ai') => void;
  onEndInterview: () => void;
  onUpdateRecordingState: (isRecording: boolean) => void;
  interviewEndedByRecruiter: boolean;
  categorizedQuestions?: any;
  onSidebarChange: (sidebar: SidebarKey) => void;
}

interface DeviceInfo {
  deviceId: string;
  kind: 'audioinput' | 'videoinput';
  label: string;
}

const InterviewContent: React.FC<InterviewContentProps> = ({
  token,
  recording,
  activeSidebar,
  onLeaveInterview,
  onEndInterview,
  onUpdateRecordingState,
  categorizedQuestions,
  onSidebarChange,
}) => {
  const [contentSearchParams] = useSearchParams();
  // Use LiveKit hook
  const liveKit = useLiveKit();
  const room = useRoomContext();
  const unreadChatCount = useUnreadChatCount(activeSidebar === 'chat');
  const controlButtonClass = 'text-white hover:!text-white/90 hover:!bg-white/10';

  // Track if user manually left (vs room being ended by recruiter)
  const userManuallLeftRef = React.useRef(false);

  // Track remote participant roles received via data messages
  // Key: participant identity, Value: role string
  const remoteRolesRef = React.useRef<Map<string, string>>(new Map());

  // Track last active sidebar for smooth close transition
  const lastSidebarRef = React.useRef(activeSidebar);
  if (activeSidebar) {
    lastSidebarRef.current = activeSidebar;
  }
  const displaySidebar = activeSidebar || lastSidebarRef.current;

  const [showRecordingPopup, setShowRecordingPopup] = useState(false);

  useEffect(() => {
    if (recording) {
      setShowRecordingPopup(true);
    }
  }, [recording]);

  /**
   * AI Video rounds have no human interviewer to click "End Interview" —
   * ai-service's own agent (LiveKit identity "Iris" by default; see
   * ai_video_room_identity) just disconnects its own connection once the
   * round's time is up (conduct_ai_video_interview.py's `finally`-guarded
   * `_room_agent.disconnect()`); it never closes the room itself. Nothing
   * previously reacted to that on the candidate side, so the candidate was
   * left sitting alone in a still-live call indefinitely.
   *
   * Scoped to CANDIDATE tokens only — a human interviewer's own client
   * already has its own explicit "End Interview" flow. A short grace
   * period (rather than acting the instant the room is empty) absorbs a
   * brief reconnect blip on a PANEL round's interviewer without
   * prematurely ending the candidate's call; it's cancelled if anyone
   * rejoins before it elapses.
   */
  const AI_ENDED_GRACE_SECONDS = 10;
  const isCandidateToken = token.role === 'CANDIDATE';
  const remoteParticipants = useRemoteParticipants();
  const hadRemoteParticipantRef = React.useRef(false);
  const aiEndTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [aiEndedNoticeVisible, setAiEndedNoticeVisible] = useState(false);
  const [aiEndedCountdown, setAiEndedCountdown] = useState(AI_ENDED_GRACE_SECONDS);

  useEffect(() => {
    if (remoteParticipants.length > 0) {
      hadRemoteParticipantRef.current = true;
    }
  }, [remoteParticipants.length]);

  useEffect(() => {
    if (!isCandidateToken) return;

    if (remoteParticipants.length > 0) {
      // Someone (re)joined inside the grace window — still a live call.
      if (aiEndTimeoutRef.current) {
        clearTimeout(aiEndTimeoutRef.current);
        aiEndTimeoutRef.current = null;
      }
      setAiEndedNoticeVisible(false);
      return;
    }

    // Only fire once the room has actually had someone in it (never on
    // initial mount before Iris/the interviewer has even joined), and only
    // once per emptying — `aiEndTimeoutRef` guards against re-arming on
    // every re-render while the notice is already showing.
    if (!hadRemoteParticipantRef.current || userManuallLeftRef.current || aiEndTimeoutRef.current) {
      return;
    }

    setAiEndedNoticeVisible(true);
    setAiEndedCountdown(AI_ENDED_GRACE_SECONDS);
    aiEndTimeoutRef.current = setTimeout(() => {
      onLeaveInterview('ai');
    }, AI_ENDED_GRACE_SECONDS * 1000);
  }, [remoteParticipants.length, isCandidateToken, onLeaveInterview]);

  useEffect(() => {
    if (!aiEndedNoticeVisible) return undefined;
    const interval = setInterval(() => {
      setAiEndedCountdown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [aiEndedNoticeVisible]);

  useEffect(
    () => () => {
      if (aiEndTimeoutRef.current) clearTimeout(aiEndTimeoutRef.current);
    },
    []
  );

  const handleLeaveNowAfterAiEnded = useCallback(() => {
    if (aiEndTimeoutRef.current) {
      clearTimeout(aiEndTimeoutRef.current);
      aiEndTimeoutRef.current = null;
    }
    onLeaveInterview('ai');
  }, [onLeaveInterview]);

  const [devices, setDevices] = useState<{
    audioDevices: DeviceInfo[];
    videoDevices: DeviceInfo[];
    selectedAudioDevice: string | null;
    selectedVideoDevice: string | null;
  }>({
    audioDevices: [],
    videoDevices: [],
    selectedAudioDevice: null,
    selectedVideoDevice: null,
  });

  // Hiring Panel reference questions — pushed by ai-service over the data
  // channel, see PanelQuestionsMessage's own docstring above. `null` until
  // the message arrives (which can be never, if this round isn't a Panel
  // round or ai-service hasn't published yet).
  const [panelQuestions, setPanelQuestions] = useState<PanelQuestionsMessage | null>(null);
  // Whether the "please introduce yourselves"-style instructions banner is
  // still showing — separate from `panelQuestions` itself so dismissing the
  // banner doesn't lose the question set from the sidebar, and re-shown
  // (see handleDataReceived) if a fresher instructions string arrives.
  const [showInstructionsBanner, setShowInstructionsBanner] = useState(false);
  // Guards the one-shot `message.info` toast below from re-firing on every
  // redelivery of the same instructions text (ai-service may re-publish on
  // reconnect) — only toast again if the text actually changed.
  const lastToastedInstructionsRef = useRef<string | null>(null);

  // Assessment scoring state
  const [assessmentScores, setAssessmentScores] = useState<{
    [questionId: number]: {
      score?: number;
      passFailResult?: boolean | null;
    };
  }>({});

  useEffect(() => {
    if (categorizedQuestions && categorizedQuestions.categories) {
      const initialScores: {
        [questionId: number]: { score?: number; passFailResult?: boolean | null };
      } = {};

      Object.keys(categorizedQuestions.categories).forEach((category) => {
        categorizedQuestions.categories[category].forEach((q: any) => {
          let parsedScore: number | undefined;
          if (q.score !== null && q.score !== undefined && q.score !== '') {
            const num = Number(q.score);
            if (!isNaN(num)) parsedScore = num;
          }

          let parsedPassFail: boolean | null = null;
          const pfString = String(q.passFailResult).toLowerCase();
          if (q.passFailResult === true || pfString === 'true' || pfString === 'yes') {
            parsedPassFail = true;
          } else if (q.passFailResult === false || pfString === 'false' || pfString === 'no') {
            parsedPassFail = false;
          }

          if (parsedScore !== undefined || parsedPassFail !== null) {
            initialScores[q.id] = {
              score: parsedScore,
              passFailResult: parsedPassFail,
            };
          }
        });
      });

      setAssessmentScores((prev) => ({ ...initialScores, ...prev }));
    }
  }, [categorizedQuestions]);

  /**
   * Per-question debounce timers for score API calls.
   * Prevents the API from firing on every keystroke, which caused isSavingScore
   * to flip true→false rapidly, disabling the input and breaking focus.
   */
  const scoreDebounceRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  // Tracks which category sections are expanded in the assessment panel
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // API mutation for saving scores
  const [editAiQuestionForScoring, { isLoading: isSavingScore }] =
    useEditAiQuestionForScoringMutation();

  const isRecruiter = token.role === 'RECRUITER' || token.role === 'INTERVIEWER';
  const [isSmsPanelOpen, setIsSmsPanelOpen] = useState(false);

  type InterviewJwtPayload = {
    candidateId?: number | string;
    jobId?: number | string;
    jobOpeningId?: number | string;
    candidateName?: string;
    candidatePhone?: string;
    phoneNumber?: string;
    countryCode?: string;
    bookingId?: number | string;
  };

  const interviewTokenFromUrl = contentSearchParams.get('token') || '';

  const decodedInterviewToken = useMemo<InterviewJwtPayload>(() => {
    if (!interviewTokenFromUrl) return {};
    try {
      return jwtDecode<InterviewJwtPayload>(interviewTokenFromUrl);
    } catch {
      return {};
    }
  }, [interviewTokenFromUrl]);

  const smsCandidateId = Number(
    token.candidateId ?? decodedInterviewToken.candidateId ?? token.participantIdentity
  );
  const smsJobOpeningId = Number(decodedInterviewToken.jobId ?? decodedInterviewToken.jobOpeningId);
  const smsCandidateName =
    decodedInterviewToken.candidateName || token.participantName || 'Candidate';
  const smsCandidatePhone =
    decodedInterviewToken.candidatePhone || decodedInterviewToken.phoneNumber || '';
  const smsBookingId = decodedInterviewToken.bookingId || token.bookingId || '';
  const canUseSmsPanel =
    isRecruiter &&
    Number.isFinite(smsCandidateId) &&
    smsCandidateId > 0 &&
    Number.isFinite(smsJobOpeningId) &&
    smsJobOpeningId > 0;

  /**
   * Handle score input change for scoring questions.
   *
   * Fix for focus-loss bug:
   * - State is updated IMMEDIATELY for instant UI feedback.
   * - The API call is DEBOUNCED (600ms) — it only fires after the user
   *   stops typing. This prevents isSavingScore from toggling true→false
   *   on every keystroke, which was disabling the input and stealing focus.
   */
  const handleScoreChange = useCallback(
    (questionId: number, value: string) => {
      let score: number | null = null;
      if (value !== '') {
        score = parseInt(value, 10);
        if (isNaN(score)) score = 1;
        else if (score < 1) score = 1;
        else if (score > 5) score = 5;
      }

      // Update local state immediately for responsive UI
      setAssessmentScores((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          score: score === null ? undefined : score,
        },
      }));

      // Debounce the API call — cancel any pending call for this question
      const existing = scoreDebounceRef.current.get(questionId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(async () => {
        scoreDebounceRef.current.delete(questionId);
        try {
          await editAiQuestionForScoring({
            candidateId: token.candidateId
              ? Number(token.candidateId)
              : parseInt(token.participantIdentity, 10),
            questionId,
            score,
            interviewRoundId: token.interviewRoundId
              ? parseInt(token.interviewRoundId, 10)
              : undefined,
          }).unwrap();
          message.success('Score saved');
        } catch (error) {
          console.error('Failed to save score:', error);
          message.error('Failed to save score');
        }
      }, 600);

      scoreDebounceRef.current.set(questionId, timer);
    },
    [token, editAiQuestionForScoring]
  );

  /**
   * Handle pass/fail toggle for pass/fail questions
   * Calls API to save result
   */
  const handlePassFailChange = useCallback(
    async (questionId: number, value: boolean | null) => {
      try {
        // Update local state
        setAssessmentScores((prev) => {
          const updated = { ...prev };
          updated[questionId] = {
            ...updated[questionId],
            passFailResult: value,
          };
          return updated;
        });

        // Call API to save pass/fail result
        await editAiQuestionForScoring({
          candidateId: token.candidateId
            ? Number(token.candidateId)
            : parseInt(token.participantIdentity, 10),
          questionId,
          passFailResult: value,
          interviewRoundId: token.interviewRoundId
            ? parseInt(token.interviewRoundId, 10)
            : undefined,
        }).unwrap();

        message.success('Result saved');
      } catch (error) {
        console.error('Failed to save result:', error);
        message.error('Failed to save result');
      }
    },
    [token, editAiQuestionForScoring]
  );

  /**
   * Handle user manually leaving the interview
   * Sets flag to indicate user left, not recruiter ending
   */
  const handleUserLeave = useCallback(() => {
    userManuallLeftRef.current = true;
    onLeaveInterview('user');
  }, [onLeaveInterview]);

  /**
   * Detect when room is disconnected (e.g., recruiter ended interview)
   * and automatically show ended screen to all participants
   */
  useEffect(() => {
    if (!room) {
      return;
    }

    const handleDisconnect = () => {
      // If user manually left, show "You Left the Meeting"
      // If room was disconnected without manual leave, recruiter ended it
      const endedBy = userManuallLeftRef.current ? 'user' : 'recruiter';
      onLeaveInterview(endedBy);
    };

    room.on('disconnected', handleDisconnect);

    return () => {
      room.off('disconnected', handleDisconnect);
    };
  }, [room, onLeaveInterview]);

  /**
   * Single screen share policy — auto-stop local share when a remote participant starts.
   *
   * This covers the race-condition case where two participants start sharing at the
   * same moment (before either sees the other's track). The local participant's share
   * is stopped gracefully and a notification is shown.
   */
  useEffect(() => {
    if (!room) return;

    const handleRemoteTrackPublished = (
      publication: { source: string },
      participant: { name?: string; identity: string }
    ) => {
      if (publication.source !== Track.Source.ScreenShare) return;

      // If we are currently screen sharing, stop — only one person shares at a time
      if (liveKit.mediaState.screenSharing) {
        liveKit.toggleScreenShare();
        const sharer = participant.name || participant.identity || 'Another participant';
        message.warning(`${sharer} started sharing. Your screen share was stopped.`, 5);
      }
    };

    room.on('trackPublished', handleRemoteTrackPublished as any);

    return () => {
      room.off('trackPublished', handleRemoteTrackPublished as any);
    };
  }, [room, liveKit.mediaState.screenSharing, liveKit.toggleScreenShare]);

  /**
   * Broadcast local participant's role via publishData.
   * Retries until the room is fully connected.
   * Also re-broadcasts when new participants connect so late-joiners get the role.
   */
  useEffect(() => {
    if (!room) return;

    let timerId: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const broadcastRole = async () => {
      if (!isMounted) return;
      try {
        if (room.state !== 'connected') {
          timerId = setTimeout(broadcastRole, 500);
          return;
        }
        const metadata = JSON.stringify({ role: token.role });
        await room.localParticipant.publishData(new TextEncoder().encode(metadata), {
          reliable: true,
        });
      } catch (error) {
        if (!isMounted) return;
        console.error('Failed to broadcast role metadata:', error);
        timerId = setTimeout(broadcastRole, 1000);
      }
    };

    // Broadcast role on initial connection
    broadcastRole();

    // Re-broadcast when a new participant connects so they learn our role
    const handleNewParticipant = () => {
      broadcastRole();
    };
    room.on('participantConnected', handleNewParticipant);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
      room.off('participantConnected', handleNewParticipant);
    };
  }, [room, token.role]);

  /**
   * Listen for data messages from other participants to learn their roles.
   * When a participant publishes their role via publishData, we capture it
   * in remoteRolesRef and re-check for interviewer presence.
   */
  useEffect(() => {
    if (!room) return;

    const checkForInterviewer = () => {
      // Check roles discovered via data messages
      const hasRemoteInterviewer = Array.from(remoteRolesRef.current.values()).some(
        (role) => role === 'RECRUITER' || role === 'INTERVIEWER'
      );

      // Also check the local participant
      const isLocalRecruiter = token.role === 'RECRUITER' || token.role === 'INTERVIEWER';

      if (hasRemoteInterviewer || isLocalRecruiter) {
        onUpdateRecordingState(true);
      } else {
        onUpdateRecordingState(false);
      }
    };

    // Handle incoming data messages that contain role information
    const handleDataReceived = (
      payload: Uint8Array,
      participant?: { identity: string } | undefined
    ) => {
      let decoded: any;
      try {
        decoded = JSON.parse(new TextDecoder().decode(payload));
      } catch {
        // Not a JSON message, ignore
        return;
      }

      if (decoded.role) {
        // Only the role message needs a sender to attribute the role to —
        // every real participant broadcasts their own via publishData, so
        // this is always populated for that case.
        if (!participant) return;
        remoteRolesRef.current.set(participant.identity, decoded.role);
        checkForInterviewer();
        return;
      }

      if (decoded.resume_based !== undefined || decoded.instructions !== undefined) {
        // Hiring Panel question set — distinguished from the role message
        // above by shape, not by sender identity (see PanelQuestionsMessage's
        // own docstring). Unlike the role message, this is pushed by
        // ai-service through LiveKit's server-side RoomService/SendData API
        // (see ai-service's livekit_room_data_publisher.py), not a real
        // connected participant's own publishData — the LiveKit protocol's
        // DataPacket then carries no sending participant at all, so
        // `participant` is `undefined` here. Deliberately NOT gated on it.
        //
        // ai-service targets `destination_identities` at the LiveKit
        // transport level for this message in online mode, so a candidate's
        // client never receives it in the first place; this `isRecruiter`
        // check is a defensive fallback only, for the documented case where
        // ai-service falls back to broadcasting because
        // `interviewer_identities` wasn't populated upstream.
        if (isRecruiter) {
          const next: PanelQuestionsMessage = {
            resume_based: Array.isArray(decoded.resume_based) ? decoded.resume_based : [],
            jd_based: Array.isArray(decoded.jd_based) ? decoded.jd_based : [],
            instructions: typeof decoded.instructions === 'string' ? decoded.instructions : '',
          };
          setPanelQuestions(next);
          setShowInstructionsBanner(true);
          if (next.instructions && lastToastedInstructionsRef.current !== next.instructions) {
            lastToastedInstructionsRef.current = next.instructions;
            message.info(next.instructions, 8);
          }
        }
      }
    };

    // Clean up roles when a participant disconnects
    const handleParticipantDisconnected = (participant: { identity: string }) => {
      remoteRolesRef.current.delete(participant.identity);
      checkForInterviewer();
    };

    // Check immediately for local recruiter role
    checkForInterviewer();

    room.on('dataReceived', handleDataReceived as any);
    room.on('participantDisconnected', handleParticipantDisconnected as any);

    return () => {
      room.off('dataReceived', handleDataReceived as any);
      room.off('participantDisconnected', handleParticipantDisconnected as any);
    };
  }, [room, token.role, isRecruiter, onUpdateRecordingState]);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return undefined;
    }

    const enumerateDevices = async (): Promise<void> => {
      try {
        const availableDevices = await navigator.mediaDevices.enumerateDevices();

        const audioDevices: DeviceInfo[] = availableDevices
          .filter((device) => device.kind === 'audioinput')
          .map((device) => ({
            deviceId: device.deviceId,
            kind: 'audioinput',
            label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
          }));

        const videoDevices: DeviceInfo[] = availableDevices
          .filter((device) => device.kind === 'videoinput')
          .map((device) => ({
            deviceId: device.deviceId,
            kind: 'videoinput',
            label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
          }));

        setDevices((prev) => ({
          ...prev,
          audioDevices,
          videoDevices,
          selectedAudioDevice: prev.selectedAudioDevice || audioDevices[0]?.deviceId || null,
          selectedVideoDevice: prev.selectedVideoDevice || videoDevices[0]?.deviceId || null,
        }));
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
        message.error('Unable to access media devices');
      }
    };

    enumerateDevices();
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    };
  }, []);

  const handleSelectAudioDevice = useCallback(
    async (deviceId: string): Promise<void> => {
      try {
        await room.switchActiveDevice('audioinput', deviceId);
        setDevices((prev) => ({ ...prev, selectedAudioDevice: deviceId }));
      } catch (error) {
        console.error('Failed to switch microphone:', error);
        message.error('Failed to switch microphone');
      }
    },
    [room]
  );

  const handleSelectVideoDevice = useCallback(
    async (deviceId: string): Promise<void> => {
      try {
        await room.switchActiveDevice('videoinput', deviceId);
        setDevices((prev) => ({ ...prev, selectedVideoDevice: deviceId }));
      } catch (error) {
        console.error('Failed to switch camera:', error);
        message.error('Failed to switch camera');
      }
    },
    [room]
  );

  const audioMenuItems: MenuProps['items'] = devices.audioDevices.map((device) => ({
    key: device.deviceId,
    label: device.label,
  }));

  const videoMenuItems: MenuProps['items'] = devices.videoDevices.map((device) => ({
    key: device.deviceId,
    label: device.label,
  }));

  return (
    <div className="flex h-screen w-screen bg-gray-900">
      {aiEndedNoticeVisible && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[95vw] max-w-[480px] flex flex-col items-center rounded-2xl bg-white px-10 py-10 text-center shadow-2xl animate-[fadeIn_0.2s_ease-out]">
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Your Interview Has Ended</h2>
            <p className="mb-1 text-base text-gray-700">Thank you for participating.</p>
            <p className="mb-6 text-sm text-gray-500">
              This call will close automatically in {aiEndedCountdown}s, or you may leave now.
            </p>
            <Button
              type="primary"
              size="large"
              className="rounded-lg bg-brand-600 hover:!bg-brand-700 border-none px-8 font-medium"
              onClick={handleLeaveNowAfterAiEnded}
            >
              Leave Now
            </Button>
          </div>
        </div>
      )}
      {/* Main Video Grid */}
      <div className="flex-1 flex flex-col">
        {/* Video Grid */}
        <div className="flex-1 relative overflow-hidden pb-20">
          {isRecruiter && showInstructionsBanner && panelQuestions?.instructions && (
            <div className="absolute top-4 left-1/2 z-40 w-[min(90%,640px)] -translate-x-1/2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-100 shadow-lg backdrop-blur-md">
              <div className="flex items-start justify-between gap-3">
                <p className="leading-relaxed">{panelQuestions.instructions}</p>
                <button
                  type="button"
                  onClick={() => setShowInstructionsBanner(false)}
                  className="shrink-0 text-amber-200/70 transition-colors hover:text-white cursor-pointer"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          <VideoGrid
            token={token}
            liveKit={liveKit}
            isRecording={recording}
            candidateName={decodedInterviewToken.candidateName}
          />
        </div>

        {/* Minimal bottom bar: statuses + controls */}
        <div className="interview-control-bar fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-gray-900/80 px-4 py-2 text-xs text-gray-300 backdrop-blur-md border border-gray-700/60 shadow-lg">
          <div className="flex items-center gap-3">
            {recording && (
              <span className="relative flex items-center">
                <Tooltip title="recording is in progress">
                  <span
                    onClick={() => setShowRecordingPopup(true)}
                    className="flex items-center gap-1 text-red-400 cursor-pointer select-none"
                  >
                    <FaCircle className="animate-pulse" size={8} />
                    Rec
                  </span>
                </Tooltip>

                {showRecordingPopup && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-10 left-0 z-50 w-85 rounded-xl border border-gray-700 bg-gray-900/95 p-3.5 shadow-2xl text-gray-200 backdrop-blur-md text-left cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                          Recording in progress
                        </p>
                        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                          This interview is being recorded, transcribed and analyzed using AI. By
                          continuing, you consent to this.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRecordingPopup(false);
                        }}
                        className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </span>
            )}
            {liveKit.isConnected && <span className="text-emerald-400">Connected</span>}
          </div>

          <div className="h-4 w-px bg-gray-700/70" />

          <div className="flex items-center gap-2">
            <Tooltip title={liveKit.mediaState.micEnabled ? 'Mute' : 'Unmute'}>
              <Button
                type="text"
                size="small"
                className={controlButtonClass}
                icon={
                  liveKit.mediaState.micEnabled ? (
                    <FaMicrophone className="text-white" />
                  ) : (
                    <FaMicrophoneSlash className="text-red-500" />
                  )
                }
                onClick={liveKit.toggleMic}
                loading={liveKit.isMicLoading}
              />
            </Tooltip>

            <Dropdown
              menu={{
                items: audioMenuItems,
                onClick: ({ key }) => handleSelectAudioDevice(String(key)),
              }}
              trigger={['click']}
              placement="top"
            >
              <Tooltip title="Select microphone">
                <Button
                  type="text"
                  size="small"
                  className={controlButtonClass}
                  icon={<FaChevronDown className="text-gray-300" />}
                  disabled={devices.audioDevices.length === 0}
                />
              </Tooltip>
            </Dropdown>

            <Tooltip title={liveKit.mediaState.cameraEnabled ? 'Stop camera' : 'Start camera'}>
              <Button
                type="text"
                size="small"
                className={controlButtonClass}
                icon={
                  liveKit.mediaState.cameraEnabled ? (
                    <FaVideo className="text-white" />
                  ) : (
                    <FaVideoSlash className="text-red-500" />
                  )
                }
                onClick={liveKit.toggleCam}
                loading={liveKit.isCamLoading}
              />
            </Tooltip>

            <Dropdown
              menu={{
                items: videoMenuItems,
                onClick: ({ key }) => handleSelectVideoDevice(String(key)),
              }}
              trigger={['click']}
              placement="top"
            >
              <Tooltip title="Select camera">
                <Button
                  type="text"
                  size="small"
                  className={controlButtonClass}
                  icon={<FaChevronDown className="text-gray-300" />}
                  disabled={devices.videoDevices.length === 0}
                />
              </Tooltip>
            </Dropdown>

            <Tooltip
              title={
                liveKit.isRemoteScreenSharing && !liveKit.mediaState.screenSharing
                  ? 'Another participant is already sharing their screen'
                  : liveKit.mediaState.screenSharing
                    ? 'Stop sharing'
                    : 'Share screen'
              }
            >
              <Button
                type="text"
                size="small"
                className={clsx(
                  controlButtonClass,
                  liveKit.isRemoteScreenSharing && !liveKit.mediaState.screenSharing
                    ? 'opacity-40 cursor-not-allowed'
                    : ''
                )}
                icon={
                  liveKit.mediaState.screenSharing ? (
                    // Actively sharing — show stop/slash icon in blue
                    <MdStopScreenShare className="text-brand-400" size={18} />
                  ) : liveKit.isRemoteScreenSharing ? (
                    // Blocked — someone else is sharing, show grayed out
                    <MdScreenShare className="text-gray-500" size={18} />
                  ) : (
                    // Idle — show share icon in white
                    <MdScreenShare className="text-white" size={18} />
                  )
                }
                onClick={liveKit.toggleScreenShare}
                loading={liveKit.isScreenShareLoading}
                disabled={liveKit.isRemoteScreenSharing && !liveKit.mediaState.screenSharing}
              />
            </Tooltip>

            {isRecruiter && (
              <Tooltip title="Assessment">
                <Button
                  type="text"
                  size="small"
                  className={`${controlButtonClass} ${activeSidebar === 'assessment' ? 'text-brand-400 bg-white/10' : ''}`}
                  icon={
                    <FaClipboardList
                      className={activeSidebar === 'assessment' ? 'text-brand-400' : 'text-white'}
                    />
                  }
                  onClick={() =>
                    onSidebarChange(activeSidebar === 'assessment' ? null : 'assessment')
                  }
                />
              </Tooltip>
            )}

            {isRecruiter && (
              <Tooltip title="Panel Questions">
                <Button
                  type="text"
                  size="small"
                  className={`${controlButtonClass} ${activeSidebar === 'panel-questions' ? 'text-brand-400 bg-white/10' : ''}`}
                  icon={
                    <MdOutlineQuestionAnswer
                      className={
                        activeSidebar === 'panel-questions' ? 'text-brand-400' : 'text-white'
                      }
                    />
                  }
                  onClick={() =>
                    onSidebarChange(activeSidebar === 'panel-questions' ? null : 'panel-questions')
                  }
                />
              </Tooltip>
            )}

            <Tooltip title="Chat">
              <span className="relative inline-flex">
                <Button
                  type="text"
                  size="small"
                  className={`${controlButtonClass} ${activeSidebar === 'chat' ? 'text-brand-400 bg-white/10' : ''}`}
                  icon={
                    <MdChatBubbleOutline
                      className={activeSidebar === 'chat' ? 'text-brand-400' : 'text-white'}
                    />
                  }
                  onClick={() => onSidebarChange(activeSidebar === 'chat' ? null : 'chat')}
                />
                {unreadChatCount > 0 && (
                  <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand-500 px-0.5 text-[9px] font-bold text-white">
                    {unreadChatCount}
                  </span>
                )}
              </span>
            </Tooltip>

            <Tooltip title="Settings">
              <Button
                type="text"
                size="small"
                className={`${controlButtonClass} ${activeSidebar === 'settings' ? 'text-brand-400 bg-white/10' : ''}`}
                icon={
                  <MdOutlineSettings
                    className={activeSidebar === 'settings' ? 'text-brand-400' : 'text-white'}
                  />
                }
                onClick={() => onSidebarChange(activeSidebar === 'settings' ? null : 'settings')}
              />
            </Tooltip>

            <Tooltip title="Leave">
              <Button
                type="text"
                size="small"
                className="bg-red-500 hover:!bg-red-600 text-white border-none flex items-center justify-center"
                icon={<FaPhone className="rotate-[225deg]" />}
                onClick={handleUserLeave}
              />
            </Tooltip>

            {isRecruiter && (
              <Tooltip title="End interview">
                <Button
                  type="text"
                  size="small"
                  className="bg-red-500 hover:!bg-red-600 text-white border-none flex items-center justify-center"
                  icon={<FaStopCircle />}
                  onClick={onEndInterview}
                />
              </Tooltip>
            )}
          </div>
        </div>

        {canUseSmsPanel && (
          <Tooltip title="Send SMS" placement="left">
            <button
              type="button"
              onClick={() => setIsSmsPanelOpen((prev) => !prev)}
              className="fixed bottom-6 right-6 z-69 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-primary-200 bg-primary-50 text-primary-600 shadow-lg transition-colors hover:bg-primary-100 cfp-hover-lift cursor-pointer"
              aria-label="Open SMS panel"
            >
              <FaRegCommentDots size={18} />
            </button>
          </Tooltip>
        )}

        {canUseSmsPanel && (
          <InterviewSmsPanel
            open={isSmsPanelOpen}
            onClose={() => setIsSmsPanelOpen(false)}
            candidateId={smsCandidateId}
            jobOpeningId={smsJobOpeningId}
            candidateName={smsCandidateName}
            candidatePhone={smsCandidatePhone}
            bookingId={smsBookingId}
          />
        )}
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={!!activeSidebar}
        onClose={() => onSidebarChange(null)}
        title={
          displaySidebar === 'assessment'
            ? 'Assessment'
            : displaySidebar === 'panel-questions'
              ? 'Panel Questions'
              : displaySidebar === 'chat'
                ? 'Chat'
                : displaySidebar === 'settings'
                  ? 'Settings'
                  : 'Participants'
        }
      >
        {displaySidebar === 'chat' && (
          <ChatPanel embedded open onClose={() => onSidebarChange(null)} />
        )}

        {displaySidebar === 'settings' && (
          <SettingsPanel
            embedded
            open
            onClose={() => onSidebarChange(null)}
            devicesSection={
              <div className="flex flex-col gap-3 text-sm text-white">
                <div>
                  <p className="mb-1 text-xs text-neutral-400">Microphone</p>
                  <select
                    value={devices.selectedAudioDevice ?? ''}
                    onChange={(e) => void handleSelectAudioDevice(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5"
                  >
                    {devices.audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-xs text-neutral-400">Camera</p>
                  <select
                    value={devices.selectedVideoDevice ?? ''}
                    onChange={(e) => void handleSelectVideoDevice(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5"
                  >
                    {devices.videoDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            }
          />
        )}

        {displaySidebar === 'assessment' && categorizedQuestions?.categories && (
          <div className="space-y-4">
            {Object.entries(categorizedQuestions.categories).map(
              ([categoryName, questionsData]: [string, unknown]) => {
                const questions = questionsData as any[];
                const isPassFailCategory =
                  categoryName.toLowerCase().includes('pass') &&
                  categoryName.toLowerCase().includes('fail');

                return (
                  <div
                    key={categoryName}
                    className="border border-gray-800 bg-gray-800/50 rounded-xl overflow-hidden shadow-sm"
                  >
                    <button
                      onClick={() => toggleCategory(categoryName)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-700/50 text-gray-200 font-medium text-sm transition-colors cursor-pointer"
                    >
                      <span>{categoryName}</span>
                      <span className="text-xl leading-none text-gray-400 transition-all duration-200 select-none">
                        {expandedCategories.has(categoryName) ? '−' : '+'}
                      </span>
                    </button>
                    <div
                      className={`bg-gray-900/40 px-5 py-5 space-y-6 border-t border-gray-800 ${
                        expandedCategories.has(categoryName) ? 'block' : 'hidden'
                      }`}
                    >
                      {questions.map((q: any, idx: number) => (
                        <div key={q.id || idx} className="space-y-3">
                          <p className="text-sm text-slate-300 leading-relaxed font-light">
                            <span className="text-brand-400 font-medium mr-1 tracking-wide">
                              Q{idx + 1}.
                            </span>
                            {q.question}
                          </p>

                          {/* Pass/Fail Questions: Radio Toggle */}
                          {isPassFailCategory ? (
                            <div className="flex items-center gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="radio"
                                  name={`pf-${q.id}`}
                                  value="yes"
                                  checked={assessmentScores[q.id]?.passFailResult === true}
                                  onChange={() => handlePassFailChange(q.id, true)}
                                  onClick={(e) => {
                                    if (assessmentScores[q.id]?.passFailResult === true) {
                                      e.preventDefault();
                                      handlePassFailChange(q.id, null);
                                    }
                                  }}
                                  disabled={isSavingScore}
                                  className="w-4 h-4 text-brand-500 bg-gray-800 border-gray-700 focus:ring-brand-600 focus:ring-2"
                                />
                                <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                  Yes
                                </span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="radio"
                                  name={`pf-${q.id}`}
                                  value="no"
                                  checked={assessmentScores[q.id]?.passFailResult === false}
                                  onChange={() => handlePassFailChange(q.id, false)}
                                  onClick={(e) => {
                                    if (assessmentScores[q.id]?.passFailResult === false) {
                                      e.preventDefault();
                                      handlePassFailChange(q.id, null);
                                    }
                                  }}
                                  disabled={isSavingScore}
                                  className="w-4 h-4 text-brand-500 bg-gray-800 border-gray-700 focus:ring-brand-600 focus:ring-2"
                                />
                                <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                                  No
                                </span>
                              </label>
                            </div>
                          ) : (
                            // Score Questions: Number Input (1-5)
                            // Note: disabled is intentionally NOT tied to isSavingScore here.
                            // Disabling on every keystroke (while API saves) would steal focus.
                            // The API call is debounced, so isSavingScore only triggers
                            // after the user has paused typing.
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={assessmentScores[q.id]?.score ?? ''}
                              onChange={(e) => handleScoreChange(q.id, e.target.value)}
                              placeholder="Score (1-5)"
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all font-sans"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
            <Button
              block
              type="primary"
              size="large"
              className="mt-6 bg-brand-600 hover:!bg-brand-500 border-none font-medium h-11 shadow-lg shadow-brand-900/20"
              onClick={() => onSidebarChange(null)}
            >
              SAVE FEEDBACK
            </Button>
          </div>
        )}

        {displaySidebar === 'panel-questions' && isRecruiter && (
          <div className="space-y-5">
            {panelQuestions?.instructions && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-100">
                {panelQuestions.instructions}
              </div>
            )}

            {!panelQuestions ||
            (panelQuestions.resume_based.length === 0 && panelQuestions.jd_based.length === 0) ? (
              <p className="text-sm text-gray-400">No panel questions received yet.</p>
            ) : (
              <>
                {panelQuestions.resume_based.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Resume-based
                    </h4>
                    <ol className="list-decimal space-y-3 pl-5">
                      {panelQuestions.resume_based.map((q, idx) => (
                        <li key={idx} className="text-sm leading-relaxed text-gray-200">
                          {q.question_text}
                          {q.scoring_sections && q.scoring_sections.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {q.scoring_sections.map((section) => (
                                <span
                                  key={section}
                                  className="rounded-full bg-gray-700/70 px-2 py-0.5 text-[10px] text-gray-300"
                                >
                                  {section}
                                </span>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {panelQuestions.jd_based.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      JD-based
                    </h4>
                    <ol className="list-decimal space-y-3 pl-5">
                      {panelQuestions.jd_based.map((q, idx) => (
                        <li key={idx} className="text-sm leading-relaxed text-gray-200">
                          {q.question_text}
                          {q.scoring_sections && q.scoring_sections.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {q.scoring_sections.map((section) => (
                                <span
                                  key={section}
                                  className="rounded-full bg-gray-700/70 px-2 py-0.5 text-[10px] text-gray-300"
                                >
                                  {section}
                                </span>
                              ))}
                            </div>
                          )}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Sidebar>
    </div>
  );
};

export default Interview;
