import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../redux/provider/store';
import { showToast } from '../shared/ui/toast';
import {
  jobScoringConfigApi,
  useGetJobScoringConfigQuery,
  useUpdateJobScoringConfigMutation,
  useResetJobScoringConfigMutation,
} from '../../api/job-service/JobOpening/jobScoringConfig';
import type {
  JobScoringConfigData,
  JobScoringWeight,
} from '../../api/job-service/JobOpening/jobScoringConfig';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  INTERVIEW_CATEGORY_META,
  normalizeScoringWeights,
  RESUME_CATEGORY_META,
  ScoringWeightCard,
} from '../shared';
import type { ScoringWeight } from '../shared';
import { getJobErrorMessage } from '../../shared/utils/auth/jobError.helpers';
import { asJobId } from '../../api/job-service/jobId';

const normalizeWeights = (weights: unknown): JobScoringWeight[] =>
  normalizeScoringWeights(weights).map((w) => ({
    ...w,
    id: w.id,
    categoryName: w.categoryName,
    weightPercentage: w.weightPercentage,
  }));

interface JobScoringCriteriaTabProps {
  jobId: string;
  isViewMode?: boolean;
  isEditMode?: boolean;
}

const JobScoringCriteriaTab: React.FC<JobScoringCriteriaTabProps> = ({
  jobId: rawJobId,
  isViewMode = false,
  isEditMode = false,
}) => {
  const jobId = asJobId(rawJobId);
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { data: jobScoringData, isLoading } = useGetJobScoringConfigQuery(jobId, {
    skip: !jobId,
  });

  const [updateScoring, { isLoading: isSaving }] = useUpdateJobScoringConfigMutation();
  const [resetScoring, { isLoading: isResetting }] = useResetJobScoringConfigMutation();
  // Tracks which card's button should show as loading.
  const [savingSection, setSavingSection] = useState<'resume' | 'interview' | null>(null);
  const [resettingSection, setResettingSection] = useState<'resume' | 'interview' | null>(null);

  const isLocked = Boolean(jobScoringData?.data?.isLocked);
  const isEditable = !isViewMode && !isLocked;

  const resumeWeights = useMemo(
    () => normalizeWeights(jobScoringData?.data?.resumeConfig?.weights),
    [jobScoringData]
  );
  const interviewWeights = useMemo(
    () => normalizeWeights(jobScoringData?.data?.interviewConfig?.weights),
    [jobScoringData]
  );

  // Patches the cache directly from the mutation's own response.
  const patchScoringCache = useCallback(
    (data: JobScoringConfigData) => {
      dispatch(
        jobScoringConfigApi.util.updateQueryData('getJobScoringConfig', jobId, (draft) => {
          draft.data = data;
        })
      );
    },
    [dispatch, jobId]
  );

  const handleSaveResume = useCallback(
    async (weights: ScoringWeight[]) => {
      setSavingSection('resume');
      try {
        const result = await updateScoring({
          jobId,
          resumeWeights: weights.map((w) => ({
            id: w.id,
            categoryName: w.categoryName,
            weightPercentage: w.weightPercentage,
          })),
          interviewWeights,
        }).unwrap();
        patchScoringCache(result.data);
        showToast({ message: 'Resume scoring configuration saved successfully.', type: 'success' });
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Failed to save resume scoring configuration.'),
          type: 'error',
        });
      } finally {
        setSavingSection(null);
      }
    },
    [jobId, interviewWeights, updateScoring, patchScoringCache]
  );

  const handleSaveInterview = useCallback(
    async (weights: ScoringWeight[]) => {
      setSavingSection('interview');
      try {
        const result = await updateScoring({
          jobId,
          resumeWeights,
          interviewWeights: weights.map((w) => ({
            id: w.id,
            categoryName: w.categoryName,
            weightPercentage: w.weightPercentage,
          })),
        }).unwrap();
        patchScoringCache(result.data);
        showToast({
          message: 'Interview scoring configuration saved successfully.',
          type: 'success',
        });
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Failed to save interview scoring configuration.'),
          type: 'error',
        });
      } finally {
        setSavingSection(null);
      }
    },
    [jobId, resumeWeights, updateScoring, patchScoringCache]
  );

  // Reset resets both sections; only the clicked card shows as loading.
  const handleReset = useCallback(
    async (section: 'resume' | 'interview') => {
      setResettingSection(section);
      try {
        const result = await resetScoring({ jobId }).unwrap();
        patchScoringCache(result.data);
        showToast({
          message: 'Scoring configuration reset successfully.',
          type: 'success',
        });
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Failed to reset scoring configuration.'),
          type: 'error',
        });
      } finally {
        setResettingSection(null);
      }
    },
    [jobId, resetScoring, patchScoringCache]
  );

  if (!jobId) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Job not found. Please complete the previous steps first.
      </div>
    );
  }

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

  if (!resumeWeights.length && !interviewWeights.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Scoring configuration is unavailable for this job.
      </div>
    );
  }

  return (
    <div className="py-4">
      <h2 className="text-2xl font-semibold text-gray-800 mb-1">Scoring Weight Distribution</h2>
      <p className="text-sm text-gray-500 mb-6">
        {isLocked
          ? 'Scoring weights are locked for this job.'
          : isEditable
            ? 'Customize scoring weights for this specific job opening. Both panels are saved together.'
            : 'Scoring weights configured for this job opening.'}
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
          editable={isEditable}
        />

        <ScoringWeightCard
          title="Interview Scoring Categories"
          subtitle="Applies to AI Audio Screening and Video Interview"
          infoText="If a category is not covered in an interview, its weight is redistributed proportionally"
          weights={interviewWeights}
          categoryMeta={INTERVIEW_CATEGORY_META}
          onSave={handleSaveInterview}
          onReset={() => handleReset('interview')}
          isSaving={isSaving && savingSection === 'interview'}
          isResetting={isResetting && resettingSection === 'interview'}
          editable={isEditable}
        />
      </div>

      {!isViewMode && (
        <div className="mt-8 flex justify-center">
          <Button
            className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2"
            onClick={() =>
              // The Edit wizard's own interview step lives at
              // /jobs/edit/:id/interview, not the create wizard's bare
              // /interview-setup (which has no job-id context at all — it
              // reads JobSlice, which an edit session never populates).
              // Hardcoding the create-mode path here sent every edit
              // session to a route with no way to know which job it was
              // for, surfacing as "please save the job details first" on
              // arrival and an apparently-empty Job Details on the way
              // back.
              navigate(isEditMode ? `/jobs/edit/${jobId}/interview` : '/interview-setup')
            }
          >
            SAVE &amp; NEXT
          </Button>
        </div>
      )}
    </div>
  );
};

export default JobScoringCriteriaTab;
