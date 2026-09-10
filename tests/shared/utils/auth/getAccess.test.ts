import { describe, expect, it } from 'vitest';
import { isAssignedToJob } from '../../../../src/shared/utils/auth/getAccess';

const recruiterRole = { name: 'recruiter', type: 'organization' };
const hiringManagerRole = { name: 'hiring_manager', type: 'organization' };
const companyAdminRole = { name: 'company_admin', type: 'organization' };
const superAdminRole = { name: 'super_admin', type: 'owner' };

const userId = 'user-1';
const otherUserId = 'user-2';

describe('isAssignedToJob', () => {
  it('allows a recruiter listed in recruiterIds', () => {
    const job = { hiringManagerIds: [], recruiterIds: [userId] };
    expect(isAssignedToJob(job, userId, recruiterRole)).toBe(true);
  });

  it('allows a hiring manager listed in hiringManagerIds', () => {
    const job = { hiringManagerIds: [userId], recruiterIds: [] };
    expect(isAssignedToJob(job, userId, hiringManagerRole)).toBe(true);
  });

  it('allows the job creator even when not in either assignment list', () => {
    const job = { hiringManagerIds: [], recruiterIds: [], createdById: userId };
    expect(isAssignedToJob(job, userId, recruiterRole)).toBe(true);
  });

  it('rejects a recruiter/hiring manager not assigned to and not the creator of the job', () => {
    const job = {
      hiringManagerIds: [otherUserId],
      recruiterIds: [otherUserId],
      createdById: otherUserId,
    };
    expect(isAssignedToJob(job, userId, recruiterRole)).toBe(false);
    expect(isAssignedToJob(job, userId, hiringManagerRole)).toBe(false);
  });

  it('rejects when there is no current user id at all', () => {
    const job = { hiringManagerIds: [], recruiterIds: [] };
    expect(isAssignedToJob(job, null, recruiterRole)).toBe(false);
    expect(isAssignedToJob(job, undefined, recruiterRole)).toBe(false);
  });

  it('exempts company_admin regardless of assignment', () => {
    const job = { hiringManagerIds: [], recruiterIds: [], createdById: otherUserId };
    expect(isAssignedToJob(job, userId, companyAdminRole)).toBe(true);
  });

  it('exempts an owner-type (platform) role regardless of assignment', () => {
    const job = { hiringManagerIds: [], recruiterIds: [], createdById: otherUserId };
    expect(isAssignedToJob(job, userId, superAdminRole)).toBe(true);
  });
});
