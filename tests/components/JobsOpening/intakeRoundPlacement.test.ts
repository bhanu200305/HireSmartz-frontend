import { describe, it, expect } from 'vitest';
import {
  INTAKE_POSITION_NUMBER,
  addableRoundTypes,
  hasQuestionRound,
  retypableRoundTypes,
  placeIntakeRound,
} from '../../../src/components/JobsOpening/intakeRoundPlacement';

type R = { id: string; sequence: number };
const isResume = (round: R) => round.id === 'resume';
const sequenceOf = (rounds: R[]) => rounds.map((r) => r.id);

describe('placeIntakeRound', () => {
  const existing: R[] = [
    { id: 'resume', sequence: 1 },
    { id: 'video', sequence: 2 },
  ];
  const intake: R = { id: 'intake', sequence: 3 };

  it('puts the Intake Call right after Resume as round 2', () => {
    const result = placeIntakeRound(existing, intake, 'after_resume', isResume);
    expect(sequenceOf(result)).toEqual(['resume', 'intake', 'video']);
    expect(result.map((r) => r.sequence)).toEqual([1, 2, 3]);
  });

  it('puts the Intake Call before Resume as round 1', () => {
    const result = placeIntakeRound(existing, intake, 'before_resume', isResume);
    expect(sequenceOf(result)).toEqual(['intake', 'resume', 'video']);
    expect(result.map((r) => r.sequence)).toEqual([1, 2, 3]);
  });

  it('orders by sequence, not by array position', () => {
    const shuffled: R[] = [
      { id: 'video', sequence: 2 },
      { id: 'resume', sequence: 1 },
    ];
    const result = placeIntakeRound(shuffled, intake, 'after_resume', isResume);
    expect(sequenceOf(result)).toEqual(['resume', 'intake', 'video']);
  });

  it('goes first when there is no Resume round', () => {
    const result = placeIntakeRound(
      [{ id: 'video', sequence: 1 }],
      intake,
      'after_resume',
      isResume
    );
    expect(sequenceOf(result)).toEqual(['intake', 'video']);
  });
});

describe('intake position numbers', () => {
  it('maps each position to its round number', () => {
    expect(INTAKE_POSITION_NUMBER).toEqual({ before_resume: 1, after_resume: 2 });
  });
});

const types = [
  { id: 'resume', special_kind: 'resume' },
  { id: 'intake', special_kind: 'intake_call' },
  { id: 'video', special_kind: null },
  { id: 'panel', special_kind: null },
];
const idsOf = (list: { id: string }[]) => list.map((t) => t.id);

describe('addableRoundTypes', () => {
  it('offers the Intake Call while the job has none, never Resume', () => {
    expect(idsOf(addableRoundTypes(types, false))).toEqual(['intake', 'video', 'panel']);
  });

  it('hides the Intake Call once the job has one', () => {
    expect(idsOf(addableRoundTypes(types, true))).toEqual(['video', 'panel']);
  });
});

describe('retypableRoundTypes', () => {
  const opts = (over: Partial<Parameters<typeof retypableRoundTypes>[1]> = {}) => ({
    currentTypeId: 'video',
    jobHasIntake: false,
    position: 2,
    ...over,
  });

  it('offers the Intake Call to a round that is round 1 or 2', () => {
    expect(idsOf(retypableRoundTypes(types, opts({ position: 1 })))).toContain('intake');
    expect(idsOf(retypableRoundTypes(types, opts({ position: 2 })))).toContain('intake');
  });

  it('does not offer it to a round further down, or when the job has one', () => {
    expect(idsOf(retypableRoundTypes(types, opts({ position: 3 })))).not.toContain('intake');
    expect(idsOf(retypableRoundTypes(types, opts({ jobHasIntake: true })))).not.toContain('intake');
  });

  it('keeps the round its own current type, even Resume or Intake Call', () => {
    expect(idsOf(retypableRoundTypes(types, opts({ currentTypeId: 'resume' })))).toContain(
      'resume'
    );
    expect(
      idsOf(retypableRoundTypes(types, opts({ currentTypeId: 'intake', jobHasIntake: true })))
    ).toContain('intake');
  });

  it('never offers Resume to another round', () => {
    expect(idsOf(retypableRoundTypes(types, opts()))).not.toContain('resume');
  });
});

describe('hasQuestionRound', () => {
  const roundTypes = [
    { id: 'resume', requires_duration: false },
    { id: 'intake', requires_duration: false },
    { id: 'video', requires_duration: true },
  ];
  const job = (...ids: string[]) =>
    ids.map((id, index) => ({ round: { id }, sequence: index + 1 }));

  it('is false for a job with only Resume or Intake Call', () => {
    expect(hasQuestionRound(job('resume'), roundTypes)).toBe(false);
    expect(hasQuestionRound(job('resume', 'intake'), roundTypes)).toBe(false);
  });

  it('is true once a round that takes questions is added', () => {
    expect(hasQuestionRound(job('resume', 'video'), roundTypes)).toBe(true);
  });
});
