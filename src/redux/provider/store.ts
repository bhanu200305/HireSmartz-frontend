import storage from 'redux-persist/lib/storage';
import { configureStore, Middleware } from '@reduxjs/toolkit';
import { persistStore, persistReducer, PersistConfig } from 'redux-persist';
import rootReducer from '../reducers';
import api from '../../api';
import { interviewApi } from '../../api/interview-service/client';
import { publicApplyApi } from '../../api/candidate-service/PublicApply/index';
import { candidateApi } from '../../api/candidate-service/candidateApi';
import { authApi } from '../../api/authentication-service/authApi';
import { orgApi } from '../../api/organization-service/orgApi';
import { notifApi } from '../../api/notification-service/notifApi';
import { jobApi } from '../../api/job-service/jobApi';
import { aiApi } from '../../api/ai-service/aiApi';
import { auditApi } from '../../api/audit-service/auditApi';

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
  publicApplyApi.middleware,
  candidateApi.middleware,
  authApi.middleware,
  orgApi.middleware,
  notifApi.middleware,
  jobApi.middleware,
  aiApi.middleware,
  auditApi.middleware,
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
