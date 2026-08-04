import { useState, useEffect, useMemo } from 'react';
import { Form } from 'antd';
import { Loader } from '../../../shared/ui/loader';
import { Button } from '../../../shared';
import { CandidateByIdResponse, InterviewRoundResponseDTO } from '../../../../types';
import { getLocalStorageItem } from '../../../../shared/utils/auth/localstorage.helpers';
import { jwtDecode } from 'jwt-decode';
import { LOCALSTORAGE_KEYS } from '../../../../constants/webAPI';
import { InterviewEnum } from '../../../../shared/utils/enums';

type InterviewerProps = {
  startTime: string;
  isRoundEnabled: boolean;
  interview: InterviewRoundResponseDTO;
  candidate?: CandidateByIdResponse;
};

const Interviewer = ({ startTime, isRoundEnabled, interview, candidate }: InterviewerProps) => {
  const getUserIdFromToken = () => {
    const token = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
    if (!token) return null;
    const decoded = jwtDecode<{ userId: string }>(token);
    return decoded.userId;
  };
  const userId = getUserIdFromToken();
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [loading] = useState(false);

  useEffect(() => {
    if (!startTime) return;
    const interviewStart = new Date(startTime).getTime();
    const fifteenMinutesBefore = interviewStart - 15 * 60 * 1000;

    const checkTime = () => {
      const now = new Date().getTime();
      setIsButtonEnabled(now >= fifteenMinutesBefore);
    };
    checkTime();
    const interval = setInterval(checkTime, 60 * 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const interviewerToken = useMemo(() => {
    const round = candidate?.interviewRounds?.find(
      (r) =>
        r?.roundType === interview?.roundType && r?.interviewRoundId === interview?.interviewRoundId
    );
    return (
      round?.interviewerList?.find((interviewer: any) => interviewer.userId === userId)
        ?.interviewToken || ''
    );
  }, [candidate, interview?.roundType, userId]);

  const isInterviewerTokenValid = () => {
    if (interviewerToken) {
      return true;
    } else {
      return false;
    }
  };

  if (loading) return <Loader />;

  return (
    <>
      {isRoundEnabled && interview.interviewStatus === InterviewEnum.BOOKING_CREATED ? (
        <Form layout="vertical" autoComplete="off" className="flex flex-col gap-2 w-full">
          {isButtonEnabled && isInterviewerTokenValid() && (
            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                className="bg-primary text-white rounded-full py-2 text-sm font-semibold w-full"
                onClick={() => {
                  window.open(
                    `/interview?token=${encodeURIComponent(interviewerToken || '')}`,
                    '_blank'
                  );
                }}
              >
                START INTERVIEW
              </Button>
            </Form.Item>
          )}
        </Form>
      ) : null}
    </>
  );
};

export default Interviewer;
