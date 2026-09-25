import { notifApi } from '../notifApi';

/**
 * Matches notification-service's `PreferenceItem`/`PreferencesView`
 * (app/modules/notifications/api/responses.py) field-for-field.
 *
 * `items` now only lists switches that actually work (today: Activity by
 * email / Activity in-app) — `is_editable` is always true here, so there's
 * nothing left to render as a disabled switch. `label`/`description`/
 * `channel_label` are server-supplied display text, not derived client-side.
 */
export interface PreferenceItem {
  category: string;
  channel: string;
  is_enabled: boolean;
  is_editable: boolean;
  label: string;
  description: string;
  channel_label: string;
}

/** A required category (Security alerts, Account setup, Service emails) —
 * read-only, no switch, shown once with its reason. */
export interface AlwaysOnPreference {
  category: string;
  label: string;
  reason: string;
  channels: string[];
}

export interface PreferencesView {
  items: PreferenceItem[];
  always_on: AlwaysOnPreference[];
  /** Set for platform accounts, who have no editable switches — `items` is
   * empty when this is set. Render this instead of the switch list. */
  notice: string | null;
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
