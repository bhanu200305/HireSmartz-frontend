import { useEffect, useState } from 'react';
import ScoringCriteriaModal from './Modal/ScoringCriteriaModal';
import { LiaThumbsUpSolid, LiaThumbsDownSolid } from 'react-icons/lia';
import { BsFullscreen } from 'react-icons/bs';
import { base64toBlob } from '../../../shared/utils/methods';
import { CandidateByIdResponse } from '../../../types';
import { Viewer } from '@react-pdf-viewer/core';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import { fullScreenPlugin } from '@react-pdf-viewer/full-screen';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/full-screen/lib/styles/index.css';
import { Button, showToast, Textarea } from '../../shared';
import CommonModal from './Modal/CommonModal';
import {
  useCandidateResumeStatusMutation,
  useResumeThumbStatusMutation,
} from '../../../api/candidate-service/Candidates/Candidates';
import { get } from 'lodash-es';
import { Rate, Tooltip } from 'antd';
import { Loader } from '../../shared/ui/loader';
import { LuSquarePen } from 'react-icons/lu';

const pdfjsVersion = '3.4.120';
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.js`;

type ResumeScoreProps = {
  atsScore: number;
  candidate?: CandidateByIdResponse;
  isBlocked?: boolean;
  /** Opens notes for the resume-screening interview round when available, else candidate-wide notes. */
  onOpenNotes?: () => void;
  notesCount?: number;
};

type MatchMetric = {
  label: string;
  value?: string;
  max: number;
};

type ResumeScoringWeight = {
  categoryName?: string;
  weightPercentage?: number;
};

const ResumeScore = ({
  atsScore,
  candidate,
  onOpenNotes,
  notesCount,
  //  isBlocked = false
}: ResumeScoreProps) => {
  const [reason, setReason] = useState<string>('');
  const [, setResumeStatus] = useState<string>(candidate?.resumeStatus);
  const [rating, setRating] = useState<number>(candidate?.resumeRating || 0);
  const [fileUrl, setFileUrl] = useState<string | undefined>();
  const fullScreenPluginInstance = fullScreenPlugin();
  const [showDislikeModal, setShowDislikeModal] = useState(false);
  const [showScoringCriteria, setShowScoringCriteria] = useState(false);
  // mimeType/fileType/docs (for a DocViewer fallback) were removed as dead
  // code — their only consumer was the commented-out <DocViewer> block
  // further down in this file.
  const [candidateResumeStatus, { isLoading: isResumeStatusLoading }] =
    useCandidateResumeStatusMutation();
  const [resumeThumbStatus, { isLoading: isResumeThumbStatusLoading }] =
    useResumeThumbStatusMutation();

  const resumeScoringWeights = (candidate?.resumeScoringConfig?.weights ||
    []) as ResumeScoringWeight[];

  const getWeightPercentageByCategory = (categoryName: string): number => {
    const matchedWeight = resumeScoringWeights.find(
      (weight) => weight?.categoryName === categoryName
    );
    const streamWeightPercentage = Number(matchedWeight?.weightPercentage);

    if (!Number.isNaN(streamWeightPercentage) && streamWeightPercentage > 0) {
      return streamWeightPercentage;
    }

    return 0;
  };

  // const calculateMax = (weightPercentage: number): number => {
  //   if (weightPercentage > 0) {
  //     return (weightPercentage / 100) * 5;
  //   }

  //   return 0;
  // };

  const matchMetrics: MatchMetric[] = [
    {
      label: 'Skills Match',
      value: candidate?.scoreSkills,
      max: getWeightPercentageByCategory('SKILLS_MATCH'),
    },
    {
      label: 'Experience Match',
      value: candidate?.scoreExperience,
      max: getWeightPercentageByCategory('EXPERIENCE_MATCH'),
    },
    {
      label: 'Qualifications',
      value: candidate?.scoreQualifications,
      max: getWeightPercentageByCategory('QUALIFICATIONS'),
    },
    {
      label: 'Keyword Presence',
      value: candidate?.scoreKeywords,
      max: getWeightPercentageByCategory('KEYWORD_PRESENCE'),
    },
  ];

  const getBarColor = (value: number) => {
    const percentage = (value / 5) * 100;
    if (percentage >= 80) return '#2B934E';
    if (percentage >= 50 && percentage <= 79) return '#FFBF00';
    if (percentage >= 1 && percentage <= 49) return '#FF3B30';
  };

  // const handleStatusChange = (statusName?: string) => (e: CheckboxChangeEvent) => {
  //   const { checked } = e.target
  //   if (!checked) return
  //   setResumeStatus(statusName)
  //   onSubmit(statusName, rating)
  // }
  const handleRatingChange = async (value: number) => {
    setRating(value);
    await onSubmit(value);
  };

  // const handleSubmitRating = (value: number) => {
  //   setRating(value)
  //   onSubmit(rating)
  // }
  const onSubmit = async (selectedRating: number) => {
    const payload = {
      candidateId: candidate?.id,
      status: null,
      rating: selectedRating,
    };
    candidateResumeStatus(payload)
      .unwrap()
      .then((res) => {
        if (res?.success) {
          showToast({
            message: get(res, 'message'),
            type: 'success',
          });
        } else {
          showToast({
            message: get(res, 'message', ''),
            type: 'error',
          });
        }
      })
      .catch((err) => {
        showToast({
          message: get(err, 'data.message', ''),
          type: 'error',
        });
      });
  };

  const handleResumeThumbFeedback = async (thumbStatus: boolean, reason: string) => {
    const payload = {
      candidateId: Number(candidate?.id),
      status: thumbStatus,
      reason: reason.trim() ?? '',
    };
    resumeThumbStatus(payload)
      .unwrap()
      .then((res: any) => {
        if (res?.success) {
          showToast({
            message: get(res, 'message'),
            type: 'success',
          });
        } else {
          showToast({
            message: get(res, 'message', ''),
            type: 'error',
          });
        }
      })
      .catch((err) => {
        showToast({
          message: get(err, 'data.message', ''),
          type: 'error',
        });
      });
  };

  useEffect(() => {
    if (candidate?.resumeStatus) {
      setResumeStatus(candidate.resumeStatus);
    }
    if (candidate?.resumeRating) {
      setRating(candidate.resumeRating);
    }
  }, [candidate?.resumeStatus, candidate?.resumeRating]);

  useEffect(() => {
    if (!candidate?.resumeFilePath) return;
    try {
      const blob = base64toBlob(candidate?.resumeFilePath);
      const url = URL.createObjectURL(blob);
      setFileUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (err) {
      console.error('Error converting base64 to Blob:', err);
    }
  }, [candidate?.resumeFilePath]);

  const likeHelpText = (
    <div style={{ fontSize: '14px' }}>
      <p style={{ fontWeight: 600, marginBottom: '4px' }}>
        This feedback applies only to the AI‑generated score, not the candidate or their resume.
      </p>
    </div>
  );

  const dislikeHelpText = (
    <div style={{ fontSize: '14px' }}>
      <p style={{ fontWeight: 600, marginBottom: '4px' }}>
        You are providing feedback on the AI scoring logic, not rating the candidate.
      </p>
    </div>
  );

  const tooltipStyles = {
    backgroundColor: 'white',
    color: '#333',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    maxWidth: '300px',
    padding: '12px',
  };

  return (
    <>
      {isResumeThumbStatusLoading && <Loader />}
      <div>
        <div className="flex justify-between">
          <div className="flex justify-center gap-4">
            <p>
              Resume Score is <b>{atsScore || 0}</b>/5
            </p>

            <Tooltip
              title={likeHelpText}
              placement="top"
              color="white"
              overlayInnerStyle={tooltipStyles}
              mouseEnterDelay={0.3}
              arrow={false}
            >
              <LiaThumbsUpSolid
                style={{
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: candidate?.resumeThumbStatus ? '#1890ff' : 'inherit',
                }}
                onClick={() => handleResumeThumbFeedback(true, '')}
              />
            </Tooltip>

            <Tooltip
              title={dislikeHelpText}
              placement="top"
              color="white"
              overlayInnerStyle={tooltipStyles}
              mouseEnterDelay={0.3}
              arrow={false}
            >
              <LiaThumbsDownSolid
                style={{
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: candidate?.resumeThumbStatus === false ? '#1890ff' : 'inherit',
                }}
                onClick={() => setShowDislikeModal(true)}
              />
            </Tooltip>
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
              <span>Scoring Criteria</span>
            </Button>
          </div>
        </div>

        <div className="flex justify-between pt-5">
          <div>
            <div className="space-y-4">
              {matchMetrics?.map((metric, index) => {
                const value = Number(metric.value) || 0;
                // TODO: percentage is hardcoded to a /5 scale rather than
                // metric.max — looks like it should be (value / metric.max) * 100.
                // Left as-is (not guessing at intended behavior) during the lint
                // cleanup pass.
                const percentage = (value / 5) * 100 ? Math.round((value / 5) * 100) : 0;
                return (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-64 h-4 bg-gray-200 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: getBarColor(value) as string,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-800 whitespace-nowrap">
                      {metric.label} – {percentage}%
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col justify-start pt-5">
              {/* <p className="font-black mb-2">Initial Screening</p>

              <div className="flex justify-start gap-24">
                <CustomCheckbox
                  className="roboto-font"
                  label="Selected"
                  checked={resumeStatus === 'SELECTED'}
                  onChange={handleStatusChange('SELECTED')}
                  disabled={isResumeStatusLoading || isBlocked}
                />
                <CustomCheckbox
                  className="roboto-font"
                  label="Rejected"
                  checked={resumeStatus === 'NOT_SELECTED'}
                  onChange={handleStatusChange('NOT_SELECTED')}
                  disabled={isResumeStatusLoading || isBlocked}
                />
                {isResumeStatusLoading && <Loader />}
              </div> */}
              <div className="flex flex-col gap-4">
                <div className="mb-3">
                  <label className="block font-medium mb-2">Resume Rating</label>
                  <div className="flex items-center gap-4">
                    <Rate
                      value={rating}
                      onChange={handleRatingChange}
                      disabled={isResumeStatusLoading}
                      count={5}
                      tooltips={['Strong No', 'No', 'Neutral', 'Yes', 'Strong Yes']}
                      style={{ fontSize: '24px' }}
                    />
                    {rating > 0 && (
                      <span className="text-sm text-gray-600">
                        {['Strong No', 'No', 'Neutral', 'Yes', 'Strong Yes'][rating - 1]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col justify-start">
                  <h2 className="font-medium pb-2">Feedback Comments</h2>
                  {candidate?.resumeFeedback && candidate.resumeFeedback.length > 0 ? (
                    <Textarea
                      rows={4}
                      className="w-full p-3 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-gray-300 mb-3"
                      name="feedback"
                      value={candidate?.resumeFeedback || 'No comments'}
                      disabled
                      placeholder="No comments"
                    />
                  ) : (
                    <Textarea
                      rows={4}
                      className="w-full p-3 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-gray-300"
                      name="feedback"
                      value="No feedback comments yet"
                      disabled
                      placeholder="No feedback comments yet"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            {fileUrl ? (
              <>
                <div
                  className="relative w-[300px] h-[380px] rounded-lg overflow-auto cursor-pointer"
                  onClick={() => {
                    window.open(fileUrl, '_blank');
                  }}
                >
                  <BsFullscreen
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-black cursor-pointer z-50"
                    size={24}
                  />
                  <div className="pdf-fullscreen-viewer w-full h-full overflow-auto">
                    <Viewer
                      fileUrl={fileUrl}
                      plugins={[fullScreenPluginInstance]}
                      defaultScale={0.47}
                    />
                  </div>
                  {/* <Viewer fileUrl={fileUrl} defaultScale={0.49} /> */}
                  {/* <iframe
                  src={fileUrl}
                  style={{ width: "100%", height: "600px" }}
                /> */}
                  {/* <DocViewer
                  documents={docs}
                  pluginRenderers={DocViewerRenderers}
                  config={{
                    header: {
                      disableHeader: false,
                      disableFileName: true,
                      retainURLParams: false
                    }
                  }}
                /> */}
                </div>
              </>
            ) : (
              <p className="text-center text-gray-500 mt-4">No resume available</p>
            )}
          </div>
        </div>

        <ScoringCriteriaModal
          visible={showScoringCriteria}
          onClose={() => setShowScoringCriteria(false)}
          title="Scoring Criteria"
          footer={null}
          matchMetrics={matchMetrics}
        />

        <CommonModal
          visible={showDislikeModal}
          onClose={() => setShowDislikeModal(false)}
          title="Please explain why you dislike it"
          setReason={setReason}
          footer={
            <div className="flex justify-center items-center space-x-2">
              <Button
                className="px-10 py-3 bg-brand-600 font-bold text-white border rounded-4xl cursor-pointer"
                onClick={() => {
                  handleResumeThumbFeedback(false, reason);
                  setShowDislikeModal(false);
                }}
                disabled={!reason.trim() || isResumeThumbStatusLoading}
              >
                <span>SAVE</span>
              </Button>

              <Button
                className="px-7 py-3 font-bold border border-gray-200 rounded-4xl cursor-pointer !bg-white"
                onClick={() => setShowDislikeModal(false)}
              >
                <span>CANCEL</span>
              </Button>
            </div>
          }
        />
      </div>
    </>
  );
};

export default ResumeScore;
