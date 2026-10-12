import type {
  CandidateDisplayStatus,
  CandidateView,
} from '../../../api/candidate-service/Candidates/CandidateLifecycle';
import type { BadgeStatus } from '../../shared/ui/badge';
import type { CandidateInterviewScoreView } from '../../../api/candidate-service/Candidates/scoring';

// Split out of CandidatesListing.tsx so other candidate views can reuse the
// exact same "First Last" formatting the Table view's rows use, without
// making CandidatesListing.tsx export a non-component value
// (react-refresh/only-export-components).
/** Why SMS can't be sent to a candidate, or null when it can. SMS is on by
 * default: only a missing phone number or an explicit opt-out
 * (`sms_opted_out_at`) blocks it. A missing field means "allowed". */
export const getSmsBlockedReason = (
  c: Pick<CandidateView, 'contact_no' | 'sms_opted_out_at'> | null | undefined
): string | null => {
  if (!c?.contact_no) return 'No phone number on file';
  if (c.sms_opted_out_at != null) return 'Candidate opted out of SMS';
  return null;
};

/** The office a candidate applied under as one line, or `null` when the server gave none
 * (none chosen, or not resolvable for this load): then the row is left out, not shown as N/A. */
export const candidateAppliedLocation = (c: CandidateView): string | null => {
  const parts = [
    c.applied_location_address_line_1,
    c.applied_location_address_line_2,
    c.applied_location_city,
    c.applied_location_state,
    c.applied_location_zip_code,
    c.applied_location_country,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

export const candidateDisplayName = (c: CandidateView) =>
  `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'N/A';

/** "AB" from "Aarav Sharma", "A" from "Aarav" alone, "?" with no name at all
 * — feeds the round avatar next to a candidate's name in list rows. */
export const candidateInitials = (c: CandidateView) => {
  const first = c.first_name?.trim()?.[0] ?? '';
  const last = c.last_name?.trim()?.[0] ?? '';
  return (first + last).toUpperCase() || '?';
};

/** Same green/red/blue read as `CandidateDetails.tsx`'s own status pill
 * (`statusUpper === 'selected'` / `.includes('reject')`), just expressed
 * through the shared `Badge` component's status vocabulary instead of
 * one-off inline color classes, so every place a candidate's status shows
 * up — list row, detail header — agrees on what color it gets. `null`
 * (no status yet) reads as the same "needs attention" warning color the
 * list row's plain-text fallback already used.
 *
 * Kept around (alongside the richer `candidateStatusColor` below) for
 * anything still using the shared `Badge` component's 5-value status
 * vocabulary directly. */
export const candidateStatusBadgeStatus = (statusCode: string | null | undefined): BadgeStatus => {
  const code = (statusCode ?? '').toLowerCase();
  if (!code) return 'warning';
  if (code === 'selected') return 'success';
  if (code.includes('reject')) return 'danger';
  return 'info';
};

export type CandidateStatusColor = { bg: string; text: string; dot: string };

/** One distinct color per funnel stage, not just the 5-bucket success/
 * warning/danger/info/neutral split `Badge` offers — with 11 real status
 * codes (`master_candidate_status`, candidate-service migration 0002),
 * bucketing most of them into a single "info" blue made every in-progress
 * candidate look identical regardless of where they actually are.
 * Deliberately NOT added to `badge.tsx`'s own `BadgeStatus`/`statusClasses`
 * — that vocabulary is shared by every status pill across the whole app,
 * and this palette is specific to the candidate funnel, so it renders as a
 * plain span with its own classes rather than through `Badge`. Unknown
 * codes (a status added later without an update here) fall back to
 * `UNKNOWN_STATUS_COLOR`, a neutral gray, not an error state. */
const CANDIDATE_STATUS_COLOR: Record<string, CandidateStatusColor> = {
  applied: { bg: 'bg-neutral-100', text: 'text-neutral-600', dot: 'bg-neutral-400' },
  resume_under_review: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  resume_rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  shortlisted: { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  interview_scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  interview_in_progress: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  interview_rejected: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  advanced: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  selected: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  rejected: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  // Distinct from `applied`'s neutral gray — both used to be the same gray,
  // making a withdrawn candidate indistinguishable from a fresh applicant.
  withdrawn: { bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-500' },
};

const NOT_SCREENED_COLOR: CandidateStatusColor = {
  bg: 'bg-amber-50',
  text: 'text-amber-700',
  dot: 'bg-amber-500',
};

const UNKNOWN_STATUS_COLOR: CandidateStatusColor = {
  bg: 'bg-neutral-100',
  text: 'text-neutral-600',
  dot: 'bg-neutral-400',
};

export const candidateStatusColor = (
  statusCode: string | null | undefined
): CandidateStatusColor => {
  const code = (statusCode ?? '').toLowerCase();
  if (!code) return NOT_SCREENED_COLOR;
  return CANDIDATE_STATUS_COLOR[code] ?? UNKNOWN_STATUS_COLOR;
};

/** Plain-English tooltip copy per funnel status, written for a recruiter —
 * NOT `CandidateStatusView.description` from the backend, which reads like
 * an engineering changelog note ("which round is tracked in
 * interview_bookings, not duplicated here") and references internal table
 * names. Codes are `master_candidate_status`'s seeded set (candidate-
 * service migration 0002) — an unrecognized code (a status added later
 * without an update here) just gets no tooltip rather than a broken one. */
const STATUS_TOOLTIP_BY_CODE: Record<string, string> = {
  applied: 'Application received, not yet reviewed.',
  resume_under_review: "Resume is being scored — check back once it's done.",
  resume_rejected: "Didn't pass resume review.",
  shortlisted: 'Passed resume review — ready for interview rounds.',
  interview_scheduled: 'An interview round has been booked for this candidate.',
  interview_in_progress: 'An interview round is currently underway.',
  interview_rejected: "Didn't pass an interview round.",
  advanced: 'Passed a round — moving on to the next one.',
  selected: 'Selected for this role.',
  rejected: 'Rejected from this job opening.',
  withdrawn: 'Candidate withdrew their application.',
};

export const candidateStatusTooltip = (statusCode: string | null | undefined): string | undefined =>
  STATUS_TOOLTIP_BY_CODE[(statusCode ?? '').toLowerCase()];

/** The candidate list's four top-level states (candidate-service's
 * `display_status`), in the order the status filter lists them. */
export const CANDIDATE_DISPLAY_STATUS_OPTIONS: { value: CandidateDisplayStatus; label: string }[] =
  [
    { value: 'in_process', label: 'In Process' },
    { value: 'selected', label: 'Selected' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'withdrawn', label: 'Withdrawn' },
  ];

const DISPLAY_STATUS_LABEL = Object.fromEntries(
  CANDIDATE_DISPLAY_STATUS_OPTIONS.map((o) => [o.value, o.label])
) as Record<CandidateDisplayStatus, string>;

// Same palette as the matching `status_code` colours above.
const DISPLAY_STATUS_COLOR: Record<CandidateDisplayStatus, CandidateStatusColor> = {
  in_process: CANDIDATE_STATUS_COLOR.interview_scheduled,
  selected: CANDIDATE_STATUS_COLOR.selected,
  rejected: CANDIDATE_STATUS_COLOR.rejected,
  withdrawn: CANDIDATE_STATUS_COLOR.withdrawn,
};

const DISPLAY_STATUS_TOOLTIP: Record<CandidateDisplayStatus, string> = {
  in_process: 'Still moving through the hiring rounds.',
  selected: 'Selected for this role.',
  rejected: 'Rejected from this job opening.',
  withdrawn: 'Candidate withdrew their application.',
};

const REJECTED_STATUS_CODES = new Set(['rejected', 'resume_rejected', 'interview_rejected']);

/** The row's `display_status`, or — for a candidate-service build that
 * doesn't return it yet — the same four-way split derived from
 * `status_code` (any rejection, withdrawn, selected, else in process). */
export const resolveDisplayStatus = (c: CandidateView): CandidateDisplayStatus => {
  if (c.display_status) return c.display_status;
  const code = (c.status_code ?? '').toLowerCase();
  if (REJECTED_STATUS_CODES.has(code)) return 'rejected';
  if (code === 'withdrawn') return 'withdrawn';
  if (code === 'selected') return 'selected';
  return 'in_process';
};

// ── Average score ──────────────────────────────────────────────────────
// The list's "Avg. score" is the resume score plus every interview round's
// own score (the recruiter's if one was recorded, else the AI's), averaged.
// The list endpoint neither returns nor sorts on it, so the figure is
// computed here (see CandidatesListing's score probes) and the Avg. Score
// column sort runs in the browser.

export const computeAverageScore = (
  resumeScore: number | null | undefined,
  scores: Pick<CandidateInterviewScoreView, 'score' | 'recruiter_score'>[]
): number | null => {
  const values = [
    resumeScore,
    ...scores.map((s) => (s.recruiter_score != null ? s.recruiter_score : s.score)),
  ].filter((v): v is number => v !== null && v !== undefined);
  return values.length > 0
    ? Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(1))
    : null;
};

export const candidateDisplayStatusLabel = (status: CandidateDisplayStatus): string =>
  DISPLAY_STATUS_LABEL[status] ?? 'In Process';

export const candidateDisplayStatusColor = (status: CandidateDisplayStatus): CandidateStatusColor =>
  DISPLAY_STATUS_COLOR[status] ?? UNKNOWN_STATUS_COLOR;

export const candidateDisplayStatusTooltip = (status: CandidateDisplayStatus): string | undefined =>
  DISPLAY_STATUS_TOOLTIP[status];
