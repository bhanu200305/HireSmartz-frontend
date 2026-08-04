import { useState } from 'react';
import { Switch } from 'antd';
import { EvaluationResponseDto, InterviewScore as InterviewScoreType } from '../../../../types';

type InterviewScoreProps = {
  evalResponse?: EvaluationResponseDto;
};

type Language = 'EN' | 'ES';

const InterviewScore = ({ evalResponse }: InterviewScoreProps) => {
  const showToggle =
    evalResponse?.interview_score?.some((q) => q.english_question_text?.trim()) ?? false;

  const [selectedLanguage, setSelectedLanguage] = useState<Language>(showToggle ? 'ES' : 'EN');

  if (!evalResponse?.interview_score || evalResponse?.interview_score.length === 0) {
    return <p className="font-black">No interview score released yet</p>;
  }

  const getQuestionText = (item: InterviewScoreType): string => {
    if (selectedLanguage === 'EN' && item.english_question_text?.trim()) {
      return item.english_question_text;
    }
    return item.question_text;
  };

  return (
    <div className="interview-score-container p-4">
      <table className="interview-score-table w-full p-4 ">
        <thead>
          <tr className="bg-gray-50 text-left">
            <th className="p-4 font-semibold text-gray-700">
              <div className="flex items-center gap-4">
                <span>Questions</span>
                {showToggle && (
                  <div className="flex items-center gap-3 font-normal">
                    <span className="text-sm text-gray-600">Original (Español)</span>
                    <Switch
                      checked={selectedLanguage === 'EN'}
                      onChange={(checked) => setSelectedLanguage(checked ? 'EN' : 'ES')}
                      size="small"
                    />
                    <span className="text-sm text-gray-600">Translation (English)</span>
                  </div>
                )}
              </div>
            </th>
            <th className="p-4 font-semibold text-gray-700 text-center whitespace-nowrap">
              Score (Max 5)
            </th>
          </tr>
        </thead>
        <tbody>
          {evalResponse?.interview_score?.map((item: InterviewScoreType, index: number) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="p-4 text-gray-600">{getQuestionText(item)}</td>
              <td className="p-4 text-gray-600 text-center">{item?.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default InterviewScore;
