import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Tooltip } from 'antd';
import { MdLock } from 'react-icons/md';
import { ScoringWeightCard, showToast } from '../shared';
import type { ScoringWeight } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  organizationScoringConfigApi,
  useGetOrganizationScoringCriteriaQuery,
  useResetOrganizationScoringCriteriaMutation,
  useSaveOrganizationScoringCriteriaMutation,
} from '../../api/job-service/JobOpening/organizationScoringConfig';
import type {
  CategoryWeightOverride,
  OrganizationScoringCriteriaResponse,
} from '../../api/job-service/types';
import { getJobErrorMessage } from '../../shared/utils/auth/jobError.helpers';
import { AppDispatch } from '../../redux/provider/store';

const toWeights = (
  panel: OrganizationScoringCriteriaResponse['resume'] | undefined
): ScoringWeight[] =>
  (panel?.weights ?? []).map((w) => ({
    id: w.category_code,
    categoryName: w.category_code,
    displayName: w.display_name,
    description: w.description,
    weightPercentage: Number(w.weight_pct),
  }));

const toOverrides = (weights: ScoringWeight[]): CategoryWeightOverride[] =>
  weights.map((w) => ({ category_code: w.categoryName, weight_pct: w.weightPercentage }));

/**
 * The caller's own tenant's self-service scoring weights, resolved
 * against the platform default.
 */
const ScoringCriteriaOwnerTab: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { data, isLoading } = useGetOrganizationScoringCriteriaQuery();
  const [saveScoring, { isLoading: isSaving }] = useSaveOrganizationScoringCriteriaMutation();
  const [resetScoring, { isLoading: isResetting }] = useResetOrganizationScoringCriteriaMutation();
  const [savingSection, setSavingSection] = useState<'resume' | 'interview' | null>(null);
  const [resettingSection, setResettingSection] = useState<'resume' | 'interview' | null>(null);

  const resumeWeights = useMemo(() => toWeights(data?.resume), [data]);
  const interviewWeights = useMemo(() => toWeights(data?.interview), [data]);
  const isLocked = Boolean(data?.is_locked);

  const patchCache = useCallback(
    (result: OrganizationScoringCriteriaResponse) => {
      dispatch(
        organizationScoringConfigApi.util.updateQueryData(
          'getOrganizationScoringCriteria',
          undefined,
          () => result
        )
      );
    },
    [dispatch]
  );

  const handleSaveResume = useCallback(
    async (weights: ScoringWeight[]) => {
      setSavingSection('resume');
      try {
        const result = await saveScoring({
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
    [interviewWeights, saveScoring, patchCache]
  );

  const handleSaveInterview = useCallback(
    async (weights: ScoringWeight[]) => {
      setSavingSection('interview');
      try {
        const result = await saveScoring({
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
    [resumeWeights, saveScoring, patchCache]
  );

  const handleReset = useCallback(
    async (section: 'resume' | 'interview') => {
      setResettingSection(section);
      try {
        const result = await resetScoring().unwrap();
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
    [resetScoring, patchCache]
  );

  if (isLoading) return <Loader />;
  if (!data) return null;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-2xl font-semibold text-gray-800">Scoring Weight Distribution</h2>
        {isLocked && (
          <Tooltip title="Locked by CareerForcePro — contact support to change this.">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1">
              <MdLock size={13} /> Locked
            </span>
          </Tooltip>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Your company&apos;s own resume and interview scoring weights.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ScoringWeightCard
          title="Resume Scoring Categories"
          subtitle="Applies to Resume Screening"
          infoText="Resume categories are always evaluated. All categories must total exactly 100%."
          weights={resumeWeights}
          categoryMeta={{}}
          onSave={handleSaveResume}
          onReset={() => handleReset('resume')}
          isSaving={isSaving && savingSection === 'resume'}
          isResetting={isResetting && resettingSection === 'resume'}
          editable={!isLocked}
        />

        <ScoringWeightCard
          title="Interview Scoring Categories"
          subtitle="Applies to AI Audio Screening and Video Interview"
          infoText="If a category is not covered in an interview, its weight is redistributed proportionally across the remaining categories."
          weights={interviewWeights}
          categoryMeta={{}}
          onSave={handleSaveInterview}
          onReset={() => handleReset('interview')}
          isSaving={isSaving && savingSection === 'interview'}
          isResetting={isResetting && resettingSection === 'interview'}
          editable={!isLocked}
        />
      </div>
    </div>
  );
};

export default ScoringCriteriaOwnerTab;
