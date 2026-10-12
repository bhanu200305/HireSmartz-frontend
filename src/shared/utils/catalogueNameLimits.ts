/** The longest name each company catalogue accepts (the server's own limits). */
export const SHIFT_NAME_MAX_LENGTH = 20;

const LIMITS: Record<string, number> = {
  shift: SHIFT_NAME_MAX_LENGTH,
  job_type: 50,
  work_mode: 30,
  education_preference: 100,
};

/** `name` cut to the limit of the catalogue `fieldKey` names; any other field is left as is. */
export const fitCatalogueName = (fieldKey: string, name: string): string => {
  const limit = LIMITS[fieldKey];
  return limit == null ? name : name.slice(0, limit).trim();
};
