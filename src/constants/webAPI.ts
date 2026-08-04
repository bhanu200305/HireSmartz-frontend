export const LOCALSTORAGE_KEYS = {
  ACCESS: 'cfp_atoken',
  REFRESH: 'cfp_rtoken',
  INTERVIEW: 'cfp_itoken',
  USER: 'cfp_user',
  ACTIVE_TAB: 'activeTab',
  REMEMBER_ME: 'rememberMe',
  REMEMBER_CREDENTIALS: 'rememberedCredentials',
  ROLE: 'role',
};

export const BASE_URL = `${import.meta.env.VITE_BACKEND_ENDPOINT}${import.meta.env.VITE_BACKEND_PREFIX}`;

export const NYLAS_API = {
  CONNECT_URL: '/api/nylas/connect-url',
  GRANT_STATUS_URL: '/api/nylas/grant-status',
  GRANT_URL: '/api/nylas/grant',
};
