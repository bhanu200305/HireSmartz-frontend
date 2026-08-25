import React from 'react';
import { Switch, Tooltip } from 'antd';
import {
  MdOutlineFavorite,
  MdAutoAwesome,
  MdOutlineVideocam,
  MdOutlineQuestionAnswer,
  MdOutlineLocationOn,
  MdOutlineAccountTree,
  MdLockOutline,
} from 'react-icons/md';
import { Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  useGetOwnEntitlementsQuery,
  useUpdateOwnEntitlementsMutation,
  Entitlements,
} from '../../api/organization-service/Tenants/entitlements';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

type FlagKey = Exclude<keyof Entitlements, 'locked_flags'>;

// The fixed six — docs/frontend_guide.txt: "Six on/off switches (culture
// intro, AI scoring, candidate intro video, candidate questions, letting
// them manage their own locations, org-chart/hierarchy view) plus which of
// those are locked so the company can't change them themselves." Same
// labels/icons as the Super Admin's variant (CustomerDashboard/ViewCustomer/
// EntitlementsPanel.tsx) so a flag looks identical in both places.
const FLAGS: { key: FlagKey; label: string; description: string; icon: React.ReactNode }[] = [
  {
    key: 'is_culture_intro_enabled',
    label: 'Culture intro',
    description: 'Show a "why work here" intro to candidates.',
    icon: <MdOutlineFavorite size={14} />,
  },
  {
    key: 'is_config_score_enabled',
    label: 'AI candidate scoring',
    description: 'Score candidates against your configured weights.',
    icon: <MdAutoAwesome size={14} />,
  },
  {
    key: 'is_candidate_intro_enabled',
    label: 'Candidate intro video',
    description: 'Ask candidates for a short intro video.',
    icon: <MdOutlineVideocam size={14} />,
  },
  {
    key: 'is_candidate_inquiries_enabled',
    label: 'Candidate questions',
    description: 'Let candidates ask questions during the process.',
    icon: <MdOutlineQuestionAnswer size={14} />,
  },
  {
    key: 'is_location_manage_allowed',
    label: 'Manage own locations',
    description: 'Let your team add/edit office locations.',
    icon: <MdOutlineLocationOn size={14} />,
  },
  {
    key: 'is_hierarchy_enabled',
    label: 'Org-chart / hierarchy view',
    description: 'Enable departments and the org-chart view.',
    icon: <MdOutlineAccountTree size={14} />,
  },
];

/**
 * GET/PUT /v1/tenants/{tenant_id}/entitlements — a tenant's own write path,
 * which deliberately has no `locked_flags` field: a locked flag is rejected
 * server-side, so it's disabled here rather than let a Company Admin submit
 * a change the backend will refuse anyway.
 */
const EntitlementsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useGetOwnEntitlementsQuery(tenantId);
  const [updateEntitlements] = useUpdateOwnEntitlementsMutation();
  const canEdit = useHasAccess(Authorities.COMPANY_SETTINGS_EDIT);

  if (isLoading) return <Loader />;
  if (!data) return <div className="p-6 text-gray-500">Feature settings are not available.</div>;

  const handleToggle = async (key: FlagKey, checked: boolean) => {
    try {
      await updateEntitlements({ tenantId, [key]: checked }).unwrap();
      showToast({ message: 'Feature setting updated.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to update this setting.'),
        type: 'error',
      });
    }
  };

  const enabledCount = FLAGS.filter(({ key }) => data[key]).length;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Typography variant="h5">Feature settings</Typography>
        <Typography variant="body2" className="text-gray-400">
          {enabledCount} of {FLAGS.length} features enabled
        </Typography>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {FLAGS.map(({ key, label, description, icon }) => {
          const isLocked = data.locked_flags.includes(key);
          const isEnabled = data[key];
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
                  {icon}
                </span>
                <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
                  <Typography variant="body1" className="font-semibold text-gray-900 shrink-0">
                    {label}
                  </Typography>
                  <Typography variant="body2" className="text-gray-400 truncate">
                    {description}
                  </Typography>
                  {isLocked && (
                    <Tooltip title="Locked by CareerForcePro — contact support to change this.">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 shrink-0">
                        <MdLockOutline size={10} /> Locked
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>

              <Switch
                size="small"
                checked={isEnabled}
                disabled={isLocked || !canEdit}
                onChange={(checked) => handleToggle(key, checked)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EntitlementsTab;
