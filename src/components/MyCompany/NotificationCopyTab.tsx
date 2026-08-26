import React, { useState } from 'react';
import { Badge, Button, Typography } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  TemplateOverride,
  useListTemplateOverridesQuery,
} from '../../api/notification-service/TemplateSettings/index';
import EmailTemplateOverrideModal from './EmailTemplateOverrideModal';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

const humanizeType = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

/**
 * `GET /v1/template-settings/overrides` — every notification type this
 * tenant can customise, whether or not they have (the whole catalogue, per
 * the backend's own reasoning: a list of only the three things already
 * edited is a list nobody can act on).
 *
 * Its own top-level tab, split out from Email Templates rather than stacked
 * inside it — a pack/layout choice ("what CFP mail looks like") and editing
 * individual message copy ("what CFP mail says") are different jobs even
 * though they hang off the same notification-service settings, and this one
 * was easy to lose scrolling past the pack picker and layout section above
 * it.
 */
const NotificationCopyTab: React.FC = () => {
  const { data, isLoading } = useListTemplateOverridesQuery();
  const [editingOverride, setEditingOverride] = useState<TemplateOverride | null>(null);
  const canEdit = useHasAccess(Authorities.EMAIL_TEMPLATE_EDIT);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div className="p-4">
      <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
        <Typography variant="h6" className="mb-1 block">
          Notification copy
        </Typography>
        <Typography variant="caption" className="mb-4 block text-gray-500">
          Every message CareerForce Pro can send on your behalf. Edit the ones you&apos;d like in
          your own words — the rest use the platform&apos;s default copy inside your chosen pack.
        </Typography>

        <div className="divide-y overflow-hidden rounded-xl border">
          {data?.overrides.map((override) => (
            <div
              key={override.notification_type}
              className="flex items-center justify-between gap-3 p-4"
            >
              <div className="flex items-center gap-2">
                <Typography variant="body1">{humanizeType(override.notification_type)}</Typography>
                <Badge status={override.is_customised ? 'info' : 'neutral'}>
                  {override.is_customised ? 'Customised' : 'Default'}
                </Badge>
              </div>
              {canEdit && (
                <Button
                  type="button"
                  appname="edit notification template"
                  onClick={() => setEditingOverride(override)}
                  className="rounded-3xl border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </Button>
              )}
            </div>
          ))}
          {data && data.overrides.length === 0 && (
            <p className="p-4 text-sm text-gray-500">
              No notification templates are seeded on this environment yet.
            </p>
          )}
        </div>

        <EmailTemplateOverrideModal
          open={editingOverride !== null}
          override={editingOverride}
          onClose={() => setEditingOverride(null)}
        />
      </section>
    </div>
  );
};

export default NotificationCopyTab;
