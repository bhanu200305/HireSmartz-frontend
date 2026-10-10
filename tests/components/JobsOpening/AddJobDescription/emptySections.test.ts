import { describe, it, expect } from 'vitest';
import {
  emptySections,
  INTAKE_SECTION,
} from '../../../../src/components/JobsOpening/AddJobDescription/emptySections';

const rounds = [
  { round_instance_id: 'r1', round_name: 'AI Video Interview' },
  { round_instance_id: 'r2', round_name: 'In-Person Interview' },
];

describe('emptySections', () => {
  it('is empty when every round has a question', () => {
    expect(emptySections(rounds, { r1: 3, r2: 1 }, null)).toEqual([]);
  });

  it('lists each round with no question, in tab order', () => {
    expect(emptySections(rounds, { r1: 2 }, null)).toEqual([
      { key: 'r2', name: 'In-Person Interview' },
    ]);
    expect(emptySections(rounds, {}, null).map((s) => s.key)).toEqual(['r1', 'r2']);
  });

  it('puts the Intake Call first when it has no question', () => {
    expect(emptySections(rounds, { r1: 1, r2: 1 }, { count: 0 })).toEqual([INTAKE_SECTION]);
    expect(emptySections(rounds, {}, { count: 0 }).map((s) => s.key)).toEqual([
      'intake',
      'r1',
      'r2',
    ]);
  });

  it('ignores the Intake Call when the job has none or it has questions', () => {
    expect(emptySections(rounds, { r1: 1, r2: 1 }, { count: 4 })).toEqual([]);
    expect(emptySections(rounds, { r1: 1, r2: 1 }, null)).toEqual([]);
  });

  it('treats a round with a zero count as empty', () => {
    expect(emptySections(rounds, { r1: 0, r2: 5 }, null).map((s) => s.key)).toEqual(['r1']);
  });

  it('handles a job with no rounds', () => {
    expect(emptySections([], {}, null)).toEqual([]);
  });
});
