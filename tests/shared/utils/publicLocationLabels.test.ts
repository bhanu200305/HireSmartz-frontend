import { describe, it, expect } from 'vitest';
import { publicLocationLabels } from '../../../src/shared/utils/publicJobDisplay';

const loc = (address_line_1: string, city: string) => ({
  address_line_1,
  city,
  state: 'California',
  country: 'United States',
});

describe('publicLocationLabels', () => {
  it('keeps the plain label when every location is in a different city', () => {
    expect(publicLocationLabels([loc('1 A Road', 'Cupertino'), loc('2 B Road', 'Austin')])).toEqual(
      ['Cupertino, California, United States', 'Austin, California, United States']
    );
  });

  it('adds the address line when two locations share a city', () => {
    expect(
      publicLocationLabels([loc('Apple Park', 'Cupertino'), loc('Infinite Loop', 'Cupertino')])
    ).toEqual([
      'Cupertino, California, United States - Apple Park',
      'Cupertino, California, United States - Infinite Loop',
    ]);
  });
});
