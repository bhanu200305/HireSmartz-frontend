// LiveKit types
export * from './LiveKit';

// RBAC (roles & permissions) types
export * from './rbac';

export type SmsMessage = {
  id: number;
  messageText: string;
  direction: 'INBOUND' | 'OUTBOUND';
  senderName: string;
  senderType?: 'CANDIDATE' | 'USER' | 'SYSTEM' | 'AUTO_GENERATED';
  sentByRole?: string;
  createdAt: string;
  status?: string;
};

export type SmsConversationResponse = {
  content: SmsMessage[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  candidateName?: string;
  candidatePhone?: string;
  conversationId?: number;
};

export type GetSmsConversationRequest = {
  candidateId: number;
  jobOpeningId: number;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
};

export type SendCandidateSmsRequest = {
  candidateId: number;
  jobOpeningId: number;
  messageText: string;
};

export type SendCandidateSmsResult = {
  candidateId: number;
  candidateName: string;
  phoneNumber: string;
  success: boolean;
  messageSid?: string;
  status?: string;
};

export type SendCandidateSmsResponse = {
  success: boolean;
  message: string;
  data: {
    sentCount: number;
    skippedCount: number;
    results: SendCandidateSmsResult[];
  };
};

export type SendCandidateSmsActionRequest = {
  candidateId: number;
  jobOpeningId: number;
  actionType: 'LIVE_JOIN_ASSIST' | 'SEND_INTERVIEW_LINK';
  bookingId?: number | string;
};

export type SendCandidateSmsActionResponse = {
  actionId: number;
  conversationSid: string;
  messageSid: string;
  actionType: string;
  status: string;
  messageText: string;
  expiresAt: string;
  alreadySent: boolean;
};

export type GenerateSmsContentRequest = {
  subject: string;
  body: string;
};

export type GenerateSmsContentResponse = {
  success: boolean;
  message: string;
  generatedContent: string;
};

export type DuplicateCandidate = {
  email: string;
  fileName: string;
  candidateName?: string;
};

export type Route = {
  name: string;
  path: string;
  component: React.ComponentType<any>;
  exact?: boolean;
  children?: Route[];
  isPrivate?: boolean;
  isPublic?: boolean;
  /** Truly open routes - accessible to everyone regardless of auth state (no redirect). */
  isOpen?: boolean;
};

export type User = {
  key: string;
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  title: string;
  role: string;
  archived: boolean | undefined;
  isActiveAndVerified: boolean | undefined;
  status: 'ACTIVE' | 'INACTIVE';
  emailId: string;
};
export type ViewUserTypes = {
  profilePicture: string;
  profilePictureType: string;
  firstName: string;
  lastName: string;
  title?: string;
  emailId: string;
  phoneNumber: string;
  countryCode?: string;
  roleId?: string;
  role?: string;
  status: boolean;
  archived: boolean;
};
export type ViewOrgUserTypes = {
  profilePicture: string;
  profilePictureType: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  emailId: string;
  phoneNumber: string;
  countryCode?: string;
  roleId?: string;
  role?: string;
  status: boolean;
};

export type UpdateCompanyRequest = {
  companyId: number;
  companyName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  primaryFirstName?: string;
  primaryLastName?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  primaryCountryCode?: string;
  secondaryFirstName?: string;
  secondaryLastName?: string;
  secondaryEmail?: string;
  secondaryPhone?: string;
  secondaryCountryCode?: string;
  companyLogo?: string;
  companyLogoType?: string;
  websiteUrl?: string;
  industryId?: number;
  status?: boolean;
  allowedToManageLocation?: boolean;
  departmentIds?: number[];
  cultureIntroText?: string;
  cultureIntroDefaultEnabled?: boolean;
  candidateIntroEnabled?: boolean;
  candidateEnquiriesEnabled?: boolean;
  locationCode?: string | null;
};

export type JobDetailsState = {
  jobProfileCode: string;
  jobTitle: Array<string | number>;
  department: Array<string | number>;
  jobType: Array<string | number>;
  // Single catalogue id, held as an array-of-one — same convention as
  // jobTitle/department/jobType above. Maps to `mode_id`, a
  // publish-mandatory field (_publish_validation.py).
  jobMode?: Array<string | number>;
  // Single catalogue id, held as an array-of-one — same convention as
  // jobMode above. References the organization's own configured shift
  // (name + start/end time), not a free-typed time range — see
  // api/job-service/Shifts/shifts.ts. Replaces the old shiftStart/shiftEnd
  // pair, which only ever built a display string and was never sent to the
  // backend (buildSaveJobDetailsPayload has always read `shift`/`shiftId`
  // for `shift_id`), so every job's shift was silently discarded.
  shift?: Array<string | number>;
  openings: number | null;
  exemptionStatus: string | number | boolean | null;
  minSalary: string | null;
  maxSalary: string | null;
  referralBonus?: number | string | null;
  minExperience: number | null;
  maxExperience?: number | null;
  openDate: string;
  closeDate?: string;
  hiringManagers: Array<string | number>;
  recruiters?: Array<string | number>;
  country: string;
  state: string;
  officeLocation: Array<string | number>;
  responsibilities?: string;
  // Single catalogue id, held as an array-of-one for consistency with every
  // other DropdownWithAddOption-backed field here (jobTitle, department, …).
  educationPreference: Array<string | number>;
  // organization_language ids a job's communication requires (migration
  // 0014) — replaces the old isMultilingual boolean below, which the
  // backend no longer accepts.
  languages?: Array<string | number>;
  mandatorySkills: Array<string | number>;
  optionalSkills?: Array<string | number>;
  otherRequirements?: string;
  /** skill_id -> skill_label, for skills that landed in mandatorySkills/
   * optionalSkills without ever going through a dropdown search (AI added
   * them directly via job.jd.enhance's auto-committed suggestions). The
   * catalogue search dropdowns only know a label for a skill someone has
   * actually searched for, so the "Selected Skills" chips need their own
   * label source for anything that arrived another way — this is that
   * source, persisted (redux-persist) so it survives a remount even if the
   * Job Details step wasn't open when the skill was added (see
   * JobDescriptionPanel.tsx's Redux-dispatch effect, which is the one
   * guaranteed to run in that case). Merged in, never replaced wholesale —
   * see jobOpeningSlice.ts's `updateJobDetails` reducer. */
  aiSuggestedSkillLabels?: Record<string, string>;
  /** @deprecated backend no longer accepts this (job-service migration 0016) */
  isMultilingual?: boolean;
  useCultureIntro?: boolean;
  isDraft?: boolean;
  /** @deprecated backend no longer accepts this (job-service migration 0016) */
  isRemote?: boolean;
};
export type ATS = {
  id: string;
  name: string;
  jobBoard?: [];
};

export type JobDescriptionState = {
  educationPreference: Array<string | number>;
  // // experience: number
  // communicationSkills: string;
  mandatorySkills: Array<string | number>;
  optionalSkills?: Array<string | number>;
  responsibilities?: string;
  otherRequirements?: string;
  candidateCommunicationLanguage?: string;
  isDraft?: boolean;
};
export type InterviewRoundState = {
  id: number;
  jobId: number;
  round: {
    id: number;
    name: string;
  };
  roundType: 'AI' | 'VIDEO' | 'IN_PERSON' | 'MANUAL';
  sequence: number;
  description: string;
};
export type InterviewRoundReorderItem = {
  id: number;
  jobId: number;
  round: number;
  roundType: string;
  sequence: number;
  description?: string;
};
export type ReorderInterviewRoundsRequest = InterviewRoundReorderItem[];
export type SaveJobOpeningRequest = {
  jobOpeningId?: number;
  locationId?: number;
  jobProfileCode: string;
  jobTitle: number[];
  department?: number[];
  officeLocation?: number[];
  jobType?: number[];
  shift?: string | null;
  openings?: number;
  minSalary?: number;
  maxSalary?: number;
  minExperience?: number;
  maxExperience?: number;
  openDate?: string;
  hiringManagers?: number[];
  recruiters?: number[];
  mandatorySkills?: number[];
  optionalSkills?: number[];
  exemptionStatus?: string | number | boolean | null;
  referralBonus?: number | string | null;
  educationPreference?: number[];
  communicationSkills?: string;
  responsibilities?: string;
  otherRequirements?: string;
  candidateCommunicationLanguage?: string;
  isMultilingual?: boolean;
  useCultureIntro?: boolean;
  isDraft?: boolean;
  isRemote?: boolean;
};

export type AddOrgUserRequest = {
  profilePicture: string;
  profilePictureType: string;
  firstName: string;
  lastName: string;
  emailId: string;
  phoneNumber: string;
  employeeId: string;
  countryCode: string;
  roleTypeMappingId: number;
  status: boolean;
  archived: boolean;
  allowMultiLocationAccess: boolean;
  primaryLocationId: number;
  accessibleLocationIds: number[];
};
export type AddOrgUserResponse = {
  profilePicture: string;
  profilePictureType: string;
  firstName: string;
  lastName: string;
  emailId: string;
  phoneNumber: string;
  employeeId: string;
  countryCode: string;
  roleTypeMappingId: number;
  status: boolean;
  archived: boolean;
  success: boolean;
};

export type JobFilterRequest = {
  text?: string;
  searchQuery?: string;
  globalSearchRequestDto?: {
    text: string;
    field: string;
  };
  startDate?: string;
  endDate?: string;
  status?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
};

export type JobFilterResponse = {
  data: any[];
  total: number;
  totalElements: number;
  success: boolean;
};

export type Jobs = {
  key: string;
  /** UUID from job-service (`org_job_opening_id`). */
  jobOpeningId: string;
  jobProfileCode: string;
  shift: string;
  openings: number;
  minSalary: number;
  maxSalary: number;
  minExperience: number;
  maxExperience: number;
  openDate: string;
  hiringManager: string;
  recruiter: string;
  exemptionStatusId: number;
  referralBonus?: number | string | null;
  communicationSkills: string;
  jobOpeningCreatedAt: string;
  jobOpeningUpdatedAt: string;
  isDeleted: boolean;
  exemptionStatusName: string;
  jobTitleName: string;
  departmentName: string;
  officeLocationName: string;
  jobTypeName: string;
  educationPreferenceName: string;
  mandatorySkillName: string;
  optionalSkills: string | null;
  isDraft: boolean;
  isClosed: boolean;
  isPublished?: boolean;
  isRemote?: boolean | null;
  selectedCount: number;
  rejectedCount?: number;
  bookingCreatedCount: number;
  inProgressCount: number;
  invitationSentCount: number;
  candidateCount?: number;
  newCandidateCount?: number;
  interviewedCandidateCount?: number;
  location?: {
    id: string | number;
    name: string;
  };
  /** Raw ids from JobSummaryResponse — used to resolve display names. */
  jobTitleId?: string | null;
  departmentId?: string | null;
  jobTypeId?: string | null;
  hiringManagerIds?: string[];
  recruiterIds?: string[];
  createdById?: string | null;
  createdByName?: string;
};

export type JobOpeningByIdResponse = {
  success: boolean;
  message: string;
  data: {
    id: string | number;
    atsJobOpeningId: string;
    jobProfileCode: string;
    // Id only, name resolved separately against the organization's shift
    // catalogue (same pattern as jobTitle/department/jobType below) — the
    // backend's `shift_id` has no name of its own to send.
    shiftId?: string | null;
    openings: number;
    minSalary: number;
    maxSalary: number;
    minExperience: number;
    maxExperience: number;
    /** @deprecated backend no longer accepts this (job-service migration 0016) — see `languages` */
    isMultilingual?: boolean;
    languages?: number[];
    useCultureIntro?: boolean;
    isDraft: boolean;
    /** @deprecated backend no longer accepts this (job-service migration 0016) */
    isRemote?: boolean;
    isClosed: boolean;
    candidatesInvitedCount?: number;
    interviewedCandidateCount?: number;
    responsibilities?: string;
    otherRequirements?: string;
    candidateCommunicationLanguage?: string;
    hiringManager?: {
      id: number;
      name: string;
    } | null;
    recruiter?: {
      id: number;
      name: string;
    } | null;
    hiringManagers?: number[];
    recruiters?: number[];
    referralBonus?: number | string | null;
    communicationSkills: string;
    aiJobDescription: {
      id: number;
      jobDescription: string;
      jobOpeningId: number;
    };
    exemptionStatus: {
      id: number;
      statusName: string;
    };
    mandatorySkills: {
      id: number;
      skillName: string;
    }[];
    optionalSkills: {
      id: number;
      skillName: string;
    }[];
    jobTitle: {
      id: number;
      jobTypeName: string;
    }[];
    department: {
      id: number;
      departmentName: string;
    }[];
    officeLocation: {
      country: {
        id: number;
        name: string;
      };
      city: {
        id: number;
        name: string;
      };
      state: {
        id: number;
        name: string;
      };
    }[];
    location?: {
      id: number;
      companyId?: number;
      name: string;
      code?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      country?: string;
      zip?: string;
      zipCode?: string;
      timezone?: string | null;
      isPrimary?: boolean | null;
      status?: boolean;
    };
    jobType: {
      id: number;
      jobTypeName: string;
    }[];
    jobMode: {
      id: number;
      name: string;
    }[];
    educationPreference: {
      id: number;
      educationLevel: string;
    }[];
    interviewRounds: {
      id: number;
      jobId: number;
      round: {
        id: number;
        name: string;
      };
      roundType: string;
      sequence: number;
      description: string;
      uniqueRoundIdentifier: string;
    }[];
    categorizedQuestions: {
      openDate: string;
      createdAt: string;
      updatedAt: string;
      deleted: boolean;
      categories: {
        [categoryName: string]: {
          id: number;
          question: string;
          categoryId: number;
          categoryName: string;
          status: string | null;
          createdBy: string | null;
          jobOpeningId: number | null;
          createdAt: string | null;
        }[];
      };
    };
    generalQuestions: {
      id: number;
      question: string;
      status: string | null;
      jobOpeningId: number | null;
      interviewRoundId: number | null;
    }[];
    openDate: string;
    createdAt: string;
    updatedAt: string;
    deleted: boolean;
  };
};

export type InterviewRound = {
  id: string | number;
  jobId: string | number;
  round: {
    id: string | number;
    name: string;
    status: boolean;
  };
  roundType: 'AI' | 'VIDEO' | 'IN_PERSON' | 'MANUAL';
  sequence: number;
  description: string;
  uniqueRoundIdentifier: string;
  duration?: number | null;
  variant?: string | null;
  roundId?: string;
  roundName?: string | null;
};

export type SaveInterviewRoundRequest = {
  jobId: string | number;
  round: string | number;
  roundType: string;
  sequence: number;
  description: string;
  duration?: number | null;
  variant?: string | null;
};
export type EditInterviewRoundRequest = {
  id: string | number;
  jobId: string | number;
  round: string | number;
  roundType: string;
  sequence: number;
  description: string;
  duration?: number | null;
  variant?: string | null;
};

export type UpdateJobOpeningRequest = {
  jobOpeningId?: number;
  locationId?: number;
  jobTitle: number[];
  department?: number[];
  officeLocation?: number[];
  country?: string;
  state?: string;
  useCultureIntro?: boolean;
  jobType?: number[];
  shiftStart?: string;
  shiftEnd?: string;
  openings?: number | null;
  exemptionStatus?: string | number | boolean | null;
  minSalary: string | null;
  maxSalary: string | null;
  referralBonus?: number | string | null;
  minExperience?: number | null;
  maxExperience?: number | null;
  openDate: string;
  hiringManagers?: number[];
  recruiters?: number[];
  jobProfileCode: string;
  educationPreference?: number[];
  communicationSkills?: string;
  responsibilities?: string;
  otherRequirements?: string;
  candidateCommunicationLanguage?: string;
  mandatorySkills?: number[];
  optionalSkills?: number[];
  shift?: string | null;
  generateAiJd?: boolean;
  isMultilingual?: boolean;
  useCultureIntro?: boolean;
  isDraft?: boolean;
  isRemote?: boolean;
};

export type AiJobDescriptionState = {
  id: string;
  jobDescription?: string;
  jobOpeningId: string;
};

export type SaveAiQuestionRequest = {
  JobOpeningId: number;
  categoryId: number;
  question: string;
};
export type SaveAiGeneralQuestionRequest = {
  jobOpeningId: number;
  question: string;
  interviewRoundId: number | undefined;
};
export type EditAiQuestionRequest = {
  questionID: number;
  categoryId: number;
  question: string;
};
export type EditAiGeneralQuestionRequest = {
  questionID: number;
  question: string;
  interviewRoundId: number | undefined;
};
export type ReorderAiGeneralQuestionRequest = {
  sequence: number;
  questionID: number;
};
export type SaveAiQuestionResponse = {
  status: boolean;
  message: string;
};
export type SaveAiGeneralQuestionResponse = {
  status: boolean;
  message: string;
};
export type RegenrateAiGeneralQuestionResponse = {
  success: boolean;
  message: string;
};
export type ReorderAiGeneralQuestionResponse = {
  status: boolean;
  message: string;
};

// Candidates
export type InitiateVapiCallRequest = {
  candidateId: number;
};

export type InitiateVapiCallResponse = {
  status: boolean;
  message: string;
  callId: string;
};
export type ExtractMultipleResumesResponse = {
  invalidFiles: {
    id: string;
    fileName: string;
    message: string;
  }[];
  batchId: string;
  totalFiles: number;
  validFiles: number;
};
export type ExtractResumeRequest = FormData;

export type GetAllCandidatesRequest = {
  jobOpeningId: string | number;
  page?: number;
  size?: number;
  text?: string;
  startDateTime?: string;
  endDateTime?: string;
  status?: boolean;
  source?: string | null;
  internalStatus?: string | null;
  externalStatus?: string | null;
  roundType?: string;
  sortBy?: string;
  sortDir?: string;
  isNew?: boolean;
};

export type ResumeThumbStatusRequest = {
  candidateId: number;
  status: boolean;
  reason?: string;
};

export type ExtractResumeResponse = {
  status: boolean;
  success: boolean;
  message: string;
  extractedData: {
    name: string;
    email: string;
    phone: string;
    skills: string[];
    experience: string;
  };
};

export type CandidateById = {
  status: boolean;
  message: string;
  candidateId: number;
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  currentJobTitle: string;
  skills: string;
  education: string;
  resumeFilePath: string;
  resumeUploadDate: string;
  contactedByAI: boolean;
  lastAICallTimestamp: string;
  atsScore: number;
  linkedInProfile: string;
  source: string;
  companyName: string;
};

export type Candidates = {
  status: boolean;
  message: string;
  jobOpeningId: number;
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  currentJobTitle: string;
  education: string;
  resumeFilePath: string;
  resumeUploadDate: string;
  contactedByAI: boolean;
  lastAICallTimestamp: string;
  atsScore: number;
  linkedInProfile: string;
  source: string;
  status: string;
};

export type InterviewRoundResponseDTO = {
  description: string;
  id: number;
  jobId: number;
  candidateId: number;
  firstName: string;
  lastName: string;
  isCompleted: boolean;
  externalBookingId: string;
  interviewRoundId: number;
  interviewStatus: string;
  interviewStatusLabel: string;
  interviewBookingId?: number;
  isFollowUpEmailSent?: boolean;
  round: {
    companyId: number;
    createdAt: string;
    id: number;
    name: string;
    status: boolean;
    updatedAt: string;
  };
  interviewerList: InterviewerList[];
  roundType: string;
  score: string;
  sequence: number;
  startTime: string;
  videoInterviewFeedback: string;
  interviewStatus: string;
  skipReason: string;
  cancellationReason: string;
  bookingSentAt: string | null;
  interviewLocation: string;
  interviewDurationInMinutes: number;
  advanceFeedbackCreatedAt?: string | null;
  advanceFeedbackCreatedByName?: string | null;
  reminderCount?: number | null;
  lastInvitationSentAt?: string | null;
  isLastAttemptExpired?: boolean | null;
};

export type InterviewerList = {
  fullName: string;
  id: number;
  interviewToken: string;
  isActive: boolean;
  userId: number;
  hostId: any[];
};

export type Scorecard = {
  [key: string]: ScorecardValue;
};

export type ScorecardSection = [key: string, value: ScorecardValue];

export type ScorecardAttribute = {
  name: string;
  score: number;
};

export type ScorecardValue = {
  attributes: ScorecardAttribute[];
};

export type InterviewScore = {
  question_text: string;
  english_question_text?: string | null;
  justification: string;
  score: number;
};

export type EvaluationResponseDto = {
  id: number;
  bookingId: string;
  recording_url: string | null;
  candidateId: number;
  createdAt: string;
  updatedAt: string;
  interview_feedback: string;
  interviewScore: string | number;
  summary: string;
  transcript: string;
  transcript_diarized: string;
  english_transcript?: string | null;
  jobOpeningId: number;
  offsetDateTime: string;
  interview_round: InterviewRoundResponseDTO;
  scorecard: Scorecard[];
  interview_score: InterviewScore[];
};

export type InterviewBookingResponseDto = {
  bookingSentAt: string | null;
  candidateId: number;
  createdAt: string;
  description: string;
  endTime: string;
  externalBookingId: string | null;
  id: number;
  interviewRoundId: number;
  jobOpeningId: number;
  organizerEmail?: string;
  interviewerRoundType: string;
  organizerName?: string;
  startTime: string;
  status: string;
  sequence: number;
  timezone: string | null;
  title: string;
  updatedAt: string;
  videoCallId: string | number;
  videoCallPassword: string;
  videoCallUrl: string;
};

export type CandidateByIdResponse = {
  status: sting;
  message: string;
  candidateId: number;
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
  address: string;
  atsCandidateCreatedTime?: string;
  atsCandidateId?: string;
  currentJobTitle?: string;
  skills: string | null;
  education?: string;
  resumeFilePath: string;
  resumeUploadDate?: string;
  contactedByAI: boolean;
  lastAICallTimestamp: string;
  atsScore: number;
  isAtsCandidate: boolean;
  isAttachmentPresent?: boolean;
  isRecentFromAts?: boolean;
  isResumeDownloadedFromAts?: boolean;
  lastAICallTimestamp?: string;
  linkedInProfile?: string;
  nextCandidateId?: number;
  previousCandidateId?: number;
  isNew?: boolean;
  source: string;
  companyName: string;
  updatedAt: string;
  scoreExperience: string;
  scoreKeywords: string;
  scoreQualifications: string;
  scoreSkills: string;
  scoreDeductions: string;
  interviewRounds: InterviewRoundResponseDTO[];
  nextRoundDetails: {
    currentRoundStatus: string | null;
    nextRound: {
      round: {
        name: string;
      };
    };
    currentRound: {
      id: number;
    };
  };
  interviewRounds: InterviewRoundResponseDTO[];
  evaluationResponseDto: EvaluationResponseDto[];
  interviewBookingResponseDto?: {
    interviewerRoundType: string;
    interviewerToken: string;
    [key: string]: any;
  }[];
  [key: string]: any;
};

export type GetAllCandidatesResponse = {
  data: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    address: string;
    currentJobTitle: string;
    skills: string | null;
    education: string | null;
    resumeFilePath: string;
    resumeUploadDate: string;
    contactedByAI: boolean | null;
    lastAICallTimestamp: string | null;
    atsScore: number;
    nextRoundDetails: {
      currentRoundStatus: string | null;
      nextRound: {
        round: {
          name: string;
        };
      };
    };
    linkedInProfile: string | null;
    source: string;
    isAttachmentPresent: boolean | null;
    atsCandidateId: string | null;
    isResumeDownloadedFromAts: boolean | null;
    isRecentFromAts: boolean | null;
    isAtsCandidate: boolean | null;
    isNew?: boolean;
    createdAt: string | null;
    updatedAt: string | null;
  }[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      empty: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalPages: number;
  totalElements: number;
  message: {
    status: string;
    message: string;
    code: string;
  };
};

// ATS Job Details API Types
export type AtsJobDropdownItem = {
  id: string;
  jobOpeningCode: string;
  jobTitle: string;
  combinedName: string;
};

export type GetAtsDropdownsValuesResponse = {
  data: AtsJobDropdownItem[];
  errorCode: string | null;
  providerName: string | null;
  operationId: string | null;
};

export type GetAllAtsNamesByCompanyIdResponse = {
  data: [
    {
      id: string;
      name: string;
      errorCode: string | null;
      providerName: string | null;
      operationId: string | null;
    },
  ];
};
export type GetAllAtsNamesByCompanyIdRequest = Record<string, never>;

export type GetAtsJobByIdRequest = {
  atsJobOpeningId: string;
};

export type AtsJobOpeningData = {
  id: null | number;
  jobProfileCode: string;
  shift: null | string;
  openings: number;
  minSalary: null | number;
  maxSalary: null | number;
  minExperience: null | number;
  maxExperience: null | number;
  hiringManager: null | {
    id: number;
    name: string;
  };
  recruiter: null | {
    id: number;
    name: string;
  };
  referralBonus: null | number | string;
  communicationSkills: null | string;
  exemptionStatus: null | {
    id: number;
    statusName: string;
  };
  mandatorySkills: {
    id: number;
    skillName: string;
  }[];
  optionalSkills: Skill[];
  jobTitle: {
    id: number;
    jobTypeName: string;
  }[];
  department: {
    id: number;
    departmentName: string;
  }[];
  officeLocation: {
    id: number;
    locationName: string;
  }[];
  jobType: {
    id: number;
    jobTypeName: string;
  }[];
  educationPreference: {
    id: number;
    educationLevel: string;
  }[];
};

// ATS Fetch All Candidates API Types
export type FetchAllAtsCandidatesRequest = {
  atsJobOpeningId: string;
};

export type FetchAllAtsCandidatesResponse = {
  success: boolean;
  message: string;
  data: any; // Replace 'any' with a more specific type if available
  errorCode: string | null;
  providerName: string | null;
  operationId: string | null;
};

export type RefreshResumeRequest = {
  candidateId: number;
};

export type FetchAllMembersResponse = {
  email: any;
  userId: number;
  name: string;
}[];

export type InterviewScheduleRequest = {
  candidateId: number;
  jobId: number;
  interviewRoundId: number;
};

export type InterviewScheduleResponse = {
  success: boolean;
  message: string;
  data: [];
};

export type BulkScheduleInterviewResult = {
  candidateId: number;
  candidateName: string;
  jobId: string | number;
  roundId: number;
  success: boolean;
  message: string;
  errorCode: string | null;
};

export type BulkScheduleInterviewResponse = {
  success: boolean;
  message: string;
  data?: {
    totalRequested: number;
    successCount: number;
    failureCount: number;
    results: BulkScheduleInterviewResult[];
    completeSuccess: boolean;
    partialSuccess: boolean;
  };
};

export type SubstituteInterviewerRequest = {
  candidateId: number;
  jobId: number;
  interviewRoundId: number;
  hostsId: number[];
};

export type SubstituteInterviewerResponse = {
  status: boolean | string;
  message: string;
  code: string;
};

export type CancelBookingResponse = {
  status: string;
  message: string;
  code: string;
};

export type CancelBookingRequest = {
  externalBookingId: string;
  reason: string;
};

export type SkipInterviewResponse = {
  status: string;
  message: string;
  code: string;
};

export type SkipInterviewRoundRequest = {
  candidateId: number;
  interviewRoundId: number;
  jobOpeningId: number;
  reason: string;
};

type FinalFeedbackStatusQueryParams = {
  jobOpeningId?: number;
  candidateId?: number;
  roundId?: number;
};

type FinalFeedbackStatusBody = {
  status: string;
  feedback: string;
};

export type FinalFeedbackStatusResponse = {
  success: boolean;
  message: string;
};

export type FinalFeedbackStatusRequest = {
  query: FinalFeedbackStatusQueryParams;
  body: FinalFeedbackStatusBody;
};

export type CandidateResumeStatusResponse = {
  success: boolean;
  message: string;
};

export type FetchCandidateSourceResponse = string[];

export type FetchCandidateListingInterviewStatusResponse = {
  id: number;
  code: string;
  label: string;
  description: string;
  sortOrder: number;
}[];

export type EditCandidateResponse = {
  success: string;
  message: string;
};

export type EditCandidateRequest = {
  candidateId?: number;
  linkedInProfile?: string;
  FormData;
};

export type UpdateInterviewStatusRequest = {
  externalBookingId: string;
  status: string;
};

export type CandidateResumeStatusRequest = {
  candidateId?: number;
  status?: string | null;
  rating: number;
};

// dateTimeRangePicker
export type Filters = {
  startDateTime: string;
  endDateTime: string;
};

export type DateTimeRange = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

export type DateTimePayload = {
  startDateTime: string;
  endDateTime: string;
};

export type SidebarItem = {
  key: string;
  label: string;
  roundType?: string;
  status?: string;
  score?: number | string;
  static?: boolean;
  isBlocked?: boolean;
  finalRating?: number | null;
};

export type AgoraTokenResponse = {
  success: boolean;
  message: string;
  data: {
    token: string;
    agoraChannelName: string;
    agoraChannelType: string;
    agoraChannelExpirationTime: string;
    jobId: number;
    candidateId: number;
    interviewRoundId: number;
    role: string;
    uid: number;
    bookingId: number;
    sessionId: string;
    categorizedQuestions: {
      openDate: string;
      createdAt: string;
      updatedAt: string;
      deleted: boolean;
      categories: {
        [categoryName: string]: {
          id: number;
          question: string;
          categoryId: number;
          categoryName: string;
          status: string | null;
          createdBy: string | null;
          jobOpeningId: number | null;
          createdAt: string | null;
        }[];
      };
    };
  };
};

export type EditAiQuestionForScoringRequest = {
  candidateId: number;
  questionId: number;
  score?: number | null;
  passFailResult?: boolean | null;
  interviewRoundId?: number | null;
};

export type EditAiQuestionForScoringResponse = {
  message: string;
  status: boolean;
};

export type SaveScoreRequest = {
  userId: number;
  candidateId: number;
  score: number | null;
  interviewRoundId: number;
};

export type SaveScoreResponse = {
  message: string;
  status: boolean;
};

export type SaveFeedbackRequest = {
  userId: number;
  candidateId: number;
  feedback: string;
  interviewRoundId: number;
};

export type SaveFeedbackResponse = {
  message: string;
  status: boolean;
};

export type OrgUser = {
  id: number;
  firstName: string;
  lastName: string;
  emailId: string;
  title: string | null;
  countryCode: string;
  role: string | null;
  status: boolean;
  employeeId: string;
  archived: boolean;
};

export type UploadChunkRequest = {
  chunk: string;
};

export type UploadChunkResponse = string;

export type MergeChunksResponse = string;

export type GetAiQuestionsByUserIdResponse = {
  categorizedQuestions: {
    categories: {
      [category: string]: {
        id: number;
        question: string;
        score: number;
        createdBy: number;
        jobOpeningId: number;
        createdAt: string;
      }[];
    };
  };
  feedback: string;
  overallScore: number;
};

export type JobOpeningFilterRequest = {
  page?: number;
  value: {
    searchQuery?: string;
    status?: boolean | undefined;
    isArchived?: boolean | undefined;
    startDateTime?: string;
    endDateTime?: string;
    isAll?: boolean | undefined;
    isDraft?: boolean | undefined;
    isClosed?: boolean | undefined;
  };
  pageSize?: number;
};

export type JobOpeningFilterResponse = {
  success: boolean;
  message: string;
  data: any;
  totalElements?: number;
};

export type InterviewRounds = {
  roundType: string;
  totalInterviews: number;
  totalCandidates: number;
  selectedCandidates: number;
  rejectedCandidates: number;
};

export type InterviewSummaryDashboardResponse = {
  allInterviews: {
    totalInterviews: number;
    totalCandidates: number;
    totalJobOpenings: number;
    selectedCandidates: number;
    rejectedCandidates: number;
    totalCandidateEngage: number;
    closureRate: number;
  };
  interviewRounds: InterviewRounds[];
};

export type InterviewSummaryDashboardRequest = {
  year: number;
  month: number;
  isOwner: boolean;
};

export type OptionType = {
  label: string;
  value: number;
};

export type SourceOptions = {
  label: string;
  value: string;
}[];

export type InterviewStatusOptions = {
  label: string;
  value: number;
}[];

export type SortDirection = 'asc' | 'desc' | null;

export type SourceItem = {
  id: string;
  video: MediaStreamTrack | null;
  audio?: MediaStreamTrack | null;
  label: string;
};

export type RoundTypeResponse = {
  data: [
    {
      id: number;
      name: string;
    },
  ];
  success: boolean;
  message: string;
};

export type GetAiInterviewQuestionsByRoundResponse = {
  categories: {
    'Competency-Based Questions': Array<{
      id: number;
      question: string;
      categoryId: number;
      categoryName: string;
      status: any;
      createdBy: any;
      jobOpeningId: any;
      createdAt: any;
    }>;
    'Open-Ended Questions': Array<{
      id: number;
      question: string;
      categoryId: number;
      categoryName: string;
      status: any;
      createdBy: any;
      jobOpeningId: any;
      createdAt: any;
    }>;
    'Pass/Fail Questions': Array<{
      id: number;
      question: string;
      categoryId: number;
      categoryName: string;
      status: any;
      createdBy: any;
      jobOpeningId: any;
      createdAt: any;
    }>;
    status: boolean;
    message: string;
  };
};

export type CandidateStatusUpdateItem = {
  jobOpeningId: string | number;
  candidateId: number;
  roundId: number | null;
  status: string;
  comments: string;
  isResumeStatusUpdated: boolean;
  reason: string | undefined;
  isNotifyCandidate: boolean;
  rating: number | null;
};

export type BulkStatusUpdateRequest = {
  candidateStatusUpdateList: CandidateStatusUpdateItem[];
};

export type BulkStatusUpdateResponse = {
  status: string;
  message?: string;
  code?: string;
};

export type CandidateStatusProps = {
  isOpen: boolean;
  onClose: () => void;
  candidateIds: number[];
  statusType:
    | 'SELECTED'
    | 'NOT_SELECTED'
    | 'REACTIVATE'
    | 'ADVANCE'
    | 'FINAL_ROUND_SHORTLIST'
    | 'REVIEW_AWAITED';
  candidateNames: string[];
  currentRoundId?: number | null;
  onStatusUpdate?: () => void;
  onCandidatesUpdate?: (remainingCount: number) => void;
  showSendInviteCheckbox?: boolean;
  sendInviteCheckboxLabel?: React.ReactNode;
  onAdvanceInviteRequested?: (eligibleCandidateIds?: number[]) => Promise<void> | void;
  candidateDetails: Array<{
    candidateId: number;
    jobOpeningId: string | number;
    roundId: number | null;
    candidateName?: string;
    isResumeStatusUpdated?: boolean;
    nextRound?: {
      name: string;
    };
    resumeStatus?: string;
    status?: string;
    interviewStatus?: string;
    interviewRounds?: Array<{
      id: number;
      interviewStatus: string;
      interviewStatusLabel?: string;
      round: {
        name: string;
      };
    }>;
  }>;
};

export type StatusFormData = {
  reason?: string;
  comments: string;
  notifyCandidate: boolean;
  sendInterviewInvite?: boolean;
  finalRating?: number | null;
};
export type SelectedCandidate = {
  id: number;
  name: string;
  nextRoundName?: string;
  roundId?: number | null;
  isEligibleForAdvance: boolean;
  interviewRounds?: Array<{
    id: number;
    interviewStatus: string;
    interviewStatusLabel?: string;
    round: {
      name: string;
    };
  }>;
};

export type NameValidationOptions = {
  label: string;
  required?: boolean;
};
