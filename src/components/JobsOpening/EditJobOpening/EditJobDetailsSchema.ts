import { z } from 'zod';

export const editJobDetailsSchema = z
  .object({
    jobProfileCode: z.string().min(1, 'Job Profile Code is required.'),
    jobTitle: z.array(z.number()),
    department: z.array(z.number()).min(1, 'Department is required.'),
    officeLocation: z.array(z.number()).min(1, 'Location is required.'),
    jobType: z.array(z.number()).min(1, 'Job Type is required.'),
    shiftStart: z.string().optional(),
    shiftEnd: z.string().optional(),
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
    exemptionStatus: z
      .number()
      .min(1, 'Exemption Status is required.')
      .nullable()
      .refine((val) => !!val, {
        message: 'Exemption Status is required.',
      }),
    minSalary: z.preprocess(
      (val) => {
        const parsed = val === '' || val === undefined || val === null ? null : val;
        return parsed;
      },
      z
        .string()
        .nullable()
        .refine((val) => val === null || !isNaN(Number(val)), {
          message: 'Enter a valid minimum salary.',
        })
        .refine((val) => val === null || Number(val) > 0, {
          message: 'Enter a valid minimum salary.',
        })
        .refine(
          (val) => {
            if (Number(val) < 0 || isNaN(Number(val))) {
              return false;
            }
            return true;
          },
          {
            message: 'Enter a valid minimum salary.',
          }
        )
        .refine((val) => !!val, {
          message: 'Minimum salary is required.',
        })
    ),
    maxSalary: z.preprocess(
      (val) => {
        const parsed = val === '' || val === undefined || val === null ? null : val;
        return parsed;
      },
      z
        .string()
        .nullable()
        .refine((val) => val === null || !isNaN(Number(val)), {
          message: 'Enter a valid maximum salary.',
        })
        .refine((val) => val === null || Number(val) > 0, {
          message: 'Enter a valid maximum salary.',
        })
        .refine(
          (val) => {
            if (Number(val) < 0 || isNaN(Number(val))) {
              return false;
            }
            return true;
          },
          {
            message: 'Enter a valid maximum salary.',
          }
        )
        .refine((val) => !!val, {
          message: 'Maximum salary is required.',
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
    hiringManagers: z.array(z.number()).min(1, 'Hiring Manager is required.'),
    recruiters: z.array(z.number()).optional(),
    state: z.string().nonempty('State is required.'),
    country: z.string().nonempty('Country is required.'),
    educationPreference: z.array(z.number()).min(1, 'Education preference is required.'),
    mandatorySkills: z
      .array(z.number().min(1))
      .min(1, 'At least one required skill is needed.')
      .max(15, 'You can select up to 15 required skills.'),
    optionalSkills: z
      .array(z.number().min(1))
      .max(15, 'You can select up to 15 optional skills.')
      .optional(),
    responsibilities: z.string().optional(),
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
          return val.length <= 1000;
        },
        { message: 'Other requirements cannot exceed 1000 characters.' }
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    const isShiftStartEmpty = !data.shiftStart?.trim();
    const isShiftEndEmpty = !data.shiftEnd?.trim();

    const min = data.minSalary ? Number(data.minSalary) : null;
    const max = data.maxSalary ? Number(data.maxSalary) : null;

    const minExp = data.minExperience;
    const maxExp = data.maxExperience;

    if (!(isShiftStartEmpty && isShiftEndEmpty)) {
      if (isShiftStartEmpty || isShiftEndEmpty) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please select both shift start and end time.',
          path: isShiftStartEmpty ? ['shiftStart'] : ['shiftEnd'],
        });
      }
    }
    if (min === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimum salary is required.',
        path: ['minSalary'],
      });
    }

    if (max === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Maximum salary is required.',
        path: ['maxSalary'],
      });
    }
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

    if (min !== null && max !== null) {
      if (max < min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Maximum salary cannot be less than minimum salary.',
          path: ['maxSalary'],
        });
      }

      if (min > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Minimum salary cannot exceed maximum salary.',
          path: ['minSalary'],
        });
      }
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
  jobTitle: z.array(z.number()).min(1, 'Job Title is required.').default([]).optional(),
  educationPreference: z.array(z.number().min(1)).min(1, 'Education preference is required.'),
  // communicationSkills: z.string().min(1, 'Communication skill level is required.'),
  mandatorySkills: z
    .array(z.number().min(1))
    .min(1, 'At least one required skill is needed.')
    .max(15, 'You can select up to 15 required skills.'),
  optionalSkills: z
    .array(z.number().min(1))
    .max(15, 'You can select up to 15 optional skills.')
    .optional(),
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
        return val.length <= 1000;
      },
      { message: 'Other requirements cannot exceed 1000 characters.' }
    )
    .optional(),
});
export type JobDescriptionSchemaType = z.infer<typeof editJobDescriptionSchema>;
export type JobDetailsSchemaType = z.infer<typeof editJobDetailsSchema>;

export const editJobDetailsDraftSchema = z.object({
  jobProfileCode: z.string().min(1, 'Job Profile Code is required.'),
  jobTitle: z.array(z.number()).min(1, 'Job Title is required.'),
  department: z.array(z.number()).optional(),
  officeLocation: z.array(z.number()).optional(),
  jobType: z.array(z.number()).optional(),
  shiftStart: z.string().optional(),
  shiftEnd: z.string().optional(),
  isMultilingual: z.boolean().optional(),
  useCultureIntro: z.boolean().optional(),
  openings: z.number().optional().nullable(),
  exemptionStatus: z.number().optional().nullable(),
  minSalary: z.string().optional().nullable(),
  maxSalary: z.string().optional().nullable(),
  referralBonus: z.union([z.number(), z.string()]).optional().nullable(),
  minExperience: z.number().optional().nullable(),
  maxExperience: z.number().optional().nullable(),
  openDate: z.string().optional(),
  hiringManagers: z.array(z.number()).optional(),
  recruiters: z.array(z.number()).optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  educationPreference: z.array(z.number()).optional(),
  mandatorySkills: z.array(z.number()).optional(),
  optionalSkills: z.array(z.number()).optional(),
  responsibilities: z.string().optional(),
  otherRequirements: z.string().optional(),
});

export const editJobDescriptionDraftSchema = z.object({
  jobTitle: z.array(z.number()).min(1, 'Job Title is required.').default([]).optional(),
  educationPreference: z.array(z.number()).optional(),
  communicationSkills: z.string().optional(),
  mandatorySkills: z.array(z.number()).optional(),
  optionalSkills: z.array(z.number()).optional(),
  responsibilities: z.string().optional(),
  otherRequirements: z.string().optional(),
});
export type JobDetailsDraftSchemaType = z.infer<typeof editJobDetailsDraftSchema>;
export type JobDescriptionDraftSchemaType = z.infer<typeof editJobDescriptionDraftSchema>;
