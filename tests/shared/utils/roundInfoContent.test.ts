import { describe, it, expect } from 'vitest';
import {
  firstAvailableVariant,
  getRoundInfoSections,
  getSpecialKindFromRoundName,
  isUnavailableVariant,
} from '../../../src/shared/utils/roundInfoContent';

describe('getSpecialKindFromRoundName', () => {
  it('maps the seeded round names to their kind, ignoring case and spaces', () => {
    expect(getSpecialKindFromRoundName('Resume Round')).toBe('resume');
    expect(getSpecialKindFromRoundName('  intake call round ')).toBe('intake_call');
    expect(getSpecialKindFromRoundName('Identity Verification')).toBe('verification');
  });

  it('returns undefined for other or missing names', () => {
    expect(getSpecialKindFromRoundName('AI Video Round')).toBeUndefined();
    expect(getSpecialKindFromRoundName('')).toBeUndefined();
    expect(getSpecialKindFromRoundName(null)).toBeUndefined();
  });
});

describe('getRoundInfoSections', () => {
  const textOf = (options: Parameters<typeof getRoundInfoSections>[0], title: string) =>
    getRoundInfoSections(options).find((s) => s.title === title)?.text ?? '';

  it('tells the recruiter the candidate can pick resume first or the call first', () => {
    const choice = textOf({ specialKind: 'intake_call' }, 'How candidates apply');
    expect(choice).toMatch(/submit their resume first/i);
    expect(choice).toMatch(/take the Intake Call first/i);
  });

  it('describes the Intake Call as a consistency check, not resume building', () => {
    const what = textOf({ specialKind: 'intake_call' }, 'What this round is');
    expect(what).toMatch(/against their resume/i);
    expect(what).not.toMatch(/fill|build/i);
  });

  it('lists the focus areas of each interview round', () => {
    expect(textOf({ roundName: 'AI Audio Screening' }, 'Focus areas')).toBe(
      'Personality Traits, Qualifications, Company Fit, Career Goals.'
    );
    expect(textOf({ variants: ['avatar'] }, 'Focus areas')).toBe('Skills Match.');
    expect(textOf({ variants: ['online'] }, 'Focus areas')).toBe(
      'Skills Match, Personality Traits, Qualifications, Company Fit, Career Goals.'
    );
  });

  it('keeps each round to a couple of short sections', () => {
    expect(getRoundInfoSections({ roundName: 'Resume Round' }).map((s) => s.title)).toEqual([
      'What this round is',
      'Focus areas',
    ]);
  });

  it('gives nothing for an unknown round', () => {
    expect(getRoundInfoSections({ roundName: 'Something New' })).toEqual([]);
  });
});

describe('variant helpers', () => {
  it('greys out Avatar and defaults to the first available variant (Soundwave)', () => {
    expect(isUnavailableVariant('avatar')).toBe(true);
    expect(isUnavailableVariant('soundwave')).toBe(false);
    expect(firstAvailableVariant(['avatar', 'soundwave'])).toBe('soundwave');
    expect(firstAvailableVariant(['soundwave', 'avatar'])).toBe('soundwave');
    expect(firstAvailableVariant(['online', 'offline'])).toBe('online');
    expect(firstAvailableVariant(null)).toBeNull();
  });
});
