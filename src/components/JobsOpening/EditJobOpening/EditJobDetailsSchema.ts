import { z } from 'zod';

const catalogId = z.union([z.string().min(1), z.number()]);

export const editJobDetailsSchema = z
  .object({
    jobProfileCode: z.string().min(1, 'Job Profile Code is required.'),
    jobTitle: z.array(catalogId),
    department: z.array(catalogId).min(1, 'Department is required.'),
    officeLocation: z.array(catalogId).min(1, 'Location is required.'),
    jobType: z.array(catalogId).min(1, 'Job Type is required.'),
    // Not in PUBLISH_CHECK_LABELS' mandatory-fields list, so optional —
    // same convention as shift below.
    jobMode: z.array(catalogId).optional(),
    shift: z.array(catalogId).optional(),
    isMultilingual: z.boolean().optional(),
    useCultureIntro: z.boolean().optional(),
    openings: z.preprocess(
      (val) => (val === '' ? null : val),
      z
        .number({ invalid_type_error: 'Enter a valid number of opening(s).' })
        .int('Must be a positive whole number.')
        .min(1, 'Opening(s) must be at least 1.')
        .max(99, 'Maximum 99 allowed.')
        .nullable()
        .refine((val) => !!val, {
          message: 'Opening(s) are required.',
        })
    ),
    exemptionStatus: z.array(z.string()).min(1, 'Exemption Status is required.'),
    // Range-completeness rules live in the superRefine below.
    exemptMinSalary: z.preprocess(
      (val) => (val === '' || val === undefined || val === null ? null : val),
      z
        .string()
        .nullable()
        .refine((val) => val === null || (!isNaN(Number(val)) && Number(val) >= 0), {
          message: 'Enter a valid minimum salary.',
        })
    ),
    exemptMaxSalary: z.preprocess(
      (val) => (val === '' || val === undefined || val === null ? null : val),
      z
        .string()
        .nullable()
        .refine((val) => val === null || (!isNaN(Number(val)) && Number(val) >= 0), {
          message: 'Enter a valid maximum salary.',
        })
    ),
    nonExemptMinSalary: z.preprocess(
      (val) => (val === '' || val === undefined || val === null ? null : val),
      z
        .string()
        .nullable()
        .refine((val) => val === null || (!isNaN(Number(val)) && Number(val) >= 0), {
          message: 'Enter a valid minimum salary.',
        })
    ),
    nonExemptMaxSalary: z.preprocess(
      (val) => (val === '' || val === undefined || val === null ? null : val),
      z
        .string()
        .nullable()
        .refine((val) => val === null || (!isNaN(Number(val)) && Number(val) >= 0), {
          message: 'Enter a valid maximum salary.',
        })
    ),
    referralBonus: z.preprocess(
      (val) => {
        if (val === '' || val === null || val === undefined) {
          return '';
        }
        const num = Number(val);
        return isNaN(num) ? val : num;
      },
      z
        .union([z.number().min(0, 'Enter a valid referral bonus amount.'), z.string().length(0)])
        .nullable()
        .optional()
    ),
    minExperience: z.preprocess(
      (val) => {
        if (val === '' || val === undefined || val === null || isNaN(Number(val))) {
          return null;
        }
        return Number(val);
      },
      z
        .number({
          invalid_type_error: 'Enter a valid minimum experience.',
          required_error: 'Minimum experience is required.',
        })
        .min(0, 'Enter a valid minimum experience.')
        .max(50, 'Minimum experience cannot exceed 50.')
        .nullable()
    ),
    maxExperience: z
      .preprocess((val) => {
        if (val === '' || val === undefined || val === null || isNaN(Number(val))) {
          return null;
        }
        return Number(val);
      }, z.number().min(0, 'Enter a valid maximum experience.').max(50, 'Maximum experience cannot exceed 50.').nullable())
      .optional(),
    openDate: z.string().nonempty('Open date is required.'),
    closeDate: z.string().optional(),
    hiringManagers: z.array(catalogId).min(1, 'Hiring manager is required.'),
    recruiters: z.array(catalogId).optional(),
    state: z.string().nonempty('State is required.'),
    country: z.string().nonempty('Country is required.'),
    educationPreference: z.array(catalogId).min(1, 'Education preference is required.'),
    languages: z.array(catalogId).optional(),
    mandatorySkills: z
      .array(catalogId)
      .min(1, 'At least one required skill is required.')
      .max(30, 'You can select up to 30 required skills.'),
    optionalSkills: z
      .array(catalogId)
      .max(30, 'You can select up to 30 optional skills.')
      .optional(),
    responsibilities: z
      .string()
      .nonempty('Responsibilities is required.')
      .refine((val) => val.length <= 2000, {
        message: 'Responsibilities cannot exceed 2000 characters.',
      }),
    otherRequirements: z
      .string()
      .transform((val) => {
        if (!val) return val;
        let cleaned = val.trim();
        cleaned = cleaned.replace(/ {2,}/g, ' ');
        cleaned = cleaned.replace(/[^\x20-\x7E\n\r\t]/g, '');
        return cleaned;
      })
      .refine(
        (val) => {
          if (!val) return true;
          return val.length <= 2000;
        },
        { message: 'Other requirements cannot exceed 2000 characters.' }
      )
      .optional(),
    benefits: z
      .string()
      .transform((val) => {
        if (!val) return val;
        let cleaned = val.trim();
        cleaned = cleaned.replace(/ {2,}/g, ' ');
        cleaned = cleaned.replace(/[^\x20-\x7E\n\r\t]/g, '');
        return cleaned;
      })
      .refine(
        (val) => {
          if (!val) return true;
          return val.length <= 2000;
        },
        { message: 'Benefits cannot exceed 2000 characters.' }
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    const exemptMin = data.exemptMinSalary ? Number(data.exemptMinSalary) : null;
    const exemptMax = data.exemptMaxSalary ? Number(data.exemptMaxSalary) : null;
    const nonExemptMin = data.nonExemptMinSalary ? Number(data.nonExemptMinSalary) : null;
    const nonExemptMax = data.nonExemptMaxSalary ? Number(data.nonExemptMaxSalary) : null;

    const minExp = data.minExperience;
    const maxExp = data.maxExperience;

    if (data.minExperience === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum experience is required.',
        path: ['minExperience'],
      });
    }
    if (minExp !== null && maxExp != null) {
      if (maxExp < minExp) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Maximum experience cannot be less than minimum experience.',
          path: ['maxExperience'],
        });
      }
    }

    const wantsExempt = (data.exemptionStatus ?? []).includes('true');
    const wantsNonExempt = (data.exemptionStatus ?? []).includes('false');

    if (wantsExempt && exemptMin === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum salary is required.',
        path: ['exemptMinSalary'],
      });
    }
    if (wantsExempt && exemptMax === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Maximum salary is required.',
        path: ['exemptMaxSalary'],
      });
    }
    if (wantsNonExempt && nonExemptMin === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum salary is required.',
        path: ['nonExemptMinSalary'],
      });
    }
    if (wantsNonExempt && nonExemptMax === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Maximum salary is required.',
        path: ['nonExemptMaxSalary'],
      });
    }
    if (exemptMin !== null && exemptMax !== null && exemptMin > exemptMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum salary cannot exceed maximum salary.',
        path: ['exemptMinSalary'],
      });
    }

    if (nonExemptMin !== null && nonExemptMax !== null && nonExemptMin > nonExemptMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum salary cannot exceed maximum salary.',
        path: ['nonExemptMinSalary'],
      });
    }

    if (data.department && data.department.length > 0) {
      if (!data.jobTitle || data.jobTitle.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Job Title is required.',
          path: ['jobTitle'],
        });
      }
    }
  });
// .refine((data) => data.hiringManagers || data.recruiters, {
//   message: 'Either Hiring Manager or Recruiter is required',
//   path: ['hiringManagers']
// })

export const editJobDescriptionSchema = z.object({
  jobTitle: z.array(catalogId).min(1, 'Job Title is required.').default([]).optional(),
  educationPreference: z.array(catalogId).optional(),
  languages: z.array(catalogId).optional(),
  mandatorySkills: z
    .array(catalogId)
    .max(30, 'You can select up to 30 required skills.')
    .optional(),
  optionalSkills: z.array(catalogId).max(30, 'You can select up to 30 optional skills.').optional(),
  responsibilities: z.string().optional(),
  otherRequirements: z
    .string()
    .transform((val) => {
      if (!val) return val;
      // Trim leading/trailing spaces
      let cleaned = val.trim();
      // Replace multiple spaces with single space (but preserve line breaks)
      cleaned = cleaned.replace(/ {2,}/g, ' ');
      // Remove non-printable characters except newlines, carriage returns, and tabs
      cleaned = cleaned.replace(/[^\x20-\x7E\n\r\t]/g, '');
      return cleaned;
    })
    .refine(
      (val) => {
        if (!val) return true;
        return val.length <= 2000;
      },
      { message: 'Other requirements cannot exceed 2000 characters.' }
    )
    .optional(),
  benefits: z
    .string()
    .transform((val) => {
      if (!val) return val;
      let cleaned = val.trim();
      cleaned = cleaned.replace(/ {2,}/g, ' ');
      cleaned = cleaned.replace(/[^\x20-\x7E\n\r\t]/g, '');
      return cleaned;
    })
    .refine(
      (val) => {
        if (!val) return true;
        return val.length <= 2000;
      },
      { message: 'Benefits cannot exceed 2000 characters.' }
    )
    .optional(),
});
export type JobDescriptionSchemaType = z.infer<typeof editJobDescriptionSchema>;
export type JobDetailsSchemaType = z.infer<typeof editJobDetailsSchema>;

export const editJobDetailsDraftSchema = z.object({
  jobProfileCode: z.string().min(1, 'Job Profile Code is required.'),
  jobTitle: z.array(catalogId).min(1, 'Job Title is required.'),
  department: z.array(catalogId).optional(),
  officeLocation: z.array(catalogId).optional(),
  jobType: z.array(catalogId).optional(),
  jobMode: z.array(catalogId).optional(),
  shift: z.array(catalogId).optional(),
  isMultilingual: z.boolean().optional(),
  useCultureIntro: z.boolean().optional(),
  openings: z.number().optional().nullable(),
  exemptionStatus: z.array(z.string()).optional(),
  exemptMinSalary: z.string().optional().nullable(),
  exemptMaxSalary: z.string().optional().nullable(),
  nonExemptMinSalary: z.string().optional().nullable(),
  nonExemptMaxSalary: z.string().optional().nullable(),
  referralBonus: z.union([z.number(), z.string()]).optional().nullable(),
  minExperience: z.number().optional().nullable(),
  maxExperience: z.number().optional().nullable(),
  openDate: z.string().optional(),
  closeDate: z.string().optional(),
  hiringManagers: z.array(catalogId).optional(),
  recruiters: z.array(catalogId).optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  educationPreference: z.array(catalogId).optional(),
  languages: z.array(catalogId).optional(),
  mandatorySkills: z.array(catalogId).optional(),
  optionalSkills: z.array(catalogId).optional(),
  responsibilities: z.string().optional(),
  otherRequirements: z.string().optional(),
  benefits: z.string().optional(),
});

export const editJobDescriptionDraftSchema = z.object({
  jobTitle: z.array(catalogId).min(1, 'Job Title is required.').default([]).optional(),
  educationPreference: z.array(catalogId).optional(),
  languages: z.array(catalogId).optional(),
  communicationSkills: z.string().optional(),
  mandatorySkills: z.array(catalogId).optional(),
  optionalSkills: z.array(catalogId).optional(),
  responsibilities: z.string().optional(),
  otherRequirements: z.string().optional(),
  benefits: z.string().optional(),
});
export type JobDetailsDraftSchemaType = z.infer<typeof editJobDetailsDraftSchema>;
export type JobDescriptionDraftSchemaType = z.infer<typeof editJobDescriptionDraftSchema>;
