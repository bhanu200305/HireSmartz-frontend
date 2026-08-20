import React, { useState } from 'react';
import { Switch } from 'antd';
import { AiOutlinePlus, AiOutlineMinus } from 'react-icons/ai';
import SummaryContent from './Summary';
import InterviewFeedback from './InterviewFeedback';
import Transcript from './Transcript';
import Scorecard from './Scorecard';
import InterviewScore from './InterviewScore';
import InterviewRecording from './InterviewRecording';
import { CandidateByIdResponse } from '../../../../types';
import FeedbackTabs from './FeedbackTabs';
import FinalFeedback from './FinalFeedback';
import ScoringCriteriaModal from '../Modal/ScoringCriteriaModal';

type InterviewDetailsProps = {
  candidate?: CandidateByIdResponse;
  roundType: string;
  interviewRoundId: number;
  useCultureIntro?: boolean;
  showAIGeneratedFeedback?: boolean;
  showFinalFeedback?: boolean;
  onOpenNotes?: () => void;
  notesCount?: number;
};

const AIInterviewDetails = ({
  candidate,
  roundType,
  interviewRoundId,
  useCultureIntro = false,
  showAIGeneratedFeedback = false,
  showFinalFeedback = false,
  onOpenNotes,
  notesCount,
}: InterviewDetailsProps) => {
  const voiceAIData = candidate?.evaluationResponseDto?.find(
    (item) => Number(item?.interview_round?.id) === interviewRoundId
  );
  const [expandedSection, setExpandedSection] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>('AI_GENERATED_FEEDBACK');
  const [showScoringCriteria, setShowScoringCriteria] = useState(false);

  const toggleSection = (key: string) => {
    setExpandedSection((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const renderSection = (
    title: string,
    sectionKey: string,
    content: React.ReactNode,
    fullCard: boolean = false
  ) => {
    const isExpanded = expandedSection[sectionKey] || false;

    return (
      <div
        className={`border border-[#E2E2E2] ${
          isExpanded ? 'rounded-xl' : 'rounded-full'
        } px-6 py-4 mb-4 bg-white w-full max-w-[820px]`}
      >
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection(sectionKey)}
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
      case 'AI_GENERATED_FEEDBACK':
        if (!voiceAIData) {
          return (
            <div className="max-w-[820px]">
              <div className="mt-3 mb-4 flex items-center gap-3">
                {/* <Switch
                  checked={useCultureIntro}
                  disabled
                  style={{
                    backgroundColor: useCultureIntro ? 'var(--color-primary)' : undefined,
                  }}
                /> */}
                <p className="font-bold">Company Culture Introduction:</p>
                <span className="font-semibold text-gray-500">
                  {useCultureIntro ? 'On' : 'Off'}
                </span>
              </div>
              <div className="border border-primary text-primary px-4 py-3 rounded-lg mb-4">
                The AI-generated summary will be displayed once the AI Audio Screening has been
                successfully completed.
              </div>
            </div>
          );
        }
        return (
          <>
            <div className="mt-3 mb-4 flex items-center gap-3 max-w-[820px]">
              <Switch
                checked={useCultureIntro}
                disabled
                style={{
                  backgroundColor: useCultureIntro ? 'var(--color-primary)' : undefined,
                }}
              />
              <span className="text-sm text-gray-500">
                Company Culture Introduction - {useCultureIntro ? 'On' : 'Off'}
              </span>
            </div>
            {renderSection(
              'AI Interview Recording',
              'recording',
              <InterviewRecording evalResponse={voiceAIData} roundType={roundType} />,
              true
            )}
            {renderSection(
              'Interview Score',
              'score',
              <InterviewScore evalResponse={voiceAIData} />
            )}
            {renderSection(
              'Scorecard',
              'scorecard',
              <Scorecard evalResponse={voiceAIData} />,
              true
            )}
            {renderSection('Summary', 'summary', <SummaryContent evalResponse={voiceAIData} />)}
            {renderSection(
              'Interview Feedback',
              'feedback',
              <InterviewFeedback evalResponse={voiceAIData} />
            )}
            {renderSection('Transcript', 'transcript', <Transcript evalResponse={voiceAIData} />)}
          </>
        );
      case 'FINAL_FEEDBACK': {
        const interviewRound = candidate?.interviewRounds?.find(
          (item) => Number(item?.id) === interviewRoundId
        );
        return <>{interviewRound && <FinalFeedback interviewRound={interviewRound} />}</>;
      }
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
          interviewRound={voiceAIData?.interview_round}
          showInterviewerFeedback={false}
          showAIGeneratedFeedback={showAIGeneratedFeedback}
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
        subtitle="AI Audio Screening"
        footer={null}
      />
    </div>
  );
};

export default AIInterviewDetails;
