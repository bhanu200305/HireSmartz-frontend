// Wire types for job-service's /job-openings surface — mirrors
// app/modules/jobs/api/{requests,responses}.py field-for-field. This is the
// REAL backend contract: a from-scratch draft/upload/AI-generate wizard with
// async JD status polling, a resume/interview scoring split, a nested
// round->questions question bank, and explicit publish/close/reopen
// transitions — not the legacy `src/api/job-service/**` shapes (isDraft/
// isClosed booleans on one big job object, synchronous JD fields, a flat
// scoring config) those replace.

export type JDStatus = 'PROCESSING' | 'GENERATING' | 'READY' | 'FAILED';
export type SkillType = 'mandatory' | 'optional';
export type ScoringStage = 'RESUME' | 'INTERVIEW';
export type JobStatusFilter = 'draft' | 'published' | 'closed';

// -- draft / upload / AI-generate entry paths --------------------------------

export type CreateDraftResponse = {
  org_job_opening_id: string;
  job_profile_code: string;
  is_draft: boolean;
  is_published: boolean;
};

export type UploadJdResponse = {
  org_job_opening_id: string;
  jd_status: JDStatus;
};

export type JdBulkUploadResponse = {
  batch_id: string;
  total_files: number;
  job_ids: string[];
};

export type JdUploadBatchItem = {
  filename: string;
  status: 'processing' | 'succeeded' | 'failed';
  org_job_opening_id: string | null;
  error: string | null;
};

export type JdUploadBatchSummaryResponse = {
  batch_id: string;
  total_files: number;
  processing_count: number;
  succeeded_count: number;
  failed_count: number;
  items: JdUploadBatchItem[];
};

export type ImportAtsJobArgs = {
  ats_provider: string;
  ats_job_id: string;
};

export type ImportAtsJobResponse = {
  org_job_opening_id: string;
  jd: string;
  ats_mapping: { jd_ats_id: string; ats_job_id: string; ats_provider: string };
  auto_filled_fields: {
    title: string | null;
    location: string | null;
    min_salary: number | null;
    max_salary: number | null;
  };
};

export type GenerateJdResponse = {
  org_job_opening_id: string;
  jd_status: JDStatus;
};

export type JdStatusResponse = {
  status: JDStatus;
  error_message: string | null;
};

export type EditJdResponse = {
  jd: string;
};

export type RegenerateJdResponse = {
  jd_status: JDStatus;
};

export type EnhanceJdResponse = {
  enhance_status: 'PROCESSING' | 'READY';
};

export type JdEnhancementSection = {
  section_name: string;
  original_text: string;
  enhanced_text: string;
};

export type JdEnhancementSuggestedSkill = {
  skill_id: string;
  skill_label: string;
  category: string | null;
  suggested_type: SkillType;
};

export type JdEnhancementResultResponse = {
  status: 'PROCESSING' | 'READY';
  sections: JdEnhancementSection[];
  suggested_skills: JdEnhancementSuggestedSkill[];
};

export type ReviewJdEnhancementAction =
  | 'accept_all'
  | 'reject_all'
  | 'accept_partial'
  | 'accept_edited';

export type ReviewJdEnhancementArgs = {
  jobId: string;
  action: ReviewJdEnhancementAction;
  accepted_sections?: string[];
  edited_jd?: string;
};

export type ReviewJdEnhancementResponse = {
  jd: string;
  skills_added: number;
};

// -- job details + skills ----------------------------------------------------

export type JobLocation = {
  job_location_id: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  country: string;
  zip: string;
};

export type JobSkillView = {
  skill_id: string;
  skill_type: SkillType;
  skill_label: string;
  category: string | null;
  source: string | null;
};

export type JobDetailsResponse = {
  org_job_opening_id: string;
  job_profile_code: string;
  job_title_id: string | null;
  department_id: string | null;
  shift_id: string | null;
  mode_id: string | null;
  job_type_id: string | null;
  hiring_manager_ids: string[];
  recruiter_ids: string[];
  job_open_date: string | null;
  job_close_date: string | null;
  vacancies: number | null;
  min_experience_req: number | null;
  max_experience_req: number | null;
  lower_salary_range: number | null;
  upper_salary_range: number | null;
  referral_bonus: number | null;
  responsibilities: string | null;
  requirements: string | null;
  other_requirements: string | null;
  education_preference: string[];
  communication_skills: string | null;
  use_culture_intro: boolean;
  is_multilingual: boolean;
  is_exempted: boolean;
  is_remote: boolean;
  resume_submission_enabled: boolean;
  audio_call_enabled: boolean;
  jd: string | null;
  locations: JobLocation[];
  skills: JobSkillView[];
};

export type SaveJobDetailsSkill = {
  skill_id: string;
  skill_type: SkillType;
};

export type SaveJobDetailsLocation = {
  job_location_id?: string;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state: string;
  country: string;
  zip: string;
};

export type SaveJobDetailsArgs = {
  jobId: string;
  job_title_id?: string | null;
  department_id?: string | null;
  shift_id?: string | null;
  mode_id?: string | null;
  job_type_id?: string | null;
  hiring_manager_ids?: string[];
  recruiter_ids?: string[];
  job_open_date?: string | null;
  job_close_date?: string | null;
  vacancies?: number | null;
  min_experience_req?: number | null;
  max_experience_req?: number | null;
  lower_salary_range?: number | null;
  upper_salary_range?: number | null;
  referral_bonus?: number | null;
  responsibilities?: string | null;
  requirements?: string | null;
  other_requirements?: string | null;
  education_preference?: string[];
  communication_skills?: string | null;
  use_culture_intro?: boolean;
  is_multilingual?: boolean;
  is_exempted?: boolean;
  is_remote?: boolean;
  resume_submission_enabled?: boolean;
  audio_call_enabled?: boolean;
  locations?: SaveJobDetailsLocation[];
  skills?: SaveJobDetailsSkill[];
};

// -- notes --------------------------------------------------------------------

export type JobNote = {
  id: string;
  org_job_opening_id: string;
  note_text: string;
  created_by: string;
  created_at: string;
};

export type JobNotesResponse = {
  notes: JobNote[];
};

export type AddJobNoteArgs = {
  jobId: string;
  note_text: string;
};

export type EditJobNoteArgs = {
  jobId: string;
  noteId: string;
  note_text: string;
};

export type DeleteJobNoteArgs = {
  jobId: string;
  noteId: string;
};

// -- suggested skills -----------------------------------------------------

export type SuggestedSkillsArgs = {
  jobId: string;
  job_title_id?: string;
  job_title_text?: string;
};

export type SuggestedSkill = {
  skill_id: string;
  skill_label: string;
  category: string | null;
  suggested_skill_type: SkillType;
  source: 'TITLE_MAPPING' | 'AI_EXTRACTED';
};

export type SuggestedSkillsResponse = {
  skills: SuggestedSkill[];
};

// -- scoring criteria -----------------------------------------------------

export type ScoringWeightEntry = {
  category_name: string;
  weight_pct: number;
};

export type ScoringCriteriaResponse = {
  org_job_opening_id: string;
  is_locked: boolean;
  resume: { stage: 'RESUME'; weights: ScoringWeightEntry[] };
  interview: { stage: 'INTERVIEW'; weights: ScoringWeightEntry[] };
};

export type SaveScoringCriteriaArgs = {
  jobId: string;
  resume_weights: ScoringWeightEntry[];
  interview_weights: ScoringWeightEntry[];
};

// -- interview sequence -----------------------------------------------------

export type InterviewSequenceRound = {
  id: string;
  round_id: string;
  sequence: number;
  description: string | null;
  duration: number | null;
  variant: string | null;
  round_name: string;
};

export type InterviewSequenceResponse = {
  rounds: InterviewSequenceRound[];
};

export type SaveInterviewSequenceRound = {
  id?: string;
  round_id: string;
  sequence: number;
  description?: string | null;
  duration?: number | null;
  variant?: string | null;
};

export type SaveInterviewSequenceArgs = {
  jobId: string;
  rounds: SaveInterviewSequenceRound[];
};

// -- audio questions (view-only) + question bank -----------------------------

export type AudioQuestion = {
  question_id: string;
  question_text: string;
};

export type AudioQuestionsResponse = {
  questions: AudioQuestion[];
};

export type JobQuestion = {
  id: string;
  question_text: string;
  source: string;
  answer_text: string | null;
  interview_round_id: string | null;
  topic_skill: string | null;
};

export type JobQuestionRound = {
  round_instance_id: string;
  round_id: string;
  round_name: string;
  sequence: number;
  variant: string | null;
  questions: JobQuestion[];
};

export type QuestionsResponse = {
  rounds: JobQuestionRound[];
};

export type GenerateQuestionsArgs = {
  jobId: string;
  question_count: number;
};

export type GenerateQuestionsResponse = {
  generation_status: 'GENERATING';
};

export type RegenerateQuestionsArgs = {
  jobId: string;
  question_count: number;
  instruction?: string;
};

export type RegenerateQuestionsResponse = {
  generation_status: 'GENERATING';
};

export type SaveQuestionEntry = {
  id?: string;
  question_text: string;
  answer_text?: string | null;
  interview_round_id?: string | null;
  topic_skill?: string | null;
};

export type SaveQuestionsArgs = {
  jobId: string;
  questions: SaveQuestionEntry[];
};

export type BulkImportQuestionsFailedRow = {
  row_number: number;
  question_text: string | null;
  error: string;
};

export type BulkImportQuestionsSkippedRow = {
  row_number: number;
  question_text: string;
};

export type BulkImportQuestionsResponse = {
  imported_count: number;
  failed_rows: BulkImportQuestionsFailedRow[];
  skipped_duplicate_rows: BulkImportQuestionsSkippedRow[];
  questions: JobQuestion[];
};

export type BulkImportQuestionsArgs = {
  jobId: string;
  file: File;
};

// -- publish / close / reopen -----------------------------------------------

export type PublishValidationResponse = {
  is_valid: boolean;
  failed_checks: string[];
};

export type PublishJobResponse = {
  org_job_opening_id: string;
  is_draft: boolean;
  is_published: boolean;
};

export type CloseJobArgs = {
  jobId: string;
  closure_reason_id?: string;
  custom_reason?: string;
  notify_candidates: boolean;
};

export type CloseJobResponse = {
  org_job_opening_id: string;
  is_published: boolean;
  is_closed: boolean;
};

export type ReopenJobResponse = {
  org_job_opening_id: string;
  is_published: boolean;
  is_closed: boolean;
};

// -- listing / stats / counts -------------------------------------------------

export type JobSummary = {
  org_job_opening_id: string;
  job_profile_code: string;
  title: string | null;
  department_id: string | null;
  job_title_id: string | null;
  is_draft: boolean;
  is_published: boolean;
  is_closed: boolean;
  jd_status: JDStatus;
  is_remote: boolean;
  job_open_date: string | null;
  job_close_date: string | null;
  vacancies: number | null;
  candidate_count: number;
  interviewed_count: number;
  selected_count: number;
  not_selected_count: number;
};

export type JobListArgs = {
  page?: number;
  page_size?: number;
  status?: JobStatusFilter;
  job_title_id?: string;
  text?: string;
  open_date_from?: string;
  open_date_to?: string;
  is_remote?: boolean;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
};

export type JobListResponse = {
  items: JobSummary[];
  total: number;
  page: number;
  page_size: number;
};

export type JobStatsResponse = {
  draft_count: number;
  published_count: number;
  closed_count: number;
  total_count: number;
};

export type ActiveJobCountResponse = {
  count: number;
};

export type JobCountsByDepartmentResponse = {
  departments: { department_id: string; count: number }[];
};

export type JobCountsByLocationResponse = {
  locations: { job_location_id: string; count: number }[];
};

// -- full detail / wizard state / duplicate -----------------------------------

export type InterviewRoundResponse = InterviewSequenceRound;

export type JobOpeningDetailResponse = {
  org_job_opening_id: string;
  is_draft: boolean;
  is_published: boolean;
  is_closed: boolean;
  jd_status: JDStatus;
  details: JobDetailsResponse;
  scoring: ScoringCriteriaResponse;
  interview_rounds: InterviewRoundResponse[];
  questions: JobQuestion[];
};

export type WizardStage = {
  stage: string;
  is_complete: boolean;
};

export type WizardStateResponse = {
  stages: WizardStage[];
  resume_at: string | null;
};

export type DuplicateJobResponse = {
  org_job_opening_id: string;
  job_profile_code: string;
  is_draft: boolean;
};
