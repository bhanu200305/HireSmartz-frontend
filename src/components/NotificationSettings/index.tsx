import { useState } from 'react';
import { Switch, Tooltip } from 'antd';
import { MdLock, MdOutlineArrowBack, MdOutlineNotifications } from 'react-icons/md';
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

const CATEGORY_META: Record<string, { label: string; description: string }> = {
  security: {
    label: 'Security alerts',
    description:
      'Password resets, sign-in device alerts, two-factor changes. Required: protects your account.',
  },
  transactional: {
    label: 'Account actions',
    description:
      'Confirmations of actions you (or an admin) took. Required: completes the flow that produced it.',
  },
  onboarding: {
    label: 'Onboarding & invitations',
    description: 'Getting set up, joining a company. Required.',
  },
  activity: {
    label: 'Product activity',
    description: 'Everything else: informational only.',
  },
};

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
  in_app: 'In-app',
};

const humanize = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const categoryMeta = (category: string) =>
  CATEGORY_META[category] || { label: humanize(category), description: '' };

const channelLabel = (channel: string) => CHANNEL_LABELS[channel] || humanize(channel);

const groupByCategory = (items: PreferenceItem[]): Map<string, PreferenceItem[]> => {
  const grouped = new Map<string, PreferenceItem[]>();
  for (const item of items) {
    const existing = grouped.get(item.category);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(item.category, [item]);
    }
  }
  return grouped;
};

/**
 * `GET/PUT /v1/preferences/me` — a user's own notification opt-outs.
 * Identity-scoped on the backend (no permission gate), same as the bell.
 *
 * Every (category, channel) pair is always returned by the backend, whether
 * or not the user has ever touched it, and `is_editable` is derived from the
 * catalogue rather than hard-coded here — a category is only ever rendered
 * enabled when the backend says it may be, which also makes this render
 * correctly for a platform-scoped caller (Super Admin/staff): the backend
 * returns every switch already disabled for them, with no special case
 * needed on this side (see preferences_router.py's `my_preferences`).
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

  const categoryEntries = Array.from(
    (data ? groupByCategory(data.items) : new Map<string, PreferenceItem[]>()).entries()
  );
  // Split so the section people can actually act on renders first, ahead of
  // the required/locked ones — previously every section looked identical
  // (same switch styling whether clickable or not), so the one editable
  // category was easy to miss below several that only look interactive.
  const editableEntries = categoryEntries.filter(([, items]) => items.some((i) => i.is_editable));
  const lockedEntries = categoryEntries.filter(([, items]) => items.every((i) => !i.is_editable));

  const renderCategory = ([category, items]: [string, PreferenceItem[]]) => {
    const meta = categoryMeta(category);
    const isEditableCategory = items.some((i) => i.is_editable);
    return (
      <section key={category} className="rounded-2xl border border-[var(--border)] bg-white p-6">
        <div className="mb-1 flex items-center justify-between gap-2">
          <Typography variant="h6" className="block">
            {meta.label}
          </Typography>
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={
              isEditableCategory
                ? { background: 'var(--primary-50)', color: 'var(--primary)' }
                : { background: 'var(--gray-100)', color: 'var(--gray-500)' }
            }
          >
            {isEditableCategory ? 'Customizable' : 'Always on'}
          </span>
        </div>
        {meta.description && (
          <Typography variant="caption" className="mb-3 block text-gray-500">
            {meta.description}
          </Typography>
        )}
        <div className="divide-y">
          {items.map((item) => {
            const key = `${item.category}:${item.channel}`;
            return (
              <div
                key={key}
                className={`flex items-center justify-between py-3 ${
                  !item.is_editable ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Typography
                    variant="body1"
                    className={!item.is_editable ? 'text-gray-500' : undefined}
                  >
                    {channelLabel(item.channel)}
                  </Typography>
                  {!item.is_editable && (
                    <Tooltip title="Required, cannot be turned off — protects your account or completes a flow you started.">
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <MdLock size={12} />
                        Locked
                      </span>
                    </Tooltip>
                  )}
                </div>
                <Switch
                  checked={item.is_enabled}
                  disabled={!item.is_editable || pendingKey === key}
                  onChange={(checked) => handleToggle(item, checked)}
                />
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <MainLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <button
          onClick={() => navigate('/profile')}
          className="flex w-fit items-center text-gray-600 hover:text-gray-800 cursor-pointer"
        >
          <MdOutlineArrowBack className="mr-2" />
          <span>Back to profile</span>
        </button>

        <div className="flex items-center gap-2">
          <MdOutlineNotifications className="text-xl text-brand-700" />
          <h1 className="text-2xl font-semibold text-gray-900">Notification settings</h1>
        </div>

        {isLoading && <Loader />}
        {isError && (
          <p className="text-sm text-red-600">Could not load your notification settings.</p>
        )}

        {!isLoading && !isError && (
          <div className="flex flex-col gap-4">
            <Typography variant="caption" className="text-gray-500">
              {editableEntries.length > 0
                ? 'Security and account-action alerts are always on to protect you — everything under “Customizable” below is yours to turn on or off.'
                : 'Everything below is required to run and protect your account, so none of it can be turned off yet. Optional updates (like digests) will show up here as toggles once we add them.'}
            </Typography>
            {editableEntries.map(renderCategory)}
            {lockedEntries.length > 0 && (
              <div className="mt-2 flex flex-col gap-4">
                {editableEntries.length > 0 && (
                  <Typography variant="caption" className="text-gray-400">
                    Always on
                  </Typography>
                )}
                {lockedEntries.map(renderCategory)}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default NotificationSettings;
