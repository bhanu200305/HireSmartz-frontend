import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Tooltip } from 'antd';
import { MdLock } from 'react-icons/md';
import { ScoringWeightCard, showToast, toOptionalWeight } from '../../../shared';
import type { ScoringWeight } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import { RESUME_CATEGORY_META, INTERVIEW_CATEGORY_META } from '../../../shared/scoringCategories';
import {
  organizationScoringConfigApi,
  useGetPlatformOrganizationScoringCriteriaQuery,
  useResetPlatformOrganizationScoringCriteriaMutation,
  useSavePlatformOrganizationScoringCriteriaMutation,
} from '../../../../api/job-service/JobOpening/organizationScoringConfig';
import type {
  CategoryWeightOverride,
  OrganizationScoringCriteriaResponse,
} from '../../../../api/job-service/types';
import { getJobErrorMessage } from '../../../../shared/utils/auth/jobError.helpers';
import { AppDispatch } from '../../../../redux/provider/store';

const toWeights = (
  panel: OrganizationScoringCriteriaResponse['resume'] | undefined
): ScoringWeight[] =>
  (panel?.weights ?? []).map((w) => ({
    id: w.category_code,
    categoryName: w.category_code,
    displayName: w.display_name,
    description: w.description,
    weightPercentage: Number(w.weight_pct),
    defaultWeightPercentage: toOptionalWeight(w.default_weight_pct),
  }));

const toOverrides = (weights: ScoringWeight[]): CategoryWeightOverride[] =>
  weights.map((w) => ({ category_code: w.categoryName, weight_pct: w.weightPercentage }));

/**
 * Super Admin's mirror of MyCompany/ScoringCriteriaOwnerTab.tsx, for one
 * fixed tenant instead of the caller's own.
 */
const ScoringCriteriaPanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { data, isLoading } = useGetPlatformOrganizationScoringCriteriaQuery(tenantId);
  const [saveScoring, { isLoading: isSaving }] =
    useSavePlatformOrganizationScoringCriteriaMutation();
  const [resetScoring, { isLoading: isResetting }] =
    useResetPlatformOrganizationScoringCriteriaMutation();
  const [savingSection, setSavingSection] = useState<'resume' | 'interview' | null>(null);
  const [resettingSection, setResettingSection] = useState<'resume' | 'interview' | null>(null);

  const resumeWeights = useMemo(() => toWeights(data?.resume), [data]);
  const interviewWeights = useMemo(() => toWeights(data?.interview), [data]);
  const isLocked = Boolean(data?.is_locked);

  const patchCache = useCallback(
    (result: OrganizationScoringCriteriaResponse) => {
      dispatch(
        organizationScoringConfigApi.util.updateQueryData(
          'getPlatformOrganizationScoringCriteria',
          tenantId,
          () => result
        )
      );
    },
    [dispatch, tenantId]
  );

  const handleSaveResume = useCallback(
    async (weights: ScoringWeight[]) => {
      setSavingSection('resume');
      try {
        const result = await saveScoring({
          organizationId: tenantId,
          resume_weights: toOverrides(weights),
          interview_weights: toOverrides(interviewWeights),
        }).unwrap();
        patchCache(result);
        showToast({ message: 'Resume scoring weights saved.', type: 'success' });
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Failed to save resume scoring weights.'),
          type: 'error',
        });
      } finally {
        setSavingSection(null);
      }
    },
    [tenantId, interviewWeights, saveScoring, patchCache]
  );

  const handleSaveInterview = useCallback(
    async (weights: ScoringWeight[]) => {
      setSavingSection('interview');
      try {
        const result = await saveScoring({
          organizationId: tenantId,
          resume_weights: toOverrides(resumeWeights),
          interview_weights: toOverrides(weights),
        }).unwrap();
        patchCache(result);
        showToast({ message: 'Interview scoring weights saved.', type: 'success' });
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Failed to save interview scoring weights.'),
          type: 'error',
        });
      } finally {
        setSavingSection(null);
      }
    },
    [tenantId, resumeWeights, saveScoring, patchCache]
  );

  const handleReset = useCallback(
    async (section: 'resume' | 'interview') => {
      setResettingSection(section);
      try {
        const result = await resetScoring({ organizationId: tenantId }).unwrap();
        patchCache(result);
        showToast({ message: 'Scoring weights reset to platform defaults.', type: 'success' });
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Failed to reset scoring weights.'),
          type: 'error',
        });
      } finally {
        setResettingSection(null);
      }
    },
    [tenantId, resetScoring, patchCache]
  );

  if (isLoading) return <Loader />;
  if (!data) return null;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-2xl font-semibold text-gray-800">Scoring Weight Distribution</h2>
        {isLocked && (
          <Tooltip title="This company is locked to the platform default; it can't set its own weights.">
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
          infoText="Resume categories are always evaluated. All categories must total exactly 100%."
          weights={resumeWeights}
          categoryMeta={RESUME_CATEGORY_META}
          onSave={handleSaveResume}
          onReset={() => handleReset('resume')}
          isSaving={isSaving && savingSection === 'resume'}
          isResetting={isResetting && resettingSection === 'resume'}
          editable
        />

        <ScoringWeightCard
          title="Interview Scoring Categories"
          subtitle="Applies to AI Audio Screening and Video Interview"
          infoText="If a category is not covered in an interview, its weight is redistributed proportionally across the remaining categories."
          weights={interviewWeights}
          categoryMeta={INTERVIEW_CATEGORY_META}
          onSave={handleSaveInterview}
          onReset={() => handleReset('interview')}
          isSaving={isSaving && savingSection === 'interview'}
          isResetting={isResetting && resettingSection === 'interview'}
          editable
        />
      </div>
    </div>
  );
};

export default ScoringCriteriaPanel;
