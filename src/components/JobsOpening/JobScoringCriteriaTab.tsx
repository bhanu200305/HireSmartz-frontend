import React, { useCallback, useMemo, useState } from 'react';
import { Tooltip } from 'antd';
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
        <div className="mt-8 flex justify-center gap-6">
          {showDraftActions && (
            <Tooltip title="Save progress and come back later.">
              <Button
                className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2"
                onClick={handleSaveDraft}
              >
                Save As Draft
              </Button>
            </Tooltip>
          )}
          {showDraftActions && (
            <Tooltip title="Delete this job opening and everything in it.">
              <Button
                className="text-white bg-gray-400 hover:bg-gray-500 rounded-3xl px-8 py-2 flex items-center space-x-2"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Save this page and continue.">
            <Button
              className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2"
              onClick={() => {
                dispatch(setIsScoringCompleted(true));
                dispatch(setEditScoringPassedJobId(jobId || null));
                // Edit mode needs the job-id-aware route, not the create wizard's bare path.
                navigate(isEditMode ? `/jobs/edit/${jobId}/interview` : '/interview-setup');
              }}
            >
              Save &amp; Next
            </Button>
          </Tooltip>
        </div>
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
