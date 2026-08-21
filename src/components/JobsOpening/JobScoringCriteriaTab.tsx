import React, { useCallback } from 'react';
import { showToast } from '../shared/ui/toast';
import { useSelector, shallowEqual } from 'react-redux';
import { RootState } from '../../redux/provider/store';
import { safeDecodeToken } from '../../shared/utils/methods';
import { getLocalStorageItem } from '../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import {
  useGetJobScoringConfigQuery,
  useUpdateJobScoringConfigMutation,
  useResetJobScoringConfigMutation,
} from '../../api/job-service/JobOpening/jobScoringConfig';
import type { JobScoringWeight } from '../../api/job-service/JobOpening/jobScoringConfig';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  INTERVIEW_CATEGORY_META,
  normalizeScoringWeights,
  RESUME_CATEGORY_META,
  ScoringWeightCard,
} from '../shared';
import type { ScoringWeight } from '../shared';

const normalizeWeights = (weights: unknown): JobScoringWeight[] =>
  normalizeScoringWeights(weights).map((w) => ({ ...w, id: Number(w.id) }));

/* ─────────────────────── Main component ─────────────────────── */

interface JobScoringCriteriaTabProps {
  jobId: number;
  isViewMode?: boolean;
}

const JobScoringCriteriaTab: React.FC<JobScoringCriteriaTabProps> = ({
  jobId,
  isViewMode = false,
}) => {
  const { loginToken } = useSelector((state: RootState) => state.LoginSlice, shallowEqual);
  const tokenFromStorage = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) as string | null;
  const authToken = loginToken || tokenFromStorage;
  const decodedToken = safeDecodeToken<{ isScoringConfigEditable?: boolean }>(authToken);
  const isTokenEditable = decodedToken?.isScoringConfigEditable ?? false;

  // Editable only in create/edit mode AND token allows it
  const navigate = useNavigate();
  const isEditable = !isViewMode && isTokenEditable;

  const { data: jobScoringData, isLoading } = useGetJobScoringConfigQuery(jobId, {
    skip: !jobId,
  });

  const [updateResume, { isLoading: isSavingResume }] = useUpdateJobScoringConfigMutation();
  const [updateInterview, { isLoading: isSavingInterview }] = useUpdateJobScoringConfigMutation();
  const [resetResume, { isLoading: isResettingResume }] = useResetJobScoringConfigMutation();
  const [resetInterview, { isLoading: isResettingInterview }] = useResetJobScoringConfigMutation();

  const handleSaveResume = useCallback(
    async (weights: ScoringWeight[]) => {
      try {
        const payload: JobScoringWeight[] = weights.map((w) => ({ ...w, id: Number(w.id) }));
        await updateResume({ jobId, stage: 'RESUME', weights: payload }).unwrap();
        showToast({ message: 'Resume scoring configuration saved successfully.', type: 'success' });
      } catch {
        showToast({ message: 'Failed to save resume scoring configuration.', type: 'error' });
      }
    },
    [jobId, updateResume]
  );

  const handleSaveInterview = useCallback(
    async (weights: ScoringWeight[]) => {
      try {
        const payload: JobScoringWeight[] = weights.map((w) => ({ ...w, id: Number(w.id) }));
        await updateInterview({ jobId, stage: 'INTERVIEW', weights: payload }).unwrap();
        showToast({
          message: 'Interview scoring configuration saved successfully.',
          type: 'success',
        });
      } catch {
        showToast({ message: 'Failed to save interview scoring configuration.', type: 'error' });
      }
    },
    [jobId, updateInterview]
  );

  const handleResetResume = useCallback(async () => {
    try {
      const res = await resetResume({ jobId, stage: 'RESUME' }).unwrap();
      showToast({
        message: res?.message || 'Resume scoring configuration reset successfully.',
        type: 'success',
      });
    } catch {
      showToast({ message: 'Failed to reset resume scoring configuration.', type: 'error' });
    }
  }, [jobId, resetResume]);

  const handleResetInterview = useCallback(async () => {
    try {
      const res = await resetInterview({ jobId, stage: 'INTERVIEW' }).unwrap();
      showToast({
        message: res?.message || 'Interview scoring configuration reset successfully.',
        type: 'success',
      });
    } catch {
      showToast({ message: 'Failed to reset interview scoring configuration.', type: 'error' });
    }
  }, [jobId, resetInterview]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading scoring configuration...
      </div>
    );
  }

  if (!jobScoringData?.data) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        No scoring configuration found for this job.
      </div>
    );
  }

  const resumeWeights = normalizeWeights(jobScoringData?.data?.resumeConfig?.weights);
  const interviewWeights = normalizeWeights(jobScoringData?.data?.interviewConfig?.weights);

  if (!resumeWeights.length && !interviewWeights.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Scoring configuration is unavailable for this job.
      </div>
    );
  }

  return (
    <div className="py-4">
      <h2 className="text-2xl font-semibold text-gray-800 mb-1">AI Scoring Weight Distribution</h2>
      <p className="text-sm text-gray-500 mb-6">
        {isEditable
          ? 'Customize scoring weights for this specific job opening.'
          : 'Scoring weights configured for this job opening.'}
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ScoringWeightCard
          title="Resume Scoring Categories"
          subtitle="Applies to Resume Screening"
          infoText="Resume categories are always evaluated. All 4 categories must total exactly 100%."
          weights={resumeWeights}
          categoryMeta={RESUME_CATEGORY_META}
          onSave={handleSaveResume}
          onReset={handleResetResume}
          isSaving={isSavingResume}
          isResetting={isResettingResume}
          editable={isEditable}
        />

        <ScoringWeightCard
          title="Interview Scoring Categories"
          subtitle="Applies to AI Audio Screening and Video Interview"
          infoText="If a category is not covered in an interview, its weight is redistributed proportionally"
          weights={interviewWeights}
          categoryMeta={INTERVIEW_CATEGORY_META}
          onSave={handleSaveInterview}
          onReset={handleResetInterview}
          isSaving={isSavingInterview}
          isResetting={isResettingInterview}
          editable={isEditable}
        />
      </div>

      {!isViewMode && (
        <div className="mt-8 flex justify-center">
          <Button
            className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2"
            onClick={() => navigate('/jobs')}
          >
            SAVE &amp; NEXT
          </Button>
        </div>
      )}
    </div>
  );
};

export default JobScoringCriteriaTab;
