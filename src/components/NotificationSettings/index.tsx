import BackButton from '../shared/ui/BackButton';
import { useState } from 'react';
import { Switch } from 'antd';
import { MdInfoOutline, MdLock, MdOutlineNotifications } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import { Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  PreferenceItem,
  useGetMyNotificationPreferencesQuery,
  useSetNotificationPreferenceMutation,
} from '../../api/notification-service/Preferences/index';
import { getNotifErrorMessage } from '../../shared/utils/auth/notifError.helpers';

const humanize = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

/**
 * `GET/PUT /v1/preferences/me` — a user's own notification opt-outs.
 * Identity-scoped on the backend (no permission gate), same as the bell.
 *
 * `items` is only ever the switches that actually work today — every entry
 * is editable, so there's no locked/editable split to render here anymore.
 * The required categories (security, account setup, service emails) come
 * back separately as `always_on`, a flat read-only list with no switches.
 * A platform account gets `notice` instead of either: `items` is empty for
 * them, and `notice` explains why in place of the switch list.
 */
const NotificationSettings = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useGetMyNotificationPreferencesQuery();
  const [setPreference] = useSetNotificationPreferenceMutation();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const handleToggle = async (item: PreferenceItem, checked: boolean) => {
    const key = `${item.category}:${item.channel}`;
    setPendingKey(key);
    try {
      await setPreference({
        category: item.category,
        channel: item.channel,
        is_enabled: checked,
      }).unwrap();
    } catch (err) {
      showToast({
        message: getNotifErrorMessage(err, 'Failed to update this setting.'),
        type: 'error',
      });
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <BackButton onClick={() => navigate('/profile')} />

        <div className="flex items-center gap-2">
          <MdOutlineNotifications className="text-xl text-brand-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Notification settings</h1>
        </div>

        {isLoading && <Loader />}
        {isError && (
          <p className="text-sm text-red-600">Could not load your notification settings.</p>
        )}

        {!isLoading && !isError && data && (
          <div className="flex flex-col gap-4">
            {data.notice ? (
              <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
                <div className="flex items-start gap-2">
                  <MdInfoOutline className="mt-0.5 shrink-0 text-lg text-gray-400" />
                  <Typography variant="body1" className="text-gray-600">
                    {data.notice}
                  </Typography>
                </div>
              </section>
            ) : (
              <>
                {data.items.length > 0 && (
                  <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
                    <Typography variant="h6" className="mb-3 block">
                      Customizable
                    </Typography>
                    <div className="divide-y">
                      {data.items.map((item) => {
                        const key = `${item.category}:${item.channel}`;
                        return (
                          <div key={key} className="flex items-center justify-between gap-4 py-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <Typography variant="body1">{item.label}</Typography>
                                <span className="rounded-full bg-[var(--gray-100)] px-2 py-0.5 text-xs font-medium text-[var(--gray-500)]">
                                  {item.channel_label}
                                </span>
                              </div>
                              {item.description && (
                                <Typography variant="caption" className="block text-gray-500">
                                  {item.description}
                                </Typography>
                              )}
                            </div>
                            <Switch
                              checked={item.is_enabled}
                              disabled={pendingKey === key}
                              onChange={(checked) => handleToggle(item, checked)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {data.always_on.length > 0 && (
                  <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
                    <Typography variant="h6" className="mb-3 block">
                      Always on
                    </Typography>
                    <div className="divide-y">
                      {data.always_on.map((entry) => (
                        <div
                          key={entry.category}
                          className="flex items-center justify-between gap-4 py-3"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <MdLock size={12} className="text-gray-400" />
                              <Typography variant="body1" className="text-gray-500">
                                {entry.label}
                              </Typography>
                            </div>
                            <Typography variant="caption" className="block text-gray-500">
                              {entry.reason}
                            </Typography>
                          </div>
                          <span className="shrink-0 text-xs text-gray-400">
                            {entry.channels.map(humanize).join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default NotificationSettings;
