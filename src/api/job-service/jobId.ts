/**
 * Coerce a persisted / URL job id into a UUID string.
 * Treats legacy numeric `0` / empty as "no job yet".
 */
export const asJobId = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '0' || trimmed === 'undefined' || trimmed === 'null') return '';
    return trimmed;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(value);
  }
  return '';
};

export const isJobId = (value: unknown): value is string => asJobId(value).length > 0;

const readDraftField = (draft: unknown, key: string): unknown => {
  if (!draft || typeof draft !== 'object') return undefined;
  const record = draft as Record<string, unknown>;
  if (record[key] != null) return record[key];
  const nested = record.data;
  if (nested && typeof nested === 'object') {
    return (nested as Record<string, unknown>)[key];
  }
  return undefined;
};

export const extractDraftJobId = (draft: unknown): string =>
  asJobId(
    readDraftField(draft, 'org_job_opening_id') ??
      readDraftField(draft, 'orgJobOpeningId') ??
      readDraftField(draft, 'job_id') ??
      readDraftField(draft, 'jobOpeningId') ??
      readDraftField(draft, 'id')
  );

export const extractDraftProfileCode = (draft: unknown): string => {
  const value =
    readDraftField(draft, 'job_profile_code') ?? readDraftField(draft, 'jobProfileCode');
  return typeof value === 'string' ? value : '';
};
