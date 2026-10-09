import { describe, it, expect } from 'vitest';
import {
  toJobTypeRow,
  transformJobTypesResponse,
} from '../../../../src/api/job-service/JobOpening/catalogs';

describe('transformJobTypesResponse — is_active/is_deleted', () => {
  it('keeps is_active and is_deleted from the raw response', () => {
    const result = transformJobTypesResponse({
      job_types: [
        {
          id: '1',
          job_type_name: 'Full-Time',
          job_type_description: null,
          is_active: false,
          is_deleted: false,
        },
      ],
    });

    expect(result).toEqual([
      {
        id: '1',
        job_type_name: 'Full-Time',
        job_type_description: null,
        is_active: false,
        is_deleted: false,
      },
    ]);
  });

  it('falls back to job_type_id for the platform catalogue shape', () => {
    const result = transformJobTypesResponse({
      // No `id` in real master responses - cast past the type.
      job_types: [{ job_type_id: 'master-1', job_type_name: 'Contract' }] as unknown as Parameters<
        typeof transformJobTypesResponse
      >[0]['job_types'],
    });

    expect(result[0].id).toBe('master-1');
  });

  it('returns an empty array when job_types is missing', () => {
    expect(transformJobTypesResponse({})).toEqual([]);
  });
});

describe('toJobTypeRow', () => {
  it('keeps is_active so a deactivated type reads as off in the table', () => {
    const row = toJobTypeRow({
      id: '1',
      job_type_name: 'Contract',
      is_active: false,
    });

    expect(row.is_active).toBe(false);
  });
});
