import React, { useEffect, useState } from 'react';
import { MdOutlineAdd, MdOutlineAutoAwesome, MdDelete } from 'react-icons/md';
import { Button, Input, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  useListInterviewQuestionsQuery,
  useSuggestInterviewQuestionsMutation,
  useSaveInterviewQuestionsMutation,
  MAX_INTERVIEW_QUESTIONS,
} from '../../api/organization-service/Tenants/interviewQuestions';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

/**
 * §"Interview questions" — the tenant's own HR/interpersonal question set
 * (up to 8), shared across every job. "Ask AI to suggest" is a preview only
 * — nothing is saved until "Save" replaces the whole set, per
 * docs/frontend_guide.txt.
 */
const InterviewQuestionsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useListInterviewQuestionsQuery(tenantId);
  const [suggest, { isLoading: isSuggesting }] = useSuggestInterviewQuestionsMutation();
  const [saveQuestions, { isLoading: isSaving }] = useSaveInterviewQuestionsMutation();
  const [questions, setQuestions] = useState<string[]>([]);

  useEffect(() => {
    if (data) setQuestions(data.questions.map((q) => q.question_text));
  }, [data]);

  const handleSuggest = async () => {
    try {
      const result = await suggest({ tenantId, count: MAX_INTERVIEW_QUESTIONS }).unwrap();
      setQuestions(result.questions);
      showToast({ message: 'Suggestions loaded — review and save to keep them.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to get suggestions.'), type: 'error' });
    }
  };

  const updateQuestion = (index: number, value: string) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? value : q)));
  };

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const cleaned = questions.map((q) => q.trim()).filter(Boolean);
    try {
      await saveQuestions({ tenantId, questions: cleaned }).unwrap();
      showToast({ message: 'Interview questions saved.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to save questions.'), type: 'error' });
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-1">
        <Typography variant="h5">Interview questions</Typography>
        <Button
          className="rounded-full border border-gray-300 px-4 py-1.5 flex items-center gap-1"
          onClick={handleSuggest}
          disabled={isSuggesting}
        >
          <MdOutlineAutoAwesome /> {isSuggesting ? 'Asking AI…' : 'Ask AI to suggest'}
        </Button>
      </div>
      <Typography variant="body2" className="mb-6 block">
        Up to {MAX_INTERVIEW_QUESTIONS} questions, shared across every job. Saving replaces the
        whole set.
      </Typography>

      <div className="flex flex-col gap-3">
        {questions.map((question, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={question}
              onChange={(e) => updateQuestion(index, e.target.value)}
              placeholder={`Question ${index + 1}`}
              className="flex-1"
            />
            <button
              type="button"
              aria-label="Remove question"
              className="p-2 hover:bg-gray-100 rounded-full"
              onClick={() => removeQuestion(index)}
            >
              <MdDelete className="text-red-500" />
            </button>
          </div>
        ))}
      </div>

      {questions.length < MAX_INTERVIEW_QUESTIONS && (
        <button
          type="button"
          className="mt-3 flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
          onClick={() => setQuestions((prev) => [...prev, ''])}
        >
          <MdOutlineAdd /> Add a question
        </button>
      )}

      <Button
        className="mt-6 rounded-full bg-button text-white px-6 py-2"
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? 'Saving…' : 'Save questions'}
      </Button>
    </div>
  );
};

export default InterviewQuestionsTab;
