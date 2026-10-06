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
      text: "Every candidate's resume is reviewed and scored against this job. It is always the first round and cannot be removed.",
    },
    {
      title: 'What it looks at',
      text: 'Skills, experience, education and how closely the resume matches the job description.',
    },
    {
      title: 'Why it is here',
      text: 'It quickly separates candidates who fit the role from those who do not, so interview time goes to the right people.',
    },
  ],
  intake_call: [
    {
      title: 'What this round is',
      text: "A short phone call with our AI assistant that checks the details on the candidate's resume and fills in anything missing. It is optional and always comes right after the Resume round.",
    },
    {
      title: 'What it looks at',
      text: 'Whether what the candidate says matches their resume: their experience, skills and availability.',
    },
    {
      title: 'Why it is here',
      text: 'It catches mismatches early and gives you a fuller picture of the candidate before any interview.',
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
    {
      title: 'Why it is here',
      text: 'It confirms identity before the candidate moves further in the process.',
    },
  ],
  audio_screening: [
    {
      title: 'What this round is',
      text: 'An AI-led audio interview. The candidate answers the questions you set for this round by voice.',
    },
    {
      title: 'What it looks at',
      text: "Communication and how well the answers fit the role. The focus comes from the questions on this round's tab in Questions.",
    },
    {
      title: 'Why it is here',
      text: 'It is a quick first screening of many candidates without anyone having to schedule time.',
    },
  ],
  ai_video: [
    {
      title: 'What this round is',
      text: 'An AI-led video interview with a virtual interviewer. The candidate answers your questions on camera.',
    },
    {
      title: 'What it looks at',
      text: 'How clearly and confidently the candidate answers, and how well the answers fit the role and the scoring areas you have set.',
    },
    {
      title: 'Why it is here',
      text: 'It gives every candidate the same interview, so answers are easy to compare, without needing your team in the room.',
    },
  ],
  panel: [
    {
      title: 'What this round is',
      text: "A live interview with your team's interviewers, held online or in person.",
    },
    {
      title: 'What it looks at',
      text: 'Depth of skills, how the candidate thinks, and how well they would fit the team, using the questions and scoring areas set for this round.',
    },
    {
      title: 'Why it is here',
      text: 'It is the human judgement before a hiring decision.',
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
