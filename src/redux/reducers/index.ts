import { combineReducers } from '@reduxjs/toolkit';
import api from '../../api';
import { videoIntegrationApi } from '../../api/interview-service/VideoIntegration/index';
import { interviewFeedbackApi } from '../../api/interview-service/InterviewFeedback/index';
import { publicQrApi } from '../../api/candidate-service/PublicQr/index';
import LoginSlice from '../slices/loginSlice';
import UserFiltersSlice from '../slices/userFilterSlice';
import CompanyFilterSlice from '../slices/companyFilterSlice';
import JobSlice from '../slices/jobOpeningSlice';
import JobOpeningFiltersSlice from '../slices/jobOpeningFilterSlice';
import OrgUserFilterSlice from '../slices/OrgUserFilterSlice';
import EditJobSlice from '../slices/editJobOpeningSlice';
import CandidateFilterSlice from '../slices/CandidateFilterSlice';
import cfpDashboardFiltersSlice from '../slices/CFPDashboardFilterSlice';
import ownerDashboardFiltersSlice from '../slices/OwnerDashboardFilterSlice';
import activitySearchFilterSlice from '../slices/DashboardActivityFilterSlice';
import globalSearchSlice from '../slices/globalSearchSlice';
import streamSlice from '../slices/streamSlice';
import notificationSlice from '../slices/notificationSlice';

const rootReducer = combineReducers({
  LoginSlice,
  UserFiltersSlice,
  CompanyFilterSlice,
  JobSlice,
  JobOpeningFiltersSlice,
  OrgUserFilterSlice,
  EditJobSlice,
  CandidateFilterSlice,
  cfpDashboardFiltersSlice,
  ownerDashboardFiltersSlice,
  activitySearchFilterSlice,
  globalSearchSlice,
  streamSlice,
  notificationSlice,
  [api.reducerPath]: api.reducer,
  [videoIntegrationApi.reducerPath]: videoIntegrationApi.reducer,
  [interviewFeedbackApi.reducerPath]: interviewFeedbackApi.reducer,
  [publicQrApi.reducerPath]: publicQrApi.reducer,
});

export default rootReducer;
