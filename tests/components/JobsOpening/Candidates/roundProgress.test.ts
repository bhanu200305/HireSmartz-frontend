import { describe, it, expect } from 'vitest';
import {
  bucketForStatus,
  isOverdue,
  isReadyForOverallScore,
  isRoundConcluded,
  resolveCurrentRound,
} from '../../../../src/components/JobsOpening/Candidates/roundProgress';
import { roundStatusLabel } from '../../../../src/components/JobsOpening/Candidates/roundDisplay';

type Round = Parameters<typeof resolveCurrentRound>[0][number];

const round = (id: string, fields: Partial<Round> = {}): Round =>
  ({
    id,
    round_name: `Round ${id}`,
    stage_type: 'interview',
    status: 'to_be_scheduled',
    recruiter_advanced_at: null,
    due_at: null,
    ...fields,
  }) as Round;

const advanced = (id: string, fields: Partial<Round> = {}) =>
  round(id, { status: 'completed', recruiter_advanced_at: '2026-10-09T10:00:00Z', ...fields });

describe('isReadyForOverallScore', () => {
  it('is ready when the last round is completed and every earlier one was advanced', () => {
    const rounds = [advanced('1'), advanced('2'), round('3', { status: 'completed' })];

    expect(isReadyForOverallScore(rounds)).toBe(true);
    // The last round still counts as current, so nothing else changes.
    expect(resolveCurrentRound(rounds)?.id).toBe('3');
  });

  it('is ready when the last round was a no-show, cancelled or aborted', () => {
    for (const status of ['no_show', 'cancelled', 'aborted', 'interviewer_no_show']) {
      expect(isReadyForOverallScore([advanced('1'), round('2', { status })])).toBe(true);
    }
  });

  it('is not ready while the last round is still scheduled or in progress', () => {
    for (const status of ['scheduled', 'in_progress', 'to_be_scheduled', 'rescheduled']) {
      expect(isReadyForOverallScore([advanced('1'), round('2', { status })])).toBe(false);
    }
  });

  it('is not ready while an earlier round has not been advanced', () => {
    const rounds = [
      advanced('1'),
      round('2', { status: 'completed' }),
      round('3', { status: 'completed' }),
    ];

    expect(isReadyForOverallScore(rounds)).toBe(false);
  });

  it('is ready when the last round was skipped', () => {
    expect(isReadyForOverallScore([advanced('1'), round('2', { status: 'skipped' })])).toBe(true);
  });

  it('is ready once the candidate is selected and every round is closed', () => {
    expect(isReadyForOverallScore([advanced('1'), advanced('2')])).toBe(true);
  });

  it('ignores a resume row with no due date and a stale resume interview row', () => {
    const rounds = [
      round('r', { stage_type: 'resume', status: 'to_be_scheduled', due_at: null }),
      round('s', { round_name: 'Resume Review', status: 'pending' }),
      advanced('1'),
      round('2', { status: 'completed' }),
    ];

    expect(isReadyForOverallScore(rounds)).toBe(true);
  });

  it('is not ready for a candidate with no rounds', () => {
    expect(isReadyForOverallScore([])).toBe(false);
  });
});

describe('a failed round (interview-service could not dial the candidate)', () => {
  it('is a concluded round, so Advance is not blocked and it is not flagged as overdue', () => {
    const failed = round('1', {
      status: 'failed',
      scheduled_at: '2026-10-01T10:00:00Z',
    });
    expect(bucketForStatus('failed')).toBe('failed');
    expect(isRoundConcluded(failed)).toBe(true);
    expect(isOverdue(failed)).toBe(false);
  });

  it('reads as Failed', () => {
    expect(roundStatusLabel('failed')).toBe('Failed');
  });
});
