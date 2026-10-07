import { describe, it, expect } from 'vitest';
import { filterSearchCategories } from '../../../src/shared/utils/globalSearchCategories';

const categories = {
  JOB: [
    { uiName: 'Job Title', entityField: 'title', dbColumn: 'job_title' },
    { uiName: 'Department', entityField: 'department', dbColumn: 'department' },
    { uiName: 'Job Code', entityField: 'code', dbColumn: 'job_profile_code' },
  ],
  USER: [{ uiName: 'Name', entityField: 'name', dbColumn: 'name' }],
};

describe('filterSearchCategories', () => {
  it('hides Department under Job Openings for company users', () => {
    const result = filterSearchCategories(categories, false)!;
    expect(result.JOB.map((i) => i.uiName)).toEqual(['Job Title', 'Job Code']);
  });

  it('keeps Department for platform (Super Admin) users', () => {
    expect(filterSearchCategories(categories, true)).toBe(categories);
  });

  it('leaves every other category untouched', () => {
    expect(filterSearchCategories(categories, false)!.USER).toEqual(categories.USER);
  });

  it('passes undefined through while categories are loading', () => {
    expect(filterSearchCategories(undefined, false)).toBeUndefined();
  });
});
