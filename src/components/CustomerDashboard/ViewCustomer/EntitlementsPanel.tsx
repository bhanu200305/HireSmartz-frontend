import React, { useState } from 'react';
import { Switch, Checkbox } from 'antd';
import { Button, Typography, showToast } from '../../shared';
import type {
  PlatformEntitlements,
  UpdatePlatformEntitlementsArgs,
} from '../../../api/organization-service/Platform/tenants';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';

type FlagKey = Exclude<keyof PlatformEntitlements, 'locked_flags'>;

const FLAGS: { key: FlagKey; label: string }[] = [
  { key: 'is_culture_intro_enabled', label: 'Culture intro' },
  { key: 'is_config_score_enabled', label: 'AI candidate scoring' },
  { key: 'is_candidate_intro_enabled', label: 'Candidate intro video' },
  { key: 'is_candidate_inquiries_enabled', label: 'Candidate questions' },
  { key: 'is_location_manage_allowed', label: 'Manage own locations' },
  { key: 'is_hierarchy_enabled', label: 'Org-chart / hierarchy view' },
];

type EntitlementsPanelProps = {
  tenantId: string;
  entitlements: PlatformEntitlements;
  isSaving: boolean;
  onSave: (body: Omit<UpdatePlatformEntitlementsArgs, 'tenantId'>) => Promise<unknown>;
};

/** Super Admin's variant — every flag toggleable AND lockable, unlike the
 * tenant's own read-write view (MyCompany/EntitlementsTab.tsx), which can
 * see locks but never set them. */
const EntitlementsPanel: React.FC<EntitlementsPanelProps> = ({
  entitlements,
  isSaving,
  onSave,
}) => {
  const [flags, setFlags] = useState(entitlements);
  const isDirty =
    FLAGS.some(({ key }) => flags[key] !== entitlements[key]) ||
    flags.locked_flags.join() !== entitlements.locked_flags.join();

  const toggleLock = (key: FlagKey, locked: boolean) => {
    setFlags((prev) => ({
      ...prev,
      locked_flags: locked
        ? [...prev.locked_flags, key]
        : prev.locked_flags.filter((flag) => flag !== key),
    }));
  };

  const handleSave = async () => {
    try {
      await onSave({
        is_culture_intro_enabled: flags.is_culture_intro_enabled,
        is_config_score_enabled: flags.is_config_score_enabled,
        is_candidate_intro_enabled: flags.is_candidate_intro_enabled,
        is_candidate_inquiries_enabled: flags.is_candidate_inquiries_enabled,
        is_location_manage_allowed: flags.is_location_manage_allowed,
        is_hierarchy_enabled: flags.is_hierarchy_enabled,
        locked_flags: flags.locked_flags,
      });
      showToast({ message: 'Feature toggles updated.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to update feature toggles.'),
        type: 'error',
      });
    }
  };

  return (
    <div>
      <div className="divide-y border rounded-xl overflow-hidden mb-4">
        {FLAGS.map(({ key, label }) => {
          const isLocked = flags.locked_flags.includes(key);
          return (
            <div key={key} className="flex items-center justify-between p-3">
              <Typography variant="body1">{label}</Typography>
              <div className="flex items-center gap-4">
                <Checkbox checked={isLocked} onChange={(e) => toggleLock(key, e.target.checked)}>
                  Locked
                </Checkbox>
                <Switch
                  checked={flags[key]}
                  onChange={(checked) => setFlags((prev) => ({ ...prev, [key]: checked }))}
                />
              </div>
            </div>
          );
        })}
      </div>
      <Button
        className="rounded-full bg-button text-white px-6 py-2"
        onClick={handleSave}
        disabled={isSaving || !isDirty}
      >
        {isSaving ? 'Saving…' : 'Save feature toggles'}
      </Button>
    </div>
  );
};

export default EntitlementsPanel;
