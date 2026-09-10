// Shared display formatting for the public, unauthenticated careers pages
// (CareersListingPage, CareersJobDetailPage) — pulled out to a single file
// so a fix (or a bug) doesn't have to be made twice. Both pages read
// `min_experience_req`/`max_experience_req`/`salary_min`/`salary_max` off
// `api/job-service/PublicCareers/index.ts`'s queries, which already
// normalize those to real numbers (job-service serializes the Decimal
// experience fields as JSON strings on the wire — see that file's own
// `toNumber` comment) — every function here can assume real `number | null`.

const fmtAmount = (n: number): string => (n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`);

/** isExempted: true = annual, false = hourly. */
export const formatSalary = (
  min: number | null,
  max: number | null,
  isExempted: boolean
): string | null => {
  if (min === null && max === null) return null;
  const suffix = isExempted ? '/year' : '/hr';
  if (min !== null && max !== null) return `${fmtAmount(min)} - ${fmtAmount(max)}${suffix}`;
  return `${fmtAmount((min ?? max) as number)}${suffix}`;
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
  const postedMs = new Date(isoDate).getTime();
  if (Number.isNaN(postedMs)) return null;
  const days = Math.max(0, Math.floor((Date.now() - postedMs) / 86_400_000));
  if (days === 0) return 'Posted today';
  if (days === 1) return 'Posted yesterday';
  if (days < 30) return `Posted ${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Posted ${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `Posted ${years} year${years === 1 ? '' : 's'} ago`;
};
