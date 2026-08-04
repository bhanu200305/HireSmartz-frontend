import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { IoSend } from 'react-icons/io5';
import dayjs from 'dayjs';
import { jwtDecode } from 'jwt-decode';
import {
  useGetSmsConversationThreadQuery,
  useSendCandidateSmsMutation,
} from '../../../../api/candidate-service/Candidates/Candidates';
import type { SmsMessage, SendCandidateSmsResponse } from '../../../../types';
import { rtkErrorMessage } from '../../../../shared/utils/api/rtkErrorMessage';
import { showToast } from '../../../shared';
import { isValidSmsPhoneTarget } from '../Modal/smsHelpers';
import { Loader } from '../../../shared/ui/loader';
import ConfirmationModal from '../../../shared/ui/ConfirmationModal';
import { RootState } from '../../../../redux/provider/store';
import { LOCALSTORAGE_KEYS } from '../../../../constants/webAPI';
import { getLocalStorageItem } from '../../../../shared/utils/auth/localstorage.helpers';
import { StompClient } from '../../../../services/StompClient';

type SmsCommunicationTabProps = {
  candidateId: number;
  jobOpeningId: number;
  smsPhoneTarget: string;
  smsOptOut?: boolean;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

const SmsCommunicationTab = ({
  candidateId,
  jobOpeningId,
  smsPhoneTarget,
  smsOptOut = false,
}: SmsCommunicationTabProps) => {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showOptOutWarning, setShowOptOutWarning] = useState(false);

  const { loginToken } = useSelector((state: RootState) => state.LoginSlice);
  const companyId = useMemo<number | null>(() => {
    const token = loginToken || getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
    if (!token) return null;
    try {
      const decoded = jwtDecode<{ companyId?: number }>(token);
      return decoded.companyId ?? null;
    } catch {
      return null;
    }
  }, [loginToken]);

  const {
    data: conversationData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetSmsConversationThreadQuery(
    { candidateId, jobOpeningId, page: 0, size: 50, sortBy: 'createdAt', sortDirection: 'ASC' },
    {
      skip: !candidateId || !jobOpeningId,
    }
  );

  useEffect(() => {
    if (!candidateId || !companyId) return;

    const backendEndpoint = import.meta.env.VITE_BACKEND_ENDPOINT || window.location.host;
    const wsUrl = `wss://${backendEndpoint.replace(/^https?:\/\//, '')}/ws-sms`;
    const token = loginToken || getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);

    const client = new StompClient(wsUrl);

    client.connect(token, () => {
      const topic = `/topic/sms/company/${companyId}/candidate/${candidateId}`;
      client.subscribe(topic, (body) => {
        console.log('[WebSocket SMS] received message:', body);
        void refetch();
      });

      const companyTopic = `/topic/sms/company/${companyId}`;
      client.subscribe(companyTopic, (body) => {
        console.log('[WebSocket SMS] received company-wide message:', body);
        if (body?.candidateId === candidateId) {
          void refetch();
        }
      });
    });

    return () => {
      client.disconnect();
    };
  }, [candidateId, companyId, loginToken, refetch]);

  const [sendSms, { isLoading: isSending }] = useSendCandidateSmsMutation();

  const messages: SmsMessage[] = conversationData?.content ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const text = messageText.trim();
    if (!text) return;
    if (!isValidSmsPhoneTarget(smsPhoneTarget)) {
      showToast({
        message: 'Candidate phone number is invalid. Cannot send SMS.',
        type: 'error',
      });
      return;
    }
    try {
      const response: SendCandidateSmsResponse = await sendSms({
        candidateId,
        jobOpeningId,
        messageText: text,
      }).unwrap();
      setMessageText('');
      showToast({ message: response?.message || 'SMS sent successfully.', type: 'success' });
      void refetch();
    } catch (e) {
      showToast({ message: rtkErrorMessage(e), type: 'error' });
    }
  };

  /** Intercepts send if smsOptOut is true; otherwise sends directly */
  const handleSendWithOptOutCheck = () => {
    const text = messageText.trim();
    if (!text) return;
    if (smsOptOut) {
      setShowOptOutWarning(true);
    } else {
      void handleSend();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendWithOptOutCheck();
    }
  };

  const canSend =
    !isSending && messageText.trim().length > 0 && isValidSmsPhoneTarget(smsPhoneTarget);

  return (
    <div className="flex flex-col h-155 max-h-[70vh] bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-gray-800">Conversation History</h2>
      </div>

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
        {isLoading && (
          <div className="flex justify-center items-center h-32">
            <Loader />
          </div>
        )}

        {!isLoading && isError && (
          <div className="flex justify-center items-center h-32 text-sm text-red-500">
            Failed to load conversation history.
          </div>
        )}

        {!isLoading && !isError && messages.length === 0 && (
          <div className="flex justify-center items-center h-32 text-sm text-gray-400">
            No messages yet.
          </div>
        )}

        {messages.map((msg) => {
          const isOutbound = msg.direction === 'OUTBOUND';
          const initials = getInitials(msg.senderName || '?');
          const formattedTime = dayjs(msg.createdAt).format('MMM DD, YYYY hh:mm A');
          const roleLabel =
            msg.sentByRole || msg.senderType || (isOutbound ? 'Hiring Manager' : 'Candidate');
          const isAutoGenerated =
            roleLabel?.toUpperCase() === 'AUTO_GENERATED' || msg.senderType === 'AUTO_GENERATED';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isOutbound ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-white ${
                  isOutbound ? 'bg-[#4A6FA5]' : 'bg-gray-400'
                }`}
              >
                {initials}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[65%] flex flex-col gap-1 ${isOutbound ? 'items-end' : 'items-start'}`}
              >
                <span className="text-xs font-medium text-gray-600">
                  {msg.senderName}{' '}
                  {!isAutoGenerated && <span className="text-gray-400">({roleLabel})</span>}
                </span>

                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    isOutbound
                      ? 'bg-[#4A6FA5] text-white rounded-tr-none'
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'
                  }`}
                >
                  {msg.messageText}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-gray-400">{formattedTime}</span>
                  {isOutbound && msg.status && (
                    <span
                      className={`inline-flex items-center text-[11px] font-medium ${
                        ['DELIVERED', 'SENT'].includes(msg.status.toUpperCase())
                          ? 'text-emerald-600'
                          : ['FAILED', 'UNDELIVERED'].includes(msg.status.toUpperCase())
                            ? 'text-red-500'
                            : 'text-gray-500'
                      }`}
                    >
                      • {msg.status.charAt(0).toUpperCase() + msg.status.slice(1).toLowerCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isFetching && !isLoading && (
          <div className="flex justify-center py-1">
            <span className="text-xs text-gray-400">Refreshing…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 px-4 py-3 flex items-end gap-3">
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Start Typing..."
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-(--primary)/30 focus:border-(--primary) transition-colors"
          style={{ maxHeight: '100px', overflowY: 'auto' }}
        />
        <button
          type="button"
          onClick={() => handleSendWithOptOutCheck()}
          disabled={!canSend}
          className="shrink-0 h-10 w-10 rounded-full bg-(--primary) flex items-center justify-center text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          aria-label="Send SMS"
        >
          {isSending ? (
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <IoSend size={16} />
          )}
        </button>
      </div>

      {showOptOutWarning && (
        <ConfirmationModal
          title="This candidate has opted out of SMS communication. Do you still want to continue sending SMS to this candidate?"
          confirmText="CONTINUE SENDING"
          cancelText="CANCEL"
          onClose={() => setShowOptOutWarning(false)}
          onConfirm={() => {
            setShowOptOutWarning(false);
            void handleSend();
          }}
        />
      )}
    </div>
  );
};

export default SmsCommunicationTab;
