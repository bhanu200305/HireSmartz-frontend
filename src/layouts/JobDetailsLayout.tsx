import { ReactNode, useEffect, useMemo } from 'react';
import { MdOutlineArrowBack } from 'react-icons/md';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { RootState } from '../redux/provider/store';
import { sanitizedPath } from '../shared/utils/business-logic';

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
  const jobDetails = useSelector((state: RootState) => state.JobSlice.details);
  const jobDescription = useSelector((state: RootState) => state.JobSlice.description);
  const isFormCompleted = useSelector((state: RootState) => state.JobSlice.isFormCompleted);

  const isCreateMode = !isViewMode && !isEditMode;

  // Check step completion in create mode
  const isTab1Completed = isCreateMode
    ? Object.keys(jobDetails).length > 0 && jobDetails.jobProfileCode
    : true;
  const isTab2Completed = isCreateMode
    ? Object.keys(jobDescription).length > 0 && jobDescription.educationPreference?.length > 0
    : true;
  const isTab3Completed = isCreateMode ? isFormCompleted === true : true;
  const isScoringUnlocked =
    !isCreateMode || isTab3Completed || (isTab1Completed && isTab2Completed);

  const isActiveTab = (path: string) => location.pathname.includes(path);

  const isCandidatePage =
    location.pathname.includes('/candidateDetails') || /\/candidates/.test(location.pathname);

  const fromDashboard = location.state?.fromDashboard || false;

  // Create wizard: Job Details and AI Job Description are two separate
  // steps (jobdetails.tsx + JobDescriptionStep.tsx/JobDescriptionPanel.tsx),
  // same shape as View/Edit below — previously merged into one split-screen
  // step, un-merged back to match. Scoring Criteria sits right after AI
  // Job Description; Video Questions is retired as its own step (JD
  // Questions — the renamed AI Questions pool — is the one shared question
  // bank now; see AiQuestionsSetup.tsx). VideoQuestionsSetup.tsx/its route
  // are left in place, just unlinked from this nav.
  const baseSteps = [
    'Job Details',
    'AI Job Description',
    'Scoring Criteria',
    'Interview Setup',
    'Questions',
  ];

  // View/Edit keep Job Details and AI Job Description as two separate
  // read-only tabs — same Scoring-Criteria-earlier, Video-Questions-retired
  // changes as the create wizard, for consistency.
  const viewSteps = [
    'Job Details',
    'AI Job Description',
    // 'Candidates',
    'Scoring Criteria',
    'Interview Setup',
    'Questions',
  ];
  // const allSteps = isViewMode ? viewSteps : baseSteps
  const allSteps = isViewMode || isEditMode ? viewSteps : baseSteps;

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

  const handleBackNavigation = () => {
    if (isCandidatePage) {
      navigate(-1);
    } else if (fromDashboard) {
      navigate('/');
    } else {
      navigate('/jobs');
    }
  };

  // Redirect to first available tab if current tab is disabled (e.g., on page refresh)
  useEffect(() => {
    if (!isCreateMode || isCandidatePage) return;

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
      (currentTabIndex === 3 && !isTab3Completed) ||
      (currentTabIndex === 4 && !isTab3Completed);

    if (!isCurrentTabDisabled) return; // Current tab is enabled, no redirect needed

    // Don't redirect from interview-setup as it has its own save navigation logic
    if (currentPath.includes('/interview-setup')) return;

    // Find first available tab
    const firstAvailableIndex = currentPaths.findIndex((_: string, index: number) => {
      if (index === 1 && !isTab1Completed) return false;
      if (index === 2 && !isScoringUnlocked) return false;
      if (index === 3 && !isTab3Completed) return false;
      if (index === 4 && !isTab3Completed) return false;
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
    isScoringUnlocked,
    isCreateMode,
    isCandidatePage,
    location.pathname,
    search,
    navigate,
    currentPaths,
  ]);

  return (
    <div className="flex flex-col items-center px-4 mt-4 w-full">
      <div className="w-full max-w-6xl mb-3">
        <button
          type="button"
          onClick={handleBackNavigation}
          className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg px-2 py-1 -ml-2 cursor-pointer transition-colors"
        >
          <MdOutlineArrowBack size={16} />
          <span>Back</span>
        </button>
      </div>
      <div className="bg-white p-6 md:p-6 rounded-2xl shadow-sm border border-neutral-200 w-full max-w-6xl flex flex-col">
        {!isCandidatePage && (
          <div className="mb-4 border-b border-neutral-200">
            <div className="flex items-center justify-between gap-4">
              <div className="stepsContainer flex items-center gap-6 sm:gap-8 flex-1 min-w-0 overflow-x-auto">
                {allSteps.map((step, index) => {
                  const stepPath = currentPaths[index];

                  // Determine if tab is disabled based on previous tabs completion
                  let isDisabled = false;
                  if (isCreateMode) {
                    if (index === 1 && !isTab1Completed) isDisabled = true;
                    if (index === 2 && !isScoringUnlocked) isDisabled = true;
                    if (index === 3 && !isTab3Completed) isDisabled = true;
                    if (index === 4 && !isTab3Completed) isDisabled = true;
                  }

                  const isStepActive = isActiveTab(stepPath);

                  return (
                    <button
                      type="button"
                      key={`${step}-${index}`}
                      onClick={() => {
                        if (isDisabled) return;
                        const safePath = sanitizedPath(stepPath + search) || '/';
                        navigate(safePath);
                      }}
                      disabled={isDisabled}
                      className={`stepBox whitespace-nowrap shrink-0 pb-3 text-sm border-b-2 transition-colors ${
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
