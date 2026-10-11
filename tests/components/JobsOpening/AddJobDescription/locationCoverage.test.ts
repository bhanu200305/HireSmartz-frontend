import { describe, it, expect } from 'vitest';
import {
  coverageIssue,
  coverageMessage,
  managersWithoutAnyOffice,
  uncoveredOffices,
} from '../../../../src/components/JobsOpening/AddJobDescription/locationCoverage';

const coverage = {
  a: ['m1', 'both'],
  b: ['m2', 'both'],
};

describe('uncoveredOffices', () => {
  it('is empty when each office has a manager who holds the role there', () => {
    expect(uncoveredOffices(['a', 'b'], ['m1', 'm2'], coverage)).toEqual([]);
  });

  it('lists the office no chosen manager covers', () => {
    expect(uncoveredOffices(['a', 'b'], ['m1'], coverage)).toEqual(['b']);
  });

  it('lets one manager cover several offices', () => {
    expect(uncoveredOffices(['a', 'b'], ['both'], coverage)).toEqual([]);
  });

  it('lists every office when the chosen managers cover none of them', () => {
    expect(uncoveredOffices(['a', 'b'], ['stranger'], coverage)).toEqual(['a', 'b']);
  });

  it('asks for nothing until a manager is chosen', () => {
    expect(uncoveredOffices(['a', 'b'], [], coverage)).toEqual([]);
  });

  it('treats an office with no known coverage as uncovered', () => {
    expect(uncoveredOffices(['c'], ['m1'], coverage)).toEqual(['c']);
  });

  it('compares ids as text, so a number and a string match', () => {
    expect(uncoveredOffices([1], [7], { '1': ['7'] })).toEqual([]);
  });

  it('has nothing to check without offices', () => {
    expect(uncoveredOffices([], ['m1'], coverage)).toEqual([]);
  });
});

describe('coverageMessage', () => {
  it('names one office', () => {
    expect(coverageMessage(['Pune'])).toBe('Choose at least one hiring manager for Pune.');
  });

  it('joins two offices with "and"', () => {
    expect(coverageMessage(['Pune', 'Delhi'])).toBe(
      'Choose at least one hiring manager for Pune and Delhi.'
    );
  });

  it('joins three or more with commas and a final "and"', () => {
    expect(coverageMessage(['Pune', 'Delhi', 'Goa'])).toBe(
      'Choose at least one hiring manager for Pune, Delhi and Goa.'
    );
  });
});

describe('managersWithoutAnyOffice', () => {
  it('finds a chosen manager who holds the role at none of the selected offices', () => {
    expect(managersWithoutAnyOffice(['a', 'b'], ['m1', 'gone'], coverage)).toEqual(['gone']);
  });

  it('is empty when every chosen manager works at one of the offices', () => {
    expect(managersWithoutAnyOffice(['a'], ['m1', 'both'], coverage)).toEqual([]);
  });

  it('flags everyone once the offices they work at are deselected', () => {
    expect(managersWithoutAnyOffice(['b'], ['m1'], coverage)).toEqual(['m1']);
  });
});

describe('coverageIssue', () => {
  const names: Record<string, string> = { a: 'Pune', b: 'Delhi' };
  const nameOf = (id: string) => names[id] ?? id;

  it('is null when every office has a manager', () => {
    expect(coverageIssue(['a', 'b'], ['m1', 'm2'], coverage, nameOf)).toBeNull();
  });

  it('names the office that has none', () => {
    expect(coverageIssue(['a', 'b'], ['m1'], coverage, nameOf)).toBe(
      'Choose at least one hiring manager for Delhi.'
    );
  });

  it('names every uncovered office', () => {
    expect(coverageIssue(['a', 'b'], ['stranger'], coverage, nameOf)).toBe(
      'Choose at least one hiring manager for Pune and Delhi.'
    );
  });

  it('is null until a manager is chosen', () => {
    expect(coverageIssue(['a', 'b'], [], coverage, nameOf)).toBeNull();
  });
});
