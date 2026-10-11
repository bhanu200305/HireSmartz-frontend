import { describe, it, expect } from 'vitest';
import { citiesText, jobCities } from '../../../src/shared/utils/jobCities';

describe('jobCities', () => {
  it('lists every city of a job at several locations', () => {
    expect(jobCities({ location_city: 'Pune', location_cities: ['Pune', 'Delhi'] })).toEqual([
      'Pune',
      'Delhi',
    ]);
  });

  it('falls back to the first city when the list is not sent', () => {
    expect(jobCities({ location_city: 'Pune' })).toEqual(['Pune']);
    expect(jobCities({ location_city: 'Pune', location_cities: [] })).toEqual(['Pune']);
  });

  it('is empty for a job with no location', () => {
    expect(jobCities({ location_city: null })).toEqual([]);
    expect(jobCities({})).toEqual([]);
  });
});

describe('citiesText', () => {
  it('joins the cities for a list column', () => {
    expect(citiesText({ location_cities: ['Pune', 'Delhi', 'Goa'] })).toBe('Pune, Delhi, Goa');
  });

  it('is empty without a location', () => {
    expect(citiesText({ location_city: null })).toBe('');
  });
});
