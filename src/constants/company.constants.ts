// ============================================
// COMPANY / LOCATION CONSTANTS
// ============================================

/**
 * Fields in the location form that are subject to validation.
 * Used to track which fields have been touched and to compute changed fields
 * between form state updates.
 */
export const COMPANY_LOCATION_VALIDATION_FIELDS = [
  'locationName',
  'addressLine1',
  'country',
  'state',
  'city',
  'zipCode',
  'countryCode',
  'phoneNumber',
] as const;

export type CompanyLocationValidationField = (typeof COMPANY_LOCATION_VALIDATION_FIELDS)[number];
