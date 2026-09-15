import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { IoClose, IoSend } from 'react-icons/io5';
import { jwtDecode } from 'jwt-decode';
import {
  useGetSmsConversationThreadQuery,
  useSendCandidateSmsActionMutation,
  useSendCandidateSmsMutation,
} from '../../api/candidate-service/Candidates/Candidates';
import type { SmsMessage, SendCandidateSmsResponse } from '../../types';
import { rtkErrorMessage } from '../../shared/utils/api/rtkErrorMessage';
import { formatPhoneNumber } from '../../shared/utils/methods';
import { showToast } from '../shared';
import { RootState } from '../../redux/provider/store';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { getLocalStorageItem } from '../../shared/utils/auth/localstorage.helpers';
import { StompClient } from '../../services/StompClient';

type InterviewSmsPanelProps = {
  open: boolean;
  onClose: () => void;
  candidateId: number;
  jobOpeningId: number;
  candidateName: string;
  candidatePhone?: string;
  bookingId?: number | string;
};

type QuickReplyItem =
  | {
      id: string;
      label: string;
      mode: 'action';
      actionType: 'LIVE_JOIN_ASSIST' | 'SEND_INTERVIEW_LINK';
    }
  | {
      id: string;
      label: string;
      mode: 'text';
    };

const QUICK_REPLIES: QuickReplyItem[] = [
  { id: 'waiting', label: 'We are waiting.', mode: 'action', actionType: 'LIVE_JOIN_ASSIST' },
  { id: 'join_shortly', label: "We'll join shortly", mode: 'text' },
  { id: 'check_connection', label: 'Please check your connection', mode: 'text' },
  {
    id: 'send_interview_link',
    label: 'Send interview link',
    mode: 'action',
    actionType: 'SEND_INTERVIEW_LINK',
  },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

const InterviewSmsPanel = ({
  open,
  onClose,
  candidateId,
  jobOpeningId,
  candidateName,
  candidatePhone,
  bookingId,
}: InterviewSmsPanelProps) => {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      skip: !open || !candidateId || !jobOpeningId,
    }
  );

  useEffect(() => {
    if (!open || !candidateId || !companyId) return;

    const backendEndpoint = import.meta.env.VITE_BACKEND_ENDPOINT || window.location.host;
    const wsUrl = `wss://${backendEndpoint.replace(/^https?:\/\//, '')}/ws-sms`;
    const token = loginToken || getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);

    const client = new StompClient(wsUrl);

    client.connect(token, () => {
      const topic = `/topic/sms/company/${companyId}/candidate/${candidateId}`;
      client.subscribe(topic, () => {
        void refetch();
      });

      const companyTopic = `/topic/sms/company/${companyId}`;
      client.subscribe(companyTopic, (body) => {
        if (body?.candidateId === candidateId) {
          void refetch();
        }
      });
    });

    return () => {
      client.disconnect();
    };
  }, [open, candidateId, companyId, loginToken, refetch]);

  const [sendSms, { isLoading: isSendingSms }] = useSendCandidateSmsMutation();
  const [sendSmsAction, { isLoading: isSendingAction }] = useSendCandidateSmsActionMutation();

  const isSending = isSendingSms || isSendingAction;
  const messages: SmsMessage[] = conversationData?.content || [];

  const headerName = conversationData?.candidateName || candidateName || 'Candidate';
  const headerPhone = useMemo(() => {
    const rawPhone = String(conversationData?.candidatePhone || candidatePhone || '').trim();
    if (!rawPhone) return '-';

    const hasLeadingPlus = rawPhone.startsWith('+');
    const digits = rawPhone.replace(/\D/g, '');
    if (!digits) return '-';

    if (digits.length <= 10) {
      return formatPhoneNumber(digits);
    }

    const countryDigits = digits.slice(0, digits.length - 10);
    const localDigits = digits.slice(-10);
    const countryCode = `${hasLeadingPlus ? '+' : ''}${countryDigits}`;
    return `${countryCode} ${formatPhoneNumber(localDigits)}`.trim();
  }, [conversationData?.candidatePhone, candidatePhone]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, open]);

  const sendTextMessage = async (text: string): Promise<void> => {
    const response: SendCandidateSmsResponse = await sendSms({
      candidateId,
      jobOpeningId,
      messageText: text,
    }).unwrap();
    showToast({ message: response?.message || 'SMS sent successfully.', type: 'success' });
  };

  const handleSend = async () => {
    const trimmed = messageText.trim();
    if (!trimmed) return;

    try {
      await sendTextMessage(trimmed);
      setMessageText('');
      void refetch();
    } catch (error) {
      showToast({ message: rtkErrorMessage(error), type: 'error' });
    }
  };

  const handleQuickReply = async (item: QuickReplyItem) => {
    if (isSending) return;

    try {
      if (item.mode === 'action') {
        const response = await sendSmsAction({
          candidateId,
          jobOpeningId,
          actionType: item.actionType,
          ...(bookingId && { bookingId }),
        }).unwrap();
        showToast({
          message: response.alreadySent
            ? 'Quick message already sent recently.'
            : 'Quick message sent successfully.',
          type: 'success',
        });
      } else {
        await sendTextMessage(item.label);
      }
      void refetch();
    } catch (error) {
      showToast({ message: rtkErrorMessage(error), type: 'error' });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const canSend = messageText.trim().length > 0 && !isSending;

  const panelClassName = useMemo(
    () =>
      `fixed right-6 bottom-18 z-[70] w-[min(440px,calc(100vw-1.5rem))] rounded-2xl border border-gray-300 bg-[#f4f4f5] shadow-2xl transition-all duration-200 ${
        open
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0'
      }`,
    [open]
  );

  return (
    <div className={panelClassName}>
      <div className="flex items-center justify-between rounded-t-2xl border-b border-gray-300 bg-[#dfe7f2] px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            <span className="truncate text-[18px] font-semibold text-[#2f2f2f]">{headerName}</span>
            <span className="truncate rounded-md bg-white/60 px-1 py-0 text-[14px] text-[#4b4b4b]">
              {headerPhone}
            </span>
          </div>
          <div className="text-[14px] text-[#3565b7]">Candidate</div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-700 hover:bg-gray-200"
          aria-label="Close SMS panel"
        >
          <IoClose size={20} />
        </button>
      </div>

      <div className="px-3 py-3">
        <div className="h-64 overflow-y-auto rounded-lg border border-gray-300 bg-white px-3 py-3">
          {isLoading && (
            <div className="py-6 text-center text-sm text-gray-500">Loading conversation...</div>
          )}

          {!isLoading && isError && (
            <div className="py-6 text-center text-sm text-red-500">
              Failed to load conversation.
            </div>
          )}

          {!isLoading && !isError && messages.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-400">No messages yet.</div>
          )}

          {messages.map((msg) => {
            const isOutbound = msg.direction === 'OUTBOUND';
            const sender = msg.senderName || headerName;
            const roleLabel =
              msg.sentByRole || msg.senderType || (isOutbound ? 'Hiring Manager' : 'Candidate');
            const isAutoGenerated =
              roleLabel?.toUpperCase() === 'AUTO_GENERATED' || msg.senderType === 'AUTO_GENERATED';
            const timeText = dayjs(msg.createdAt).format('MMM DD, YYYY hh:mm A');
            const initials = getInitials(sender) || 'U';

            return (
              <div
                key={msg.id}
                className={`mb-3 flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-lg border px-3 py-2 ${
                    isOutbound
                      ? 'border-[#9eb3d7] bg-[#d9e3f7] text-[#2f2f2f]'
                      : 'border-gray-300 bg-white text-[#2f2f2f]'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-sm">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#d5deee] text-xs font-semibold text-[#2f5ea8]">
                      {initials}
                    </span>
                    <span className="font-semibold">{sender}</span>
                    {!isAutoGenerated && <span className="text-gray-500">({roleLabel})</span>}
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.messageText}
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-gray-500">
                    <span>{timeText}</span>
                    {isOutbound && msg.status && (
                      <span
                        className={`inline-flex items-center font-medium ${
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
            <div className="py-1 text-center text-xs text-gray-400">Refreshing...</div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="mt-2 flex flex-wrap gap-2 rounded-md border border-gray-300 bg-[#e6e6e7] p-2">
          {QUICK_REPLIES.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={isSending}
              onClick={() => void handleQuickReply(item)}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-[#2f2f2f] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-2 py-2">
          <textarea
            rows={1}
            value={messageText}
            onChange={(event) => setMessageText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Start Typing..."
            className="max-h-24 min-h-8 w-full resize-none border-none bg-transparent px-1 text-sm text-[#2f2f2f] outline-none placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#9fb4d5] hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send message"
          >
            <IoSend size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewSmsPanel;
