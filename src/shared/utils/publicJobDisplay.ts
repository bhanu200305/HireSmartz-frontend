import { calendarDaysSince } from './calendarDate';
import { formatMoney } from './money';

// Shared display formatting for the public, unauthenticated careers pages
// (CareersListingPage, CareersJobDetailPage) — pulled out to a single file
// so a fix (or a bug) doesn't have to be made twice. Both pages read
// `min_experience_req`/`max_experience_req`/`exempt_salary_min`/
// `exempt_salary_max`/`non_exempt_salary_min`/`non_exempt_salary_max` off
// `api/job-service/PublicCareers/index.ts`'s queries, which already
// normalize those to real numbers (job-service serializes the Decimal
// experience fields as JSON strings on the wire — see that file's own
// `toNumber` comment) — every function here can assume real `number | null`.

// "K" only for an exact thousand, so no amount is ever rounded.
const fmtAmount = (n: number): string =>
  n >= 1000 && n % 1000 === 0 ? `$${n / 1000}K` : formatMoney(n);

const formatOneRange = (min: number | null, max: number | null, suffix: string): string | null => {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) return `${fmtAmount(min)} - ${fmtAmount(max)}${suffix}`;
  return `${fmtAmount((min ?? max) as number)}${suffix}`;
};

/** A job may offer an Exempt (annual) range, a Non-Exempt (hourly) range,
 * or both — this joins whichever are present into one display string, so
 * every existing caller that just wants "the salary line" keeps working
 * unchanged even though a job can now have two ranges. */
export const formatSalary = (
  exemptMin: number | null,
  exemptMax: number | null,
  nonExemptMin: number | null,
  nonExemptMax: number | null
): string | null => {
  const exempt = formatOneRange(exemptMin, exemptMax, '/year');
  const nonExempt = formatOneRange(nonExemptMin, nonExemptMax, '/hr');
  if (exempt && nonExempt) return `${exempt}  •  ${nonExempt}`;
  return exempt ?? nonExempt;
};

/** `0` is a real, meaningful value here ("no experience required"), not
 * "unset" — only `null` means unset. A job with `min === max === 0` reads
 * as "0-0 Years of Experience" if formatted like every other range, which
 * is technically correct but reads oddly, so it gets its own label. */
export const formatExperience = (min: number | null, max: number | null): string | null => {
  if (min === null && max === null) return null;
  if (min === 0 && max === 0) return 'No experience required';
  if (min !== null && max !== null) return `${min}-${max} Years of Experience`;
  return `${min ?? max}+ Years of Experience`;
};

/** `null`/an unparseable date both return `null` — callers should treat
 * that as "don't show a posted-date badge," not "posted today." */
export const formatPostedAgo = (isoDate: string | null): string | null => {
  if (!isoDate) return null;
  const days = calendarDaysSince(isoDate);
  if (days === null) return null;
  if (days === 0) return 'Posted today';
  if (days === 1) return 'Posted yesterday';
  if (days < 30) return `Posted ${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Posted ${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `Posted ${years} year${years === 1 ? '' : 's'} ago`;
};
