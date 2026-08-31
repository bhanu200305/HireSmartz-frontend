/**
 * jdSync.ts — shared logic for keeping the AI Job Description in sync with
 * Job Details.
 *
 * The AI description is free-text prose composed FROM a fixed set of
 * structured Job Details fields (experience range, salary range,
 * responsibilities, other requirements) — but nothing on the backend ever
 * re-derives those fields back out of the text, and saving Job Details
 * alone never regenerates the text either (`PUT .../details` only writes
 * the structured columns; `PUT .../jd` only writes the raw text — see
 * SaveJobDetailsUseCase / job-service). Left alone, editing Job Details
 * after a description already exists leaves the old, now-inaccurate
 * description on screen with no indication anything changed.
 *
 * `haveDescriptionInputsChanged` is the trigger both Job Details save
 * flows (AddJobDescription/jobdetails.tsx, EditJobOpening/EditJobDetail.tsx)
 * use to decide whether to also kick off a regenerate — only when a field
 * the description is actually generated from changed, so saving an
 * unrelated field (e.g. swapping the Recruiter) doesn't blow away a
 * manually-edited description for no reason.
 */

export type JdDescriptionInputs = {
  minExperience?: number | string | null;
  maxExperience?: number | string | null;
  minSalary?: number | string | null;
  maxSalary?: number | string | null;
  responsibilities?: string | null;
  otherRequirements?: string | null;
};

const normalizeNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeText = (value: string | null | undefined): string => (value ?? '').trim();

/**
 * True when any field the AI description is generated from differs between
 * the Job Details form's latest values (`next`) and what the description
 * currently on file was generated from (`current`, from the same
 * `getJobDescriptionById` response the AI Description step reads).
 */
export const haveDescriptionInputsChanged = (
  next: JdDescriptionInputs,
  current: JdDescriptionInputs
): boolean =>
  normalizeNumber(next.minExperience) !== normalizeNumber(current.minExperience) ||
  normalizeNumber(next.maxExperience) !== normalizeNumber(current.maxExperience) ||
  normalizeNumber(next.minSalary) !== normalizeNumber(current.minSalary) ||
  normalizeNumber(next.maxSalary) !== normalizeNumber(current.maxSalary) ||
  normalizeText(next.responsibilities) !== normalizeText(current.responsibilities) ||
  normalizeText(next.otherRequirements) !== normalizeText(current.otherRequirements);
