import { z } from 'zod';

const catalogId = z.union([z.string().min(1), z.number()]);

export const jobDetailsSchema = z
  .object({
    jobProfileCode: z.string().min(1, 'Job profile code is required.'),
    jobTitle: z.array(catalogId),
    department: z.array(catalogId).min(1, 'Department is required.'),
    officeLocation: z.array(catalogId).min(1, 'Location Name is required.'),
    jobType: z.array(catalogId).min(1, 'Job Type is required.'),
    jobMode: z.array(catalogId).min(1, 'Job Mode is required.'),
    // Single catalogue id, array-of-one — same convention as jobMode above.
    // Not in PUBLISH_CHECK_LABELS' mandatory-fields list, so optional.
    shift: z.array(catalogId).optional(),
    isMultilingual: z.boolean().optional(),
    useCultureIntro: z.boolean().optional(),
    isRemote: z.boolean().optional(),
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
      .union([z.string(), z.number(), z.boolean()])
      .nullable()
      .refine((val) => val !== null && val !== undefined && val !== '', {
        message: 'Salary exemption status is required.',
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
    openDate: z
      .string()
      .nonempty('Open date is required.')
      .refine(
        (dateStr) => {
          if (!dateStr) return false;

          const input = dateStr.trim();

          const toYmd = (year: number, month: number, day: number): string | null => {
            const candidate = new Date(year, month - 1, day);
            const isValid =
              candidate.getFullYear() === year &&
              candidate.getMonth() === month - 1 &&
              candidate.getDate() === day;

            if (!isValid) return null;

            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          };

          let selectedDatePart = '';
          const ddMmYyyyMatch = input.match(/^(\d{2})-(\d{2})-(\d{4})$/);
          const yyyyMmDdMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);

          if (ddMmYyyyMatch) {
            const day = Number(ddMmYyyyMatch[1]);
            const month = Number(ddMmYyyyMatch[2]);
            const year = Number(ddMmYyyyMatch[3]);
            selectedDatePart = toYmd(year, month, day) || '';
          } else if (yyyyMmDdMatch) {
            const year = Number(yyyyMmDdMatch[1]);
            const month = Number(yyyyMmDdMatch[2]);
            const day = Number(yyyyMmDdMatch[3]);
            selectedDatePart = toYmd(year, month, day) || '';
          }

          const parsedDate = new Date(input);

          if (!selectedDatePart && !isNaN(parsedDate.getTime())) {
            const year = parsedDate.getFullYear();
            const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
            const day = String(parsedDate.getDate()).padStart(2, '0');
            selectedDatePart = `${year}-${month}-${day}`;
          }

          if (!selectedDatePart) {
            const isoDateMatch = input.match(/\d{4}-\d{2}-\d{2}/);
            selectedDatePart = isoDateMatch ? isoDateMatch[0] : '';
          }

          if (!selectedDatePart) return false;

          const now = new Date();
          const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
            now.getDate()
          ).padStart(2, '0')}`;

          return selectedDatePart >= todayLocal;
        },
        {
          message: 'Open date cannot be in the past.',
        }
      ),
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
    responsibilities: z.string().nonempty('Responsibilities is required.'),
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
    const min = data.minSalary ? Number(data.minSalary) : null;
    const max = data.maxSalary ? Number(data.maxSalary) : null;

    const minExp = data.minExperience;
    const maxExp = data.maxExperience;

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

export const jobDescriptionSchema = z.object({
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
        return val.length <= 1000;
      },
      { message: 'Other requirements cannot exceed 1000 characters.' }
    )
    .optional(),
});

export type JobDescriptionSchemaType = z.infer<typeof jobDescriptionSchema>;
export type JobDetailsSchemaType = z.infer<typeof jobDetailsSchema>;

export const jobDetailsDraftSchema = z.object({
  jobProfileCode: z.string().min(1, 'Job Profile Code is required.'),
  jobTitle: z.array(catalogId).min(1, 'Job Title is required.'),
  department: z.array(catalogId).min(1, 'Department is required.'),
  officeLocation: z.array(catalogId).optional(),
  jobType: z.array(catalogId).optional(),
  jobMode: z.array(catalogId).optional(),
  shift: z.array(catalogId).optional(),
  isMultilingual: z.boolean().optional(),
  useCultureIntro: z.boolean().optional(),
  isRemote: z.boolean().optional(),
  openings: z.number().optional().nullable(),
  exemptionStatus: z.union([z.string(), z.number(), z.boolean()]).optional().nullable(),
  minSalary: z.string().optional().nullable(),
  maxSalary: z.string().optional().nullable(),
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
});

export const jobDescriptionDraftSchema = z.object({
  jobTitle: z.array(catalogId).min(1, 'Job Title is required.').default([]).optional(),
  educationPreference: z.array(catalogId).optional(),
  languages: z.array(catalogId).optional(),
  communicationSkills: z.string().optional(),
  mandatorySkills: z.array(catalogId).optional(),
  optionalSkills: z.array(catalogId).optional(),
  responsibilities: z.string().optional(),
  otherRequirements: z.string().optional(),
});
export type JobDetailsDraftSchemaType = z.infer<typeof jobDetailsDraftSchema>;
export type JobDescriptionDraftSchemaType = z.infer<typeof jobDescriptionDraftSchema>;
