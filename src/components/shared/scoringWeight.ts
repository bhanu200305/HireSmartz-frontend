/**
 * `ScoringWeight` + normalization helper for ScoringWeightCard (ui/scoringWeightCard.tsx).
 * Kept in its own module, not exported alongside the component, so that file
 * stays component-only — mixing a component export with plain function
 * exports in the same file breaks Vite's Fast Refresh (see the
 * react-refresh/only-export-components lint rule it was tripping).
 */

export type ScoringWeight = {
  id: string | number;
  categoryName: string;
  weightPercentage: number;
};

const clampWeight = (value: unknown): number => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return 0;
  if (normalized < 0) return 0;
  if (normalized > 100) return 100;
  return normalized;
};

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
        weightPercentage: clampWeight(candidate.weightPercentage),
      } as ScoringWeight;
    })
    .filter((weight): weight is ScoringWeight => Boolean(weight));
};
