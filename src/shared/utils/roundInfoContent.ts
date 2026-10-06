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

export type RoundInfoSection = { title: string; text: string };

/** Identity Verification isn't set up in the backend yet, so it is hidden from round pickers and lists. */
/** The Avatar video format isn't set up in the backend yet, so it is shown greyed out. */
export const isUnavailableVariant = (variant?: string | null): boolean => variant === 'avatar';

/** The first variant that can be picked, so a default never lands on a greyed-out one. */
export const firstAvailableVariant = (variants?: string[] | null): string | null =>
  variants?.find((variant) => !isUnavailableVariant(variant)) ?? null;

export const isHiddenRoundType = (specialKind?: string | null): boolean =>
  specialKind === 'verification';

type RoundKind = SpecialKind | 'audio_screening' | 'ai_video' | 'panel';

const AI_VIDEO_VARIANTS = ['soundwave', 'avatar'];
const PANEL_VARIANTS = ['online', 'offline'];

/** Which kind of round this is, from its type's special kind, its variant or its name. */
const detectRoundKind = (options: {
  specialKind?: string | null;
  roundName?: string | null;
  variants?: (string | null | undefined)[] | null;
}): RoundKind | undefined => {
  const special = options.specialKind ?? getSpecialKindFromRoundName(options.roundName);
  if (special === 'resume' || special === 'intake_call' || special === 'verification') {
    return special;
  }
  const variants = (options.variants ?? []).filter(Boolean).map((v) => String(v).toLowerCase());
  if (variants.some((v) => AI_VIDEO_VARIANTS.includes(v))) return 'ai_video';
  if (variants.some((v) => PANEL_VARIANTS.includes(v))) return 'panel';
  const name = options.roundName?.toLowerCase() ?? '';
  if (name.includes('audio')) return 'audio_screening';
  if (name.includes('video')) return 'ai_video';
  if (name.includes('panel')) return 'panel';
  return undefined;
};

const ROUND_INFO: Record<RoundKind, RoundInfoSection[]> = {
  resume: [
    {
      title: 'What this round is',
      text: "Every candidate's resume is reviewed and scored against the job. It is always the first round and cannot be removed.",
    },
    {
      title: 'Focus areas',
      text: 'Skills, experience and education compared with the job description.',
    },
  ],
  intake_call: [
    {
      title: 'What this round is',
      text: 'A short AI phone call that checks what the candidate says against their resume.',
    },
    {
      title: 'Focus areas',
      text: 'Whether the call matches the resume or not.',
    },
    {
      title: 'How candidates apply',
      text: 'When this round is added, the candidate can choose how to start. They can submit their resume first and then schedule the Intake Call, or they can take the Intake Call first and upload their resume afterwards through a link. Both options are shown to them on the apply page.',
    },
  ],
  verification: [
    {
      title: 'What this round is',
      text: 'A check that the candidate is who they say they are.',
    },
  ],
  audio_screening: [
    {
      title: 'What this round is',
      text: 'An AI-led audio interview. The candidate answers your questions by voice.',
    },
    {
      title: 'Focus areas',
      text: 'Personality Traits, Qualifications, Company Fit, Career Goals.',
    },
  ],
  ai_video: [
    {
      title: 'What this round is',
      text: 'An AI-led video interview with a virtual interviewer. The candidate answers your questions on camera.',
    },
    {
      title: 'Focus areas',
      text: 'Skills Match.',
    },
  ],
  panel: [
    {
      title: 'What this round is',
      text: "A live interview with your team's interviewers, online or in person.",
    },
    {
      title: 'Focus areas',
      text: 'Skills Match, Personality Traits, Qualifications, Company Fit, Career Goals.',
    },
  ],
};

/** The plain-language sections for a round's info popup, or none for an unknown kind. */
export const getRoundInfoSections = (options: {
  specialKind?: string | null;
  roundName?: string | null;
  variants?: (string | null | undefined)[] | null;
}): RoundInfoSection[] => {
  const kind = detectRoundKind(options);
  return kind ? ROUND_INFO[kind] : [];
};
