import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOpenJobDuplicate } from '../../src/hooks/useOpenJobDuplicate';
import type { TenantOffice } from '../../src/api/organization-service/Tenants/offices';

const query = vi.fn();
vi.mock('../../src/api/job-service/JobOpening/CheckDuplicateJob', () => ({
  useCheckDuplicateJobQuery: (...args: unknown[]) => query(...args),
}));

const TITLE = '11111111-1111-4111-8111-111111111111';
const DEPARTMENT = '22222222-2222-4222-8222-222222222222';
const OFFICE_ID = '33333333-3333-4333-8333-333333333333';

const office: TenantOffice = {
  office_id: OFFICE_ID,
  location_code: 'A-1S',
  address_line_1: '1 Apple Park',
  address_line_2: null,
  city: 'Cupertino',
  state: 'California',
  country: 'United States',
  zip_code: '95014',
  is_active: true,
};

const match = { job_id: 'j1', job_profile_code: 'JB-1042', location_ids: [OFFICE_ID] };

describe('useOpenJobDuplicate', () => {
  beforeEach(() => query.mockReset());

  it('says an open job is already there, naming it and the office', () => {
    query.mockReturnValue({ data: { matches: [match] } });
    const { result } = renderHook(() =>
      useOpenJobDuplicate({ jobTitleId: TITLE, departmentId: DEPARTMENT, offices: [office] })
    );
    expect(result.current).toContain('JB-1042');
    expect(result.current).toContain('Cupertino');
  });

  it('is empty when nothing matches', () => {
    query.mockReturnValue({ data: { matches: [] } });
    const { result } = renderHook(() =>
      useOpenJobDuplicate({ jobTitleId: TITLE, departmentId: DEPARTMENT, offices: [office] })
    );
    expect(result.current).toBeNull();
  });

  it('does not ask until a title, a department and an office are chosen', () => {
    query.mockReturnValue({ data: { matches: [match] } });
    const { result } = renderHook(() =>
      useOpenJobDuplicate({ jobTitleId: TITLE, offices: [office] })
    );
    expect(result.current).toBeNull();
    expect(query.mock.calls[0][1]).toEqual({ skip: true });
  });

  it('sends the department with the check', () => {
    query.mockReturnValue({ data: { matches: [] } });
    renderHook(() =>
      useOpenJobDuplicate({ jobTitleId: TITLE, departmentId: DEPARTMENT, offices: [office] })
    );
    expect(query.mock.calls[0][0]).toMatchObject({ departmentId: DEPARTMENT, jobTitleId: TITLE });
  });
});
