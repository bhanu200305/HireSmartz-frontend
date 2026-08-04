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
  const isReadOnlyMode = isViewMode || isEditMode;
  const search = location.search;
  const { id } = useParams<{ id: string }>();
  const aiJobDescriptionId = useSelector(
    (state: RootState) => state.EditJobSlice.aiJobDescription.id
  );
  const jobDetails = useSelector((state: RootState) => state.JobSlice.details);
  const jobDescription = useSelector((state: RootState) => state.JobSlice.description);
  const isFormCompleted = useSelector((state: RootState) => state.JobSlice.isFormCompleted);
  const interviewRounds = useSelector((state: RootState) => state.JobSlice.interviewRounds);

  const isCreateMode = !isViewMode && !isEditMode;

  // Check step completion in create mode
  const isTab1Completed = isCreateMode
    ? Object.keys(jobDetails).length > 0 && jobDetails.jobProfileCode
    : true;
  const isTab2Completed = isCreateMode
    ? Object.keys(jobDescription).length > 0 && jobDescription.educationPreference?.length > 0
    : true;
  const isTab3Completed = isCreateMode ? isFormCompleted === true : true;

  const isActiveTab = (path: string) => location.pathname.includes(path);

  const isCandidatePage =
    location.pathname.includes('/candidateDetails') || /\/candidates/.test(location.pathname);

  const fromDashboard = location.state?.fromDashboard || false;

  const baseSteps = [
    'Job Details',
    'AI Job Description',
    'Interview Setup',
    'AI Questions',
    'Video Questions',
    'Scoring Criteria',
  ];

  const viewSteps = [
    'Job Details',
    'AI Job Description',
    // 'Candidates',
    'Interview Setup',
    'AI Questions',
    'Video Questions',
    'Scoring Criteria',
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
        `${basePaths.view}/interview`,
        `${basePaths.view}/aiQuestions`,
        `${basePaths.view}/video-interview-questions`,
        `${basePaths.view}/scoring-criteria`,
      ],
      edit: [
        `${basePaths.edit}/details`,
        `${basePaths.edit}/AiJobDescription/${aiJobDescriptionId}`,
        `${basePaths.edit}/interview`,
        `${basePaths.edit}/editAiQuestions`,
        `${basePaths.edit}/editVideoQuestions`,
        `${basePaths.edit}/scoring-criteria`,
      ],
      create: [
        '/job-details',
        '/ai-job-description',
        '/interview-setup',
        '/ai-questions',
        '/video-questions',
        '/scoring-criteria',
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
    const isCurrentTabDisabled =
      (currentTabIndex === 1 && (!isTab1Completed || !isTab2Completed)) ||
      (currentTabIndex === 2 && (!isTab1Completed || !isTab2Completed || !isTab3Completed)) ||
      (currentTabIndex === 3 && (!isTab1Completed || !isTab2Completed || !isTab3Completed)) ||
      (currentTabIndex === 4 && (!isTab1Completed || !isTab2Completed || !isTab3Completed)) ||
      (currentTabIndex === 5 && (!isTab1Completed || !isTab2Completed || !isTab3Completed));

    if (!isCurrentTabDisabled) return; // Current tab is enabled, no redirect needed

    // Don't redirect from interview-setup as it has its own save navigation logic
    if (currentPath.includes('/interview-setup')) return;

    // Find first available tab
    const firstAvailableIndex = currentPaths.findIndex((_: string, index: number) => {
      if (index === 1 && (!isTab1Completed || !isTab2Completed)) return false;
      if (index === 2 && (!isTab1Completed || !isTab2Completed || !isTab3Completed)) return false;
      if (index === 3 && (!isTab1Completed || !isTab2Completed || !isTab3Completed)) return false;
      if (index === 4 && (!isTab1Completed || !isTab2Completed || !isTab3Completed)) return false;
      if (index === 5 && (!isTab1Completed || !isTab2Completed || !isTab3Completed)) return false;
      return true;
    });

    // Redirect if available tab found and different from current
    if (firstAvailableIndex !== -1 && firstAvailableIndex !== currentTabIndex) {
      const safePath = sanitizedPath(currentPaths[firstAvailableIndex] + search) || '/';
      navigate(safePath, { replace: true });
    }
  }, [
    isTab1Completed,
    isTab2Completed,
    isTab3Completed,
    isCreateMode,
    isCandidatePage,
    location.pathname,
    search,
    navigate,
    currentPaths,
  ]);

  return (
    <div className="flex flex-col items-center bg-white px-4 mt-4 relative pt-16">
      <div className="mb-4 self-start px-4 absolute">
        <button
          onClick={handleBackNavigation}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
        >
          <MdOutlineArrowBack className="mr-2" />
          <span>Back</span>
        </button>
      </div>
      <div className="bg-[#FAFAFA] p-6 md:p-6 rounded-2xl shadow-lg w-full max-w-6xl flex flex-col">
        {!isCandidatePage && (
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="stepsContainer flex gap-3 flex-1 min-w-0">
              {allSteps.map((step, index) => {
                const stepPath = currentPaths[index];

                // Determine if tab is disabled based on previous tabs completion
                let isDisabled = false;
                if (isCreateMode) {
                  if (index === 1 && (!isTab1Completed || !isTab2Completed)) isDisabled = true; // AI Job Description needs job details and skills completion
                  if (index === 2 && (!isTab1Completed || !isTab2Completed || !isTab3Completed))
                    isDisabled = true; // Interview Setup needs previous completion
                  if (index === 3 && (!isTab1Completed || !isTab2Completed || !isTab3Completed))
                    isDisabled = true; // AI Questions stays after Interview Setup
                  if (index === 4 && (!isTab1Completed || !isTab2Completed || !isTab3Completed))
                    isDisabled = true; // Video Questions stays after Interview Setup
                  if (index === 5 && (!isTab1Completed || !isTab2Completed || !isTab3Completed))
                    isDisabled = true; // Scoring Criteria stays after Interview Setup
                }

                const isMergedJobDetailsTab = index === 0;
                const isStepActive = isMergedJobDetailsTab
                  ? isActiveTab(stepPath) ||
                    location.pathname.includes('/job-description') ||
                    location.pathname.includes('/description')
                  : isActiveTab(stepPath);

                return (
                  <div
                    key={`${step}-${index}`}
                    onClick={() => {
                      if (isDisabled) return;
                      const safePath = sanitizedPath(stepPath + search) || '/';
                      navigate(safePath);
                    }}
                    className={`stepBox pb-2 whitespace-nowrap shrink text-sm ${
                      isDisabled ? 'cursor-not-allowed text-gray-800 opacity-40' : 'cursor-pointer'
                    } ${
                      isStepActive
                        ? 'border-b-1 border-primary text-primary '
                        : isDisabled
                          ? 'text-gray-600'
                          : 'text-gray-500'
                    }`}
                  >
                    {step}
                  </div>
                );
              })}
            </div>
            {button && <div className="shrink-0">{button}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default JobDetailsLayout;
