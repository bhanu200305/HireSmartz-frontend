import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  AiJobDescriptionState,
  InterviewRoundState,
  JobDescriptionState,
  JobDetailsState,
} from '../../types';

type EditJobState = {
  jobOpeningId: string;
  atsJobOpeningId: string;
  details: JobDetailsState;
  description: JobDescriptionState;
  interviewRounds: InterviewRoundState[];
  aiJobDescription: AiJobDescriptionState;
  isDraft: boolean;
  isChanged: boolean;
};

const initialState: EditJobState = {
  atsJobOpeningId: '',
  jobOpeningId: '',
  isDraft: false,
  isChanged: false,
  details: {
    jobProfileCode: '',
    jobTitle: [],
    department: [],
    officeLocation: [],
    jobType: [],
    isMultilingual: false,
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
    state: '',
    country: '',
    educationPreference: [],
    mandatorySkills: [],
    optionalSkills: [],
  },
  description: {
    educationPreference: [],
    // communicationSkills: '',
    mandatorySkills: [],
    optionalSkills: [],
    otherRequirements: '',
  },
  interviewRounds: [],
  aiJobDescription: {
    id: '',
    jobDescription: '',
    jobOpeningId: '',
  },
};

const editJobSlice = createSlice({
  name: 'editJob',
  initialState,
  reducers: {
    setEditJobOpeningId: (state, action: PayloadAction<string>) => {
      state.jobOpeningId = action.payload;
    },
    setAtsJobOpeningId: (state, action: PayloadAction<string>) => {
      state.atsJobOpeningId = action.payload;
    },
    setIsDraft: (state, action: PayloadAction<boolean>) => {
      state.isDraft = action.payload;
    },
    updateEditJobDetails: (state, action: PayloadAction<Partial<JobDetailsState>>) => {
      state.details = { ...state.details, ...action.payload };
    },
    updateEditJobDescription: (state, action: PayloadAction<Partial<JobDescriptionState>>) => {
      state.description = { ...state.description, ...action.payload };
    },
    updateEditInterviewRounds: (state, action: PayloadAction<InterviewRoundState[]>) => {
      state.interviewRounds = action.payload;
    },
    updateEditAiJobDescription: (state, action: PayloadAction<AiJobDescriptionState>) => {
      state.aiJobDescription = action.payload;
    },
    resetEditJobState: () => initialState,
    setIsChanged: (state, action: PayloadAction<boolean>) => {
      state.isChanged = action.payload;
    },
  },
});

export const {
  setEditJobOpeningId,
  updateEditJobDetails,
  updateEditJobDescription,
  updateEditInterviewRounds,
  resetEditJobState,
  updateEditAiJobDescription,
  setAtsJobOpeningId,
  setIsDraft,
  setIsChanged,
} = editJobSlice.actions;

export default editJobSlice.reducer;
