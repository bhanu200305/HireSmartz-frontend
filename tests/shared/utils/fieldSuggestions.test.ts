import { describe, expect, it } from 'vitest';
import {
  fieldErrorMessages,
  planFieldFills,
  skillLabelEntries,
  unresolvedFieldNames,
} from '../../../src/shared/utils/fieldSuggestions';

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

describe('fieldErrorMessages', () => {
  it('lists a message for each text the AI wrote but could not fill', () => {
    expect(
      fieldErrorMessages({
        field_errors: {
          responsibilities:
            'Responsibilities is longer than 2,000 characters, so it was not filled.',
          benefits: 'Benefits is longer than 2,000 characters, so it was not filled.',
        },
      })
    ).toEqual([
      'Responsibilities is longer than 2,000 characters, so it was not filled.',
      'Benefits is longer than 2,000 characters, so it was not filled.',
    ]);
  });

  it('is empty when nothing was dropped', () => {
    expect(fieldErrorMessages({ field_errors: {} })).toEqual([]);
    expect(fieldErrorMessages({})).toEqual([]);
  });
});

describe('planFieldFills texts and skills', () => {
  const blank = {
    responsibilities: '',
    otherRequirements: '',
    benefits: '',
    mandatorySkills: [],
    optionalSkills: [],
  };

  it('fills the three texts when they are blank', () => {
    const plan = planFieldFills(
      { responsibilities: '- Greet', other_requirements: '- Diploma', benefits: '- PTO' },
      blank
    );
    expect(plan.fills).toEqual([
      { field: 'responsibilities', value: '- Greet', label: 'Responsibilities' },
      { field: 'otherRequirements', value: '- Diploma', label: 'Other requirements' },
      { field: 'benefits', value: '- PTO', label: 'Benefits' },
    ]);
  });

  it('never replaces a text the user already typed', () => {
    const plan = planFieldFills(
      { responsibilities: '- Greet', benefits: '- PTO' },
      { ...blank, responsibilities: 'my own text' }
    );
    expect(fieldsOf(plan)).toEqual(['benefits']);
  });

  it('skips a text the AI left out', () => {
    expect(fieldsOf(planFieldFills({ responsibilities: null }, blank))).toEqual([]);
  });

  it('fills required and optional skills when those fields are blank', () => {
    const plan = planFieldFills(
      { required_skill_ids: ['a', 'b'], optional_skill_ids: ['c'] },
      blank
    );
    expect(plan.fills).toEqual([
      { field: 'mandatorySkills', value: ['a', 'b'], label: 'Required skills' },
      { field: 'optionalSkills', value: ['c'], label: 'Optional skills' },
    ]);
  });

  it('leaves a skills field alone when it already has skills', () => {
    const plan = planFieldFills(
      { required_skill_ids: ['a'], optional_skill_ids: ['c'] },
      { ...blank, mandatorySkills: ['x'] }
    );
    expect(fieldsOf(plan)).toEqual(['optionalSkills']);
  });

  it('never adds a skill that is already picked on either list', () => {
    const plan = planFieldFills(
      { required_skill_ids: ['a', 'x'], optional_skill_ids: ['y', 'c'] },
      { ...blank, optionalSkills: ['x'], mandatorySkills: [] }
    );
    expect(plan.fills).toEqual([
      { field: 'mandatorySkills', value: ['a'], label: 'Required skills' },
    ]);
  });
});

describe('skillLabelEntries', () => {
  it('pairs each id with its label and skips ids with none', () => {
    expect(skillLabelEntries(['a', 'b', 'c'], { a: 'Python', c: 'SQL' })).toEqual([
      { id: 'a', name: 'Python' },
      { id: 'c', name: 'SQL' },
    ]);
  });

  it('gives nothing when there are no labels', () => {
    expect(skillLabelEntries(['a'], undefined)).toEqual([]);
  });
});

describe('unresolvedFieldNames', () => {
  it('keeps the named fields and leaves out the skills list', () => {
    expect(
      unresolvedFieldNames({
        unresolved: {
          department: 'Administration',
          job_title: 'Clerk',
          skills: ['Basket Weaving'],
        },
      })
    ).toEqual({ department: 'Administration', job_title: 'Clerk' });
  });

  it('is empty when nothing was unresolved', () => {
    expect(unresolvedFieldNames({})).toEqual({});
  });
});
