import React, { useEffect, useState } from 'react';
import { MdLock, MdOutlineTune } from 'react-icons/md';
import { Tooltip } from 'antd';
import { Button, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  useGetTenantScoringConfigQuery,
  useUpdateTenantScoringConfigMutation,
} from '../../api/organization-service/Tenants/scoringConfig';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

/**
 * GET/PUT /v1/tenants/{tenant_id}/scoring-config — proxied from ai-service as
 * a flat `{category: weight}` map, unlike the legacy UI's two-stage
 * (resume/interview) slider system with per-category colors/descriptions
 * and reset-to-default — none of that exists on this contract. Categories
 * come entirely from what ai-service returns; there's no endpoint to define
 * a new one from here, so this edits weights in place rather than managing
 * the category set.
 */
const ScoringCriteriaOwnerTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useGetTenantScoringConfigQuery(tenantId);
  const [updateConfig, { isLoading: isSaving }] = useUpdateTenantScoringConfigMutation();
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    if (data?.weights) setWeights(data.weights);
  }, [data]);

  if (isLoading) return <Loader />;
  if (!data?.available) {
    return (
      <div className="p-6 text-center text-gray-500 border border-dashed rounded-xl">
        Scoring configuration isn&apos;t available right now — the scoring service didn&apos;t
        respond.
      </div>
    );
  }

  const total = Object.values(weights).reduce((sum, value) => sum + (value || 0), 0);

  const handleSave = async () => {
    if (total !== 100) {
      showToast({ message: `Weights must total 100%. Current total: ${total}%`, type: 'error' });
      return;
    }
    try {
      await updateConfig({ tenantId, weights }).unwrap();
      showToast({ message: 'Scoring weights saved.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to save scoring weights.'),
        type: 'error',
      });
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-primary-600 to-accent-500 text-white flex items-center justify-center shadow-sm">
          <MdOutlineTune size={18} />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <Typography variant="h5">Candidate scoring weights</Typography>
            {data.is_locked && (
              <Tooltip title="Locked by CareerForcePro — contact support to change this.">
                <MdLock className="text-gray-400" size={16} />
              </Tooltip>
            )}
          </div>
          <Typography variant="body2" className="text-gray-400 mt-0.5">
            Weights must total 100%.{' '}
            <span className={total === 100 ? 'text-[#008A2E]' : 'text-red-500'}>
              Current: {total}%
            </span>
          </Typography>
        </div>
      </div>

      <div className="flex flex-col gap-4 max-w-md">
        {Object.keys(weights).map((category) => (
          <div key={category} className="flex items-center justify-between gap-4">
            <Typography variant="body1" className="capitalize">
              {category.replace(/_/g, ' ')}
            </Typography>
            <input
              type="number"
              min={0}
              max={100}
              value={weights[category]}
              disabled={data.is_locked}
              onChange={(e) =>
                setWeights((prev) => ({ ...prev, [category]: Number(e.target.value) }))
              }
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              className="w-20 text-center border rounded-lg py-1.5 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        ))}
        {Object.keys(weights).length === 0 && (
          <Typography variant="body2">No scoring categories returned yet.</Typography>
        )}
      </div>

      {!data.is_locked && Object.keys(weights).length > 0 && (
        <Button
          className="mt-6 rounded-full bg-button text-white px-6 py-2"
          onClick={handleSave}
          disabled={isSaving || total !== 100}
        >
          {isSaving ? 'Saving…' : 'Save weights'}
        </Button>
      )}
    </div>
  );
};

export default ScoringCriteriaOwnerTab;
