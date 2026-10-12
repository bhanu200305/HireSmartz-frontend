import { describe, it, expect } from 'vitest';
import { buildSaveJobDetailsPayload } from '../../../src/api/job-service/buildSaveJobDetailsPayload';
import {
  mapDetailsToJobDetailsState,
  mapJobOpeningToLegacyView,
} from '../../../src/api/job-service/mapJobOpeningToLegacyView';
import type { TenantOffice } from '../../../src/api/organization-service/Tenants/offices';

const PUNE = '11111111-1111-1111-1111-111111111111';
const DELHI = '22222222-2222-2222-2222-222222222222';
const GOA = '33333333-3333-3333-3333-333333333333';

const office = (id: string, city: string, overrides: Partial<TenantOffice> = {}): TenantOffice => ({
  office_id: id,
  location_code: `${city}-HQ`,
  address_line_1: `1 ${city} Road`,
  address_line_2: null,
  city,
  state: 'State',
  country: 'India',
  zip_code: '400001',
  is_active: true,
  ...overrides,
});

const offices = [office(PUNE, 'Pune'), office(DELHI, 'Delhi'), office(GOA, 'Goa')];

describe('saving a job at several offices', () => {
  it('sends one location row per selected office', () => {
    const result = buildSaveJobDetailsPayload({
      data: { officeLocation: [PUNE, DELHI] as unknown as number[] },
      offices,
    });

    expect(result.locations?.map((l) => l.job_location_id)).toEqual([PUNE, DELHI]);
    expect(result.locations?.map((l) => l.city)).toEqual(['Pune', 'Delhi']);
  });

  it('keeps the order the offices were picked in', () => {
    const result = buildSaveJobDetailsPayload({
      data: { officeLocation: [GOA, PUNE] as unknown as number[] },
      offices,
    });

    expect(result.locations?.map((l) => l.job_location_id)).toEqual([GOA, PUNE]);
  });

  it('sends an office once even if it is listed twice', () => {
    const result = buildSaveJobDetailsPayload({
      data: { officeLocation: [PUNE, PUNE] as unknown as number[] },
      offices,
    });

    expect(result.locations).toHaveLength(1);
  });

  it('sends just the id for an office the list does not hold', () => {
    const result = buildSaveJobDetailsPayload({
      data: { officeLocation: [DELHI] as unknown as number[] },
      offices: [office(PUNE, 'Pune')],
    });

    expect(result.locations).toEqual([{ job_location_id: DELHI }]);
  });

  it('sends no locations when none is selected', () => {
    const result = buildSaveJobDetailsPayload({ data: { officeLocation: [] }, offices });

    expect(result.locations).toEqual([]);
  });

  it('still reads the older single location id', () => {
    const result = buildSaveJobDetailsPayload({ data: { locationId: PUNE }, offices });

    expect(result.locations?.map((l) => l.job_location_id)).toEqual([PUNE]);
  });
});

describe('reading a job at several offices back', () => {
  const location = (id: string, city: string) => ({
    job_location_id: id,
    address_line_1: `1 ${city} Road`,
    address_line_2: null,
    city,
    state: 'State',
    country: 'India',
    zip: '400001',
    location_code: `${city}-HQ`,
  });

  it('fills the form with every office', () => {
    const state = mapDetailsToJobDetailsState({
      job_profile_code: 'JP-1',
      locations: [location(PUNE, 'Pune'), location(DELHI, 'Delhi')],
    } as never);

    expect(state.officeLocation).toEqual([PUNE, DELHI]);
  });

  it('lists every office on the view, each with its own id', () => {
    const view = mapJobOpeningToLegacyView({
      org_job_opening_id: 'job-1',
      is_draft: false,
      is_closed: false,
      details: { locations: [location(PUNE, 'Pune'), location(DELHI, 'Delhi')], skills: [] },
    } as never);

    expect(view.officeLocation.map((item) => item.id)).toEqual([PUNE, DELHI]);
    expect(view.officeLocation.map((item) => item.city.name)).toEqual(['Pune', 'Delhi']);
  });

  it('lists none for a job without a location', () => {
    const view = mapJobOpeningToLegacyView({
      org_job_opening_id: 'job-1',
      is_draft: true,
      is_closed: false,
      details: { locations: [], skills: [] },
    } as never);

    expect(view.officeLocation).toEqual([]);
  });
});
