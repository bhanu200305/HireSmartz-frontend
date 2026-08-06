import { useState } from 'react';
import { Switch } from 'antd';
import { EvaluationResponseDto } from '../../../../types';
import { FaRobot } from 'react-icons/fa';
import { FaRegUser } from 'react-icons/fa6';

type ParsedVideoMessage = {
  id: number;
  speakerLabel: string;
  text: string;
  isCandidate: boolean;
};

const CANDIDATE_SPEAKER = 'Candidate';
const speakerLineRegex = /^([^:\n\r]{1,80}):\s*(.*)$/;

const normalizeSpeaker = (speaker: string): string =>
  speaker.trim().replace(/\s+/g, ' ').toLowerCase();

const isCandidateSpeaker = (speaker: string): boolean => /\bcandidate\b/i.test(speaker);

const isInterviewerSpeaker = (speaker: string): boolean => /\binterviewer\b/i.test(speaker);

const parseVideoTranscript = (rawText: string): ParsedVideoMessage[] => {
  const lines = rawText.split(/\r?\n|\\n/);
  const fallbackSpeakerMap = new Map<string, string>();
  const parsedMessages: ParsedVideoMessage[] = [];

  const getFallbackSpeakerLabel = (speakerKey: string): string => {
    const normalizedKey = normalizeSpeaker(speakerKey) || 'unlabeled';
    if (!fallbackSpeakerMap.has(normalizedKey)) {
      fallbackSpeakerMap.set(normalizedKey, `Speaker ${fallbackSpeakerMap.size + 1}`);
    }
    return fallbackSpeakerMap.get(normalizedKey) ?? 'Speaker 1';
  };

  const pushOrMergeMessage = (message: ParsedVideoMessage): void => {
    const previous = parsedMessages[parsedMessages.length - 1];
    if (
      previous &&
      previous.speakerLabel === message.speakerLabel &&
      previous.isCandidate === message.isCandidate
    ) {
      previous.text = `${previous.text}\n${message.text}`;
      return;
    }
    parsedMessages.push(message);
  };

  lines.forEach((line) => {
    if (!line.trim()) {
      return;
    }

    const speakerMatch = line.match(speakerLineRegex);

    if (speakerMatch) {
      const rawSpeaker = speakerMatch[1].trim();
      const messageText = speakerMatch[2].trim();

      if (!messageText) {
        return;
      }

      if (isCandidateSpeaker(rawSpeaker)) {
        pushOrMergeMessage({
          id: parsedMessages.length,
          speakerLabel: CANDIDATE_SPEAKER,
          text: messageText,
          isCandidate: true,
        });
        return;
      }

      if (isInterviewerSpeaker(rawSpeaker)) {
        pushOrMergeMessage({
          id: parsedMessages.length,
          speakerLabel: rawSpeaker,
          text: messageText,
          isCandidate: false,
        });
        return;
      }

      pushOrMergeMessage({
        id: parsedMessages.length,
        speakerLabel: getFallbackSpeakerLabel(rawSpeaker),
        text: messageText,
        isCandidate: false,
      });
      return;
    }

    const fallbackSpeaker = getFallbackSpeakerLabel('unlabeled');
    pushOrMergeMessage({
      id: parsedMessages.length,
      speakerLabel: fallbackSpeaker,
      text: line.trim(),
      isCandidate: false,
    });
  });

  return parsedMessages;
};

type TranscriptProps = {
  evalResponse?: EvaluationResponseDto;
  isVideoInterview?: boolean;
};

const Transcript = ({ evalResponse, isVideoInterview }: TranscriptProps) => {
  const hasEnglishTranscript = !isVideoInterview && !!evalResponse?.english_transcript?.trim();

  const [showEnglish, setShowEnglish] = useState(false);

  const rawText = isVideoInterview
    ? evalResponse?.transcript_diarized
    : showEnglish && hasEnglishTranscript
      ? (evalResponse?.english_transcript ?? '')
      : evalResponse?.transcript;

  const lines = rawText?.split(/\\n|\n/).filter((line) => line.trim());
  const videoMessages = isVideoInterview && rawText ? parseVideoTranscript(rawText) : [];

  return (
    <div className="space-y-4">
      {hasEnglishTranscript && (
        <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
          <span className="text-sm text-gray-600">Original (Español)</span>
          <Switch checked={showEnglish} onChange={setShowEnglish} size="small" />
          <span className="text-sm text-gray-600">Translation (English)</span>
        </div>
      )}
      {isVideoInterview ? (
        videoMessages.length ? (
          videoMessages.map((message) =>
            message.isCandidate ? (
              <div key={message.id} className="flex items-start justify-end space-x-3">
                <div className="bg-white rounded-md p-3 border border-gray-200 text-sm text-gray-800 max-w-xl shadow whitespace-pre-line">
                  <p className="font-semibold text-gray-600 mb-1">{message.speakerLabel}</p>
                  {message.text}
                </div>
                <div className="w-8 h-8 flex items-center justify-center rounded-full mt-1 border border-gray-300 flex-shrink-0">
                  <FaRegUser size={16} title="Candidate" />
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-brand-600 text-white flex items-center justify-center rounded-full mt-1">
                  <FaRegUser size={16} title="Interviewer" />
                </div>
                <div className="bg-white rounded-md p-3 border border-gray-200 text-sm text-gray-800 max-w-xl shadow whitespace-pre-line">
                  <p className="font-semibold text-gray-600 mb-1">{message.speakerLabel}</p>
                  {message.text}
                </div>
              </div>
            )
          )
        ) : (
          <p className="font-bold">No transcript present</p>
        )
      ) : lines ? (
        lines.map((line, index) => {
          const isInterviewer = line.startsWith('Interviewer');
          const isAIOrInterviewer = line.startsWith('AI:') || isInterviewer;
          const content = line.replace(/^AI:|^User:|^Usuario:|^Interviewer:/, '').trim();

          return isAIOrInterviewer ? (
            <div key={index} className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-brand-600 text-white flex items-center justify-center rounded-full mt-1">
                {isInterviewer ? (
                  <FaRegUser size={16} title="Interviewer" />
                ) : (
                  <FaRobot size={20} title="BOT" />
                )}
              </div>
              <div className="bg-white rounded-md p-3 border border-gray-200 text-sm text-gray-800 max-w-xl shadow">
                {content}
              </div>
            </div>
          ) : (
            <div key={index} className="flex items-start justify-end space-x-3">
              <div className="bg-white rounded-md p-3 border border-gray-200 text-sm text-gray-800 max-w-xl shadow">
                {content}
              </div>
              <div className="w-8 h-8 flex items-center justify-center rounded-full mt-1 border border-gray-300 flex-shrink-0">
                <FaRegUser size={16} title="Candidate" />
              </div>
            </div>
          );
        })
      ) : (
        <p className="font-bold">No transcript present</p>
      )}
    </div>
  );
};

export default Transcript;
