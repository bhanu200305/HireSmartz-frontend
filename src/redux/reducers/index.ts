import { combineReducers } from '@reduxjs/toolkit';
import api from '../../api';
import { videoIntegrationApi } from '../../api/interview-service/VideoIntegration/index';
import { interviewFeedbackApi } from '../../api/interview-service/InterviewFeedback/index';
import { publicQrApi } from '../../api/candidate-service/PublicQr/index';
import { authApi } from '../../api/authentication-service/authApi';
import { orgApi } from '../../api/organization-service/orgApi';
import { notifApi } from '../../api/notification-service/notifApi';
import { jobApi } from '../../api/job-service/jobApi';
import { aiApi } from '../../api/ai-service/aiApi';
import LoginSlice from '../slices/loginSlice';
import CompanyFilterSlice from '../slices/companyFilterSlice';
import RoleFilterSlice from '../slices/roleFilterSlice';
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
  CompanyFilterSlice,
  RoleFilterSlice,
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
  [authApi.reducerPath]: authApi.reducer,
  [orgApi.reducerPath]: orgApi.reducer,
  [notifApi.reducerPath]: notifApi.reducer,
  [jobApi.reducerPath]: jobApi.reducer,
  [aiApi.reducerPath]: aiApi.reducer,
});

export default rootReducer;
