import storage from 'redux-persist/lib/storage';
import { configureStore, Middleware } from '@reduxjs/toolkit';
import { persistStore, persistReducer, PersistConfig } from 'redux-persist';
import rootReducer from '../reducers';
import api from '../../api';
import { interviewApi } from '../../api/interview-service/client';
import { interviewFeedbackApi } from '../../api/interview-service/InterviewFeedback/index';
import { publicQrApi } from '../../api/candidate-service/PublicQr/index';
import { publicApplyApi } from '../../api/candidate-service/PublicApply/index';
import { authApi } from '../../api/authentication-service/authApi';
import { orgApi } from '../../api/organization-service/orgApi';
import { notifApi } from '../../api/notification-service/notifApi';
import { jobApi } from '../../api/job-service/jobApi';
import { aiApi } from '../../api/ai-service/aiApi';

export type RootState = ReturnType<typeof rootReducer>;

const persistConfig: PersistConfig<RootState> = {
  key: 'root',
  storage,
  whitelist: ['LoginSlice', 'JobSlice', 'EditJobSlice'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const middleware: Middleware[] = [
  api.middleware,
  interviewApi.middleware,
  interviewFeedbackApi.middleware,
  publicQrApi.middleware,
  publicApplyApi.middleware,
  authApi.middleware,
  orgApi.middleware,
  notifApi.middleware,
  jobApi.middleware,
  aiApi.middleware,
];
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(middleware),
  devTools: import.meta.env.MODE !== 'production',
});

const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
export { store, persistor };
