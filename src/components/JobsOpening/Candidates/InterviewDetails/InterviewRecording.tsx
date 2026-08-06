import { useEffect, useState } from 'react';
import { EvaluationResponseDto } from '../../../../types';
import { Spin } from 'antd';

type InterviewRecordingProps = {
  evalResponse?: EvaluationResponseDto;
  roundType: string;
};

const InterviewRecording = ({ evalResponse, roundType }: InterviewRecordingProps) => {
  const [isMediaLoading, setIsMediaLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsMediaLoading(true);
  }, [evalResponse?.recording_url, roundType]);

  if (!evalResponse?.recording_url || evalResponse?.recording_url.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 text-sm text-gray-700 bg-white shadow-sm max-w-3xl mx-auto mt-6">
        <p className="font-black">No recording released yet</p>
      </div>
    );
  }
  return (
    <div className="pt-4">
      {evalResponse?.recording_url && roundType === 'AI' ? (
        <div className="mb-4">
          {isMediaLoading && <Spin size="small" />}
          <audio
            className="w-full"
            controls
            onLoadedData={() => setIsMediaLoading(false)}
            onCanPlay={() => setIsMediaLoading(false)}
            onError={() => setIsMediaLoading(false)}
          >
            <source src={evalResponse?.recording_url} type="audio/wav" />
          </audio>
        </div>
      ) : evalResponse?.recording_url && roundType === 'VIDEO' ? (
        <div className="mb-4">
          {isMediaLoading && <Spin size="small" />}

          <video
            className="w-full max-w-[820px]"
            controls
            onLoadedData={() => setIsMediaLoading(false)}
            onCanPlay={() => setIsMediaLoading(false)}
            onError={() => setIsMediaLoading(false)}
          >
            <source src={evalResponse?.recording_url} type="video/mp4" />
          </video>
        </div>
      ) : null}
    </div>
  );
};

export default InterviewRecording;
