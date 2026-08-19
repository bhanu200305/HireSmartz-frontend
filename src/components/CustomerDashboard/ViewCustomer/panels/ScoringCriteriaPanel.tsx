import React, { useEffect, useState } from 'react';
import { MdLock } from 'react-icons/md';
import { Tooltip } from 'antd';
import { Button, Typography, showToast } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import {
  useGetPlatformTenantScoringConfigQuery,
  useUpdatePlatformTenantScoringConfigMutation,
} from '../../../../api/organization-service/Platform/scoringConfig';
import { getOrgErrorMessage } from '../../../../shared/utils/auth/orgError.helpers';

/**
 * Super Admin's mirror of MyCompany/ScoringCriteriaOwnerTab.tsx — same
 * flat weights-must-total-100 contract, platform-mounted route instead of
 * the tenant's own ambient-context one.
 */
const ScoringCriteriaPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useGetPlatformTenantScoringConfigQuery(tenantId);
  const [updateConfig, { isLoading: isSaving }] = useUpdatePlatformTenantScoringConfigMutation();
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
      <div className="flex items-center gap-2 mb-1">
        <Typography variant="h5">Candidate scoring weights</Typography>
        {data.is_locked && (
          <Tooltip title="Locked by CareerForcePro — contact support to change this.">
            <MdLock className="text-gray-400" size={16} />
          </Tooltip>
        )}
      </div>
      <Typography variant="body2" className="mb-6 block">
        Weights must total 100%.{' '}
        <span className={total === 100 ? 'text-[#008A2E]' : 'text-red-500'}>Current: {total}%</span>
      </Typography>

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

export default ScoringCriteriaPanel;
