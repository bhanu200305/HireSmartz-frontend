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
// seconds after the candidate's browser itself disconnects. Branch on the
// backend's own `error_code` rather than retrying on any error shape:
//   - 425 FEEDBACK_PENDING  — booking not COMPLETED *yet*, will resolve on
//     its own once the webhook lands. Keep showing the same waiting state
//     and poll silently in the background.
//   - 422 FEEDBACK_NOT_AVAILABLE / 404 BOOKING_NOT_FOUND — permanent: the
//     booking is in a status that will never produce feedback, or doesn't
//     exist at all. Stop immediately, no retry — these were never going to
//     resolve on their own, so retrying them only delayed a dead-end screen.
// Once a 425 has been seen at least once, any OTHER error on a later poll
// (timeout, a 502 off a container restart, a dropped connection — not a
// real answer from the endpoint at all) is treated as "still waiting", not
// as a third, permanent outcome — see the state machine below for why that
// distinction matters.
const FEEDBACK_PENDING_POLL_MS = 1200;
const FEEDBACK_PENDING_TIMEOUT_MS = 20000;

// ---------------------------------------------------------------------------
// Candidate feedback  —  /feedback?token=
// ---------------------------------------------------------------------------
export const CandidateFeedbackPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  // Set (once) the moment a FEEDBACK_PENDING response is first seen, and
  // cleared only once we get a REAL answer (success, or one of the two
  // definitively-permanent error codes below) — NOT on just any error tick.
  // `withinPendingWindow` is derived from this state (set on a *previous*
  // render) before the query hook is called below, so `pollingInterval`
  // reacts to it correctly; the checks further down (using *this* render's
  // fresh result) only decide whether to schedule the state update that
  // will turn polling on/off from the next render on — see the "adjust
  // state during rendering" pattern.
  const [firstPendingAt, setFirstPendingAt] = useState<number | null>(null);
  const withinPendingWindow =
    firstPendingAt !== null && Date.now() - firstPendingAt < FEEDBACK_PENDING_TIMEOUT_MS;

  const { data, isLoading, isError, error } = useGetCandidateFeedbackLinkQuery(token, {
    skip: !token,
    pollingInterval: withinPendingWindow ? FEEDBACK_PENDING_POLL_MS : 0,
  });

  const apiError = isError ? (error as InterviewApiError) : undefined;
  // Matched on the error CODE first, not just the HTTP status number — 425
  // is an unusual status (tied to TLS 0-RTT semantics at the spec level)
  // that some proxies/CDNs/gateways are known to mangle in transit; the
  // JSON body's own `error_code` survives that even when the numeric
  // status doesn't.
  const isPendingResponse = apiError?.code === 'FEEDBACK_PENDING' || apiError?.status === 425;
  // The ONLY two outcomes the backend ever raises for a booking that will
  // truly never produce feedback (see interview-service's
  // resolve_candidate_feedback_link.py). Deliberately narrow: anything
  // else — a network blip, a 502/503 off a container restart, a timeout —
  // must NOT be treated the same way once we're already in the pending
  // window.
  const isDefinitivePermanentError =
    apiError?.code === 'FEEDBACK_NOT_AVAILABLE' || apiError?.code === 'BOOKING_NOT_FOUND';

  // BUG THIS REPLACES: the window used to clear on ANY error tick that
  // wasn't exactly FEEDBACK_PENDING — so one transient failure mid-poll
  // (a timeout, a 502 from a rolling deploy/container restart, a dropped
  // connection) got treated as a definitive "no", silently killed all
  // future polling (pollingInterval falls to 0 once the window closes),
  // and stranded the candidate on a dead-end "link not valid" screen with
  // no way back except a manual page reload — the exact "flicker, then
  // needs a reload" this was reported as, and something a real
  // multi-service docker-compose box hits often. Now the window only ends
  // on a REAL answer: a genuine success, or one of the two definitive
  // codes above. Any other error while already inside the window leaves
  // the window running, so polling just quietly retries instead.
  if (isPendingResponse && firstPendingAt === null) {
    setFirstPendingAt(Date.now());
  } else if (firstPendingAt !== null && (!isError || isDefinitivePermanentError)) {
    setFirstPendingAt(null);
  }

  // Same waiting state for the very first fetch, every FEEDBACK_PENDING
  // retry, AND any transient error while already waiting — no visible
  // transition between any of those, by construction.
  const isWaitingForCompletion = isLoading || (withinPendingWindow && !isDefinitivePermanentError);
  const hasPendingTimedOut = firstPendingAt !== null && !withinPendingWindow;
  const isPermanentError =
    isDefinitivePermanentError || (isError && !isWaitingForCompletion && !hasPendingTimedOut);

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
  if (isWaitingForCompletion) {
    return (
      <Shell>
        <div className="flex justify-center py-6">
          <Loader />
        </div>
        <p className="mt-2 text-center text-sm text-gray-500">Finishing up your interview…</p>
      </Shell>
    );
  }
  if (hasPendingTimedOut) {
    return (
      <Shell>
        <p className="text-center text-sm text-gray-600">
          This is taking longer than expected — please refresh in a moment.
        </p>
      </Shell>
    );
  }
  if (isPermanentError) {
    return (
      <Shell>
        <p className="text-center text-sm text-gray-600">
          {linkErrorText(apiError, 'This feedback link is not valid.')}
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
        className="mt-4 w-full resize-none rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
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
        {isSubmitting ? 'Submitting…' : 'Submit Feedback'}
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
        {isSubmitting ? 'Processing…' : 'Withdraw From This Process'}
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
          {dayjs(data.start_time).format('dddd, MMMM D, YYYY · h:mm A')}
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
