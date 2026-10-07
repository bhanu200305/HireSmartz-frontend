import { describe, expect, it } from 'vitest';
import { planFieldFills } from '../../../src/shared/utils/fieldSuggestions';

const fieldsOf = (plan: ReturnType<typeof planFieldFills>) => plan.fills.map((f) => f.field);

describe('planFieldFills', () => {
  it('fills blank fields from the suggestions', () => {
    const plan = planFieldFills(
      {
        department_id: 'd1',
        job_title_id: 't1',
        job_type_id: 'jt',
        vacancies: 2,
        min_experience: 3,
      },
      { department: [], jobTitle: [], jobType: [], openings: null, minExperience: null }
    );
    expect(fieldsOf(plan)).toEqual([
      'department',
      'jobTitle',
      'jobType',
      'openings',
      'minExperience',
    ]);
    expect(plan.labels).toContain('Vacancies');
  });

  it('never overwrites a field the user already filled', () => {
    const plan = planFieldFills(
      { job_type_id: 'new', vacancies: 9, min_experience: 7 },
      { jobType: ['old'], openings: 2, minExperience: 1 }
    );
    expect(plan.fills).toEqual([]);
    expect(plan.labels).toEqual([]);
  });

  it('skips a title when there is no department for it', () => {
    const plan = planFieldFills({ job_title_id: 't1' }, { department: [], jobTitle: [] });
    expect(fieldsOf(plan)).toEqual([]);
  });

  it('puts an annual salary in the exempt fields and marks the type', () => {
    const plan = planFieldFills(
      { salary_min: 90000, salary_max: 130000, salary_period: 'annual' },
      { exemptMinSalary: null, exemptMaxSalary: null, exemptionStatus: [] }
    );
    expect(plan.fills.map((f) => [f.field, f.value])).toEqual([
      ['exemptMinSalary', '90000'],
      ['exemptMaxSalary', '130000'],
      ['exemptionStatus', ['true']],
    ]);
  });

  it('puts an hourly salary in the non-exempt fields', () => {
    const plan = planFieldFills(
      { salary_min: 18, salary_period: 'hourly' },
      { nonExemptMinSalary: null, exemptionStatus: ['true'] }
    );
    expect(plan.fills.map((f) => f.field)).toEqual(['nonExemptMinSalary', 'exemptionStatus']);
    expect(plan.fills[1].value).toEqual(['true', 'false']);
  });

  it('keeps the cents of a suggested hourly rate', () => {
    const plan = planFieldFills(
      { salary_min: 16.9, salary_max: 21.45, salary_period: 'hourly' },
      { nonExemptMinSalary: null, nonExemptMaxSalary: null, exemptionStatus: [] }
    );
    expect(plan.fills.slice(0, 2).map((f) => [f.field, f.value])).toEqual([
      ['nonExemptMinSalary', '16.90'],
      ['nonExemptMaxSalary', '21.45'],
    ]);
  });

  it('suggests the location only while none is picked', () => {
    expect(planFieldFills({ office_id: 'o1' }, { officeLocation: [] }).officeId).toBe('o1');
    expect(
      planFieldFills({ office_id: 'o1' }, { officeLocation: ['o2'] }).officeId
    ).toBeUndefined();
  });
});
