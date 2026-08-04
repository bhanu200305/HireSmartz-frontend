import { Tooltip } from 'antd';
import { LuSquarePen } from 'react-icons/lu';
import { InterviewRoundResponseDTO } from '../../../../types';
import { Button } from '../../../shared';
import { InterviewEnum } from '../../../../shared/utils/enums';

type FeedbackTabsProps = {
  showInterviewerFeedback: boolean;
  showAIGeneratedFeedback?: boolean;
  showFinalFeedback: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  interviewRound?: InterviewRoundResponseDTO;
  showScoringCriteria?: boolean;
  onScoringCriteriaClick?: () => void;
  /** When set, shows a notes control next to Scoring Criteria (e.g. round-scoped candidate notes). */
  onOpenNotes?: () => void;
  notesCount?: number;
};

const FeedbackTabs = ({
  showInterviewerFeedback,
  showAIGeneratedFeedback,
  showFinalFeedback,
  activeTab,
  onTabChange,
  showScoringCriteria = false,
  interviewRound,
  onScoringCriteriaClick,
  onOpenNotes,
  notesCount,
  // interviewRound
}: FeedbackTabsProps) => {
  const shouldUseUnifiedFeedbackTab = showInterviewerFeedback && showFinalFeedback;
  const tabs = [
    ...(!shouldUseUnifiedFeedbackTab && showInterviewerFeedback
      ? [{ id: 'INTERVIEWER_FEEDBACK', label: 'Interviewer Feedback' }]
      : []),
    ...(showAIGeneratedFeedback
      ? [{ id: 'AI_GENERATED_FEEDBACK', label: 'Summary and Scoring' }]
      : []),
    ...(showFinalFeedback || shouldUseUnifiedFeedbackTab
      ? [{ id: 'FINAL_FEEDBACK', label: 'Feedback' }]
      : []),
  ];

  console.log({ interviewRound });

  return (
    <div className="w-full flex justify-between items-center">
      <div className="flex ">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            className={`px-4 py-2 text-md cursor-pointer  ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => onTabChange(tab.id)}
            // disabled={tab.id === 'FINAL_FEEDBACK' && !interviewRound?.isCompleted}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      {(showScoringCriteria || onOpenNotes) && (
        <div className="flex items-center gap-2">
          {onOpenNotes &&
          interviewRound?.interviewStatus != null &&
          interviewRound.interviewStatus !== InterviewEnum.INTERVIEW_SKIPPED &&
          interviewRound.interviewStatus !== InterviewEnum.BOOKING_CANCELLED &&
          interviewRound.interviewStatus !== InterviewEnum.NOT_SCHEDULED ? (
            <Tooltip title={notesCount != null ? `Notes (${notesCount})` : 'Notes'}>
              <button
                type="button"
                onClick={onOpenNotes}
                className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#b8d0e6] bg-[#eaf2f8] text-[#2a69a8] transition-colors hover:border-[#2a69a8] hover:bg-[#dce9f4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a69a8]/30"
                aria-label={notesCount != null ? `Notes, ${notesCount} items` : 'Notes'}
              >
                <LuSquarePen size={18} strokeWidth={2} aria-hidden />
              </button>
            </Tooltip>
          ) : null}
          {showScoringCriteria ? (
            <Button
              className="px-4 py-2 text-sm bg-button text-white rounded-lg"
              onClick={onScoringCriteriaClick}
            >
              Scoring Criteria
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default FeedbackTabs;
