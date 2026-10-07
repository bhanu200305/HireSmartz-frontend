/** A salary as a form string: 16.9 -> "16.90", 85000 -> "85000". Cents are kept, never rounded. */
export const toMoneyString = (value: number | string): string => {
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

/** A salary for the API: the typed number as is, or null when blank. */
export const toMoneyOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** "$16.90" or "$85,000": the exact amount, cents shown only when there are some. */
export const formatMoney = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
