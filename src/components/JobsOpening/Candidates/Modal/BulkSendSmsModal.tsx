import { useEffect, useMemo, useState } from 'react';
import { Checkbox, Drawer } from 'antd';
import { IoClose } from 'react-icons/io5';
import TextArea from 'antd/es/input/TextArea';
import { useSendBulkCandidateSmsMutation } from '../../../../api/candidate-service/Candidates/Candidates';
import { rtkErrorMessage } from '../../../../shared/utils/api/rtkErrorMessage';
import { Button, Input, showToast } from '../../../shared';
import {
  candidateDisplayName,
  getSmsInfoForCandidate,
  SMS_NATIONAL_DIGIT_COUNT,
} from './smsHelpers';

const SMS_MAX_LEN = 160;

type BulkSendSmsModalProps = {
  open: boolean;
  onClose: () => void;
  jobOpeningId: number;
  /** All candidates currently selected in the floating bar */
  candidates: any[];
};

const BulkSendSmsModal = ({ open, onClose, jobOpeningId, candidates }: BulkSendSmsModalProps) => {
  const [message, setMessage] = useState('');
  const [checkedById, setCheckedById] = useState<Record<string, boolean>>({});
  const [sendBulkSms, { isLoading: isSending }] = useSendBulkCandidateSmsMutation();

  const { withPhone, invalidPhone, withoutPhone } = useMemo(() => {
    const wp: { candidate: any; info: ReturnType<typeof getSmsInfoForCandidate> }[] = [];
    const inv: { candidate: any; info: ReturnType<typeof getSmsInfoForCandidate> }[] = [];
    const wo: any[] = [];
    for (const c of candidates) {
      const info = getSmsInfoForCandidate(c);
      if (info.canSms) wp.push({ candidate: c, info });
      else if (info.hasInvalidPhone) inv.push({ candidate: c, info });
      else wo.push(c);
    }
    return { withPhone: wp, invalidPhone: inv, withoutPhone: wo };
  }, [candidates]);

  useEffect(() => {
    if (!open || candidates.length === 0) return;
    const next: Record<string, boolean> = {};
    for (const { candidate } of withPhone) {
      next[String(candidate.id)] = true;
    }
    for (const { candidate } of invalidPhone) {
      next[String(candidate.id)] = false;
    }
    setCheckedById(next);
    setMessage('');
  }, [open, candidates, withPhone, invalidPhone]);

  const totalSelectedLabel = `${candidates.length} Candidate${candidates.length === 1 ? '' : 's'} Selected`;

  const toggleId = (id: string, checked: boolean) => {
    setCheckedById((prev) => ({ ...prev, [id]: checked }));
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!text) {
      showToast({ message: 'Message is required', type: 'error' });
      return;
    }
    const recipients = withPhone.filter(({ candidate }) => {
      if (checkedById[String(candidate.id)] === false) return false;
      return getSmsInfoForCandidate(candidate).canSms;
    });
    if (recipients.length === 0) {
      showToast({
        message: 'Select at least one candidate with a valid 10-digit mobile number',
        type: 'warning',
      });
      return;
    }
    if (!jobOpeningId) {
      showToast({ message: 'Job opening is missing', type: 'error' });
      return;
    }
    const candidateIds = recipients
      .map(({ candidate }) => Number(candidate.id))
      .filter(Number.isFinite);
    if (candidateIds.length === 0) {
      showToast({ message: 'No valid candidate ids', type: 'error' });
      return;
    }
    try {
      await sendBulkSms({
        candidateIds,
        jobOpeningId,
        messageText: text,
      }).unwrap();
      const n = candidateIds.length;
      showToast({
        message: `SMS Sent successfully to ${n} Candidate${n === 1 ? '' : 's'}`,
        type: 'success',
      });
      onClose();
    } catch (e) {
      showToast({ message: rtkErrorMessage(e), type: 'error' });
    }
  };

  return (
    <Drawer
      title={<span className="pr-8 text-base font-bold text-[#1a1a1a]">Send SMS - Bulk SMS</span>}
      placement="bottom"
      height="min(560px, 78dvh)"
      onClose={onClose}
      open={open}
      destroyOnClose
      maskClosable
      closable={false}
      extra={
        <button
          type="button"
          onClick={onClose}
          className="text-gray-900 hover:text-black font-extrabold flex items-center justify-center p-1.5 rounded-md hover:bg-black/[0.06] border-0 bg-transparent cursor-pointer"
          aria-label="Close"
        >
          <IoClose size={22} />
        </button>
      }
      footer={
        <Button
          type="button"
          onClick={() => void handleSend()}
          disabled={withPhone.length === 0 || isSending}
          className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
        >
          {isSending ? 'SENDING…' : 'SEND SMS'}
        </Button>
      }
      styles={{
        wrapper: {
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'none',
          marginBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        },
        content: {
          width: 'min(480px, 96vw)',
          maxWidth: 560,
          marginLeft: 'auto',
          marginRight: 12,
          marginBottom: 0,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderBottomLeftRadius: 16,
          borderBottomRightRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        },
        header: {
          background: '#f5f5f5',
          borderBottom: '1px solid #e5e7eb',
          padding: '8px 14px',
          flexShrink: 0,
        },
        body: {
          padding: '10px 14px 12px',
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        },
        footer: {
          padding: '10px 14px 12px',
          flexShrink: 0,
        },
      }}
      className="bulk-send-sms-drawer send-sms-drawer--bottom-right"
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-gray-800">
            To Recipients <span className="required-asterisk">*</span>
          </label>
          <Input
            readOnly
            value={totalSelectedLabel}
            className="h-10 rounded-lg border border-gray-300 bg-gray-50 text-sm text-[#1a1a1a]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-800">
            Candidates with Phone Number
          </label>
          {withPhone.length === 0 && invalidPhone.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
              No phone numbers on file for the selected candidate(s).
            </p>
          ) : (
            <div className="flex max-h-[min(200px,28vh)] flex-col gap-3 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
              {withPhone.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {withPhone.map(({ candidate, info }) => {
                    const id = String(candidate.id);
                    return (
                      <label
                        key={id}
                        className="flex min-w-[160px] max-w-full cursor-pointer items-start gap-2 rounded-md bg-white/80 p-2"
                      >
                        <Checkbox
                          className="mt-0.5"
                          checked={checkedById[id] !== false}
                          onChange={(e) => toggleId(id, e.target.checked)}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-[#1a1a1a]">
                            {candidateDisplayName(candidate)}
                          </span>
                          <span className="block text-xs text-gray-500">
                            {info.smsPhoneDisplay}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
              {invalidPhone.length > 0 ? (
                <div className="border-t border-gray-200 pt-3">
                  <p className="mb-2 text-xs font-medium text-red-600">
                    Invalid phone (exactly {SMS_NATIONAL_DIGIT_COUNT} digits required in mobile
                    field) — not included in send
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {invalidPhone.map(({ candidate, info }) => {
                      const id = String(candidate.id);
                      return (
                        <label
                          key={id}
                          className="flex min-w-[160px] max-w-full cursor-not-allowed items-start gap-2 rounded-md bg-gray-100/90 p-2 opacity-90"
                        >
                          <Checkbox className="mt-0.5" checked={false} disabled />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-gray-500">
                              {candidateDisplayName(candidate)}
                            </span>
                            <span className="block text-xs text-red-500">
                              {info.smsPhoneDisplay}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {withoutPhone.length > 0 ? (
          <div>
            <p className="mb-2 text-sm text-red-600">
              Candidate(s) without phone number. they will be skipped
            </p>
            <div className="flex max-h-[min(120px,20vh)] flex-wrap gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
              {withoutPhone.map((c) => (
                <span
                  key={String(c.id)}
                  className="text-sm text-gray-400 line-through decoration-gray-300"
                >
                  {candidateDisplayName(c)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <label className="mb-1 block text-sm text-gray-800">
            Message <span className="required-asterisk">*</span>
          </label>
          <TextArea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={SMS_MAX_LEN}
            showCount={{
              formatter: ({ count, maxLength }) => `${count} / ${maxLength ?? SMS_MAX_LEN}`,
            }}
            placeholder="Type your SMS"
            rows={4}
            className="resize-y rounded-lg text-sm min-h-[100px]"
          />
        </div>
      </div>
    </Drawer>
  );
};

export default BulkSendSmsModal;
