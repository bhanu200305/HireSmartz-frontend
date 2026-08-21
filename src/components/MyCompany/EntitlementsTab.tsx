import React from 'react';
import { Switch, Tooltip } from 'antd';
import { MdLock } from 'react-icons/md';
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
// those are locked so the company can't change them themselves."
const FLAGS: { key: FlagKey; label: string; description: string }[] = [
  {
    key: 'is_culture_intro_enabled',
    label: 'Culture intro',
    description: 'Show a "why work here" intro to candidates.',
  },
  {
    key: 'is_config_score_enabled',
    label: 'AI candidate scoring',
    description: 'Score candidates against your configured weights.',
  },
  {
    key: 'is_candidate_intro_enabled',
    label: 'Candidate intro video',
    description: 'Ask candidates for a short intro video.',
  },
  {
    key: 'is_candidate_inquiries_enabled',
    label: 'Candidate questions',
    description: 'Let candidates ask questions during the process.',
  },
  {
    key: 'is_location_manage_allowed',
    label: 'Manage own locations',
    description: 'Let your team add/edit office locations.',
  },
  {
    key: 'is_hierarchy_enabled',
    label: 'Org-chart / hierarchy view',
    description: 'Enable departments and the org-chart view.',
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

  return (
    <div className="p-4">
      <Typography variant="h5" className="mb-4 block">
        Feature settings
      </Typography>
      <div className="divide-y border rounded-xl overflow-hidden">
        {FLAGS.map(({ key, label, description }) => {
          const isLocked = data.locked_flags.includes(key);
          return (
            <div key={key} className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <Typography variant="body1">{label}</Typography>
                  {isLocked && (
                    <Tooltip title="Locked by CareerForcePro — contact support to change this.">
                      <MdLock className="text-gray-400" size={14} />
                    </Tooltip>
                  )}
                </div>
                <Typography variant="caption">{description}</Typography>
              </div>
              <Switch
                checked={data[key]}
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
