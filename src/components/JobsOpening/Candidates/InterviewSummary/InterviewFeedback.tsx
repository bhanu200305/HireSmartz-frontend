import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FaPlus, FaMinus } from 'react-icons/fa';
import { LuUserRound } from 'react-icons/lu';
import { useParams } from 'react-router-dom';
import { useGetJobOpeningByIdQuery } from '../../../../api/job-service/JobOpening/GetJobOpeningById';
import { asJobId } from '../../../../api/job-service/jobId';
import {
  useEditAiQuestionForScoringMutation,
  useSaveScoreMutation,
  useSaveFeedbackMutation,
  useGetAiQuestionsByUserIdQuery,
} from '../../../../api/ai-service/AiQuestion/AiQuestion';
import { Loader } from '../../../shared/ui/loader';
import TurndownService from 'turndown';
import { CandidateByIdResponse, InterviewRoundResponseDTO } from '../../../../types';
import { RichTextEditor } from '../../../shared/ui/RichTextEditor';
import ReactMarkdown from 'react-markdown';
import { showToast } from '../../../shared/ui/toast';
import { get } from 'lodash-es';
import { Rate } from 'antd';
import { InterviewFeedbackFormValues, interviewFeedbackSchema } from './InterviewScoringSchema';

interface InterviewFeedbackProps {
  onClose?: () => void;
  selectedInterviewerId: number;
  candidate?: CandidateByIdResponse;
  interviewRecord: InterviewRoundResponseDTO;
}

const InterviewFeedback: React.FC<InterviewFeedbackProps> = ({
  onClose,
  selectedInterviewerId,
  candidate,
  interviewRecord,
}) => {
  const { roundType } = interviewRecord;
  const { id, candidateId } = useParams<{ id: string; candidateId: string }>();
  const jobId = asJobId(id);
  const { data: jobData } = useGetJobOpeningByIdQuery({ jobOpeningId: jobId }, { skip: !jobId });

  const { data: interviewerData, isFetching: isInterviewerDataFetching } =
    useGetAiQuestionsByUserIdQuery(
      {
        userId: selectedInterviewerId,
        jobOpeningId: jobId,
        interviewRoundId: interviewRecord?.interviewRoundId,
        candidateId: Number(candidateId),
      },
      { skip: !selectedInterviewerId, refetchOnMountOrArgChange: true }
    );
  const categoriesObj = interviewerData?.categorizedQuestions.categories || {};
  const categoryNames = Object.keys(categoriesObj);

  const { control, reset, watch, setValue } = useForm<InterviewFeedbackFormValues>({
    resolver: zodResolver(interviewFeedbackSchema),
    defaultValues: {
      answers: {},
      finalScore: null,
    },
  });

  // State management
  const [expanded, setExpanded] = useState<{ [category: string]: boolean }>(() => {
    const saved = localStorage.getItem(`interview_feedback_${jobId}_${candidateId}_expanded`);
    return saved ? JSON.parse(saved) : {};
  });
  const [editorContent, setEditorContent] = useState<string>('');
  const [previewFeedback, setPreviewFeedback] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // API mutations
  const [editAiQuestionForScoring] = useEditAiQuestionForScoringMutation();
  const [saveScore] = useSaveScoreMutation();
  const [saveFeedback, { isLoading: isSavingFeedback }] = useSaveFeedbackMutation();

  // Initialize data
  useEffect(() => {
    localStorage.setItem(
      `interview_feedback_${jobId}_${candidateId}_expanded`,
      JSON.stringify(expanded)
    );
  }, [expanded, jobId, candidateId]);

  useEffect(() => {
    if (!jobData) return;
    setExpanded((prev) => {
      const newExpanded = { ...prev };
      categoryNames.forEach((category) => {
        if (!(category in newExpanded)) {
          newExpanded[category] = false;
        }
      });
      return newExpanded;
    });
  }, [jobData]);

  useEffect(() => {
    if (!selectedInterviewerId) {
      reset({
        answers: {},
        finalScore: null,
      });
      setEditorContent('');
      setPreviewFeedback('');
      return;
    }

    // Initialize from API data
    if (interviewerData) {
      // Initialize answers
      const apiAnswers: { [key: string]: { score?: number | null; pass?: boolean | null } } = {};
      Object.entries(interviewerData.categorizedQuestions?.categories || {}).forEach(
        ([category, questions]: [string, any[]]) => {
          questions.forEach((q) => {
            if (category === 'Pass/Fail Questions') {
              const passValue = q.passFailResult !== undefined ? q.passFailResult : q.pass;
              apiAnswers[q.id] = {
                pass:
                  passValue !== undefined && passValue !== null
                    ? passValue === true ||
                      String(passValue).toLowerCase() === 'yes' ||
                      String(passValue).toLowerCase() === 'true'
                    : null,
              };
            } else {
              apiAnswers[q.id] = { score: q.score != null ? Number(q.score) : null };
            }
          });
        }
      );

      // Initialize feedback
      if (interviewerData.feedback) {
        setEditorContent(interviewerData.feedback);
        setPreviewFeedback(interviewerData.feedback);
      }

      // Reset form with API data
      reset({
        answers: apiAnswers,
        finalScore:
          interviewerData.overallScore !== undefined ? interviewerData.overallScore : null,
      });
    }
  }, [selectedInterviewerId, interviewerData, jobId, candidateId, reset]);

  // Handle number input - prevents invalid characters
  const handleNumberInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-', '.'].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Handle score change
  const handleScoreChange = async (q: any, value: string | number | null) => {
    const score = value === '' || value === null ? null : Math.max(1, Math.min(5, Number(value)));

    setValue(`answers.${q.id}.score`, score, { shouldDirty: true });

    try {
      await editAiQuestionForScoring({
        candidateId: Number(candidateId),
        questionId: q.id,
        score: score,
        interviewRoundId: interviewRecord?.interviewRoundId || null,
      }).unwrap();
    } catch (err) {
      showToast({
        message: get(err, 'data.message', 'Failed to save score'),
        type: 'error',
      });
    }
  };

  // Handle pass/fail change
  const handlePassFailChange = async (q: any, pass: boolean | null) => {
    setValue(`answers.${q.id}.pass`, pass, { shouldDirty: true });

    try {
      await editAiQuestionForScoring({
        candidateId: Number(candidateId),
        questionId: q.id,
        passFailResult: pass === null ? undefined : pass,
        interviewRoundId: interviewRecord?.interviewRoundId || null,
      }).unwrap();
    } catch (err) {
      showToast({
        message: get(err, 'data.message', 'Failed to save pass/fail status'),
        type: 'error',
      });
      console.error('Failed to save pass/fail status:', err);
    }
  };

  // Handle final score change
  const handleFinalScoreChange = async (value: number | null) => {
    setValue('finalScore', value, { shouldDirty: true });

    try {
      await saveScore({
        userId: selectedInterviewerId,
        candidateId: Number(candidateId),
        interviewRoundId: Number(interviewRecord?.interviewRoundId),
        score: value,
      }).unwrap();
    } catch (err) {
      showToast({
        message: get(err, 'data.message', 'Failed to save final score'),
        type: 'error',
      });
    }
  };

  const handleFinalSave = () => {
    showToast({
      message: 'Feedback has been saved successfully',
      type: 'success',
    });
    if (onClose) {
      onClose();
    }
  };

  // Handle feedback content change
  const handleFeedbackChange = (content: string) => {
    setEditorContent(content);
    setHasChanges(true);
  };

  // Save feedback
  const handleSaveFeedback = async () => {
    if (!editorContent.trim()) {
      showToast({ message: 'Feedback cannot be empty', type: 'warning' });
      return;
    }

    try {
      const turndownService = new TurndownService();
      const markdown = turndownService.turndown(editorContent);

      const response = await saveFeedback({
        userId: selectedInterviewerId,
        candidateId: Number(candidateId),
        interviewRoundId: Number(interviewRecord?.interviewRoundId),
        feedback: markdown,
      }).unwrap();

      setPreviewFeedback(markdown);
      setIsEditing(false);
      setHasChanges(false);
      showToast({
        message: get(response, 'message', 'Feedback saved successfully'),
        type: 'success',
      });
    } catch (err) {
      showToast({ message: get(err, 'data.message', 'Failed to save feedback'), type: 'error' });
      console.error('Failed to save feedback:', err);
    }
  };

  // Render question input based on category
  const renderQuestionInput = (q: any, category: string) => {
    const answers = watch('answers');
    const answer = answers?.[q.id];

    if (category === 'Pass/Fail Questions') {
      return (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`pass-fail-${q.id}`}
                checked={answer?.pass === true}
                onChange={() => handlePassFailChange(q, true)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
              />
              <span className="text-sm">Yes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`pass-fail-${q.id}`}
                checked={answer?.pass === false}
                onChange={() => handlePassFailChange(q, false)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2">
          <span className="flex flex-col text-sm text-black leading-tight">
            Scorecard
            <span className="text-xs text-gray-500">(Max 5)</span>
          </span>
          <input
            type="number"
            min={1}
            max={5}
            className="w-16 h-9 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:border-[var(--primary)]"
            value={answer?.score ?? ''}
            onChange={(e) => handleScoreChange(q, e.target.value)}
            onKeyDown={handleNumberInput}
          />
        </div>
      );
    }
  };

  // Format markdown headings
  const formatMarkdownHeadings = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === 'string') {
      const parts = children.split(':');
      if (parts.length > 1) {
        return (
          <>
            {parts[0]}: <p className="font-normal">{parts.slice(1).join(':')}</p>
          </>
        );
      }
      return <>{parts[0]}:</>;
    }
    return children as string;
  };

  return (
    <>
      {isInterviewerDataFetching && <Loader />}
      <div className="bg-white rounded-lg w-[1065px] shadow p-10 mx-auto">
        {/* Header section */}
        <div className="flex items-center mb-6 shadow-sm p-6 rounded-lg w-[970px] h-[145px]">
          <div className="w-[80px] h-[80px] rounded-full bg-[#636363] flex items-center justify-center mr-4">
            <LuUserRound className="text-5xl text-white" />
          </div>
          <div className="space-y-1">
            <div className="font-semibold text-lg">
              {candidate?.firstName || ''} {candidate?.lastName || ''}
            </div>
            <div className="text-sm text-gray-500">
              <span className="text-black font-semibold">Job ID:</span>{' '}
              {jobData?.data?.jobProfileCode || ''}
            </div>
            <div className="text-sm text-gray-500">
              <span className="text-black font-semibold">Job title:</span>{' '}
              {jobData?.data?.jobTitle?.map((item: any) => item.jobTypeName).join(', ') || ''}
            </div>
            <div className="text-sm text-gray-400">
              <span className="text-black font-semibold">Hiring Manager:</span>{' '}
              {jobData?.data?.hiringManager?.name || ''}
            </div>
          </div>
        </div>

        {/* Questions section */}
        {roundType === 'VIDEO' &&
          categoryNames.map((category) => (
            <div className="mb-4" key={category}>
              <div
                className="flex items-center justify-between cursor-pointer bg-gray-100 px-4 py-2 rounded-3xl"
                onClick={() => setExpanded((prev) => ({ ...prev, [category]: !prev[category] }))}
              >
                <span className="font-semibold text-base">{category}</span>
                {expanded[category] ? <FaMinus /> : <FaPlus />}
              </div>
              {expanded[category] && (
                <div className="mt-2 space-y-3">
                  {categoriesObj[category].map((q: any) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between bg-white border border-gray-200 rounded-3xl px-4 py-2"
                    >
                      <span className="text-sm">{q.question}</span>
                      {renderQuestionInput(q, category)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

        {/* Feedback section */}
        <div className="mb-6">
          <div className="font-semibold mb-2">Interview Feedback</div>
          <div className="w-[970px] bg-white border border-gray-200 rounded px-4 py-4">
            <div className="flex items-center justify-end gap-2">
              {isEditing ? (
                <>
                  <button
                    className="flex items-center space-x-1 cursor-pointer px-3 py-1 text-gray-600 hover:text-gray-800"
                    onClick={() => {
                      setIsEditing(false);
                      setHasChanges(false);
                      setEditorContent(previewFeedback);
                    }}
                    disabled={isSavingFeedback}
                  >
                    CANCEL
                  </button>
                  <button
                    className={`flex items-center space-x-1 cursor-pointer px-3 py-1 ${
                      hasChanges ? 'text-primary' : 'text-gray-400'
                    }`}
                    onClick={handleSaveFeedback}
                    disabled={isSavingFeedback || !hasChanges}
                  >
                    {isSavingFeedback ? <Loader /> : 'SAVE'}
                  </button>
                </>
              ) : (
                <button
                  className="flex items-center space-x-1 cursor-pointer px-3 py-1 text-primary"
                  onClick={() => setIsEditing(true)}
                >
                  EDIT
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="mt-4">
                <RichTextEditor
                  initialContent={previewFeedback}
                  onContentChange={handleFeedbackChange}
                  placeholder="Write your feedback here..."
                />
                {isSavingFeedback && (
                  <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                    <Loader /> Saving feedback...
                  </div>
                )}
              </div>
            ) : (
              <div className="prose max-w-none prose-p:my-2 prose-li:my-1 prose-h2:mt-4 prose-h2:mb-2">
                <ReactMarkdown
                  components={{
                    h1: ({ ...props }) => (
                      <h1
                        className="text-2xl flex gap-2 items-center font-bold capitalize mb-3"
                        {...props}
                      >
                        {formatMarkdownHeadings(props.children)}
                      </h1>
                    ),
                    h2: ({ ...props }) => (
                      <h3
                        className="text-xl font-semibold flex gap-2 items-center capitalize py-2"
                        {...props}
                      >
                        {formatMarkdownHeadings(props.children)}
                      </h3>
                    ),
                    h3: ({ ...props }) => (
                      <h3
                        className="text-lg font-semibold flex gap-2 items-center capitalize py-2"
                        {...props}
                      >
                        {formatMarkdownHeadings(props.children)}
                      </h3>
                    ),
                    li: ({ ...props }) => <li className="list-disc ml-8">{props.children}</li>,
                    p: ({ ...props }) => <p className="my-2">{props.children}</p>,
                  }}
                >
                  {previewFeedback}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
        {/* Final score section */}
        <div className="mb-4">
          <div className="font-semibold mb-2">Interview Score</div>
          <div className="w-[970px] h-[50px] bg-white border border-gray-200 rounded px-4 py-4 flex items-center justify-between">
            <span className="text-black text-sm">Final Interview Score (Max 5)</span>
            <div className="flex items-center gap-2">
              <Controller
                name="finalScore"
                control={control}
                render={({ field }) => (
                  <>
                    <Rate
                      value={field.value ?? undefined}
                      onChange={(value) => {
                        const finalValue = value === 0 ? null : value;
                        field.onChange(finalValue);
                        handleFinalScoreChange(finalValue);
                      }}
                      count={5}
                      tooltips={['Strong No', 'No', 'Neutral', 'Yes', 'Strong Yes']}
                      style={{ fontSize: '22px' }}
                    />
                    {field.value != null && field.value > 0 && (
                      <span className="text-sm text-gray-600">
                        {['Strong No', 'No', 'Neutral', 'Yes', 'Strong Yes'][field.value - 1]}
                      </span>
                    )}
                  </>
                )}
              />
              <span className="text-xs text-gray-500">(Editable)</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-8">
          <button
            className="w-[150px] h-[50px] px-4 py-2 bg-button text-white rounded-full text-sm font-medium"
            onClick={handleFinalSave}
          >
            SAVE
          </button>
        </div>
      </div>
    </>
  );
};

export default InterviewFeedback;
