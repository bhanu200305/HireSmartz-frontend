import React, { useCallback, useMemo, useState } from 'react';
import { Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../redux/provider/store';
import { useIsEditingDraft } from '../../hooks/useIsEditingDraft';
import {
  setEditScoringPassedJobId,
  setIsScoringCompleted,
} from '../../redux/slices/jobOpeningSlice';
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
import { useDeleteDraftJobMutation } from '../../api/job-service/JobOpening/AddJobOpening';
import ConfirmationModal from '../shared/ui/ConfirmationModal';

const normalizeWeights = (weights: unknown): JobScoringWeight[] => normalizeScoringWeights(weights);

import JobActionFooter from './AddJobDescription/JobActionFooter';

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
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resumeDraft, setResumeDraft] = useState<ScoringWeight[] | null>(null);
  const [interviewDraft, setInterviewDraft] = useState<ScoringWeight[] | null>(null);
  const [deleteDraftJob, { isLoading: isCancelling }] = useDeleteDraftJobMutation();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const isEditingDraft = useIsEditingDraft(jobId) === true;
  const showDraftActions = !isEditMode || isEditingDraft;

  const handleConfirmCancel = async () => {
    if (jobId) {
      try {
        await deleteDraftJob(jobId).unwrap();
      } catch (error) {
        showToast({
          message: getJobErrorMessage(error, 'Failed to remove job opening'),
          type: 'error',
        });
        setShowCancelConfirm(false);
        return;
      }
    }
    setShowCancelConfirm(false);
    navigate('/jobs');
  };

  // Intentional "leave as draft" exit, same as every other step.
  const handleSaveDraft = () => {
    showToast({ message: 'Job saved as draft successfully', type: 'success' });
    navigate('/jobs');
  };

  const isLocked = Boolean(jobScoringData?.data?.isLocked);
  const lockedReason = jobScoringData?.data?.lockedReason ?? null;
  const isEditable = !isViewMode && !isLocked;

  const resumeWeights = useMemo(
    () => normalizeWeights(jobScoringData?.data?.resumeConfig?.weights),
    [jobScoringData]
  );
  const interviewWeights = useMemo(
    () => normalizeWeights(jobScoringData?.data?.interviewConfig?.weights),
    [jobScoringData]
  );
  const currentResumeWeights = resumeDraft ?? resumeWeights;
  const currentInterviewWeights = interviewDraft ?? interviewWeights;
  const hasChanges =
    isEditable &&
    [
      { current: currentResumeWeights, saved: resumeWeights },
      { current: currentInterviewWeights, saved: interviewWeights },
    ].some(({ current, saved }) =>
      current.some(
        (weight) =>
          saved.find((savedWeight) => savedWeight.id === weight.id)?.weightPercentage !==
          weight.weightPercentage
      )
    );
  const areWeightsValid = [currentResumeWeights, currentInterviewWeights].every(
    (weights) => weights.reduce((total, weight) => total + weight.weightPercentage, 0) === 100
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

  const handleSaveScoring = useCallback(async (): Promise<boolean> => {
    if (!isEditable || !areWeightsValid || isSaving || isResetting) return false;
    try {
      const result = await updateScoring({
        jobId,
        resumeWeights: currentResumeWeights,
        interviewWeights: currentInterviewWeights,
      }).unwrap();
      patchScoringCache(result.data);
      setResumeDraft(null);
      setInterviewDraft(null);
      showToast({ message: 'Scoring configuration saved successfully.', type: 'success' });
      return true;
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Failed to save scoring configuration.'),
        type: 'error',
      });
      return false;
    }
  }, [
    jobId,
    currentResumeWeights,
    currentInterviewWeights,
    isEditable,
    areWeightsValid,
    isSaving,
    isResetting,
    updateScoring,
    patchScoringCache,
  ]);

  const handleNext = async (): Promise<void> => {
    if (hasChanges && !(await handleSaveScoring())) return;
    dispatch(setIsScoringCompleted(true));
    dispatch(setEditScoringPassedJobId(jobId || null));
    navigate(isEditMode ? `/jobs/edit/${jobId}/interview` : '/interview-setup');
  };

  const handleReset = useCallback(async () => {
    if (!isEditable || isSaving || isResetting) return;
    try {
      const result = await resetScoring({ jobId }).unwrap();
      patchScoringCache(result.data);
      setResumeDraft(null);
      setInterviewDraft(null);
      setShowResetConfirm(false);
      showToast({
        message: 'Scoring configuration reset successfully.',
        type: 'success',
      });
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Failed to reset scoring configuration.'),
        type: 'error',
      });
    }
  }, [jobId, isEditable, isSaving, isResetting, resetScoring, patchScoringCache]);

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
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-2xl font-semibold text-gray-800">Scoring Weight Distribution</h2>
        {isEditable && (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            disabled={isSaving || isResetting}
            className="inline-flex items-center justify-center gap-2 cursor-pointer border border-neutral-300 bg-white text-neutral-600 hover:bg-gray-50 hover:text-gray-800 hover:border-neutral-400 rounded-full px-5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ReloadOutlined spin={isResetting} aria-hidden="true" />
            {isResetting ? 'Resetting...' : 'Reset to Defaults'}
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {isLocked
          ? lockedReason === 'organization'
            ? 'Locked by your organization admin. Contact them to change this.'
            : 'Locked. A candidate has already applied to this job.'
          : isEditable
            ? 'Customize scoring weights for this specific job opening. Both panels are saved together.'
            : 'Scoring weights configured for this job opening.'}
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ScoringWeightCard
          title="Resume Scoring Categories"
          subtitle="Applies to Resume Review"
          infoText="Resume categories are always evaluated. All categories must total exactly 100%."
          weights={resumeWeights}
          value={currentResumeWeights}
          onChange={setResumeDraft}
          categoryMeta={RESUME_CATEGORY_META}
          disabled={isSaving || isResetting}
          editable={isEditable}
        />

        <ScoringWeightCard
          title="Interview Scoring Categories"
          subtitle="Applies to AI Agent Call and AI Video Interview"
          infoText="If a category is not covered in an interview, its weight is redistributed proportionally"
          weights={interviewWeights}
          value={currentInterviewWeights}
          onChange={setInterviewDraft}
          categoryMeta={INTERVIEW_CATEGORY_META}
          disabled={isSaving || isResetting}
          editable={isEditable}
        />
      </div>

      {!isViewMode && (
        <JobActionFooter className="-mx-6 -mb-10 mt-8">
          {showDraftActions && (
            <Tooltip title="Delete this job opening and everything in it.">
              <Button
                className="border border-neutral-300 bg-white text-neutral-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50/50 rounded-full px-5 py-2 text-sm font-medium transition-colors flex items-center justify-center"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel
              </Button>
            </Tooltip>
          )}
          {showDraftActions && (
            <Tooltip title="Save progress and come back later.">
              <Button
                className="bg-primary hover:bg-brand-700 text-white rounded-full px-5 py-2 text-sm font-semibold shadow-sm transition-colors flex items-center justify-center"
                onClick={handleSaveDraft}
              >
                Save As Draft
              </Button>
            </Tooltip>
          )}
          <Tooltip
            title={hasChanges ? 'Save this page and continue.' : 'Continue to the next step.'}
          >
            <Button
              className="bg-primary hover:bg-primary-hover text-white rounded-full px-5 py-2 text-sm font-semibold shadow-xs hover:shadow transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleNext}
              disabled={isSaving || isResetting || (hasChanges && !areWeightsValid)}
            >
              {isSaving ? 'Saving...' : hasChanges ? 'Save & Next' : 'Next'}
            </Button>
          </Tooltip>
        </JobActionFooter>
      )}
      {showResetConfirm && (
        <ConfirmationModal
          onClose={() => setShowResetConfirm(false)}
          onConfirm={handleReset}
          title="Reset both resume and interview scoring weights to defaults? Any unsaved changes will be discarded."
          confirmText="Reset to Defaults"
          isLoading={isResetting}
        />
      )}
      {showCancelConfirm && (
        <ConfirmationModal
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={handleConfirmCancel}
          title="Cancel this job opening? Everything added so far will be permanently deleted."
          confirmText="Cancel Job"
          isLoading={isCancelling}
        />
      )}
    </div>
  );
};

export default JobScoringCriteriaTab;
