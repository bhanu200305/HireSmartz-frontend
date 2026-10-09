import { describe, it, expect } from 'vitest';
import {
  firstAvailableVariant,
  getRoundInfoSections,
  getSpecialKindFromRoundName,
  isUnavailableVariant,
} from '../../../src/shared/utils/roundInfoContent';

describe('getSpecialKindFromRoundName', () => {
  it('maps the seeded round names to their kind, ignoring case and spaces', () => {
    expect(getSpecialKindFromRoundName('Resume Review')).toBe('resume');
    expect(getSpecialKindFromRoundName('Intake Call')).toBe('intake_call');
    expect(getSpecialKindFromRoundName('Resume Screening')).toBe('resume');
    expect(getSpecialKindFromRoundName('Resume Round')).toBe('resume');
    expect(getSpecialKindFromRoundName('  intake call round ')).toBe('intake_call');
    expect(getSpecialKindFromRoundName('Identity Verification')).toBe('verification');
  });

  it('returns undefined for other or missing names', () => {
    expect(getSpecialKindFromRoundName('AI Video Interview')).toBeUndefined();
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

  it('titles the first section Round Overview for every round', () => {
    for (const options of [
      { specialKind: 'resume' },
      { specialKind: 'intake_call' },
      { specialKind: 'audio_screening' },
      { variants: ['soundwave'] },
      { specialKind: 'live_video' },
      { specialKind: 'in_person' },
    ]) {
      expect(getRoundInfoSections(options)[0].title).toBe('Round Overview');
    }
  });

  it('describes the Intake Call as an optional first conversation', () => {
    expect(textOf({ specialKind: 'intake_call' }, 'Round Overview')).toMatch(/optional first/i);
  });

  it('lists the focus areas of each interview round', () => {
    expect(textOf({ roundName: 'AI Audio Screening' }, 'Focus areas')).toBe(
      'Personality Traits, Qualifications, Company Fit, Career Goals.'
    );
    expect(textOf({ variants: ['avatar'] }, 'Focus areas')).toBe('Skills Match.');
    expect(textOf({ specialKind: 'live_video' }, 'Focus areas')).toBe(
      'Skills Match, Personality Traits, Qualifications, Company Fit, Career Goals.'
    );
    expect(textOf({ specialKind: 'in_person' }, 'Focus areas')).toBe(
      'Skills Match, Personality Traits, Qualifications, Company Fit, Career Goals.'
    );
  });

  it('does not mistake Live Video Interview for the AI video round', () => {
    expect(textOf({ roundName: 'Live Video Interview' }, 'Round Overview')).toMatch(
      /1 to 10 interviewers/i
    );
    expect(textOf({ specialKind: 'live_video' }, 'Round Overview')).toMatch(/live video/i);
    expect(textOf({ roundName: 'AI Video Interview' }, 'Focus areas')).toBe('Skills Match.');
  });

  it('describes the In-Person Interview as held at the office', () => {
    const what = textOf({ roundName: 'In-Person Interview' }, 'Round Overview');
    expect(what).toMatch(/office/i);
    expect(textOf({ specialKind: 'in_person' }, 'Round Overview')).toBe(what);
  });

  it('recognises the AI Agent Call by its name or special kind', () => {
    const focus = 'Personality Traits, Qualifications, Company Fit, Career Goals.';
    expect(textOf({ roundName: 'AI Agent Call' }, 'Focus areas')).toBe(focus);
    expect(textOf({ specialKind: 'audio_screening' }, 'Focus areas')).toBe(focus);
  });

  it("uses the Super Admin's description as the Round Overview and keeps the rest", () => {
    const sections = getRoundInfoSections({
      specialKind: 'live_video',
      description: '  Our own wording.  ',
    });

    expect(sections[0]).toEqual({ title: 'Round Overview', text: 'Our own wording.' });
    expect(sections.find((s) => s.title === 'Focus areas')).toBeTruthy();
  });

  it('falls back to the built-in overview when the description is empty', () => {
    const fallback = textOf({ specialKind: 'live_video' }, 'Round Overview');

    expect(textOf({ specialKind: 'live_video', description: '   ' }, 'Round Overview')).toBe(
      fallback
    );
    expect(textOf({ specialKind: 'live_video', description: null }, 'Round Overview')).toBe(
      fallback
    );
  });

  it('keeps each round to a couple of short sections', () => {
    expect(getRoundInfoSections({ roundName: 'Resume Round' }).map((s) => s.title)).toEqual([
      'Round Overview',
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
    expect(firstAvailableVariant(null)).toBeNull();
  });
});
