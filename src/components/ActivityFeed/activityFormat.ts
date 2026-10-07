import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { ActivityItem, ActivityScope } from '../../api/audit-service/Activity/activity';

dayjs.extend(relativeTime);

/** A piece of a rendered sentence — `bold` pieces are names (people, jobs, companies). */
export type Segment = { text: string; bold?: boolean };

const b = (text: string): Segment => ({ text, bold: true });

/** "screening_complete" → "Screening Complete" — fallback for any status/role/scope code we have no label for. */
export const humanizeCode = (code: string): string =>
  code
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

// Display labels for codes whose humanized form reads wrong. Anything not
// listed falls back to humanizeCode — the catalog is open-ended.
const STATUS_LABELS: Record<string, string> = {
  ai_screening: 'AI Screening',
  no_show: 'No Show',
};

export const statusLabel = (code?: string | null): string =>
  code ? (STATUS_LABELS[code.toLowerCase()] ?? humanizeCode(code)) : 'a new status';

const RECOMMENDATION_LABELS: Record<string, string> = {
  strong_yes: 'Strong Yes',
  yes: 'Yes',
  no: 'No',
  strong_no: 'Strong No',
};

const recommendationLabel = (code: string): string =>
  RECOMMENDATION_LABELS[code.toLowerCase()] ?? humanizeCode(code);

const JOB_VERBS: Record<string, string> = {
  'job.created': 'created',
  'job.updated': 'updated',
  'job.published': 'published',
  'job.closed': 'closed',
  'job.reopened': 'reopened',
};

/**
 * Who did it. The Super Admin view never carries actor names yet, so it reads
 * "Platform admin"; a null name elsewhere reads "Someone".
 */
const actorSegment = (item: ActivityItem, scope: ActivityScope): Segment => {
  const actor = item.actor;
  if (actor?.type === 'system') return b('The system');
  if (actor?.name) return b(actor.name);
  return b(scope === 'platform' ? 'Platform admin' : 'Someone');
};

const candidateSegment = (item: ActivityItem): Segment => b(item.candidate?.name ?? 'A candidate');
const personSegment = (item: ActivityItem): Segment => b(item.person?.name ?? 'A team member');
const companySegment = (item: ActivityItem): Segment => b(item.company?.name ?? 'A company');

/** Job title alone, or just the code when the title is null. */
const jobSegment = (item: ActivityItem): Segment | null => {
  const title = item.job?.title;
  const code = item.job?.code;
  if (title) return b(title);
  if (code) return b(code);
  return null;
};

/** "Title (CODE)" for the job lifecycle sentences; just the code when title is null. */
const jobWithCodeSegment = (item: ActivityItem): Segment | null => {
  const title = item.job?.title;
  const code = item.job?.code;
  if (title && code) return b(`${title} (${code})`);
  return jobSegment(item);
};

/** " for {job}" — empty when the event carries no job. */
const forJob = (item: ActivityItem): Segment[] => {
  const job = jobSegment(item);
  return job ? [{ text: ' for ' }, job] : [];
};

const roundName = (item: ActivityItem): string => item.params?.round_name || 'interview';

/** "the {round}" — directly booked interviews have no round name, so "the interview". */
const theRound = (item: ActivityItem): Segment[] =>
  item.params?.round_name
    ? [{ text: 'the ' }, b(item.params.round_name)]
    : [{ text: 'the interview' }];

/**
 * One sentence template per event type. The backend returns data, not text.
 * Never throws and never returns an empty sentence, whatever is null.
 */
export const buildActivitySentence = (item: ActivityItem, scope: ActivityScope): Segment[] => {
  const actor = actorSegment(item, scope);
  const candidate = candidateSegment(item);
  const person = personSegment(item);
  const params = item.params ?? {};
  const isSystem = item.actor?.type === 'system';
  const jobFull = jobWithCodeSegment(item);
  const t = (text: string): Segment => ({ text });

  switch (item.type) {
    // Job openings
    case 'job.created':
    case 'job.updated':
    case 'job.published':
    case 'job.closed':
    case 'job.reopened':
      return [actor, t(` ${JOB_VERBS[item.type]} `), ...(jobFull ? [jobFull] : [t('a job')])];
    case 'job.draft_deleted':
      return [actor, t(' deleted draft '), ...(jobFull ? [jobFull] : [t('a job')])];
    case 'job.interview_rounds_updated':
      return [actor, t(' updated the interview rounds'), ...forJob(item)];
    case 'job.member_assigned':
    case 'job.member_removed': {
      const verb = item.type === 'job.member_assigned' ? 'assigned' : 'removed';
      const job = jobSegment(item);
      return [
        actor,
        t(` ${verb} `),
        person,
        ...(params.scope ? [t(` as ${humanizeCode(params.scope).toLowerCase()}`)] : []),
        ...(job ? [t(' on '), job] : []),
      ];
    }

    // Candidates
    case 'candidate.applied':
      return item.actor?.type === 'user'
        ? [
            actor,
            t(' added '),
            candidate,
            ...(jobSegment(item) ? [t(' to '), jobSegment(item)!] : []),
          ]
        : [candidate, t(' applied'), ...forJob(item)];
    case 'candidate.status_changed':
      return isSystem
        ? [
            candidate,
            t(' was moved to '),
            b(statusLabel(params.to_status)),
            ...forJob(item),
            t(' automatically'),
          ]
        : [
            actor,
            t(' moved '),
            candidate,
            t(' to '),
            b(statusLabel(params.to_status)),
            ...forJob(item),
          ];
    case 'candidate.rejected':
      return [actor, t(' rejected '), candidate, ...forJob(item)];
    case 'candidate.withdrawal_requested':
      return [
        candidate,
        t(' asked to withdraw'),
        ...(jobSegment(item) ? [t(' from '), jobSegment(item)!] : []),
      ];
    case 'candidate.withdrew':
      return [candidate, t(' withdrew their application')];

    // Interviews
    case 'interview.scheduled':
      return isSystem
        ? [
            b(roundName(item) === 'interview' ? 'Interview' : roundName(item)),
            t(' scheduled automatically for '),
            candidate,
            ...forJob(item),
          ]
        : [actor, t(' scheduled '), ...theRound(item), t(' with '), candidate, ...forJob(item)];
    case 'interview.cancelled':
      return [actor, t(' cancelled '), candidate, t("'s "), t(roundName(item)), ...forJob(item)];
    case 'interview.completed':
      return [candidate, t(' completed '), ...theRound(item), ...forJob(item)];
    case 'interview.status_changed':
      return [candidate, t(`'s ${roundName(item)} was marked `), b(statusLabel(params.to_status))];
    case 'interview.rescheduled':
      return [t('An interview was rescheduled')];
    case 'interview.no_show':
      return [t('An interview was marked no-show')];
    case 'interview.interviewer_changed':
      return [t('An interview was reassigned to a new interviewer')];
    case 'interview.feedback_submitted':
      return [
        actor,
        t(' submitted interview feedback'),
        ...(params.recommendation ? [t(` (${recommendationLabel(params.recommendation)})`)] : []),
      ];

    // Team
    case 'team.invited':
      return [actor, t(' invited a new team member')];
    case 'team.invitation_revoked':
      return [actor, t(' revoked an invitation for a new team member')];
    case 'team.joined':
      return [actor, t(' joined the company')];
    case 'team.role_assigned':
      return [actor, t(' gave '), person, t(' the '), b(params.role_name ?? 'a'), t(' role')];
    case 'team.role_removed':
      return [actor, t(' removed a role from '), person];
    case 'team.role_created':
    case 'team.role_deleted':
    case 'team.role_permissions_changed': {
      const verb =
        item.type === 'team.role_created'
          ? 'created'
          : item.type === 'team.role_deleted'
            ? 'deleted'
            : 'changed';
      return [actor, t(` ${verb} the `), b(params.role_name ?? 'a'), t(' role')];
    }
    case 'team.member_offboarded':
      return [actor, t(' offboarded '), person];

    // Platform (Super Admin)
    case 'platform.company_onboarded':
      return [companySegment(item), t(' joined the platform')];
    case 'platform.company_status_changed':
      return [companySegment(item), t(' changed to '), b(statusLabel(params.to_status))];
    case 'platform.company_admin_invited':
      return [t('An admin was invited for '), companySegment(item)];
    case 'platform.staff_invited':
      return [t('Platform staff invited')];
    case 'platform.staff_offboarded':
      return [t('Platform staff offboarded')];
    case 'platform.security_key_rotated':
      return [t('Security keys rotated')];

    default:
      return [t('Activity'), ...(item.job?.code ? [t(' on '), b(item.job.code)] : [])];
  }
};

/** Plain-text version of a sentence — for aria-labels and tests. */
export const sentenceToText = (segments: Segment[]): string => segments.map((s) => s.text).join('');

/** In-app route an item opens: the candidate (needs the job in this app's URL) or the job. */
export const activityTargetPath = (item: ActivityItem): string | null => {
  const jobId = item.job?.id;
  const candidateId = item.candidate?.id;
  if (jobId && candidateId) return `/jobs/view/${jobId}/candidates/${candidateId}/details?tab=3`;
  if (jobId) return `/jobs/view/${jobId}/candidates`;
  return null;
};

/** "2h ago" — the exact time goes in the hover title. */
export const relativeTimeLabel = (iso: string): string => dayjs(iso).fromNow();

export const exactTimeLabel = (iso: string): string => dayjs(iso).format('DD MMM YYYY, hh:mm A');

/** "Today" / "Yesterday" / "05 Oct 2026" — group headings. */
export const dayHeading = (iso: string): string => {
  const d = dayjs(iso);
  if (d.isSame(dayjs(), 'day')) return 'Today';
  if (d.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
  return d.format('DD MMM YYYY');
};

export type DayGroup = { heading: string; items: ActivityItem[] };

/** Groups an already newest-first list into consecutive day buckets. */
export const groupByDay = (items: ActivityItem[]): DayGroup[] => {
  const groups: DayGroup[] = [];
  for (const item of items) {
    const heading = dayHeading(item.occurred_at);
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) last.items.push(item);
    else groups.push({ heading, items: [item] });
  }
  return groups;
};

export type DatePreset = 'today' | '7d' | '30d' | 'custom';

/**
 * ISO range for a preset (the default is the last 7 days); custom returns the
 * supplied range. Rolling presets leave `to` open so events that land after
 * the page loaded still show up on the next fetch.
 */
export const presetRange = (
  preset: DatePreset,
  custom?: { from?: string; to?: string }
): { from?: string; to?: string } => {
  const now = dayjs();
  switch (preset) {
    case 'today':
      return { from: now.startOf('day').toISOString() };
    case '30d':
      return { from: now.subtract(30, 'day').startOf('day').toISOString() };
    case 'custom':
      return { from: custom?.from, to: custom?.to };
    case '7d':
    default:
      return { from: now.subtract(7, 'day').startOf('day').toISOString() };
  }
};
