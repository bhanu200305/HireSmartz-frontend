import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ATS, InterviewRoundState, JobDescriptionState, JobDetailsState } from '../../types';
// import { update } from 'lodash-es';

type JobState = {
  details: JobDetailsState;
  description: JobDescriptionState;
  /** UUID from job-service (`org_job_opening_id`). Empty string = not created yet. */
  jobOpeningId: string;
  interviewRounds: InterviewRoundState[];
  ats: ATS;
  /** Same as jobOpeningId on the real contract — JD hangs off the job, not a separate entity. */
  aiJobDescriptionId: string | null;
  isFormCompleted?: boolean;
  isScoringCompleted?: boolean;
};

const initialState: JobState = {
  jobOpeningId: '',
  aiJobDescriptionId: null,
  isFormCompleted: false,
  isScoringCompleted: false,
  details: {
    jobProfileCode: '',
    jobTitle: [],
    department: [],
    officeLocation: [],
    jobType: [],
    shift: [],
    openings: null,
    exemptionStatus: [],
    exemptMinSalary: null,
    exemptMaxSalary: null,
    nonExemptMinSalary: null,
    nonExemptMaxSalary: null,
    referralBonus: null,
    minExperience: null,
    maxExperience: null,
    openDate: '',
    hiringManagers: [],
    recruiters: [],
    country: '',
    state: '',
    educationPreference: [],
    mandatorySkills: [],
    optionalSkills: [],
    responsibilities: '',
    otherRequirements: '',
    benefits: '',
  },
  description: {
    educationPreference: [],
    // experience: 0,
    //communicationSkills: '',
    mandatorySkills: [],
    optionalSkills: [],
  },
  ats: {
    id: '',
    name: '',
  },
  interviewRounds: [],
};

const jobSlice = createSlice({
  name: 'job',
  initialState,
  reducers: {
    updateJobDetails: (state, action: PayloadAction<Partial<JobDetailsState>>) => {
      state.details = { ...state.details, ...action.payload };
    },
    updateJobDescription: (state, action: PayloadAction<Partial<JobDescriptionState>>) => {
      state.description = {
        ...state.description,
        ...action.payload,
      };
    },
    updateATS: (state, action: PayloadAction<Partial<ATS>>) => {
      state.ats = { ...state.ats, ...action.payload };
    },
    updateInterviewRound: (state, action: PayloadAction<InterviewRoundState[]>) => {
      state.interviewRounds = action.payload;
    },
    setJobOpeningId: (state, action: PayloadAction<string>) => {
      state.jobOpeningId = action.payload;
    },
    setIsFormCompleted: (state, action: PayloadAction<boolean>) => {
      state.isFormCompleted = action.payload;
    },
    setIsScoringCompleted: (state, action: PayloadAction<boolean>) => {
      state.isScoringCompleted = action.payload;
    },
    setAiJobDescriptionId: (state, action: PayloadAction<string | null>) => {
      state.aiJobDescriptionId = action.payload;
    },
    resetJobDescription: (state) => {
      state.description = initialState.description;
    },
    resetJobState: () => initialState,
  },
});

export const {
  updateJobDetails,
  updateJobDescription,
  updateInterviewRound,
  resetJobState,
  updateATS,
  setJobOpeningId,
  setAiJobDescriptionId,
  resetJobDescription,
  setIsFormCompleted,
  setIsScoringCompleted,
} = jobSlice.actions;
export default jobSlice.reducer;
