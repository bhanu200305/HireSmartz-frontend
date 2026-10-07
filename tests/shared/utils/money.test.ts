import { describe, it, expect } from 'vitest';
import { formatMoney, toMoneyOrNull, toMoneyString } from '../../../src/shared/utils/money';
import { formatSalary } from '../../../src/shared/utils/publicJobDisplay';

describe('toMoneyString', () => {
  it('keeps cents on a fractional amount', () => {
    expect(toMoneyString(16.9)).toBe('16.90');
    expect(toMoneyString('21.45')).toBe('21.45');
  });

  it('leaves a whole amount whole', () => {
    expect(toMoneyString(85000)).toBe('85000');
  });
});

describe('toMoneyOrNull', () => {
  it('does not round what was typed', () => {
    expect(toMoneyOrNull('16.90')).toBe(16.9);
    expect(toMoneyOrNull('85000.50')).toBe(85000.5);
  });

  it('returns null for blank or invalid input', () => {
    expect(toMoneyOrNull('')).toBeNull();
    expect(toMoneyOrNull(undefined)).toBeNull();
    expect(toMoneyOrNull('abc')).toBeNull();
  });
});

describe('formatMoney', () => {
  it('shows cents only when there are some', () => {
    expect(formatMoney(16.9)).toBe('$16.90');
    expect(formatMoney(85000)).toBe('$85,000');
  });
});

describe('public salary line', () => {
  it('shows an hourly rate with its cents', () => {
    expect(formatSalary(null, null, 16.9, 21.45)).toBe('$16.90 - $21.45/hr');
  });

  it('abbreviates only an exact thousand', () => {
    expect(formatSalary(85000, 95000, null, null)).toBe('$85K - $95K/year');
    expect(formatSalary(85500, 95250, null, null)).toBe('$85,500 - $95,250/year');
  });
});
