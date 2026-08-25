import React, { useMemo, useState } from 'react';
import { Tooltip } from 'antd';
import { MdLock } from 'react-icons/md';
import {
  INTERVIEW_CATEGORY_META,
  RESUME_CATEGORY_META,
  ScoringWeightCard,
  showToast,
} from '../../../shared';
import type { ScoringCategoryMeta, ScoringWeight } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import {
  useGetPlatformTenantScoringConfigQuery,
  useUpdatePlatformTenantScoringConfigMutation,
} from '../../../../api/organization-service/Platform/scoringConfig';
import { getOrgErrorMessage } from '../../../../shared/utils/auth/orgError.helpers';

const RESUME_KEY_PREFIX = 'resume:';
const INTERVIEW_KEY_PREFIX = 'interview:';

const buildWeightRows = (
  flatWeights: Record<string, number>,
  prefix: string,
  categoryMeta: ScoringCategoryMeta
): ScoringWeight[] =>
  Object.keys(categoryMeta).map((categoryName) => ({
    id: `${prefix}${categoryName}`,
    categoryName,
    weightPercentage:
      flatWeights[`${prefix}${categoryName}`] ?? categoryMeta[categoryName].defaultPct,
  }));

const standardWeightRows = (prefix: string, categoryMeta: ScoringCategoryMeta): ScoringWeight[] =>
  Object.keys(categoryMeta).map((categoryName) => ({
    id: `${prefix}${categoryName}`,
    categoryName,
    weightPercentage: categoryMeta[categoryName].defaultPct,
  }));

/**
 * Super Admin's mirror of CompanySettings/PlatformScoringDefaultsTab.tsx —
 * same Resume/Interview `ScoringWeightCard` pair, same flat
 * `{category: weight}` wire format and namespacing convention (see that
 * file's own docstring). No company picker here: `tenantId` is already fixed
 * by the page this panel lives on, so this only ever edits that one
 * company's override — never the platform-wide default.
 */
const ScoringCriteriaPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useGetPlatformTenantScoringConfigQuery(tenantId);
  const [updateConfig, { isLoading: isSaving }] = useUpdatePlatformTenantScoringConfigMutation();
  const [isResettingResume, setIsResettingResume] = useState(false);
  const [isResettingInterview, setIsResettingInterview] = useState(false);

  const flatWeights = useMemo(() => data?.weights ?? {}, [data?.weights]);

  const resumeWeights = useMemo(
    () => buildWeightRows(flatWeights, RESUME_KEY_PREFIX, RESUME_CATEGORY_META),
    [flatWeights]
  );
  const interviewWeights = useMemo(
    () => buildWeightRows(flatWeights, INTERVIEW_KEY_PREFIX, INTERVIEW_CATEGORY_META),
    [flatWeights]
  );

  if (isLoading) return <Loader />;
  // No `available` flag on this contract (organization-service owns this
  // outright now — see migration 0030's docstring) — a missing/empty
  // `weights` map just means this company hasn't overridden anything yet,
  // and buildWeightRows already falls back to each category's default
  // percentage, so the cards render with sensible defaults instead of an
  // error box. `!data` past this point means the query itself genuinely
  // failed (network/auth), not "service unavailable" — nothing sensible to
  // render, so bail quietly rather than crash on `isLocked` below.
  if (!data) return null;
  const isLocked = data.is_locked;

  const persist = (nextFlatWeights: Record<string, number>) =>
    updateConfig({ tenantId, weights: nextFlatWeights }).unwrap();

  const savePanel = async (weights: ScoringWeight[], panelLabel: string) => {
    const total = weights.reduce((sum, w) => sum + w.weightPercentage, 0);
    if (total !== 100) {
      showToast({
        message: `${panelLabel} weights must total 100%. Current total: ${total}%`,
        type: 'error',
      });
      return;
    }
    const next = { ...flatWeights };
    weights.forEach((w) => {
      next[String(w.id)] = w.weightPercentage;
    });
    try {
      await persist(next);
      showToast({ message: `${panelLabel} scoring weights saved.`, type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(
          err,
          `Failed to save ${panelLabel.toLowerCase()} scoring weights.`
        ),
        type: 'error',
      });
    }
  };

  const resetPanel = async (
    prefix: string,
    categoryMeta: ScoringCategoryMeta,
    panelLabel: string,
    setIsResetting: (value: boolean) => void
  ) => {
    const next = { ...flatWeights };
    standardWeightRows(prefix, categoryMeta).forEach((w) => {
      next[String(w.id)] = w.weightPercentage;
    });
    setIsResetting(true);
    try {
      await persist(next);
      showToast({ message: `${panelLabel} scoring weights reset to defaults.`, type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(
          err,
          `Failed to reset ${panelLabel.toLowerCase()} scoring weights.`
        ),
        type: 'error',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-2xl font-semibold text-gray-800">AI Scoring Weight Distribution</h2>
        {isLocked && (
          <Tooltip title="This company is locked to the platform default — it can't set its own weights.">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1">
              <MdLock size={13} /> Locked
            </span>
          </Tooltip>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        This company&apos;s own resume and interview scoring weights.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ScoringWeightCard
          title="Resume Scoring Categories"
          subtitle="Applies to Resume Screening"
          infoText="Resume categories are always evaluated. All 4 categories must total exactly 100%."
          weights={resumeWeights}
          categoryMeta={RESUME_CATEGORY_META}
          onSave={(weights) => savePanel(weights, 'Resume')}
          onReset={() =>
            resetPanel(RESUME_KEY_PREFIX, RESUME_CATEGORY_META, 'Resume', setIsResettingResume)
          }
          isSaving={isSaving}
          isResetting={isResettingResume}
          editable={!isLocked}
        />

        <ScoringWeightCard
          title="Interview Scoring Categories"
          subtitle="Applies to AI Audio Screening and Video Interview"
          infoText="If a category is not covered in an interview, its weight is redistributed proportionally across the remaining categories."
          weights={interviewWeights}
          categoryMeta={INTERVIEW_CATEGORY_META}
          onSave={(weights) => savePanel(weights, 'Interview')}
          onReset={() =>
            resetPanel(
              INTERVIEW_KEY_PREFIX,
              INTERVIEW_CATEGORY_META,
              'Interview',
              setIsResettingInterview
            )
          }
          isSaving={isSaving}
          isResetting={isResettingInterview}
          editable={!isLocked}
        />
      </div>
    </div>
  );
};

export default ScoringCriteriaPanel;
