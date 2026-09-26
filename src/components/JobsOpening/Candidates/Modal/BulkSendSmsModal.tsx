import { useEffect, useState } from 'react';
import { Drawer } from 'antd';
import { IoClose, IoSparklesOutline } from 'react-icons/io5';
import TextArea from 'antd/es/input/TextArea';
import {
  useSendBulkCandidateSmsMutation,
  useGenerateSmsContentMutation,
  usePreviewCandidateSmsMutation,
} from '../../../../api/candidate-service/Candidates/messaging';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';
import { Button, Input, showToast } from '../../../shared';
import TemplatePreviewModal from '../../../shared/ui/TemplatePreviewModal';
import type { CandidateView } from '../../../../api/candidate-service/Candidates/CandidateLifecycle';
import { toTitleCase } from './smsHelpers';

const SMS_MAX_LEN = 160;
// POST /candidates/{candidate_id}/messages/sms/generate — one candidate
// only, no bulk variant on the real backend (messaging.ts's own note).
// Uses the FIRST selected candidate as the drafting basis when several are
// selected; the result is a generic suggested body, not personalized per
// recipient, same as the message box itself already isn't.
const AI_INTENT_MAX_LEN = 2000;

// Rewritten against candidate-service's real
// `POST /candidates/messages/sms/bulk` — a candidate with no phone/consent
// is silently SKIPPED by the backend, not rejected client-side up front
// (FRONTEND_INTEGRATION_DETAILS.md §4.9). Rather than re-deriving the old
// client-side phone-format validation (candidate-service's `CandidateView`
// has one plain `contact_no` string, not the legacy split
// countryCode/phoneNumber pair the old validator assumed), this shows the
// server's own `skipped_reason` per candidate after sending — the
// documented source of truth, not a client-side guess. Sole consumer is
// `CandidatesListing.tsx` — safe to replace in place.

type BulkSendSmsModalProps = {
  open: boolean;
  onClose: () => void;
  /** All candidates currently selected in the floating bar. */
  candidates: CandidateView[];
};

const candidateDisplayName = (c: CandidateView) =>
  `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Candidate';

const BulkSendSmsModal = ({ open, onClose, candidates }: BulkSendSmsModalProps) => {
  const [message, setMessage] = useState('');
  const [results, setResults] = useState<{ name: string; sent: boolean; reason: string | null }[]>(
    []
  );
  const [sendBulkSms, { isLoading: isSending }] = useSendBulkCandidateSmsMutation();
  const [generateSmsContent, { isLoading: isGenerating }] = useGenerateSmsContentMutation();
  const [previewSms, { data: preview, isLoading: isPreviewing }] = usePreviewCandidateSmsMutation();
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  const [aiIntent, setAiIntent] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  // The real preview endpoint (`POST /candidates/{id}/messages/sms/preview`)
  // is single-candidate only, same as email's — offer it only when exactly
  // one recipient is selected.
  const canPreview = candidates.length === 1;
  // CandidateDetails.tsx (the single candidate's own page) always opens this
  // with exactly one candidate — "Bulk SMS" and "1 Candidate Selected" read
  // like a leftover multi-select when there was never anything to select.
  // CandidatesListing.tsx's real multi-select bulk send keeps the bulk
  // copy; this only changes for the single-candidate case.
  const isSingleCandidate = candidates.length === 1;

  useEffect(() => {
    if (open) {
      // Prefilled with a greeting instead of left blank — the recruiter
      // still edits/replaces it before sending, but starting from "Hi
      // <Name>," means the candidate reliably gets addressed by name
      // without the recruiter having to remember to type it themselves.
      const firstName = toTitleCase(candidates[0]?.first_name ?? '');
      setMessage(firstName ? `Hi ${firstName}, ` : '');
      setResults([]);
      setShowAiPrompt(false);
      setAiIntent('');
      setIsPreviewOpen(false);
    }
  }, [open]);

  const handlePreview = async () => {
    const target = candidates[0];
    const text = message.trim();
    if (!target || !text) {
      showToast({ message: 'Message is required', type: 'error' });
      return;
    }
    try {
      await previewSms({ candidateId: target.id, body: { smsBody: text } }).unwrap();
      setIsPreviewOpen(true);
    } catch (e) {
      showToast({ message: getCandidateErrorMessage(e, 'Could not build preview'), type: 'error' });
    }
  };

  const handleGenerate = async () => {
    const intent = aiIntent.trim();
    if (!intent) {
      showToast({ message: 'Describe what the message should say', type: 'error' });
      return;
    }
    const basisCandidate = candidates[0];
    if (!basisCandidate) return;
    try {
      const res = await generateSmsContent({
        candidateId: basisCandidate.id,
        body: { intent },
      }).unwrap();
      // The AI draft is generic, not personalized — same greeting-by-name
      // guarantee as the initial prefill above, so switching to "Generate
      // with AI" never drops the name the recruiter already had in the box.
      const firstName = toTitleCase(basisCandidate.first_name ?? '');
      const needsGreeting =
        firstName && !res.message.toLowerCase().includes(firstName.toLowerCase());
      const generated = needsGreeting ? `Hi ${firstName}, ${res.message}` : res.message;
      setMessage(generated.slice(0, SMS_MAX_LEN));
      setShowAiPrompt(false);
    } catch (e) {
      showToast({
        message: getCandidateErrorMessage(e, 'Could not generate a draft'),
        type: 'error',
      });
    }
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!text) {
      showToast({ message: 'Message is required', type: 'error' });
      return;
    }
    if (candidates.length === 0) return;

    try {
      const res = await sendBulkSms({
        candidateIds: candidates.map((c) => c.id),
        smsBody: text,
      }).unwrap();

      const byId = new Map(candidates.map((c) => [c.id, c]));
      setResults(
        res.results.map((r) => ({
          name: candidateDisplayName(byId.get(r.candidate_id) ?? ({} as CandidateView)),
          sent: r.sent,
          reason: r.skipped_reason,
        }))
      );

      const sentCount = res.results.filter((r) => r.sent).length;
      showToast({
        message:
          sentCount === res.results.length
            ? `SMS sent to ${sentCount} candidate${sentCount === 1 ? '' : 's'}.`
            : `SMS sent to ${sentCount} of ${res.results.length}; see skipped reasons below.`,
        type: sentCount > 0 ? 'success' : 'warning',
      });
    } catch (e) {
      showToast({ message: getCandidateErrorMessage(e, 'Could not send SMS'), type: 'error' });
    }
  };

  return (
    <Drawer
      title={
        <span className="pr-8 text-base font-bold text-gray-900">
          {isSingleCandidate ? 'Send SMS' : 'Send SMS - Bulk SMS'}
        </span>
      }
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
        results.length === 0 ? (
          <div className="flex gap-3">
            {canPreview && (
              <Button
                type="button"
                onClick={() => void handlePreview()}
                disabled={isPreviewing || isSending}
                className="rounded-full border border-gray-300 px-5 py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                {isPreviewing ? 'LOADING…' : 'PREVIEW'}
              </Button>
            )}
            <Button
              type="button"
              onClick={() => void handleSend()}
              disabled={candidates.length === 0 || isSending}
              className="flex-1 rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
            >
              {isSending ? 'SENDING…' : 'SEND SMS'}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white"
          >
            DONE
          </Button>
        )
      }
      className="bulk-send-sms-drawer send-sms-drawer--bottom-right"
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="bulk-sms-recipients" className="mb-1 block text-sm text-gray-800">
            To Recipients <span className="required-asterisk">*</span>
          </label>
          <Input
            id="bulk-sms-recipients"
            readOnly
            value={
              isSingleCandidate
                ? candidateDisplayName(candidates[0])
                : `${candidates.length} Candidates Selected`
            }
            className="h-10 rounded-lg border border-gray-300 bg-gray-50 text-sm text-gray-900"
          />
        </div>

        {results.length === 0 ? (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="bulk-sms-message" className="block text-sm text-gray-800">
                Message <span className="required-asterisk">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAiPrompt((prev) => !prev)}
                className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline bg-transparent border-0 cursor-pointer p-0"
              >
                <IoSparklesOutline size={14} /> Generate with AI
              </button>
            </div>

            {showAiPrompt && (
              <div className="mb-2 rounded-lg border border-primary-100 bg-primary-50/40 p-2.5">
                <label htmlFor="bulk-sms-ai-intent" className="mb-1 block text-xs text-gray-600">
                  What should this message say?
                </label>
                <div className="flex items-start gap-2">
                  <TextArea
                    id="bulk-sms-ai-intent"
                    value={aiIntent}
                    onChange={(e) => setAiIntent(e.target.value)}
                    maxLength={AI_INTENT_MAX_LEN}
                    placeholder="e.g. Remind them to bring a photo ID to the interview"
                    rows={2}
                    className="resize-y rounded-lg text-sm"
                  />
                  <Button
                    type="button"
                    onClick={() => void handleGenerate()}
                    disabled={isGenerating || !aiIntent.trim()}
                    className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white disabled:opacity-50"
                  >
                    {isGenerating ? '…' : 'Draft'}
                  </Button>
                </div>
              </div>
            )}

            <TextArea
              id="bulk-sms-message"
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
        ) : (
          <div>
            <div className="mb-2 block text-sm font-medium text-gray-800">Results</div>
            <div className="flex max-h-[min(280px,50vh)] flex-col gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
              {results.map((r, i) => (
                <div key={i} className="flex items-start justify-between gap-3 text-sm">
                  <span className="font-medium text-gray-900">{r.name}</span>
                  {r.sent ? (
                    <span className="text-green-600 shrink-0">Sent</span>
                  ) : (
                    <span className="text-red-500 text-right shrink-0">
                      Skipped{r.reason ? `: ${r.reason}` : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <TemplatePreviewModal
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        isLoading={isPreviewing}
        preview={preview}
      />
    </Drawer>
  );
};

export default BulkSendSmsModal;
