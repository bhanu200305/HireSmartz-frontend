import React, { useState } from 'react';
import { Switch, Tooltip } from 'antd';
import {
  MdOutlineFavorite,
  MdAutoAwesome,
  MdOutlineVideocam,
  MdOutlineQuestionAnswer,
  MdOutlineLocationOn,
  MdOutlineAccountTree,
  MdLockOutline,
  MdLockOpen,
} from 'react-icons/md';
import { Button, Typography, showToast } from '../../shared';
import type {
  PlatformEntitlements,
  UpdatePlatformEntitlementsArgs,
} from '../../../api/organization-service/Platform/tenants';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';

type FlagKey = Exclude<keyof PlatformEntitlements, 'locked_flags'>;

const FLAGS: { key: FlagKey; label: string; description: string; icon: React.ReactNode }[] = [
  {
    key: 'is_culture_intro_enabled',
    label: 'Culture intro',
    description: 'Show this company\'s "About our culture" section to candidates.',
    icon: <MdOutlineFavorite size={18} />,
  },
  {
    key: 'is_config_score_enabled',
    label: 'AI candidate scoring',
    description: 'Automatically score resumes and interviews with AI.',
    icon: <MdAutoAwesome size={18} />,
  },
  {
    key: 'is_candidate_intro_enabled',
    label: 'Candidate intro video',
    description: 'Let candidates record a short intro video with their application.',
    icon: <MdOutlineVideocam size={18} />,
  },
  {
    key: 'is_candidate_inquiries_enabled',
    label: 'Candidate questions',
    description: 'Let candidates ask questions during the application process.',
    icon: <MdOutlineQuestionAnswer size={18} />,
  },
  {
    key: 'is_location_manage_allowed',
    label: 'Manage own locations',
    description: 'Let this company add and edit its own office locations.',
    icon: <MdOutlineLocationOn size={18} />,
  },
  {
    key: 'is_hierarchy_enabled',
    label: 'Org-chart / hierarchy view',
    description: 'Show the organization chart / reporting hierarchy view.',
    icon: <MdOutlineAccountTree size={18} />,
  },
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

  const enabledCount = FLAGS.filter(({ key }) => flags[key]).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Typography variant="body2" className="text-gray-400">
          {enabledCount} of {FLAGS.length} features enabled for this company.
        </Typography>
      </div>

      <div className="grid grid-cols-1 gap-1.5 mb-5">
        {FLAGS.map(({ key, label, description, icon }) => {
          const isLocked = flags.locked_flags.includes(key);
          const isEnabled = flags[key];
          return (
            <div
              key={key}
              className={`flex items-center justify-between gap-3 border rounded-lg px-3 py-2 transition-colors ${
                isEnabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50/60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-7 h-7 shrink-0 rounded-md flex items-center justify-center ${
                    isEnabled ? 'bg-primary-50 text-primary-600' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {React.cloneElement(icon as React.ReactElement<{ size?: number }>, {
                    size: 14,
                  })}
                </span>
                <div className="min-w-0 flex items-baseline gap-2">
                  <Typography variant="body1" className="font-semibold text-gray-900 shrink-0">
                    {label}
                  </Typography>
                  <Typography variant="body2" className="text-gray-400 truncate">
                    {description}
                  </Typography>
                  {isLocked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wide px-1.5 py-0.5 shrink-0">
                      <MdLockOutline size={10} /> Locked
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Tooltip
                  title={
                    isLocked
                      ? "Locked. This company can't change this flag themselves. Click to unlock."
                      : "Lock this flag so the company can't change it themselves."
                  }
                >
                  <button
                    type="button"
                    aria-label={isLocked ? 'Unlock this flag' : 'Lock this flag'}
                    onClick={() => toggleLock(key, !isLocked)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      isLocked
                        ? 'bg-gray-800 text-white hover:bg-gray-700'
                        : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
                    }`}
                  >
                    {isLocked ? <MdLockOutline size={13} /> : <MdLockOpen size={13} />}
                  </button>
                </Tooltip>
                <Switch
                  size="small"
                  checked={isEnabled}
                  onChange={(checked) => setFlags((prev) => ({ ...prev, [key]: checked }))}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Button
        className="rounded-full bg-button text-white px-6 py-2 disabled:opacity-50"
        onClick={handleSave}
        disabled={isSaving || !isDirty}
      >
        {isSaving ? 'Saving…' : 'Save Feature Toggles'}
      </Button>
    </div>
  );
};

export default EntitlementsPanel;
