// The header search's category dropdown comes from
// `GET /v1/global-search/modules`. Searching job openings by DEPARTMENT only
// works for platform (Super Admin) callers: for company users the backend
// returns no Job Openings for it (job-service has no department filter yet).
// So the "Department" choice under Job Openings is left out for them. Remove
// this once job-service supports it.

type CategoryItem = { uiName: string; entityField: string; dbColumn: string };
type Categories = Record<string, CategoryItem[]>;

/** The `<category>_<entityField>` value the dropdown uses for that choice. */
export const JOB_DEPARTMENT_SEARCH_VALUE = 'JOB_department';

export const filterSearchCategories = <T extends Categories>(
  categories: T | undefined,
  isPlatformCaller: boolean
): T | undefined => {
  if (!categories || isPlatformCaller) return categories;
  const filtered: Categories = {};
  for (const [category, items] of Object.entries(categories)) {
    filtered[category] =
      category === 'JOB' ? items.filter((item) => item.entityField !== 'department') : items;
  }
  return filtered as T;
};
