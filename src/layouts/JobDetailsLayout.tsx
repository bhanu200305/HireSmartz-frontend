import BackButton from '../components/shared/ui/BackButton';
import { Button } from '../components/shared';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Tooltip } from 'antd';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { RootState } from '../redux/provider/store';
import { sanitizedPath } from '../shared/utils/business-logic';
import { useGetJobDescriptionByIdQuery } from '../api/job-service/JobOpening/ViewJobDescriptionById';
import {
  useGetJobOpeningByIdQuery,
  useGetWizardStateQuery,
} from '../api/job-service/JobOpening/GetJobOpeningById';
import { asJobId } from '../api/job-service/jobId';
import { JobDetailsHeaderSlotContext } from './jobDetailsHeaderSlot';

interface JobDetailsLayoutProps {
  children?: ReactNode;
  button?: ReactNode;
}

const JobDetailsLayout = ({ children, button }: JobDetailsLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  // Right side of the Back row — see jobDetailsHeaderSlot.ts.
  const [headerSlot, setHeaderSlot] = useState<HTMLDivElement | null>(null);
  const isViewMode = location.pathname.includes('/jobs/view/');
  const isEditMode = location.pathname.includes('/jobs/edit/');
  const search = location.search;
  const { id } = useParams<{ id: string }>();
  const aiJobDescriptionId = useSelector(
    (state: RootState) => state.EditJobSlice.aiJobDescription.id
  );
  const savedDetailsJobId = useSelector((state: RootState) => state.JobSlice.aiJobDescriptionId);
  const isFormCompleted = useSelector((state: RootState) => state.JobSlice.isFormCompleted);
  const editAiJdPassedJobId = useSelector((state: RootState) => state.JobSlice.editAiJdPassedJobId);
  const editScoringPassedJobId = useSelector(
    (state: RootState) => state.JobSlice.editScoringPassedJobId
  );
  const isScoringCompleted = useSelector((state: RootState) => state.JobSlice.isScoringCompleted);
  const reduxJobOpeningId = useSelector((state: RootState) => state.JobSlice.jobOpeningId);

  const isCreateMode = !isViewMode && !isEditMode;

  // Gate on saved details: the server flag, or the id set on save (the refetch lags).
  const resolvedJobId = asJobId(reduxJobOpeningId);
  const { data: jdDetailsForGate, isFetching: isGateFetching } = useGetJobDescriptionByIdQuery(
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
  const { data: wizardState, isLoading: isWizardLoading } = useGetWizardStateQuery(wizardJobId, {
    skip: !wizardJobId,
  });
  // The server has a saved round, so the JD and scoring steps were passed earlier.
  const serverShowsRoundsSaved =
    wizardState?.stages.some((s) => s.stage === 'interview_rounds' && s.is_complete) === true;
  // A draft's gates can't be judged until its JD has loaded.
  const isEditJdPending = isEditingDraft && !editJd;
  const hasSavedInterviewRound =
    !isGated ||
    !wizardState ||
    wizardState.stages.some((s) => s.stage === 'interview_rounds' && s.is_complete);

  // Edited drafts count as complete until the server answers (no flicker).
  const isTab1Completed = isCreateMode
    ? jdDetailsForGate?.hasSavedDetails === true ||
      (Boolean(resolvedJobId) && savedDetailsJobId === resolvedJobId)
    : isEditingDraft
      ? !editJd || editJd.hasSavedDetails
      : true;
  const isTab3Completed = isCreateMode
    ? isFormCompleted === true || serverShowsRoundsSaved
    : isEditingDraft
      ? (editAiJdPassedJobId === editJobId && Boolean(editJd?.jobDescription?.trim())) ||
        serverShowsRoundsSaved
      : true;
  const isScoringUnlocked = !isGated || isTab3Completed;
  // Create and draft edit track when Scoring Criteria was saved.
  const isScoringDone = isCreateMode
    ? isScoringCompleted === true || serverShowsRoundsSaved
    : isEditingDraft
      ? editScoringPassedJobId === editJobId || serverShowsRoundsSaved
      : true;

  const isActiveTab = (path: string) => location.pathname.includes(path);

  const isCandidatePage =
    location.pathname.includes('/candidateDetails') || /\/candidates/.test(location.pathname);

  const fromDashboard = location.state?.fromDashboard || false;

  // Create wizard steps.
  const baseSteps = [
    'Job Details',
    'AI Job Description',
    'Scoring Criteria',
    'Interview Setup',
    'Questions',
  ];

  // View/Edit tabs.
  const viewSteps = [
    'Job Details',
    'AI Job Description',
    // 'Candidates',
    'Scoring Criteria',
    'Interview Setup',
    'Questions',
  ];
  // const allSteps = isViewMode ? viewSteps : baseSteps
  // View mode shows questions inline under each round, so no Questions tab.
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

  // A single candidate's page (not the list); Back goes to the list.
  const isCandidateDetailsPage =
    /\/candidates\/[^/]+\/details/.test(location.pathname) ||
    location.pathname.includes('/candidateDetails/');

  // View mode: a Next button at the bottom opens the following tab.
  const viewTabIndex = isViewMode
    ? currentPaths.findIndex((path: string) => location.pathname.includes(path))
    : -1;
  const nextViewPath =
    viewTabIndex >= 0 && viewTabIndex + 1 < allSteps.length ? currentPaths[viewTabIndex + 1] : null;

  // Candidate list Back goes to the job listing, not `navigate(-1)`.
  const returnState = location.state as {
    returnTo?: string;
    returnLabel?: string;
    reopenCalendar?: boolean;
  } | null;
  const returnTo =
    isCandidateDetailsPage && returnState?.returnTo?.startsWith('/') ? returnState.returnTo : null;

  const handleBackNavigation = () => {
    if (returnTo) {
      // From the calendar popup: land back on the page it was opened from, with
      // the popup open again.
      navigate(
        returnTo,
        returnState?.reopenCalendar ? { state: { reopenCalendar: true } } : undefined
      );
    } else if (isCandidateDetailsPage && id) {
      navigate(`/jobs/view/${id}/candidates`);
    } else if (fromDashboard) {
      navigate('/');
    } else {
      navigate('/jobs');
    }
  };

  // Redirect to first available tab if current tab is disabled (e.g., on page refresh)
  useEffect(() => {
    // Wait for the data the gates depend on, or a reload bounces to an earlier tab.
    if (!isGated || isCandidatePage || isGateFetching || isEditJdPending || isWizardLoading) return;

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

    // Tab order: 0 Job Details, 1 AI JD, 2 Scoring, 3 Interview Setup, 4 Questions
    const isCurrentTabDisabled =
      (currentTabIndex === 1 && !isTab1Completed) ||
      (currentTabIndex === 2 && !isScoringUnlocked) ||
      (currentTabIndex === 3 && (!isTab3Completed || !isScoringDone)) ||
      (currentTabIndex === 4 && (!isTab3Completed || !isScoringDone || !hasSavedInterviewRound));

    if (!isCurrentTabDisabled) return; // Current tab is enabled, no redirect needed

    // Nearest open tab before this one (Job Details is always open).
    const isOpen = (index: number) => {
      if (index === 1) return isTab1Completed;
      if (index === 2) return isScoringUnlocked;
      if (index === 3) return isTab3Completed && isScoringDone;
      if (index === 4) return isTab3Completed && isScoringDone && hasSavedInterviewRound;
      return true;
    };
    let targetIndex = currentTabIndex - 1;
    while (targetIndex > 0 && !isOpen(targetIndex)) targetIndex -= 1;
    const safePath = sanitizedPath(currentPaths[Math.max(targetIndex, 0)] + search) || '/';
    navigate(safePath, { replace: true });
  }, [
    isTab1Completed,
    isTab3Completed,
    isScoringDone,
    hasSavedInterviewRound,
    isScoringUnlocked,
    isGated,
    isGateFetching,
    isEditJdPending,
    isWizardLoading,
    isCandidatePage,
    location.pathname,
    search,
    navigate,
    currentPaths,
  ]);

  return (
    <div className="flex flex-col items-center px-4 mt-4 w-full">
      {isCandidateDetailsPage ? (
        // A candidate's page mirrors its two back links: Job Openings on the
        // left, Candidate List on the right directly above the Previous /
        // Next switcher (portaled into the slot), both on the same top line.
        <div className="w-full max-w-6xl mb-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <BackButton onClick={() => navigate('/jobs')} label="Back to Job Openings" />
          {/* `ml-auto` keeps it on the right even when a narrow screen wraps it. */}
          <div className="ml-auto flex flex-col items-end gap-1">
            {returnTo || !id ? (
              <BackButton
                onClick={handleBackNavigation}
                label={returnState?.returnLabel ?? 'Back'}
                className="-mr-2"
              />
            ) : (
              // A real link back to this job's candidate list, styled like
              // the candidate page's tabs (e.g. "SMS Communication"): grey,
              // accent colour on hover, never underlined.
              <Link
                to={`/jobs/view/${id}/candidates`}
                className="rounded py-1 text-sm font-medium text-[var(--gray-500)] no-underline transition-colors hover:text-[var(--accent-500)] hover:no-underline focus:outline-none focus-visible:text-[var(--accent-500)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
              >
                Candidate List
              </Link>
            )}
            <div ref={setHeaderSlot} className="flex items-center empty:hidden" />
          </div>
        </div>
      ) : (
        <div className="w-full max-w-6xl mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <BackButton onClick={handleBackNavigation} label="Back" />
          <div ref={setHeaderSlot} className="flex items-center empty:hidden" />
        </div>
      )}
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
        <JobDetailsHeaderSlotContext.Provider value={headerSlot}>
          {children}
        </JobDetailsHeaderSlotContext.Provider>
        {nextViewPath && !isCandidatePage && (
          <div className="mt-6 flex justify-end">
            <Button
              className="text-white bg-button rounded-3xl px-8 py-2 cursor-pointer"
              onClick={() => navigate(sanitizedPath(nextViewPath + search) || '/')}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetailsLayout;
