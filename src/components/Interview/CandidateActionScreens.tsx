import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';

import { Loader } from '../shared/ui/loader';
import { Badge } from '../shared/ui/badge';
import {
  useGetCandidateFeedbackLinkQuery,
  useSubmitCandidateFeedbackMutation,
  useGetWithdrawalLinkQuery,
  useSubmitWithdrawalMutation,
  useGetRecordingQuery,
  getInterviewErrorAction,
  type InterviewApiError,
  type InterviewErrorAction,
} from '../../api/interview-service/client';
import { interviewTypeLabel } from '../../pages/InterviewsPage/interviewLabels';

/**
 * Candidate-facing token links interview-service emails during the process:
 *   - CANDIDATE_FEEDBACK_BASE_URL   -> /feedback?token=…    (post-round rating)
 *   - CANDIDATE_WITHDRAWAL_BASE_URL -> /withdraw?token=…     (self-withdrawal)
 *   - a recording playback link     -> /recordings?token=…  (GET /recordings/{token})
 * All are token-only (the candidate is not logged in) and public.
 */

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="public-page flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">{children}</div>
  </div>
);

const linkErrorText = (error: InterviewApiError | undefined, fallback: string): string => {
  if (!error) return fallback;
  return getInterviewErrorAction(error) === 'expired-link'
    ? 'This link has expired and can no longer be used.'
    : error.message || fallback;
};

// AI_VIDEO/PANEL candidates arrive at the feedback page straight from
// SessionJoinScreen's `onDisconnected`, reusing the same SESSION_PURPOSE
// token — the round's booking is marked COMPLETED by LiveKit's own
// `room_finished` webhook, which can genuinely still be in flight for a few
// seconds after the candidate's browser itself disconnects. The very first
// request in that window can come back as `FEEDBACK_NOT_AVAILABLE`
// ('not-ready'), or — since the browser's network stack is often still
// settling right after the WebRTC teardown — as a bare network failure or a
// transient 500 (both classified 'toast'). Retrying only on 'not-ready' left
// the other two shapes as a dead-end error screen that never resolved on its
// own (only a manual reload, which just got lucky by retrying later once the
// webhook had caught up). Treat both shapes as retryable for a bounded
// window instead.
const RETRYABLE_FEEDBACK_ERROR_ACTIONS = new Set<InterviewErrorAction>(['not-ready', 'toast']);
const FEEDBACK_RETRY_WINDOW_MS = 20000;

// ---------------------------------------------------------------------------
// Candidate feedback  —  /feedback?token=
// ---------------------------------------------------------------------------
export const CandidateFeedbackPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  // Set (once) the moment a retryable error is first seen, and cleared once
  // the fetch stops erroring. `withinRetryWindow` is derived from this state
  // (set on a *previous* render) before the query hook is called below, so
  // `pollingInterval` reacts to it correctly; the `isError`/`isRetryableError`
  // check further down (using *this* render's fresh result) only decides
  // whether to schedule the state update that will turn polling on/off from
  // the next render on — see the "adjust state during rendering" pattern.
  const [firstRetryableErrorAt, setFirstRetryableErrorAt] = useState<number | null>(null);
  const withinRetryWindow =
    firstRetryableErrorAt !== null && Date.now() - firstRetryableErrorAt < FEEDBACK_RETRY_WINDOW_MS;

  const { data, isLoading, isError, error } = useGetCandidateFeedbackLinkQuery(token, {
    skip: !token,
    pollingInterval: withinRetryWindow ? 2000 : 0,
  });

  const errorAction = isError ? getInterviewErrorAction(error as InterviewApiError) : null;
  const isRetryableError =
    errorAction !== null && RETRYABLE_FEEDBACK_ERROR_ACTIONS.has(errorAction);

  if (!isError && firstRetryableErrorAt !== null) {
    setFirstRetryableErrorAt(null);
  } else if (isError && isRetryableError && firstRetryableErrorAt === null) {
    setFirstRetryableErrorAt(Date.now());
  }

  const isWaitingForCompletion = isError && isRetryableError && withinRetryWindow;

  const [submit, { isLoading: isSubmitting }] = useSubmitCandidateFeedbackMutation();

  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const roundLabel = data ? interviewTypeLabel(data.interview_type) : 'interview';

  // No client-side keyword/content check is added here on purpose — this
  // field is judged by the backend's guardrail LLM only, specifically so a
  // candidate reporting real discrimination is never blocked client-side.
  // The only gate below is the existing rating/text presence check.
  const onSubmit = async () => {
    if (!rating || !text.trim()) return;
    setSubmitError(null);
    try {
      await submit({ token, rating, feedback_text: text.trim() }).unwrap();
      setDone(true);
    } catch (e) {
      setSubmitError(linkErrorText(e as InterviewApiError, 'Could not submit your feedback.'));
    }
  };

  if (!token) {
    return (
      <Shell>
        <p className="text-center text-sm text-gray-500">
          This feedback link is missing its token. Please use the link from your email.
        </p>
      </Shell>
    );
  }
  if (isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-6">
          <Loader />
        </div>
      </Shell>
    );
  }
  if (isError && isWaitingForCompletion) {
    return (
      <Shell>
        <div className="flex justify-center py-6">
          <Loader />
        </div>
        <p className="mt-2 text-center text-sm text-gray-500">
          Wrapping up your interview — this will just take a moment…
        </p>
      </Shell>
    );
  }
  if (isError) {
    return (
      <Shell>
        <p className="text-center text-sm text-gray-600">
          {linkErrorText(error as InterviewApiError, 'This feedback link is not valid.')}
        </p>
      </Shell>
    );
  }
  if (done) {
    return (
      <Shell>
        <h1 className="text-center text-lg font-semibold text-gray-900">Thank you</h1>
        <p className="mt-2 text-center text-sm text-gray-500">
          Your feedback about your {roundLabel} has been shared with the hiring team.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-lg font-semibold text-gray-900">How was your {roundLabel}?</h1>
      <p className="mt-1 text-sm text-gray-500">
        Your feedback goes to the hiring team and won’t affect your candidacy.
      </p>

      <div className="mt-5 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => setRating(n)}
            className={`h-10 w-10 rounded-full text-lg cursor-pointer ${
              n <= rating ? 'bg-amber-100 text-amber-500' : 'bg-gray-100 text-gray-300'
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        className="mt-4 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        rows={4}
        placeholder="Tell us about your experience…"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (submitError) setSubmitError(null);
        }}
      />
      <p className="mt-1 text-xs text-gray-400">
        Please keep your feedback respectful and free of hateful or discriminatory language.
      </p>
      {submitError && <p className="mt-1 text-sm text-red-600">{submitError}</p>}

      <button
        type="button"
        disabled={!rating || !text.trim() || isSubmitting}
        onClick={onSubmit}
        className="mt-4 w-full rounded-3xl bg-button py-2.5 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSubmitting ? 'Submitting…' : 'Submit feedback'}
      </button>
    </Shell>
  );
};

// ---------------------------------------------------------------------------
// Candidate self-withdrawal  —  /withdraw?token=
// ---------------------------------------------------------------------------
export const WithdrawalPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const { data, isLoading, isError, error } = useGetWithdrawalLinkQuery(token, { skip: !token });
  const [submit, { isLoading: isSubmitting }] = useSubmitWithdrawalMutation();
  const [done, setDone] = useState(false);

  const org = useMemo(() => data?.organization_name?.trim() || 'this company', [data]);

  // The bare GET is deliberately inert (email clients / scanners pre-fetch
  // links) — withdrawal only happens on this button's POST.
  const onWithdraw = async () => {
    try {
      await submit(token).unwrap();
      setDone(true);
    } catch (e) {
      alert(linkErrorText(e as InterviewApiError, 'Could not process your request.'));
    }
  };

  if (!token) {
    return (
      <Shell>
        <p className="text-center text-sm text-gray-500">
          This link is missing its token. Please use the link from your email.
        </p>
      </Shell>
    );
  }
  if (isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-6">
          <Loader />
        </div>
      </Shell>
    );
  }
  if (isError) {
    return (
      <Shell>
        <p className="text-center text-sm text-gray-600">
          {linkErrorText(error as InterviewApiError, 'This link is not valid.')}
        </p>
      </Shell>
    );
  }
  if (done) {
    return (
      <Shell>
        <h1 className="text-center text-lg font-semibold text-gray-900">You’ve withdrawn</h1>
        <p className="mt-2 text-center text-sm text-gray-500">
          We’ve let {org} know you’re no longer interested in this role. Any scheduled interviews
          will be canceled.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-lg font-semibold text-gray-900">Withdraw from this process?</h1>
      <p className="mt-2 text-sm text-gray-600">
        This tells {org} you’re no longer interested in this role and cancels any upcoming
        interviews. You can’t undo this from here.
      </p>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={onWithdraw}
        className="mt-5 w-full rounded-3xl bg-danger-bg py-2.5 text-sm font-semibold text-danger-text disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSubmitting ? 'Processing…' : 'Withdraw from this process'}
      </button>
    </Shell>
  );
};

// ---------------------------------------------------------------------------
// Recording playback  —  /recordings?token=
// ---------------------------------------------------------------------------
const isUrl = (s: string) => /^https?:\/\//i.test(s);

export const RecordingPlaybackPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const { data, isLoading, isError, error } = useGetRecordingQuery(token, { skip: !token });

  if (!token) {
    return (
      <Shell>
        <p className="text-center text-sm text-gray-500">
          This recording link is missing its token. Please use the link from your email.
        </p>
      </Shell>
    );
  }
  if (isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-6">
          <Loader />
        </div>
      </Shell>
    );
  }
  if (isError || !data) {
    return (
      <Shell>
        <p className="text-center text-sm text-gray-600">
          {linkErrorText(error as InterviewApiError, 'This recording link is not valid.')}
        </p>
      </Shell>
    );
  }

  const ready = data.handoff_status === 'handed_off';

  return (
    <Shell>
      <h1 className="text-lg font-semibold text-gray-900">
        {interviewTypeLabel(data.interview_type)} recording
      </h1>
      {data.start_time && dayjs(data.start_time).isValid() && (
        <p className="mt-1 text-sm text-gray-500">
          {dayjs(data.start_time).format('dddd, MMM D, YYYY · h:mm A')}
        </p>
      )}
      <div className="mt-4">
        <Badge status={ready ? 'success' : 'warning'} dot={false}>
          {String(data.handoff_status).replace(/_/g, ' ')}
        </Badge>
      </div>
      {ready ? (
        isUrl(data.external_ref) ? (
          <a
            href={data.external_ref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 block w-full rounded-3xl bg-button py-2.5 text-center text-sm font-medium text-white"
          >
            Open recording
          </a>
        ) : (
          <p className="mt-4 break-all text-xs text-gray-400">Reference: {data.external_ref}</p>
        )
      ) : (
        <p className="mt-4 text-sm text-gray-500">
          The recording is still being processed. Check back shortly.
        </p>
      )}
    </Shell>
  );
};
