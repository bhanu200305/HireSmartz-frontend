import React, { useState } from 'react';
import { AiOutlinePlus, AiOutlineMinus } from 'react-icons/ai';
import { CandidateByIdResponse } from '../../../../types';
import VideoInterviewScoreCard from './VideoInterviewScoreCard';
import VideoInterviewFeedback from './VideoInterviewFeedabck';
import FinalFeedback from './FinalFeedback';
import FeedbackTabs from './FeedbackTabs';
import ScoringCriteriaModal from '../Modal/ScoringCriteriaModal';
import dayjs from 'dayjs';

type InterviewDetailsProps = {
  candidate?: CandidateByIdResponse;
  roundType: string;
  showInterviewerFeedback?: boolean;
  showFinalFeedback?: boolean;
  interviewRoundId: number;
  onOpenNotes?: () => void;
  notesCount?: number;
};

const InPersonInterviewDetails = ({
  candidate,
  roundType,
  showInterviewerFeedback = false,
  showFinalFeedback = false,
  interviewRoundId,
  onOpenNotes,
  notesCount,
}: InterviewDetailsProps) => {
  // const videoInterviewData = candidate?.aiQuestionScorecardResponseDto?.[roundType]
  // const interviewRound = candidate?.interviewRounds?.find((item) => item?.roundType === roundType)
  const interviewRound = candidate?.interviewRounds?.find((item) => item?.id === interviewRoundId);
  const videoInterviewData = candidate?.aiQuestionScorecardResponseDto?.[roundType]?.filter(
    (item: any) => item.interviewRoundId === interviewRoundId
  );
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>('FINAL_FEEDBACK');
  const [showScoringCriteria, setShowScoringCriteria] = useState(false);
  const roundFeedback = interviewRound?.videoInterviewFeedback?.trim();
  const toggleSection = (sectionKey: string, parentKey?: string) => {
    setExpandedSections((prev) => {
      const newState = { ...prev };
      if (!parentKey) {
        Object.keys(prev).forEach((key) => {
          if (!key.includes('-') && key !== sectionKey) {
            newState[key] = false;
          }
        });
      }
      if (parentKey) {
        Object.keys(prev).forEach((key) => {
          if (key.startsWith(parentKey)) {
            const parentParts = parentKey.split('-').length;
            const keyParts = key.split('-').length;
            if (keyParts === parentParts + 1 && key !== sectionKey) {
              newState[key] = false;
            }
          }
        });
      }
      newState[sectionKey] = !prev[sectionKey];

      return newState;
    });
  };
  const renderInterviewerSection = (interviewerData: any, index: number) => {
    const interviewerNumber = index + 1;
    const interviewerKey = `INTERVIEWER_FEEDBACK${interviewerNumber}`;
    const isExpanded = expandedSections[interviewerKey] || false;

    const interviewerName = interviewerData?.name || `Interviewer ${interviewerNumber}`;
    const feedbackTimestamp =
      interviewerData?.createdAt ||
      interviewerData?.updatedAt ||
      interviewerData?.submittedAt ||
      interviewerData?.feedbackDate;

    return (
      <div
        className={`mb-6 w-full max-w-[820px] border border-gray-200 ${isExpanded ? 'rounded-lg' : 'rounded-full'} p-4 text-sm text-gray-700 bg-[#FAFAFA] shadow-sm`}
      >
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            toggleSection(interviewerKey);
          }}
        >
          <span className="font-bold">{interviewerName}</span>
          <div className="flex items-center gap-2">
            {feedbackTimestamp ? (
              <span className="text-xs text-gray-500">
                {dayjs(feedbackTimestamp).format('MMM DD, YYYY, h:mm A')}
              </span>
            ) : null}
            {isExpanded ? (
              <AiOutlineMinus className="text-primary-600 h-5 w-5" />
            ) : (
              <AiOutlinePlus className="text-primary-600 h-5 w-5" />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-4">
            {renderSection(
              'Scorecard',
              `${interviewerKey}-scorecard`,
              <VideoInterviewScoreCard evalResponse={interviewerData} />,
              true,
              interviewerKey
            )}
            {renderSection(
              'Interview Feedback',
              `${interviewerKey}-feedback`,
              <VideoInterviewFeedback evalResponse={interviewerData} />,
              false,
              interviewerKey
            )}
          </div>
        )}
      </div>
    );
  };

  const renderUnifiedFeedbackSection = () => {
    return (
      <div className="max-w-[820px]">
        <h3 className="mb-3 text-base font-medium text-gray-800">Interviewer Feedback</h3>
        {videoInterviewData && videoInterviewData.length > 0 ? (
          videoInterviewData.map((interviewerData: any, index: number) =>
            renderInterviewerSection(interviewerData, index)
          )
        ) : (
          <div className="mb-6 w-full max-w-[820px] border border-gray-200 rounded-lg p-4 text-sm text-gray-700 bg-[#FAFAFA] shadow-sm">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-800">No interview data available</span>
            </div>
          </div>
        )}

        {interviewRound ? (
          <div className="mt-2">
            <h3 className="mb-3 text-base font-medium text-gray-800">Round Feedback</h3>
            {roundFeedback ? (
              <FinalFeedback interviewRound={interviewRound} />
            ) : (
              <div className="mb-6 w-full max-w-[820px] border border-gray-200 rounded-lg p-4 text-sm text-gray-700 bg-[#FAFAFA] shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-800">No feedback available</span>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const renderSection = (
    title: string,
    sectionKey: string,
    content: React.ReactNode,
    fullCard: boolean = false,
    parentKey?: string
  ) => {
    const isExpanded = expandedSections[sectionKey] || false;
    return (
      <div
        className={`border border-[#E2E2E2] ${
          isExpanded ? 'rounded-xl' : 'rounded-full'
        } px-6 py-4 mb-4 bg-white w-full max-w-[820px]`}
      >
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            toggleSection(sectionKey, parentKey);
          }}
        >
          <span className="font-medium text-gray-800">{title}</span>
          {isExpanded ? (
            <AiOutlineMinus className="text-primary-600 h-5 w-5" />
          ) : (
            <AiOutlinePlus className="text-primary-600 h-5 w-5" />
          )}
        </div>
        {isExpanded &&
          (fullCard ? (
            content
          ) : (
            <div className="mt-4 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 bg-white shadow-sm">
              {content}
            </div>
          ))}
      </div>
    );
  };

  const renderContentForTab = (tab: string) => {
    switch (tab) {
      case 'INTERVIEWER_FEEDBACK':
        return <>{renderUnifiedFeedbackSection()}</>;
      case 'FINAL_FEEDBACK':
        return <>{renderUnifiedFeedbackSection()}</>;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-6 w-full max-w-[820px]">
        <FeedbackTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          interviewRound={interviewRound}
          showInterviewerFeedback={showInterviewerFeedback}
          showFinalFeedback={showFinalFeedback}
          showScoringCriteria={true}
          onScoringCriteriaClick={() => setShowScoringCriteria(true)}
          onOpenNotes={onOpenNotes}
          notesCount={notesCount}
        />
      </div>

      {renderContentForTab(activeTab)}
      <ScoringCriteriaModal
        visible={showScoringCriteria}
        onClose={() => setShowScoringCriteria(false)}
        title="INTERVIEW_SCORING"
        subtitle="In-Person Interview"
        footer={null}
      />
    </div>
  );
};

export default InPersonInterviewDetails;
