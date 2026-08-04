import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ATS, InterviewRoundState, JobDescriptionState, JobDetailsState } from '../../types';
// import { update } from 'lodash-es';

type JobState = {
  details: JobDetailsState;
  description: JobDescriptionState;
  jobOpeningId: number;
  interviewRounds: InterviewRoundState[];
  ats: ATS;
  aiJobDescriptionId: number | null;
  isFormCompleted?: boolean;
};

const initialState: JobState = {
  jobOpeningId: 0,
  aiJobDescriptionId: null,
  isFormCompleted: false,
  details: {
    jobProfileCode: '',
    jobTitle: [],
    department: [],
    officeLocation: [],
    jobType: [],
    shiftStart: '',
    shiftEnd: '',
    openings: null,
    exemptionStatus: null,
    minSalary: null,
    maxSalary: null,
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
    setJobOpeningId: (state, action: PayloadAction<number>) => {
      state.jobOpeningId = action.payload;
    },
    setIsFormCompleted: (state, action: PayloadAction<boolean>) => {
      state.isFormCompleted = action.payload;
    },
    setAiJobDescriptionId: (state, action: PayloadAction<number>) => {
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
} = jobSlice.actions;
export default jobSlice.reducer;
