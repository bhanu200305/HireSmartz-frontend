type SpecialKind = 'resume' | 'intake_call' | 'verification';

// Fallback when the round type's special_kind isn't available.
const NAME_TO_SPECIAL_KIND: Record<string, SpecialKind> = {
  'resume review': 'resume',
  'resume screening': 'resume',
  'resume round': 'resume',
  'intake call': 'intake_call',
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

type RoundKind = SpecialKind | 'audio_screening' | 'ai_video' | 'live_video' | 'in_person';

const AI_VIDEO_VARIANTS = ['soundwave', 'avatar'];

/** Which kind of round this is, from its type's special kind, its variant or its name. */
const detectRoundKind = (options: {
  specialKind?: string | null;
  roundName?: string | null;
  variants?: (string | null | undefined)[] | null;
}): RoundKind | undefined => {
  const special = options.specialKind ?? getSpecialKindFromRoundName(options.roundName);
  if (
    special === 'resume' ||
    special === 'intake_call' ||
    special === 'verification' ||
    special === 'audio_screening' ||
    special === 'live_video' ||
    special === 'in_person'
  ) {
    return special;
  }
  const variants = (options.variants ?? []).filter(Boolean).map((v) => String(v).toLowerCase());
  if (variants.some((v) => AI_VIDEO_VARIANTS.includes(v))) return 'ai_video';
  const name = options.roundName?.toLowerCase() ?? '';
  // Live Video / In-Person before the "video" check below, which is the AI one.
  if (name.includes('live video')) return 'live_video';
  if (name.includes('in-person') || name.includes('in person')) return 'in_person';
  if (name.includes('audio') || name.includes('agent call')) return 'audio_screening';
  if (name.includes('video')) return 'ai_video';
  return undefined;
};

const OVERVIEW = 'Round Overview';

const ROUND_INFO: Record<RoundKind, RoundInfoSection[]> = {
  resume: [
    {
      title: OVERVIEW,
      text: 'Each resume is reviewed and graded against the job description, by AI and by your team.',
    },
    {
      title: 'Focus areas',
      text: 'Skills, experience and education compared with the job description.',
    },
  ],
  intake_call: [
    {
      title: OVERVIEW,
      text: 'An optional first conversation with the candidate, before or after the resume.',
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
      title: OVERVIEW,
      text: 'A check that the candidate is who they say they are.',
    },
  ],
  audio_screening: [
    {
      title: OVERVIEW,
      text: 'An AI phone interview with the candidate, scored against the job. The hiring team decides who advances.',
    },
    {
      title: 'Focus areas',
      text: 'Personality Traits, Qualifications, Company Fit, Career Goals.',
    },
  ],
  ai_video: [
    {
      title: OVERVIEW,
      text: 'An AI-led video interview the hiring team can watch before meeting the candidate.',
    },
    {
      title: 'Focus areas',
      text: 'Skills Match.',
    },
  ],
  live_video: [
    {
      title: OVERVIEW,
      text: 'A live video interview with 1 to 10 interviewers, wherever they are.',
    },
    {
      title: 'Focus areas',
      text: 'Skills Match, Personality Traits, Qualifications, Company Fit, Career Goals.',
    },
  ],
  in_person: [
    {
      title: OVERVIEW,
      text: 'The candidate meets your interviewers at your office.',
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
  /** The round type's description from the Super Admin; replaces the built-in overview. */
  description?: string | null;
}): RoundInfoSection[] => {
  const kind = detectRoundKind(options);
  if (!kind) return [];
  const description = options.description?.trim();
  if (!description) return ROUND_INFO[kind];
  return ROUND_INFO[kind].map((section) =>
    section.title === OVERVIEW ? { ...section, text: description } : section
  );
};
