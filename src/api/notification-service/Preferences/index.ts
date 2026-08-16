import { notifApi } from '../notifApi';

/**
 * Matches notification-service's `PreferenceItem`/`PreferencesView`
 * (app/modules/notifications/api/responses.py) field-for-field.
 *
 * `GET /v1/preferences/me` always returns every (category, channel) pair —
 * absence of a stored row means "allowed", not "unknown" — so this is never
 * a partial list to merge against local defaults; render it as-is.
 */
export interface PreferenceItem {
  category: string;
  channel: string;
  is_enabled: boolean;
  /** False for categories the catalogue marks non-opt-outable (security,
   * transactional, onboarding) — render disabled with an explanation, never
   * hidden. */
  is_editable: boolean;
}

export interface PreferencesView {
  items: PreferenceItem[];
}

export interface SetPreferenceRequest {
  category: string;
  channel: string;
  is_enabled: boolean;
}

const preferencesApi = notifApi.injectEndpoints({
  endpoints: (build) => ({
    getMyNotificationPreferences: build.query<PreferencesView, void>({
      query: () => ({
        url: '/v1/preferences/me',
        method: 'GET',
      }),
      providesTags: ['NotificationPreferences'],
    }),
    setNotificationPreference: build.mutation<void, SetPreferenceRequest>({
      query: (body) => ({
        url: '/v1/preferences/me',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['NotificationPreferences'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetMyNotificationPreferencesQuery, useSetNotificationPreferenceMutation } =
  preferencesApi;
