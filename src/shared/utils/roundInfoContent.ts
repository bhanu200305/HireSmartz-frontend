type SpecialKind = 'resume' | 'intake_call' | 'verification';

// Fallback when the round type's special_kind isn't available.
const NAME_TO_SPECIAL_KIND: Record<string, SpecialKind> = {
  'resume round': 'resume',
  'intake call round': 'intake_call',
  'identity verification': 'verification',
};

export const getSpecialKindFromRoundName = (roundName?: string | null): SpecialKind | undefined => {
  const normalized = roundName?.trim().toLowerCase();
  return normalized ? NAME_TO_SPECIAL_KIND[normalized] : undefined;
};
