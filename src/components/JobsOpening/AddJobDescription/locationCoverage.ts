/** Per office, the ids of the hiring managers who hold the role there. */
export type OfficeCoverage = Record<string, string[]>;

const sameId = (a: unknown, b: unknown): boolean => String(a) === String(b);

/**
 * The selected offices that no selected hiring manager covers. A manager covers
 * every office where they hold the role, so one manager can cover several.
 * Empty when no manager is chosen yet: the required-field check asks for one.
 */
export const uncoveredOffices = (
  officeIds: (string | number)[],
  hiringManagerIds: (string | number)[],
  coverage: OfficeCoverage
): string[] => {
  if (hiringManagerIds.length === 0) return [];
  return officeIds
    .map(String)
    .filter(
      (officeId) =>
        !hiringManagerIds.some((managerId) =>
          (coverage[officeId] ?? []).some((covered) => sameId(covered, managerId))
        )
    );
};

/** "Choose at least one hiring manager for Pune and Delhi." */
export const coverageMessage = (officeNames: string[]): string => {
  const names =
    officeNames.length < 2
      ? officeNames.join('')
      : `${officeNames.slice(0, -1).join(', ')} and ${officeNames[officeNames.length - 1]}`;
  return `Choose at least one hiring manager for ${names}.`;
};

/**
 * The warning for the hiring manager field, or null when every selected office
 * has a manager. `nameOf` turns an office id into the name shown to the user.
 */
export const coverageIssue = (
  officeIds: (string | number)[],
  hiringManagerIds: (string | number)[],
  coverage: OfficeCoverage,
  nameOf: (officeId: string) => string
): string | null => {
  const uncovered = uncoveredOffices(officeIds, hiringManagerIds, coverage);
  return uncovered.length > 0 ? coverageMessage(uncovered.map(nameOf)) : null;
};

/** The managers who cannot work at any selected office, so their pick no longer applies. */
export const managersWithoutAnyOffice = (
  officeIds: (string | number)[],
  hiringManagerIds: (string | number)[],
  coverage: OfficeCoverage
): string[] =>
  hiringManagerIds
    .map(String)
    .filter(
      (managerId) =>
        !officeIds.some((officeId) =>
          (coverage[String(officeId)] ?? []).some((covered) => sameId(covered, managerId))
        )
    );
