import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { IoClose, IoSend } from 'react-icons/io5';
import {
  useListCandidateMessageHistoryQuery,
  useSendCandidateSmsMutation,
} from '../../api/candidate-service/Candidates/messaging';
import { getCandidateErrorMessage } from '../../shared/utils/auth/candidateError.helpers';
import { formatPhoneNumber } from '../../shared/utils/methods';
import { showToast } from '../shared';

// Live-interview SMS panel, on candidate-service's messaging API
// (`POST /candidates/{id}/messages/sms` and `GET .../messages/history`).
// It used to call the old `/job-opening/candidate-messaging/*` routes and a
// STOMP websocket, none of which exist in the new backend. History is polled
// while the panel is open instead of pushed. It lists what has been SENT to
// the candidate; inbound replies are not part of this history.

type InterviewSmsPanelProps = {
  open: boolean;
  onClose: () => void;
  /** candidate-service candidate id (UUID). */
  candidateId: string;
  candidateName: string;
  candidatePhone?: string;
};

const QUICK_REPLIES = ['We are waiting.', "We'll join shortly", 'Please check your connection'];

const SMS_MAX_LEN = 160;
const POLL_MS = 10_000;

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

const deliveryColor = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'delivered' || s === 'sent' || s === 'read') return 'text-emerald-600';
  if (s === 'failed' || s === 'undelivered' || s === 'suppressed') return 'text-red-500';
  return 'text-gray-500';
};

const InterviewSmsPanel = ({
  open,
  onClose,
  candidateId,
  candidateName,
  candidatePhone,
}: InterviewSmsPanelProps) => {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching, isError, refetch } = useListCandidateMessageHistoryQuery(
    { candidateId, limit: 50 },
    { skip: !open || !candidateId, pollingInterval: open ? POLL_MS : 0 }
  );
  const [sendSms, { isLoading: isSending }] = useSendCandidateSmsMutation();

  // Newest-first from the API; the chat reads oldest-first.
  const messages = useMemo(
    () => [...(data?.items ?? [])].filter((m) => m.channel.toLowerCase() === 'sms').reverse(),
    [data]
  );

  const headerName = candidateName || 'Candidate';
  const headerPhone = useMemo(() => {
    const rawPhone = String(candidatePhone || '').trim();
    const digits = rawPhone.replace(/\D/g, '');
    if (!digits) return '-';
    if (digits.length <= 10) return formatPhoneNumber(digits);
    const countryCode = `${rawPhone.startsWith('+') ? '+' : ''}${digits.slice(0, digits.length - 10)}`;
    return `${countryCode} ${formatPhoneNumber(digits.slice(-10))}`.trim();
  }, [candidatePhone]);

  useEffect(() => {
    if (!open) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, open]);

  const sendText = async (text: string): Promise<boolean> => {
    try {
      const res = await sendSms({ candidateId, body: { smsBody: text } }).unwrap();
      if (!res.sent) {
        showToast({
          message: 'Not sent: another message was sent to this candidate in the last 5 minutes.',
          type: 'info',
        });
        return false;
      }
      showToast({ message: 'SMS sent successfully.', type: 'success' });
      void refetch();
      return true;
    } catch (error) {
      showToast({ message: getCandidateErrorMessage(error, 'Could not send SMS'), type: 'error' });
      return false;
    }
  };

  const handleSend = async () => {
    const trimmed = messageText.trim();
    if (!trimmed) return;
    if (await sendText(trimmed)) setMessageText('');
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
            <span className="truncate text-lg font-semibold text-[#2f2f2f]">{headerName}</span>
            <span className="truncate rounded-md bg-white/60 px-1 py-0 text-sm text-[#4b4b4b]">
              {headerPhone}
            </span>
          </div>
          <div className="text-sm text-[#fe7725]">Candidate</div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-700 hover:bg-gray-200 cursor-pointer"
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
            const timeText = dayjs(msg.sent_at ?? msg.created_at).format('MMM D, YYYY hh:mm A');
            const initials = getInitials('Hiring Team') || 'U';
            return (
              <div key={msg.id} className="mb-3 flex justify-end">
                <div className="max-w-[88%] rounded-lg border border-[#ffa766] bg-[#ffe0c7] px-3 py-2 text-[#2f2f2f]">
                  <div className="mb-1 flex items-center gap-2 text-sm">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#d5deee] text-xs font-semibold text-[#e5661f]">
                      {initials}
                    </span>
                    <span className="font-semibold">Hiring Team</span>
                  </div>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.body_text ?? 'Content no longer retained'}
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-gray-500">
                    <span>{timeText}</span>
                    <span
                      className={`inline-flex items-center font-medium ${deliveryColor(msg.status)}`}
                    >
                      • {msg.status.charAt(0).toUpperCase() + msg.status.slice(1).toLowerCase()}
                    </span>
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
          {QUICK_REPLIES.map((label) => (
            <button
              key={label}
              type="button"
              disabled={isSending}
              onClick={() => void sendText(label)}
              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs text-[#2f2f2f] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-2 py-2">
          <textarea
            rows={1}
            value={messageText}
            maxLength={SMS_MAX_LEN}
            onChange={(event) => setMessageText(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Start Typing..."
            className="max-h-24 min-h-8 w-full resize-none border-none bg-transparent px-1 text-sm text-[#2f2f2f] outline-none placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#ffa766] hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
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
