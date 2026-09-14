/**
 * `ScoringWeight` + normalization helper for ScoringWeightCard. Kept in its
 * own module so that file stays component-only (Fast Refresh).
 */

export type ScoringWeight = {
  id: string | number;
  categoryName: string;
  // Live label/description from the API, preferred over categoryMeta's static lookup.
  displayName?: string;
  description?: string;
  weightPercentage: number;
  // Live platform default from the API, preferred over categoryMeta's static defaultPct.
  defaultWeightPercentage?: number;
};

const clampWeight = (value: unknown): number => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return 0;
  if (normalized < 0) return 0;
  if (normalized > 100) return 100;
  return normalized;
};

/** A missing/null default should fall through to categoryMeta's static
 * value, not render as 0% — `Number(null/undefined)` would otherwise. */
export const toOptionalWeight = (value: unknown): number | undefined =>
  value === null || value === undefined ? undefined : clampWeight(value);

export const normalizeScoringWeights = (weights: unknown): ScoringWeight[] => {
  if (!Array.isArray(weights)) return [];

  return weights
    .map((item, index) => {
      if (!item || typeof item !== 'object') return undefined;

      const candidate = item as Partial<ScoringWeight>;
      const categoryName =
        typeof candidate.categoryName === 'string' ? candidate.categoryName : `CATEGORY_${index}`;

      return {
        id: candidate.id ?? index + 1,
        categoryName,
        displayName: candidate.displayName,
        description: candidate.description,
        weightPercentage: clampWeight(candidate.weightPercentage),
        defaultWeightPercentage:
          candidate.defaultWeightPercentage === undefined
            ? undefined
            : clampWeight(candidate.defaultWeightPercentage),
      } as ScoringWeight;
    })
    .filter((weight): weight is ScoringWeight => Boolean(weight));
};
