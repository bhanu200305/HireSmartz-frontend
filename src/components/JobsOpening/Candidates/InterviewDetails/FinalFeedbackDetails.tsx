import { useState } from 'react';
import { Button } from '../../../shared';
import { CandidateByIdResponse } from '../../../../types';
import ScoringCriteriaModal from '../Modal/ScoringCriteriaModal';
import { AiOutlineMinus, AiOutlinePlus } from 'react-icons/ai';
import { Rate, Tooltip } from 'antd';
import dayjs from 'dayjs';
import { LuSquarePen } from 'react-icons/lu';

type FinalSubTab = 'AI_SUMMARY' | 'INTERVIEWER_SUMMARY';

type Props = {
  candidate?: CandidateByIdResponse;
  /** Opens candidate notes (aggregate final feedback has no single round). */
  onOpenNotes?: () => void;
  notesCount?: number;
};

const FinalFeedbackDetails = ({ candidate, onOpenNotes, notesCount }: Props) => {
  const [activeSubTab, setActiveSubTab] = useState<FinalSubTab>('AI_SUMMARY');
  const [showScoringCriteria, setShowScoringCriteria] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const aiFinalFeedback = candidate?.aiSummaryResponseDtos || [];
  const interviewerFinalFeedback = candidate?.finalInterviewSummaries || [];
  const candidateFinalFeedback = candidate?.candidateFinalFeedbackDTO;
  const selectedRejectedFeedbackList = candidateFinalFeedback?.selectedRejectedFeedbackList ?? [];
  const finalDecisionFeedback = selectedRejectedFeedbackList[0];

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  const formatRoundIdentifier = (value?: string) => {
    if (!value) return '';
    return value.replace(/_/g, ' ');
  };
  const renderAiSection = (item: any) => {
    const sectionKey = `AI_${item.interviewRoundId}`;
    const isExpanded = expandedSections[sectionKey];

    return (
      <div
        key={sectionKey}
        className={`mb-4 w-full max-w-[820px] border border-gray-200 ${
          isExpanded ? 'rounded-lg' : 'rounded-full'
        } p-4 text-sm text-gray-700 shadow-sm`}
      >
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection(sectionKey)}
        >
          <span className="font-bold text-primary">
            {item.roundType === 'AI' && item.uniqueRoundIdentifier === 'AI'
              ? 'AI Audio Screening'
              : formatRoundIdentifier(item.uniqueRoundIdentifier) || item.roundType}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold">Score:</span>
              {item?.final_score ? `${Number(item.final_score).toFixed(1)}/5` : 'N/A'}
            </div>

            {isExpanded ? (
              <AiOutlineMinus className="text-primary h-5 w-5" />
            ) : (
              <AiOutlinePlus className="text-primary h-5 w-5" />
            )}
          </div>
        </div>
        {isExpanded && (
          <>
            <div className="mt-3 border-t border-gray-300" />
            <div className="mt-4 space-y-6">
              <div>
                {item.roundType === 'AI'
                  ? item.interviewFeedback || 'No feedback available'
                  : item.summary || 'No summary available'}
              </div>
              <div>
                {item.createdAt && (
                  <p className="text-xs text-gray-500">
                    {dayjs(item.createdAt).format('MMM DD, YYYY, h:mm A')}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };
  const renderInterviewerSection = (interviewer: any) => {
    const sectionKey = `INTERVIEWER_${interviewer.interviewRoundId}_${interviewer.email}`;
    const isExpanded = expandedSections[sectionKey];

    return (
      <div
        key={sectionKey}
        className={`mb-6 w-full max-w-[820px] border border-gray-200 ${
          isExpanded ? 'rounded-lg' : 'rounded-full'
        } p-4 text-sm text-gray-700 shadow-sm`}
      >
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection(sectionKey)}
        >
          <span className="font-bold text-primary">{interviewer.name}</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="font-bold">Rating:</span>
              <Rate disabled style={{ fontSize: '16px' }} value={interviewer.overallScore} />
            </div>

            {isExpanded ? (
              <AiOutlineMinus className="text-primary h-5 w-5" />
            ) : (
              <AiOutlinePlus className="text-primary h-5 w-5" />
            )}
          </div>
        </div>
        {isExpanded && (
          <>
            <p className="text-xs text-gray-500 mt-2">
              Role: {interviewer.role} |{' '}
              {formatRoundIdentifier(interviewer.uniqueRoundIdentifier) || interviewer.roundType}
            </p>
            <div className="mt-3 border-t border-gray-300" />

            <div className="mt-4 space-y-6">
              <div>
                <p className="break-words overflow-hidden">
                  {interviewer.feedback || 'No feedback provided'}
                </p>
              </div>
              {interviewer.createdAt && (
                <p className="text-xs text-gray-500">
                  {dayjs(interviewer.createdAt).format('MMM DD, YYYY, h:mm A')}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const renderFinalInterviewerSection = () => {
    const sectionKey = 'FINAL_INTERVIEWER_SUMMARY';
    const isExpanded = expandedSections[sectionKey];

    return (
      <div
        key={sectionKey}
        className={`mb-6 w-full max-w-[820px] border border-gray-200 ${
          isExpanded ? 'rounded-lg' : 'rounded-full'
        } p-4 text-sm text-gray-700 shadow-sm`}
      >
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection(sectionKey)}
        >
          <span className="font-bold text-primary">
            {finalDecisionFeedback?.createdBy || 'Interviewer'}
          </span>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="font-bold">Final Rating:</span>
              <Rate disabled style={{ fontSize: '16px' }} value={finalDecisionFeedback?.rating} />
            </div>

            {isExpanded ? (
              <AiOutlineMinus className="text-primary h-5 w-5" />
            ) : (
              <AiOutlinePlus className="text-primary h-5 w-5" />
            )}
          </div>
        </div>

        {isExpanded && (
          <>
            <p className="text-xs text-gray-500 mt-2">
              Role: {finalDecisionFeedback?.role || 'N/A'}
              {/* {interviewer.uniqueRoundIdentifier || interviewer.roundType} */}
            </p>
            <div className="mt-3 border-t border-gray-300" />
            <div className="mt-4 space-y-4">
              {finalDecisionFeedback?.status === 'NOT_SELECTED' &&
                finalDecisionFeedback?.reason && (
                  <div className="flex items-center gap-1">
                    <span className="font-bold">Reason:</span>
                    <p className="break-words overflow-hidden">{finalDecisionFeedback.reason}</p>
                  </div>
                )}
              <div>
                <p className="break-words overflow-hidden">
                  {finalDecisionFeedback?.comments || 'No feedback available'}
                </p>
              </div>
              <div>
                {finalDecisionFeedback?.feedbackDate && (
                  <p className="text-xs text-gray-500">
                    {dayjs(finalDecisionFeedback?.feedbackDate).format('MMM DD, YYYY, h:mm A')}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const getActiveScore = () => {
    if (activeSubTab === 'AI_SUMMARY') {
      return candidate?.overallAiScoreOutOf5 ? `${candidate.overallAiScoreOutOf5}/5` : 'N/A';
    } else {
      return finalDecisionFeedback?.rating ? `${finalDecisionFeedback.rating}/5` : 'N/A';
    }
  };
  const getAiResumeScore = () => {
    const score = candidate?.atsScore;
    return score && score > 0 ? `${score}/5` : 'N/A';
  };
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex">
          {[
            { id: 'AI_SUMMARY', label: 'AI Summary' },
            { id: 'INTERVIEWER_SUMMARY', label: 'Interviewer Summary' },
          ].map((tab) => (
            <Button
              key={tab.id}
              className={`px-4 py-2 text-md cursor-pointer  ${
                activeSubTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveSubTab(tab.id as FinalSubTab)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {onOpenNotes ? (
            <Tooltip title={notesCount != null ? `Notes (${notesCount})` : 'Notes'}>
              <button
                type="button"
                onClick={onOpenNotes}
                className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#c7d0ef] bg-[#eef2ff] text-[#263d92] transition-colors hover:border-[#263d92] hover:bg-[#e2e7fa] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#263d92]/30"
                aria-label={notesCount != null ? `Notes, ${notesCount} items` : 'Notes'}
              >
                <LuSquarePen size={18} strokeWidth={2} aria-hidden />
              </button>
            </Tooltip>
          ) : null}
          <Button
            className="px-4 py-2 cursor-pointer bg-button text-white rounded-lg text-sm font-medium"
            onClick={() => setShowScoringCriteria(true)}
          >
            Scoring Criteria
          </Button>
        </div>
      </div>
      <div className="mb-4 flex justify-between items-center max-w-[820px]">
        <span>Overall Score: {getActiveScore()}</span>

        {activeSubTab === 'AI_SUMMARY' && (
          <span>
            <span>AI Resume Score:</span> {getAiResumeScore()}
          </span>
        )}
      </div>
      {activeSubTab === 'AI_SUMMARY' && (
        <>
          {aiFinalFeedback.length ? (
            aiFinalFeedback.map((item: any) => renderAiSection(item))
          ) : (
            <div className="border border-gray-200 rounded-lg p-4 bg-[#FAFAFA] max-w-[820px]">
              No AI feedback available
            </div>
          )}
        </>
      )}
      {activeSubTab === 'INTERVIEWER_SUMMARY' && (
        <>
          {(candidate?.status === 'SELECTED' || candidate?.status === 'NOT_SELECTED') &&
            renderFinalInterviewerSection()}
          {interviewerFinalFeedback.length ? (
            interviewerFinalFeedback.map((item: any) => renderInterviewerSection(item))
          ) : (
            <div className="border border-gray-200 rounded-lg p-4 bg-[#FAFAFA] max-w-[820px]">
              No interviewer feedback available
            </div>
          )}
        </>
      )}
      <ScoringCriteriaModal
        visible={showScoringCriteria}
        onClose={() => setShowScoringCriteria(false)}
        title={activeSubTab === 'AI_SUMMARY' ? 'AI_FINAL_FEEDBACK' : 'INTERVIEWER_FINAL_FEEDBACK'}
        footer={null}
      />
    </div>
  );
};

export default FinalFeedbackDetails;
