/**
 * Types that mirror job-service's real response/request shapes
 * (services/job-service/docs/API_CONTRACT.md). IDs are UUIDs as strings.
 */

export type JobListStatus = 'draft' | 'published' | 'closed';

export type JdStatus = 'PROCESSING' | 'GENERATING' | 'READY' | 'FAILED';

export type CreateDraftResponse = {
  org_job_opening_id: string;
  job_profile_code: string;
  is_draft: boolean;
  is_published: boolean;
};

export type UploadJdResponse = {
  org_job_opening_id: string;
  jd_status?: 'PROCESSING';
};

export type JdBulkUploadResponse = {
  batch_id: string;
  total_files: number;
  job_ids: string[];
};

export type JdUploadBatchItem = {
  filename: string;
  status: 'processing' | 'succeeded' | 'failed';
  job_id: string | null;
  org_job_opening_id?: string | null;
  error: string | null;
};

export type JdUploadBatchSummary = {
  batch_id: string;
  total_files: number;
  processing_count: number;
  succeeded_count: number;
  failed_count: number;
  items: JdUploadBatchItem[];
};

export type GenerateJdResponse = {
  org_job_opening_id: string;
  jd_status?: 'GENERATING';
};

export type ImportAtsJobRequest = {
  ats_provider: string;
  ats_job_id: string;
};

export type ImportAtsJobResponse = {
  org_job_opening_id: string;
  jd: string;
  ats_mapping: Record<string, unknown>;
  auto_filled_fields: Record<string, unknown>;
};

export type JdStatusResponse = {
  status: JdStatus;
  error_message: string | null;
};

export type JobLocationPayload = {
  job_location_id?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip?: string | null;
  location_code?: string | null;
};

export type JobSkillPayload = {
  skill_id: string;
  skill_type: 'mandatory' | 'optional';
};

export type JobLocationResponse = {
  job_location_id: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string | null;
  location_code: string | null;
};

export type JobSkillResponse = {
  skill_id: string;
  skill_label: string;
  category: string;
  skill_type: string;
  source: string;
};

export type JobDetailsResponse = {
  org_job_opening_id: string;
  job_profile_code: string;
  entry_path: string;
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
  min_experience_req: string | number | null;
  max_experience_req: string | number | null;
  lower_salary_range: number | null;
  upper_salary_range: number | null;
  referral_bonus: number | null;
  responsibilities: string | null;
  requirements: string | null;
  other_requirements: string | null;
  // Both organization-scoped catalogue references now (migration 0014) —
  // not free text. `education_preference_id` is a single value (an
  // org_job_opening row has exactly one); `language_ids` is the set of
  // organization_language rows this job's communication requires.
  // is_multilingual/is_remote/resume_submission_enabled/audio_call_enabled
  // no longer exist on the backend (migrations 0016/0017 — Resume upload
  // and the Intake Call are unconditionally mandatory now, never a
  // recruiter toggle; is_multilingual was unused; is_remote was never
  // backed by anything real).
  education_preference_id: string | null;
  communication_skills: string | null;
  use_culture_intro: boolean;
  language_ids: string[];
  is_exempted: boolean;
  jd: string | null;
  locations: JobLocationResponse[];
  skills: JobSkillResponse[];
};

export type SaveJobDetailsRequest = {
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
  min_experience_req?: number | string | null;
  max_experience_req?: number | string | null;
  lower_salary_range?: number | null;
  upper_salary_range?: number | null;
  referral_bonus?: number | null;
  responsibilities?: string | null;
  requirements?: string | null;
  other_requirements?: string | null;
  education_preference_id?: string | null;
  communication_skills?: string | null;
  use_culture_intro?: boolean;
  language_ids?: string[];
  is_exempted?: boolean;
  locations?: JobLocationPayload[];
  skills?: JobSkillPayload[];
};

export type CategoryWeight = {
  category_name: string;
  weight_pct: number | string;
};

export type ScoringPanelResponse = {
  stage: string;
  weights: CategoryWeight[];
};

export type ScoringCriteriaResponse = {
  org_job_opening_id: string;
  is_locked: boolean;
  resume: ScoringPanelResponse;
  interview: ScoringPanelResponse;
};

export type SaveScoringCriteriaRequest = {
  resume_weights: CategoryWeight[];
  interview_weights: CategoryWeight[];
};

export type InterviewRoundResponse = {
  id: string;
  round_id: string;
  sequence: number;
  description: string | null;
  duration: number | null;
  variant: string | null;
  round_name: string | null;
};

export type InterviewRoundRequest = {
  id?: string | null;
  round_id: string;
  sequence: number;
  description?: string | null;
  duration?: number | null;
  variant?: string | null;
};

export type InterviewSequenceResponse = {
  rounds: InterviewRoundResponse[];
};

export type InterviewRoundType = {
  round_id: string;
  name: string;
  description: string | null;
  max_occurrences: number | null;
  requires_duration: boolean;
  available_variants: string[] | null;
  is_audio_round?: boolean;
  // 'intake_call' | 'resume' | 'verification' | null — marks the fixed
  // anchor round types the Interview Rounds page keeps pinned to the top
  // of the sequence (Resume + Intake Call must stay the top 2).
  special_kind?: 'intake_call' | 'resume' | 'verification' | null;
};

export type QuestionResponse = {
  id: string;
  question_text: string;
  source: string;
  answer_text: string | null;
  interview_round_id: string;
  topic_skill: string | null;
};

export type RoundQuestionsResponse = {
  round_instance_id: string;
  round_id: string;
  round_name: string | null;
  sequence: number;
  variant: string | null;
  questions: QuestionResponse[];
};

export type JobQuestionsResponse = {
  rounds: RoundQuestionsResponse[];
};

export type QuestionRequest = {
  id?: string | null;
  question_text: string;
  answer_text?: string | null;
  interview_round_id?: string | null;
  topic_skill?: string | null;
};

export type AudioQuestionResponse = {
  question_id: string;
  question_text: string;
};

export type FailedQuestionRowResponse = {
  row_number: number;
  question_text: string | null;
  error: string;
};

export type SkippedDuplicateRowResponse = {
  row_number: number;
  question_text: string;
};

export type PublishValidationResponse = {
  is_valid: boolean;
  failed_checks: string[];
};

export type PublishJobResponse = {
  org_job_opening_id: string;
  is_draft: boolean;
  is_published: boolean;
};

export type CloseJobRequest = {
  closure_reason_id?: string | null;
  custom_reason?: string | null;
  notify_candidates: boolean;
};

export type CloseJobResponse = {
  org_job_opening_id: string;
  is_published: boolean;
  is_closed: boolean;
};

export type DuplicateJobResponse = {
  org_job_opening_id: string;
  job_profile_code: string;
  is_draft: boolean;
};

export type JobSummaryResponse = {
  org_job_opening_id: string;
  job_profile_code: string;
  entry_path: string;
  job_title_id: string | null;
  department_id: string | null;
  job_type_id: string | null;
  shift_id: string | null;
  vacancies: number | null;
  job_open_date: string | null;
  min_experience_req: string | number | null;
  max_experience_req: string | number | null;
  salary_min: number | null;
  salary_max: number | null;
  is_remote: boolean | null;
  location_city: string | null;
  hiring_manager_ids: string[];
  recruiter_ids: string[];
  is_draft: boolean;
  is_published: boolean;
  is_closed: boolean;
  created_by: string | null;
  created_at: string;
  candidate_count: number;
  interviewed_count: number;
  selected_count: number;
  not_selected_count: number;
};

export type JobListResponse = {
  items: JobSummaryResponse[];
  total: number;
  page: number;
  page_size: number;
};

export type JobOpeningDetailResponse = {
  org_job_opening_id: string;
  is_draft: boolean;
  is_published: boolean;
  is_closed: boolean;
  jd_status: JdStatus;
  details: JobDetailsResponse;
  scoring: ScoringCriteriaResponse;
  interview_rounds: InterviewRoundResponse[];
  questions: QuestionResponse[];
};

export type JobStatsResponse = {
  draft_count: number;
  published_count: number;
  closed_count: number;
  total_count: number;
};

export type WizardStageResponse = {
  stage: string;
  is_complete: boolean;
};

export type WizardStateResponse = {
  stages: WizardStageResponse[];
  resume_at: string;
};

export type JobNoteResponse = {
  id: string;
  org_job_opening_id: string;
  note_text: string;
  created_by: string;
  created_at: string | null;
};

export type ClosureReason = {
  reason_id: string;
  reason: string;
  description: string | null;
};

export type OrganizationShift = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  duration_minutes: number | null;
};

export type OrganizationJobType = {
  id: string;
  name: string;
  description?: string | null;
};

/** GET /api/v1/platform/master-job-types row — Super Admin catalogue. */
export type MasterJobType = {
  job_type_id: string;
  name: string;
  description: string | null;
};

export type JobMode = {
  job_mode_id: string;
  name: string;
  description: string | null;
};

/** POST/PUT /api/v1/job-modes row — what a job's `mode_id` references. */
export type OrganizationJobMode = {
  id: string;
  name: string;
  description?: string | null;
};

/** POST/PUT /api/v1/job-closure-reasons row — what a job closure's `closure_reason_id` references. */
export type OrganizationClosureReason = {
  id: string;
  reason: string;
  description?: string | null;
};

/** GET /api/v1/master/languages row — what a job's `language_ids` pick from. */
export type Language = {
  language_id: string;
  name: string;
  language_code: string;
};

export type SkillCatalogEntry = {
  skill_id: string;
  skill_label: string;
  skill_category_id: string | null;
  category_name: string;
};

export type AtsConnection = {
  ats_provider: string;
  status: string;
  [key: string]: unknown;
};

export type AtsJobListItem = {
  ats_job_id: string;
  title?: string;
  [key: string]: unknown;
};
