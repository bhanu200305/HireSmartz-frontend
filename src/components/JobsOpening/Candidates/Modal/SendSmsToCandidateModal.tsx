import { useEffect, useMemo, useState } from 'react';
import { Drawer, Form } from 'antd';
import { IoClose } from 'react-icons/io5';
import TextArea from 'antd/es/input/TextArea';
import { useSendCandidateSmsMutation } from '../../../../api/candidate-service/Candidates/Candidates';
import type { CandidateByIdResponse } from '../../../../types';
import { rtkErrorMessage } from '../../../../shared/utils/api/rtkErrorMessage';
import { Button, showToast } from '../../../shared';
import {
  isValidSmsPhoneTarget,
  jobTitleFromCandidate,
  SMS_NATIONAL_DIGIT_COUNT,
  toTitleCase,
} from './smsHelpers';

type SendSmsToCandidateModalProps = {
  open: boolean;
  onClose: () => void;
  candidate?: CandidateByIdResponse | null;
  jobOpeningId: number;
  /** E.164-style target for `sms:` link, e.g. +15551234567 */
  smsPhoneTarget: string;
  /** Shown on the right side of the "To" row */
  phoneDisplay: string;
};

const SendSmsToCandidateModal = ({
  open,
  onClose,
  candidate,
  jobOpeningId,
  smsPhoneTarget,
  phoneDisplay,
}: SendSmsToCandidateModalProps) => {
  const [message, setMessage] = useState('');
  const [sendSms, { isLoading: isSending }] = useSendCandidateSmsMutation();

  const candidateName = candidate
    ? toTitleCase(
        `${(candidate.firstName ?? '').trim()} ${(candidate.lastName ?? '').trim()}`.trim()
      ) || 'Candidate'
    : 'Candidate';

  const jobTitle = candidate ? jobTitleFromCandidate(candidate) : '';

  const formattedJobPosition = useMemo(() => {
    let pos = jobTitle.trim();
    if (pos.toLowerCase() === 'the position') {
      return 'the';
    }
    if (pos.toLowerCase().endsWith(' position')) {
      pos = pos.slice(0, -9).trim();
    } else if (pos.toLowerCase().endsWith(' role')) {
      pos = pos.slice(0, -5).trim();
    }
    return pos;
  }, [jobTitle]);

  useEffect(() => {
    if (open && candidate) {
      setMessage(`Hi ${candidateName}\nRegarding: ${formattedJobPosition} position\n`);
    }
  }, [open, candidate, candidateName, formattedJobPosition]);
  const phoneValid = Boolean(smsPhoneTarget && isValidSmsPhoneTarget(smsPhoneTarget));

  const handleSend = async () => {
    const text = message.trim();
    if (!text) {
      showToast({ message: 'Message is required', type: 'error' });
      return;
    }
    if (!smsPhoneTarget || !isValidSmsPhoneTarget(smsPhoneTarget)) {
      showToast({
        message: `Phone number must be exactly ${SMS_NATIONAL_DIGIT_COUNT} digits to send SMS.`,
        type: 'error',
      });
      return;
    }
    const cid = candidate?.id != null ? Number(candidate.id) : NaN;
    if (!Number.isFinite(cid) || cid <= 0) {
      showToast({ message: 'Candidate is missing', type: 'error' });
      return;
    }
    if (!jobOpeningId) {
      showToast({ message: 'Job opening is missing', type: 'error' });
      return;
    }
    try {
      await sendSms({
        candidateId: cid,
        jobOpeningId,
        messageText: text,
      }).unwrap();
      const phoneLabel = phoneDisplay || smsPhoneTarget;
      showToast({
        message: `SMS Sent successfully to ${candidateName} on ${phoneLabel}`,
        type: 'success',
      });
      onClose();
    } catch (e) {
      showToast({ message: rtkErrorMessage(e), type: 'error' });
    }
  };

  return (
    <Drawer
      title={
        <span className="pr-8 text-base font-bold text-[#1a1a1a]">
          Send SMS - {jobTitle || 'Candidate'}
        </span>
      }
      placement="bottom"
      /** Room for header + message field + footer; dvh avoids mobile browser chrome eating vh */
      height="min(460px, 70dvh)"
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
          disabled={isSending || !phoneValid}
          className="w-full rounded-full bg-primary py-2 text-center text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-60"
        >
          {isSending ? 'SENDING…' : 'SEND SMS'}
        </Button>
      }
      styles={{
        /** Panel fills wrapper height; margin lifts the whole sheet off the screen edge (not truncated) */
        wrapper: {
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'none',
          marginBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        },
        /** Bottom sheet anchored to the viewport bottom-right (rises toward the header) */
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
          /** Keep scroll in the body; outer `overflow: auto` can clip the flex layout on short heights */
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
      className="send-sms-candidate-drawer send-sms-drawer--bottom-right"
    >
      <Form layout="vertical" requiredMark={false} className="pb-0">
        <Form.Item
          className="mb-2"
          label={
            <span className="text-gray-800">
              To <span className="required-asterisk">*</span>
            </span>
          }
        >
          <div
            className={`flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm ${
              phoneValid ? 'border-gray-300' : 'border-red-300'
            }`}
          >
            <span className="min-w-0 truncate font-medium text-[#1a1a1a]">{candidateName}</span>
            <span
              className={`shrink-0 text-right ${phoneValid ? 'text-gray-500' : 'text-red-600'}`}
            >
              {phoneDisplay || smsPhoneTarget || '—'}
            </span>
          </div>
          {!phoneValid ? (
            <p className="mt-1 text-xs text-red-600">
              Phone number is missing or invalid. Mobile number must be exactly{' '}
              {SMS_NATIONAL_DIGIT_COUNT} digits.
            </p>
          ) : null}
        </Form.Item>

        <Form.Item
          className="mb-4"
          label={
            <span className="text-gray-800">
              Message <span className="required-asterisk">*</span>
            </span>
          }
        >
          <TextArea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            showCount={{
              formatter: ({ count, maxLength }) => `${count} / ${maxLength ?? 1000}`,
            }}
            placeholder="Type your SMS"
            rows={6}
            className="resize-none rounded-lg text-sm min-h-[140px]"
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default SendSmsToCandidateModal;
