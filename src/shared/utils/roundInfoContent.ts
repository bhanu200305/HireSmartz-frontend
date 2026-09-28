// Recruiter facing copy for the round info popup ("i" icon) shown on the
// interview rounds list and the Add Round form. Kept as static content
// rather than a backend field since only `round_description` exists there
// (a single free text field the platform admin writes, see
// InterviewRoundTypesTab.tsx) and has no objective/procedure/analysis
// structure to draw from. Content is keyed off the fixed, catalog level
// enums (`special_kind`, `variant`) rather than the free text round name,
// since a tenant can rename or add round types but cannot change what
// these enums mean.
export type RoundInfoContent = {
  objective: string;
  procedure: string;
  analysis: string;
};

type SpecialKind = 'resume' | 'intake_call' | 'verification';
type KnownVariant = 'soundwave' | 'avatar' | 'online' | 'offline';

const SPECIAL_KIND_INFO: Record<SpecialKind, RoundInfoContent> = {
  resume: {
    objective:
      'Review the candidate resume against the job requirements and confirm baseline eligibility before moving forward.',
    procedure:
      'Work experience, education, and skills listed on the resume are checked against the criteria defined for this role.',
    analysis:
      'Candidates are shortlisted based on relevant experience, required skills, and overall fit with the job description.',
  },
  intake_call: {
    objective:
      'Have an initial conversation with the candidate and confirm interest, availability, and basic expectations.',
    procedure:
      'A recruiter speaks with the candidate to verify details such as notice period, compensation expectations, and willingness to proceed.',
    analysis:
      'Candidates who align with the practical requirements of the role and remain interested move ahead to the next round.',
  },
  verification: {
    objective: 'Confirm the authenticity of the candidate background before an offer is finalized.',
    procedure:
      'Employment history, education, and references provided by the candidate are validated against supporting documents.',
    analysis:
      'Any discrepancy found during verification is flagged and reviewed before the process continues.',
  },
};

const VARIANT_INFO: Record<KnownVariant, RoundInfoContent> = {
  soundwave: {
    objective:
      'Assess communication skills and role knowledge through an automated voice conversation.',
    procedure:
      'An AI voice agent asks the candidate a set of structured questions and records the responses in real time.',
    analysis:
      'Responses are evaluated for clarity, relevant knowledge, and communication ability, and a score is generated for the recruiter to review.',
  },
  avatar: {
    objective:
      'Evaluate the candidate through an interactive AI avatar interview that simulates a real conversation.',
    procedure:
      'The candidate interacts with an AI avatar that asks role specific and behavioral questions, adapting follow up questions based on the responses given.',
    analysis:
      'Answers are analyzed for depth, relevance, and consistency, and a summary is shared with the recruiter.',
  },
  online: {
    objective: 'Conduct a live interview remotely with the hiring panel.',
    procedure:
      'The candidate joins a scheduled video call where panel members ask questions covering skills, experience, and role fit.',
    analysis:
      'Panel members assess communication, technical depth, and cultural fit, and record their feedback after the call.',
  },
  offline: {
    objective: 'Meet the candidate in person and evaluate them in a formal setting.',
    procedure:
      'The candidate visits the office premises for a scheduled interview with one or more panel members.',
    analysis:
      'Interviewers evaluate presentation, technical ability, and interpersonal skills, and submit structured feedback afterward.',
  },
};

// Resume and Intake Call are auto seeded with these exact names (see
// AddNewRound.tsx and job-service's INTERVIEW_ROUNDS seed data), so a name
// match is a reliable stand in for `special_kind` wherever the saved round
// instance does not carry that field (`InterviewRoundResponse` only has
// `round_name`, not `special_kind`). Keys must match the seeded
// `round_name` values verbatim (lowercased) — "Resume Round"/"Intake Call
// Round"/"Identity Verification", not the bare special_kind strings
// ("resume"/"intake_call"/"verification") those rows carry in the seed
// tuple, which is a different column and never appears in `round_name`.
const NAME_TO_SPECIAL_KIND: Record<string, SpecialKind> = {
  'resume round': 'resume',
  'intake call round': 'intake_call',
  'identity verification': 'verification',
};

// Lets callers branch on round kind (e.g. to source Intake Call's questions
// from the intake-call-questions endpoint instead of the JD question bank)
// without duplicating the name-matching table above.
export const getSpecialKindFromRoundName = (roundName?: string | null): SpecialKind | undefined => {
  const normalized = roundName?.trim().toLowerCase();
  return normalized ? NAME_TO_SPECIAL_KIND[normalized] : undefined;
};

export const getRoundInfoContent = (round: {
  specialKind?: SpecialKind | null;
  variant?: string | null;
  roundName?: string | null;
}): RoundInfoContent | null => {
  if (round.specialKind && SPECIAL_KIND_INFO[round.specialKind]) {
    return SPECIAL_KIND_INFO[round.specialKind];
  }
  const normalizedName = round.roundName?.trim().toLowerCase();
  const impliedKind = normalizedName ? NAME_TO_SPECIAL_KIND[normalizedName] : undefined;
  if (impliedKind) {
    return SPECIAL_KIND_INFO[impliedKind];
  }
  const normalizedVariant = round.variant?.trim().toLowerCase() as KnownVariant | undefined;
  if (normalizedVariant && VARIANT_INFO[normalizedVariant]) {
    return VARIANT_INFO[normalizedVariant];
  }
  return null;
};
