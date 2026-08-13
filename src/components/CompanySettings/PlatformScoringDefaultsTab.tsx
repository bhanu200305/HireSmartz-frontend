import React, { useEffect, useState } from 'react';
import { Button, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  useGetPlatformScoringConfigQuery,
  useUpdatePlatformScoringConfigMutation,
} from '../../api/organization-service/Platform/scoringConfig';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

/**
 * GET/PUT /v1/platform/scoring-config — the weighting every company starts
 * with unless it sets its own. Same flat `{category: weight}` shape as a
 * tenant's own config (MyCompany/ScoringCriteriaOwnerTab.tsx), proxied from
 * ai-service — "not available" when ai-service doesn't answer, never fake zeros.
 */
const PlatformScoringDefaultsTab: React.FC = () => {
  const { data, isLoading } = useGetPlatformScoringConfigQuery();
  const [updateConfig, { isLoading: isSaving }] = useUpdatePlatformScoringConfigMutation();
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    if (data?.weights) setWeights(data.weights);
  }, [data]);

  if (isLoading) return <Loader />;
  if (!data?.available) {
    return (
      <div className="p-6 text-center text-gray-500 border border-dashed rounded-xl">
        Default scoring weights aren&apos;t available right now — the scoring service didn&apos;t
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
      await updateConfig(weights).unwrap();
      showToast({ message: 'Default scoring weights saved.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to save default weights.'),
        type: 'error',
      });
    }
  };

  return (
    <div>
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
              onChange={(e) =>
                setWeights((prev) => ({ ...prev, [category]: Number(e.target.value) }))
              }
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              className="w-20 text-center border rounded-lg py-1.5"
            />
          </div>
        ))}
        {Object.keys(weights).length === 0 && (
          <Typography variant="body2">No scoring categories returned yet.</Typography>
        )}
      </div>

      {Object.keys(weights).length > 0 && (
        <Button
          className="mt-6 rounded-full bg-button text-white px-6 py-2"
          onClick={handleSave}
          disabled={isSaving || total !== 100}
        >
          {isSaving ? 'Saving…' : 'Save defaults'}
        </Button>
      )}
    </div>
  );
};

export default PlatformScoringDefaultsTab;
