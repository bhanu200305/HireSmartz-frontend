import { describe, it, expect } from 'vitest';
import type { ActivityItem } from '../../../src/api/audit-service/Activity/activity';
import {
  activityTargetPath,
  buildActivitySentence,
  collapseRepeats,
  groupByDay,
  isInitialStatusEcho,
  sentenceToText,
  statusLabel,
} from '../../../src/components/ActivityFeed/activityFormat';

const base: ActivityItem = {
  id: '1',
  type: 'candidate.status_changed',
  category: 'candidate',
  occurred_at: '2026-10-05T09:14:00Z',
  actor: { type: 'user', id: 'u1', name: 'Vedansh Setia' },
  candidate: { id: 'c1', name: 'Karla Hall' },
  person: null,
  job: { id: 'j1', title: 'Bartender', code: 'NET-78ZIVB' },
  company: null,
  params: { from_status: 'screening', to_status: 'shortlisted' },
};

const text = (
  item: Partial<ActivityItem>,
  scope: 'company' | 'assigned_jobs' | 'platform' = 'company'
) => sentenceToText(buildActivitySentence({ ...base, ...item }, scope));

describe('buildActivitySentence', () => {
  it('maps status codes to labels and bolds names', () => {
    const segs = buildActivitySentence(base, 'company');
    expect(sentenceToText(segs)).toBe(
      'Vedansh Setia moved Karla Hall to Shortlisted for Bartender'
    );
    expect(segs.filter((s) => s.bold).map((s) => s.text)).toEqual([
      'Vedansh Setia',
      'Karla Hall',
      'Shortlisted',
      'Bartender',
    ]);
  });

  it('uses the automatic phrasing for system actors', () => {
    expect(text({ actor: { type: 'system', id: null, name: null } })).toBe(
      'Karla Hall was moved to Shortlisted for Bartender automatically'
    );
  });

  it('splits candidate.applied on who did it', () => {
    const anon = { actor: { type: 'anonymous' as const, id: null, name: null } };
    expect(text({ type: 'candidate.applied', ...anon })).toBe('Karla Hall applied for Bartender');
    expect(text({ type: 'candidate.applied' })).toBe('Vedansh Setia added Karla Hall to Bartender');
  });

  it('falls back for null names, null job title and null round name', () => {
    expect(
      text({ candidate: null, actor: null, job: { id: 'j1', title: null, code: 'NET-1' } })
    ).toBe('Someone moved A candidate to Shortlisted for NET-1');
    expect(text({ type: 'interview.scheduled', params: {} })).toBe(
      'Vedansh Setia scheduled the interview with Karla Hall for Bartender'
    );
  });

  it('calls the unattributed platform actor "Platform admin"', () => {
    expect(
      text(
        { type: 'platform.security_key_rotated', actor: { type: 'user', id: 'x', name: null } },
        'platform'
      )
    ).toBe('Security keys rotated');
    expect(
      text({ type: 'job.created', actor: { type: 'user', id: 'x', name: null } }, 'platform')
    ).toBe('Platform admin created Bartender (NET-78ZIVB)');
  });

  it('labels role keys and reads "a role" when the role is missing', () => {
    const person = { id: 'p1', name: 'Monto Carlo' };
    expect(
      text({ type: 'team.role_assigned', person, params: { role_name: 'hiring_manager' } })
    ).toBe('Vedansh Setia gave Monto Carlo the Hiring Manager role');
    expect(text({ type: 'team.role_assigned', person, params: {} })).toBe(
      'Vedansh Setia gave Monto Carlo a role'
    );
    expect(text({ type: 'team.role_created', params: { role_name: 'Regional Lead' } })).toBe(
      'Vedansh Setia created the Regional Lead role'
    );
  });

  it("reads a company's status change as a status", () => {
    expect(
      text(
        {
          type: 'platform.company_status_changed',
          company: { id: 't1', name: 'JP Morgan' },
          params: { to_status: 'active' },
        },
        'platform'
      )
    ).toBe("JP Morgan's status changed to Active");
  });

  it('handles a withdrawal with no job and unknown types', () => {
    expect(text({ type: 'candidate.withdrew', job: null })).toBe(
      'Karla Hall withdrew their application'
    );
    expect(text({ type: 'something.new' })).toBe('Activity on NET-78ZIVB');
    expect(text({ type: 'something.new', job: null })).toBe('Activity');
  });
});

describe('helpers', () => {
  it('folds only back-to-back identical events, keeping the newest', () => {
    const rounds = { ...base, type: 'job.interview_rounds_updated', params: {} };
    const items = [
      { ...rounds, id: 'a', occurred_at: '2026-10-07T12:59:00Z' },
      { ...rounds, id: 'b' },
      { ...rounds, id: 'c' },
      { ...base, id: 'd' },
      { ...rounds, id: 'e' },
      { ...rounds, id: 'f', actor: { type: 'user' as const, id: 'u2', name: 'Monto Carlo' } },
    ];
    expect(collapseRepeats(items).map((e) => [e.item.id, e.count])).toEqual([
      ['a', 3],
      ['d', 1],
      ['e', 1],
      ['f', 1],
    ]);
  });

  it('flags only the starting none -> Applied status as an echo', () => {
    const initial = { ...base, params: { from_status: null, to_status: 'applied' } };
    expect(isInitialStatusEcho(initial)).toBe(true);
    expect(
      isInitialStatusEcho({ ...initial, params: { from_status: '', to_status: 'APPLIED' } })
    ).toBe(true);
    expect(isInitialStatusEcho(base)).toBe(false);
    expect(
      isInitialStatusEcho({
        ...initial,
        params: { from_status: 'screening', to_status: 'applied' },
      })
    ).toBe(false);
    expect(isInitialStatusEcho({ ...initial, type: 'candidate.applied' })).toBe(false);
  });

  it('humanizes unknown status codes', () => {
    expect(statusLabel('final_round')).toBe('Final Round');
  });

  it('opens the candidate when both ids exist, the job otherwise', () => {
    expect(activityTargetPath(base)).toBe('/jobs/view/j1/candidates/c1/details?tab=3');
    expect(activityTargetPath({ ...base, candidate: null })).toBe('/jobs/view/j1/candidates');
    expect(activityTargetPath({ ...base, job: null })).toBeNull();
  });

  it('groups consecutive items by day', () => {
    const a = { ...base, id: 'a', occurred_at: '2020-01-02T10:00:00Z' };
    const b2 = { ...base, id: 'b', occurred_at: '2020-01-02T08:00:00Z' };
    const c = { ...base, id: 'c', occurred_at: '2020-01-01T08:00:00Z' };
    expect(groupByDay([a, b2, c]).map((g) => g.items.length)).toEqual([2, 1]);
  });
});
