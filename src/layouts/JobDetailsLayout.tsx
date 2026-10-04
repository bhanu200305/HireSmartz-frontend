import BackButton from '../components/shared/ui/BackButton';
import { ReactNode, useEffect, useMemo } from 'react';
import { Tooltip } from 'antd';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { RootState } from '../redux/provider/store';
import { sanitizedPath } from '../shared/utils/business-logic';
import { useGetJobDescriptionByIdQuery } from '../api/job-service/JobOpening/ViewJobDescriptionById';
import {
  useGetJobOpeningByIdQuery,
  useGetWizardStateQuery,
} from '../api/job-service/JobOpening/GetJobOpeningById';
import { asJobId } from '../api/job-service/jobId';

interface JobDetailsLayoutProps {
  children?: ReactNode;
  button?: ReactNode;
}

const JobDetailsLayout = ({ children, button }: JobDetailsLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isViewMode = location.pathname.includes('/jobs/view/');
  const isEditMode = location.pathname.includes('/jobs/edit/');
  const search = location.search;
  const { id } = useParams<{ id: string }>();
  const aiJobDescriptionId = useSelector(
    (state: RootState) => state.EditJobSlice.aiJobDescription.id
  );
  const isFormCompleted = useSelector((state: RootState) => state.JobSlice.isFormCompleted);
  const isScoringCompleted = useSelector((state: RootState) => state.JobSlice.isScoringCompleted);
  const reduxJobOpeningId = useSelector((state: RootState) => state.JobSlice.jobOpeningId);

  const isCreateMode = !isViewMode && !isEditMode;

  // A draft id exists before any field is filled, so gate on the
  // server-verified hasSavedDetails instead.
  const resolvedJobId = asJobId(reduxJobOpeningId);
  const { data: jdDetailsForGate } = useGetJobDescriptionByIdQuery(
    { jobOpeningId: resolvedJobId },
    { skip: !isCreateMode || !resolvedJobId }
  );

  // A draft being edited is gated like create; published/closed stay open.
  const editJobId = isEditMode && id ? id : '';
  const { data: editJob } = useGetJobOpeningByIdQuery(
    { jobOpeningId: asJobId(editJobId) },
    { skip: !editJobId }
  );
  const isEditingDraft = editJob?.is_draft === true;
  const { data: editJd } = useGetJobDescriptionByIdQuery(
    { jobOpeningId: asJobId(editJobId) },
    { skip: !isEditingDraft }
  );
  const isGated = isCreateMode || isEditingDraft;

  // Questions need a saved interview round. Ready until the server answers.
  const wizardJobId = isCreateMode ? (resolvedJobId ?? '') : isEditingDraft ? editJobId : '';
  const { data: wizardState } = useGetWizardStateQuery(wizardJobId, { skip: !wizardJobId });
  const hasSavedInterviewRound =
    !isGated ||
    !wizardState ||
    wizardState.stages.some((s) => s.stage === 'interview_rounds' && s.is_complete);

  // Edited drafts count as complete until the server answers (no flicker).
  const isTab1Completed = isCreateMode
    ? jdDetailsForGate?.hasSavedDetails === true
    : isEditingDraft
      ? !editJd || editJd.hasSavedDetails
      : true;
  const isTab3Completed = isCreateMode
    ? isFormCompleted === true
    : isEditingDraft
      ? !editJd || Boolean(editJd.jobDescription?.trim())
      : true;
  const isScoringUnlocked = !isGated || isTab3Completed;
  // Only create mode knows when Scoring Criteria was saved.
  const isScoringDone = isCreateMode ? isScoringCompleted === true : true;

  const isActiveTab = (path: string) => location.pathname.includes(path);

  const isCandidatePage =
    location.pathname.includes('/candidateDetails') || /\/candidates/.test(location.pathname);

  const fromDashboard = location.state?.fromDashboard || false;

  // Create wizard: Job Details and AI Job Description are two separate
  // steps (jobdetails.tsx + JobDescriptionStep.tsx/JobDescriptionPanel.tsx),
  // same shape as View/Edit below. Scoring Criteria sits right after AI
  // Job Description; JD Questions (AiQuestionsSetup.tsx) is the one shared
  // question bank for Audio Screening/AI Video/Hiring Panel - the old
  // Video Questions step and its screen have been removed.
  const baseSteps = [
    'Job Details',
    'AI Job Description',
    'Scoring Criteria',
    'Interview Setup',
    'Questions',
  ];

  // View/Edit keep Job Details and AI Job Description as two separate
  // read-only tabs, matching the create wizard above.
  const viewSteps = [
    'Job Details',
    'AI Job Description',
    // 'Candidates',
    'Scoring Criteria',
    'Interview Setup',
    'Questions',
  ];
  // const allSteps = isViewMode ? viewSteps : baseSteps
  // View mode drops the Questions tab - it's shown inline under each round
  // in Interview Setup instead; Edit/Create keep it as its own step.
  const allSteps = isViewMode
    ? viewSteps.filter((step) => step !== 'Questions')
    : isEditMode
      ? viewSteps
      : baseSteps;

  const currentPaths = useMemo(() => {
    const basePaths = {
      view: `/jobs/view/${id}`,
      edit: `/jobs/edit/${id}`,
      create: '',
    };

    const stepPaths = {
      view: [
        `${basePaths.view}/details`,
        `${basePaths.view}/AiJobDescription`,
        // `${basePaths.view}/candidates`,
        `${basePaths.view}/scoring-criteria`,
        `${basePaths.view}/interview`,
        `${basePaths.view}/aiQuestions`,
      ],
      edit: [
        `${basePaths.edit}/details`,
        `${basePaths.edit}/AiJobDescription/${aiJobDescriptionId}`,
        `${basePaths.edit}/scoring-criteria`,
        `${basePaths.edit}/interview`,
        `${basePaths.edit}/editAiQuestions`,
      ],
      create: [
        '/job-details',
        '/job-description',
        '/scoring-criteria',
        '/interview-setup',
        '/ai-questions',
      ],
    };
    return isViewMode ? stepPaths.view : isEditMode ? stepPaths.edit : stepPaths.create;
  }, [isViewMode, isEditMode, id, aiJobDescriptionId]);

  // A single candidate's page (not the candidate list, which `isCandidatePage`
  // also matches) — its Back link reads "Back to Candidate List", so it goes
  // to exactly that instead of wherever the browser history happens to point.
  const isCandidateDetailsPage =
    /\/candidates\/[^/]+\/details/.test(location.pathname) ||
    location.pathname.includes('/candidateDetails/');

  // The candidate list's Back goes to the job listing directly rather than
  // `navigate(-1)`: after "Back to Candidate List" pushed the list onto the
  // history, -1 just returned to the candidate that was open before.
  const handleBackNavigation = () => {
    if (isCandidateDetailsPage && id) {
      navigate(`/jobs/view/${id}/candidates`);
    } else if (fromDashboard) {
      navigate('/');
    } else {
      navigate('/jobs');
    }
  };

  // Redirect to first available tab if current tab is disabled (e.g., on page refresh)
  useEffect(() => {
    if (!isGated || isCandidatePage) return;

    const currentPath = location.pathname;
    let currentTabIndex = -1;

    // Find current tab index
    for (let i = 0; i < currentPaths.length; i++) {
      if (currentPath.includes(currentPaths[i])) {
        currentTabIndex = i;
        break;
      }
    }

    if (currentTabIndex === -1) return; // Not on a valid tab path

    // Check if current tab is disabled
    // 5-step create order: 0 Job Details (always open) -> 1 AI Job
    // Description (needs Job Details saved) -> 2 Scoring Criteria (needs
    // isScoringUnlocked) -> 3 Interview Setup / 4 Questions (both need
    // isFormCompleted — set true by JobDescriptionStep's "Next", same as
    // isTab3Completed originally meant "past the AI Job Description step").
    const isCurrentTabDisabled =
      (currentTabIndex === 1 && !isTab1Completed) ||
      (currentTabIndex === 2 && !isScoringUnlocked) ||
      (currentTabIndex === 3 && (!isTab3Completed || !isScoringDone)) ||
      (currentTabIndex === 4 && (!isTab3Completed || !isScoringDone || !hasSavedInterviewRound));

    if (!isCurrentTabDisabled) return; // Current tab is enabled, no redirect needed

    // Find first available tab
    const firstAvailableIndex = currentPaths.findIndex((_: string, index: number) => {
      if (index === 1 && !isTab1Completed) return false;
      if (index === 2 && !isScoringUnlocked) return false;
      if (index === 3 && (!isTab3Completed || !isScoringDone)) return false;
      if (index === 4 && (!isTab3Completed || !isScoringDone || !hasSavedInterviewRound))
        return false;
      return true;
    });

    // Redirect if available tab found and different from current
    if (firstAvailableIndex !== -1 && firstAvailableIndex !== currentTabIndex) {
      const safePath = sanitizedPath(currentPaths[firstAvailableIndex] + search) || '/';
      navigate(safePath, { replace: true });
    }
  }, [
    isTab1Completed,
    isTab3Completed,
    isScoringDone,
    hasSavedInterviewRound,
    isScoringUnlocked,
    isGated,
    isCandidatePage,
    location.pathname,
    search,
    navigate,
    currentPaths,
  ]);

  return (
    <div className="flex flex-col items-center px-4 mt-4 w-full">
      <div className="w-full max-w-6xl mb-3">
        <BackButton
          onClick={handleBackNavigation}
          label={isCandidateDetailsPage ? 'Back to Candidate List' : 'Back'}
        />
      </div>
      <div className="bg-white p-6 md:p-6 rounded-2xl shadow-sm border border-neutral-200 w-full max-w-6xl flex flex-col">
        {!isCandidatePage && (
          <div className="mb-4 border-b border-neutral-200">
            <div className="flex items-center justify-between gap-4">
              <div className="stepsContainer flex items-center gap-6 sm:gap-8 flex-1 min-w-0 overflow-x-auto">
                {allSteps.map((step, index) => {
                  const stepPath = currentPaths[index];

                  // Blame whichever earlier step is actually incomplete.
                  let isDisabled = false;
                  let disabledReason = '';
                  if (isGated) {
                    if (index === 1 && !isTab1Completed) {
                      isDisabled = true;
                      disabledReason = 'Complete Job Details first.';
                    }
                    if (index >= 2 && !isTab1Completed) {
                      isDisabled = true;
                      disabledReason = 'Complete Job Details first.';
                    } else if (index === 2 && !isScoringUnlocked) {
                      isDisabled = true;
                      disabledReason = 'Complete AI Job Description first.';
                    } else if ((index === 3 || index === 4) && !isTab3Completed) {
                      isDisabled = true;
                      disabledReason = 'Complete AI Job Description first.';
                    } else if ((index === 3 || index === 4) && !isScoringDone) {
                      isDisabled = true;
                      disabledReason = 'Complete Scoring Criteria first.';
                    } else if (index === 4 && !hasSavedInterviewRound) {
                      isDisabled = true;
                      disabledReason = 'Complete Interview Setup first.';
                    }
                  }

                  const isStepActive = isActiveTab(stepPath);

                  const tabButton = (
                    <button
                      type="button"
                      onClick={() => {
                        if (isDisabled) return;
                        const safePath = sanitizedPath(stepPath + search) || '/';
                        navigate(safePath);
                      }}
                      disabled={isDisabled}
                      className={`stepBox whitespace-nowrap shrink-0 pb-3 text-sm border-b-2 transition-colors w-full ${
                        isDisabled
                          ? 'cursor-not-allowed text-neutral-300 border-transparent'
                          : 'cursor-pointer'
                      } ${
                        isStepActive
                          ? 'text-primary-600 font-semibold border-primary-600'
                          : isDisabled
                            ? ''
                            : 'text-neutral-500 font-medium border-transparent hover:text-neutral-800'
                      }`}
                    >
                      {step}
                    </button>
                  );

                  return (
                    <span key={`${step}-${index}`} className="shrink-0">
                      {isDisabled ? (
                        <Tooltip title={disabledReason}>{tabButton}</Tooltip>
                      ) : (
                        tabButton
                      )}
                    </span>
                  );
                })}
              </div>
              {button && <div className="shrink-0 pb-2.5">{button}</div>}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default JobDetailsLayout;
