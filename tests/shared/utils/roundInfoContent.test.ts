import { describe, it, expect } from 'vitest';
import {
  getRoundInfoSections,
  getSpecialKindFromRoundName,
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
  const titles = (sections: { title: string }[]) => sections.map((s) => s.title);

  it('tells the recruiter the candidate can pick resume first or the call first', () => {
    const sections = getRoundInfoSections({ specialKind: 'intake_call' });
    const apply = sections.find((s) => s.title === 'How candidates apply');
    expect(apply?.text).toMatch(/submit their resume first/i);
    expect(apply?.text).toMatch(/Intake Call first/i);
  });

  it('explains what, focus and why for the resume round', () => {
    expect(titles(getRoundInfoSections({ roundName: 'Resume Round' }))).toEqual([
      'What this round is',
      'What it looks at',
      'Why it is here',
    ]);
  });

  it('recognises AI video, panel and audio rounds from variant or name', () => {
    expect(getRoundInfoSections({ variants: ['avatar'] })[0].text).toMatch(/video interview/i);
    expect(getRoundInfoSections({ variants: ['online'] })[0].text).toMatch(/live interview/i);
    expect(getRoundInfoSections({ roundName: 'AI Audio Screening' })[0].text).toMatch(/audio/i);
  });

  it('gives nothing for an unknown round', () => {
    expect(getRoundInfoSections({ roundName: 'Something New' })).toEqual([]);
  });
});
