import { useEffect, useState } from 'react';
import { Button, CustomCheckbox, showToast, Textarea } from '../../../shared';
import { useVideoFinalFeedbackStatusMutation } from '../../../../api/candidate-service/Candidates/Candidates';
import { CheckboxChangeEvent } from 'antd';
import { InterviewRoundResponseDTO } from '../../../../types';
import { get } from 'lodash-es';
import { InterviewEnum } from '../../../../shared/utils/enums';
import ConfirmationModal from '../../../shared/ui/ConfirmationModal';
import dayjs from 'dayjs';

type FinalFeedbackProps = {
  interviewRound: InterviewRoundResponseDTO;
};

const FinalFeedback: React.FC<FinalFeedbackProps> = ({ interviewRound }) => {
  const [showFeedbackConfirmationModal, setShowFeedbackConfirmationModal] = useState(false);
  const { candidateId, jobId, interviewRoundId, interviewStatus, videoInterviewFeedback } =
    interviewRound;
  const feedbackAuthorName = interviewRound?.advanceFeedbackCreatedByName?.trim();
  const feedbackCreatedAt = interviewRound?.advanceFeedbackCreatedAt;
  const [feedbackData, setFeedbackData] = useState({
    status: interviewStatus,
    feedback: videoInterviewFeedback,
  });

  // const [videoFinalFeedbackStatus, { isLoading }] = useVideoFinalFeedbackStatusMutation()

  // const handleStatusChange = (statusName: string) => (e: CheckboxChangeEvent) => {
  //   const { checked } = e.target
  //   setFeedbackData((prev) => ({
  //     ...prev,
  //     status: checked ? statusName : ''
  //   }))
  // }

  // const handleCommentsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  //   setFeedbackData((prev) => ({ ...prev, feedback: e.target.value }))
  // }

  // const onSubmit = async () => {
  //   const payload = {
  //     query: {
  //       jobOpeningId: Number(jobId),
  //       candidateId: Number(candidateId),
  //       roundId: Number(interviewRoundId)
  //     },
  //     body: {
  //       status: feedbackData.status,
  //       feedback: feedbackData.feedback
  //     }
  //   }
  //   videoFinalFeedbackStatus(payload)
  //     .unwrap()
  //     .then((res) => {
  //       if (res?.success) {
  //         showToast({
  //           message: get(res, 'message'),
  //           type: 'success'
  //         })
  //         setShowFeedbackConfirmationModal(false)
  //       } else {
  //         showToast({
  //           message: get(res, 'message', ''),
  //           type: 'error'
  //         })
  //       }
  //     })
  //     .catch((err) => {
  //       showToast({
  //         message: get(err, 'data.message', ''),
  //         type: 'error'
  //       })
  //     })
  // }

  useEffect(() => {
    if (interviewStatus && videoInterviewFeedback) {
      setFeedbackData({
        ...feedbackData,
        status: interviewStatus,
        feedback: videoInterviewFeedback,
      });
    }
  }, [interviewStatus, videoInterviewFeedback]);

  const hasFeedback = feedbackData.feedback && feedbackData.feedback.trim().length > 0;

  return (
    <div>
      <div className="flex justify-start gap-4">
        {/* <CustomCheckbox
          label="Selected"
          checked={(feedbackData.status === 'SELECTED')}
          onChange={handleStatusChange('SELECTED')}
          disabled={!!interviewStatus && interviewStatus !== InterviewEnum.INTERVIEW_COMPLETED}
        />
        <CustomCheckbox
          label="Rejected"
          checked={feedbackData.status === 'NOT_SELECTED'}
          onChange={handleStatusChange('NOT_SELECTED')}
          disabled={!!interviewStatus && interviewStatus !== InterviewEnum.INTERVIEW_COMPLETED}
        /> */}
        {/* <CustomCheckbox
          label="On Hold"
          checked={feedbackData.status === 'ON_HOLD'}
          onChange={handleStatusChange('ON_HOLD')}
          disabled={!!interviewStatus && interviewStatus !== InterviewEnum.INTERVIEW_COMPLETED}
        /> */}
      </div>
      {hasFeedback ? (
        <div>
          <div className="flex flex-col justify-start">
            <div
              className={`mb-6 w-full max-w-[820px] border border-gray-200 p-4 text-sm text-gray-700 bg-[#FAFAFA] shadow-sm`}
            >
              {feedbackAuthorName || feedbackCreatedAt ? (
                <div className="mb-2 flex items-center justify-between">
                  {feedbackAuthorName ? (
                    <span className="font-bold">{feedbackAuthorName}</span>
                  ) : null}
                  {feedbackCreatedAt ? (
                    <span className="ml-auto text-xs text-gray-500">
                      {dayjs(feedbackCreatedAt).format('MMM DD, YYYY, h:mm A')}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {/* <h2 className="font-medium pb-2">Feedback Comments</h2> */}
              <Textarea
                rows={4}
                className={`w-full p-3 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-gray-300 ${
                  videoInterviewFeedback ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
                }`}
                name="feedback"
                value={feedbackData.feedback}
                disabled
                // onChange={handleCommentsChange}
                placeholder="Enter your comments here..."
              />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-6 w-full max-w-[820px] border border-gray-200 rounded-lg p-4 text-sm text-gray-700 bg-[#FAFAFA] shadow-sm">
            <div className="flex justify-between items-center">
              <span className="font-medium text-gray-800">No feedback available</span>
            </div>
          </div>
        </div>
      )}

      {/* {interviewStatus && videoInterviewFeedback ? null : (
        <div className="flex justify-center">
          <Button
            className="mt-6 px-10 py-3 bg-blue-600 font-bold text-white border rounded-4xl cursor-pointer"
            disabled={!feedbackData.status || !feedbackData.feedback}
            onClick={() => setShowFeedbackConfirmationModal(true)}
          >
            <span>SUBMIT</span>
          </Button>
        </div>
      )} */}

      {/* {showFeedbackConfirmationModal && (
        <ConfirmationModal
          onClose={() => setShowFeedbackConfirmationModal(false)}
          onConfirm={onSubmit}
          title="Once submitted, your feedback can’t be changed. Please review before proceeding."
          confirmText="CONFIRM"
          isLoading={isLoading}
        />
      )} */}
    </div>
  );
};

export default FinalFeedback;
