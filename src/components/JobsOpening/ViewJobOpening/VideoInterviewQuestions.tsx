import { useMemo, useState } from 'react';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { useParams } from 'react-router-dom';
import { Select } from 'antd';
import { Typography } from '../../shared';
import { useGetAiInterviewQuestionsByRoundQuery } from '../../../api/interview-service/VideoInterviewQuestions/VideoInterviewQuestion';
import { asJobId } from '../../../api/job-service/jobId';

const { Option } = Select;

const VideoInterviewQuestions = () => {
  const { id } = useParams();
  const jobId = asJobId(id);

  const { data: jobData, isLoading: jobLoading } = useGetJobOpeningByIdQuery(
    { jobOpeningId: jobId },
    { skip: !jobId }
  );

  const videoRounds = useMemo(
    () => jobData?.data.interviewRounds?.filter((round) => round.roundType === 'VIDEO') || [],
    [jobData]
  );

  const defaultSelectedRound = videoRounds.length > 0 ? videoRounds[0].uniqueRoundIdentifier : '';
  const [selectedRound, setSelectedRound] = useState(defaultSelectedRound);

  const currentSelectedRound =
    selectedRound && videoRounds.some((round) => round.uniqueRoundIdentifier === selectedRound)
      ? selectedRound
      : defaultSelectedRound;

  const selectedRoundData = videoRounds.find(
    (round) => round.uniqueRoundIdentifier === currentSelectedRound
  );

  const {
    data: questionsData,
    isLoading: questionsLoading,
    isFetching: questionsFetching,
  } = useGetAiInterviewQuestionsByRoundQuery(
    { interviewRoundId: selectedRoundData?.id || '', jobOpeningId: jobId || 0 },
    {
      skip: !selectedRoundData?.id || !jobId,
      refetchOnMountOrArgChange: true,
    }
  );
  // A cached round can show isLoading: false with stale data while a fresh
  // refetch is still in flight - wait for that too before trusting "empty".
  const questionsStillResolving = questionsLoading || questionsFetching;

  const handleRoundChange = (value: string) => {
    setSelectedRound(value);
  };

  const categories: {
    key: string;
    title: string;
  }[] = [
    { key: 'Competency-Based Questions', title: 'Competency-Based Questions' },
    { key: 'Pass/Fail Questions', title: 'Pass/Fail Questions' },
    { key: 'Open-Ended Questions', title: 'Open-Ended Questions' },
  ];

  const categoriesMap = questionsData?.categories || (questionsData as any)?.categorizedQuestions;
  const hasQuestions = categoriesMap && Object.keys(categoriesMap).length > 0;

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            fontSize: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          className="width-full bg-[#E7E4E4] border border-[var(--border)] px-6 py-4 rounded-full mb-2 mt-6"
        >
          <Typography variant="h6" className="text-gray-800 m-0">
            Video Questions
          </Typography>

          {videoRounds.length > 0 && (
            <div className="border-wrapper border border-[var(--border)] p-1 w-60 rounded-3xl bg-white">
              <Select
                value={currentSelectedRound}
                onChange={handleRoundChange}
                className="w-full custom-select placeholder-style border-none shadow-none"
                placeholder="Select a Video Round"
              >
                {videoRounds.map((round: any) => (
                  <Option key={round.id} value={round.uniqueRoundIdentifier}>
                    {round.uniqueRoundIdentifier}
                  </Option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="questions-container">
        {categories.map((category) => {
          const questions = (categoriesMap as Record<string, unknown> | undefined)?.[category.key];
          if (questionsStillResolving) {
            return (
              <div key={category.key} className="category-section mb-8">
                <div className="width-full bg-[#E7E4E4] border border-[var(--border)] px-6 py-4 rounded-full mb-4">
                  <Typography variant="subtitle1" className="text-gray-800 m-0">
                    {category.title}
                  </Typography>
                </div>
                <div className="text-center py-4">
                  <Typography variant="body2" color="text-muted">
                    Loading questions...
                  </Typography>
                </div>
              </div>
            );
          }

          if (!Array.isArray(questions) || questions.length === 0) return null;

          return (
            <div key={category.key} className="category-section mb-8 animate-fade-in">
              <div className="width-full bg-[#E7E4E4] border border-[var(--border)] px-6 py-4 rounded-full mb-4">
                <Typography variant="subtitle1" className="font-bold text-gray-800 m-0">
                  {category.title}
                </Typography>
              </div>

              <div className="questions-list space-y-4">
                {questions.map((question: any) => (
                  <div
                    key={question.id}
                    className="flex items-center justify-between bg-white border border-[var(--border)] px-6 py-4 rounded-full shadow-sm"
                  >
                    <Typography variant="body2" className="text-gray-855 m-0">
                      {question.question}
                    </Typography>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {!questionsStillResolving && !hasQuestions && videoRounds.length > 0 && (
        <p style={{ color: '#666', fontStyle: 'italic', paddingLeft: '16px' }}>
          No questions available for selected round.
        </p>
      )}
      {videoRounds.length === 0 && !jobLoading && (
        <p style={{ color: '#666', fontStyle: 'italic', paddingLeft: '16px' }}>
          No video interview rounds available.
        </p>
      )}
    </div>
  );
};

export default VideoInterviewQuestions;
