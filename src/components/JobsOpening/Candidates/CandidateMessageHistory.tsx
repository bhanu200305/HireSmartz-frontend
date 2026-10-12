import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { LuSquarePen, LuTriangleAlert } from 'react-icons/lu';
import { Badge, Button, type BadgeStatus } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import {
  useListCandidateMessageHistoryQuery,
  type MessageHistoryItemView,
} from '../../../api/candidate-service/Candidates/messaging';
import { getCandidateErrorMessage } from '../../../shared/utils/auth/candidateError.helpers';
import { capitalizeFirstLetter } from '../../../shared/utils/validation/input.helpers';

// SMS Communication tab: everything already sent to this candidate
// (candidate-service `GET /candidates/{id}/messages/history` — recruiter
// ad-hoc messages AND system mails/SMS, newest first), plus the Send SMS
// entry point. Filtered client-side by channel; the backend returns both.

type ChannelFilter = 'sms' | 'email' | 'all';

const PAGE_SIZE = 25;
// candidate-service caps `limit` at 100 per request.
const MAX_LIMIT = 100;

const deliveryBadge = (status: string): { status: BadgeStatus; label: string } => {
  const s = status.toLowerCase();
  if (s === 'delivered' || s === 'read') return { status: 'success', label: 'Delivered' };
  if (s === 'sent') return { status: 'info', label: 'Sent' };
  if (s === 'failed' || s === 'bounced' || s === 'undelivered')
    return { status: 'danger', label: 'Failed' };
  return { status: 'neutral', label: s.replace(/[_-]+/g, ' ') || 'Queued' };
};

// A message that is not yet delivered or failed can still change, so the list keeps refreshing
// itself while it is open. `sent` is only worth waiting on for a while: some providers never
// report a later delivery status.
const FINAL_STATUSES = ['delivered', 'read', 'failed', 'bounced', 'undelivered'];
const SENT_IS_FINAL_AFTER_MS = 10 * 60 * 1000;
const FAST_POLL_MS = 4000;
const SLOW_POLL_MS = 20000;

const isStillChanging = (item: MessageHistoryItemView): boolean => {
  const status = item.status.toLowerCase();
  if (FINAL_STATUSES.includes(status)) return false;
  if (status !== 'sent') return true;
  const when = dayjs(item.sent_at ?? item.created_at);
  return when.isValid() && Date.now() - when.valueOf() < SENT_IS_FINAL_AFTER_MS;
};

/** Plain text of a message: the backend's `body_text`, else the HTML body
 * with tags stripped (rendered as text — never as HTML). */
const messageText = (item: MessageHistoryItemView) => {
  if (item.body_text) return item.body_text;
  if (!item.body_html) return '';
  const doc = new DOMParser().parseFromString(item.body_html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+\n/g, '\n').trim();
};

type Props = {
  candidateId: string;
  /** Why SMS can't be sent (opted out of SMS, or no phone number); null when it can. */
  smsBlockedReason: string | null;
  onSendSms: () => void;
};

const CandidateMessageHistory = ({ candidateId, smsBlockedReason, onSendSms }: Props) => {
  const canSms = smsBlockedReason === null;
  const [channel, setChannel] = useState<ChannelFilter>('sms');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [pollMs, setPollMs] = useState(SLOW_POLL_MS);
  const { data, isFetching, error } = useListCandidateMessageHistoryQuery(
    { candidateId, limit },
    { skip: !candidateId, pollingInterval: pollMs, skipPollingIfUnfocused: true }
  );
  const hasChangingMessage = (data?.items ?? []).some(isStillChanging);
  useEffect(() => {
    setPollMs(hasChangingMessage ? FAST_POLL_MS : SLOW_POLL_MS);
  }, [hasChangingMessage]);

  const items = (data?.items ?? []).filter(
    (item) => channel === 'all' || item.channel.toLowerCase() === channel
  );
  const canLoadMore = Boolean(data?.next_before) && limit < MAX_LIMIT;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 px-4 py-2.5">
        <div className="flex items-center gap-1 rounded-full bg-neutral-100 p-0.5 text-xs font-medium">
          {(['sms', 'email', 'all'] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={channel === key}
              onClick={() => setChannel(key)}
              className={`rounded-full px-3 py-1 cursor-pointer ${
                channel === key ? 'bg-white text-primary shadow-xs' : 'text-neutral-600'
              }`}
            >
              {key === 'sms' ? 'SMS' : key === 'email' ? 'Email' : 'All'}
            </button>
          ))}
        </div>
        <Button
          className="box-border inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-3 text-xs font-semibold leading-none text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onSendSms}
          disabled={!canSms}
          title={smsBlockedReason ?? undefined}
        >
          <LuSquarePen size={13} className="shrink-0" aria-hidden />
          Send SMS
        </Button>
      </div>

      <div className="px-4 py-3">
        {/* Says why Send SMS is disabled, instead of only on hover. */}
        {channel === 'sms' && smsBlockedReason && (
          <p
            role="status"
            className="mb-3 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            <LuTriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden />
            {smsBlockedReason}
          </p>
        )}
        {isFetching && !data ? (
          <div className="flex justify-center py-6">
            <Loader />
          </div>
        ) : error ? (
          <p className="py-4 text-center text-sm text-gray-500">
            {getCandidateErrorMessage(error, 'Message history is unavailable right now.')}
          </p>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            {channel === 'all'
              ? 'No messages have been sent to this candidate yet.'
              : `No ${channel === 'sms' ? 'SMS' : 'email'} messages sent to this candidate yet.`}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100">
            {items.map((item) => {
              const badge = deliveryBadge(item.status);
              const when = item.sent_at ?? item.created_at;
              const text = messageText(item);
              return (
                <li key={item.id} className="flex flex-col gap-1 py-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="rounded bg-neutral-100 px-1.5 py-px font-semibold text-neutral-600">
                      {item.channel.toLowerCase() === 'sms'
                        ? 'SMS'
                        : capitalizeFirstLetter(item.channel.toLowerCase())}
                    </span>
                    <span>
                      {dayjs(when).isValid() ? dayjs(when).format('MMM D, YYYY · h:mm A') : ''}
                    </span>
                    <span className="truncate">to {item.recipient_address}</span>
                    <Badge status={badge.status} className="ml-auto">
                      {badge.label}
                    </Badge>
                  </div>
                  {item.subject && (
                    <div className="text-sm font-semibold text-gray-900">{item.subject}</div>
                  )}
                  {text && (
                    <p className="line-clamp-3 whitespace-pre-line text-sm text-gray-700">{text}</p>
                  )}
                  {item.failure_reason && (
                    <p className="text-xs text-danger">{item.failure_reason}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {canLoadMore && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setLimit((prev) => Math.min(prev + PAGE_SIZE, MAX_LIMIT))}
              disabled={isFetching}
              className="text-xs font-semibold text-primary-600 hover:underline cursor-pointer disabled:opacity-50"
            >
              {isFetching ? 'Loading…' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default CandidateMessageHistory;
