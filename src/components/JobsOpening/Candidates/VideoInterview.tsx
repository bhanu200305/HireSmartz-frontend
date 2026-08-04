import React, { useState } from 'react';
import { AiOutlinePlus, AiOutlineMinus } from 'react-icons/ai';
import SummaryContent from './InterviewDetails/Summary';
import InterviewFeedback from './InterviewDetails/InterviewFeedback';
import Transcript from './InterviewDetails/Transcript';
import { CandidateByIdResponse } from '../../../types';
import InterviewRecording from './InterviewDetails/InterviewRecording';
import InterviewScore from './InterviewDetails/InterviewScore';
import Scorecard from './InterviewDetails/Scorecard';

type InterviewDetailsProps = {
  candidate?: CandidateByIdResponse;
  roundType: string;
};

const VideoInterview = ({ candidate, roundType }: InterviewDetailsProps) => {
  const roundTypeData = candidate?.evaluationResponseDto?.find(
    (item) => item?.interview_round?.roundType === roundType
  );
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const renderSection = (title: string, sectionKey: string, content: React.ReactNode) => {
    const isExpanded = expandedSection === sectionKey;

    return (
      <div
        className={`border border-[#E2E2E2] ${
          isExpanded ? 'rounded-xl' : 'rounded-full'
        } px-6 py-4 mb-4 bg-white w-full max-w-[820px] cursor-pointer`}
        onClick={() => toggleSection(sectionKey)}
      >
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-800">{title}</span>
          {isExpanded ? (
            <AiOutlineMinus className="text-[#0047AB] h-5 w-5" />
          ) : (
            <AiOutlinePlus className="text-[#0047AB] h-5 w-5" />
          )}
        </div>
        {isExpanded && (
          <div className="mt-4 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 bg-white shadow-sm">
            {content}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {renderSection(
        'Video Interview Recording',
        'recording',
        <InterviewRecording evalResponse={roundTypeData} roundType={roundType} />
      )}
      {renderSection('Interview Score', 'score', <InterviewScore evalResponse={roundTypeData} />)}
      {renderSection('Scorecard', 'scorecard', <Scorecard />)}
      {renderSection('Summary', 'summary', <SummaryContent evalResponse={roundTypeData} />)}
      {renderSection(
        'Interview Feedback',
        'feedback',
        <InterviewFeedback evalResponse={roundTypeData} />
      )}
      {renderSection('Transcript', 'transcript', <Transcript evalResponse={roundTypeData} />)}
    </div>
  );
};

export default VideoInterview;
