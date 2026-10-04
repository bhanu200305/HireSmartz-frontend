import { useEffect, useState } from 'react';
import TextArea from 'antd/es/input/TextArea';
import {
  useSendBulkCandidateSmsMutation,
  usePreviewCandidateSmsMutation,
} from '../../../../api/candidate-service/Candidates/messaging';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';
import { Button, Input, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import TemplatePreviewModal from '../../../shared/ui/TemplatePreviewModal';
import type { CandidateView } from '../../../../api/candidate-service/Candidates/CandidateLifecycle';
import { toTitleCase } from './smsHelpers';

const SMS_MAX_LEN = 160;

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
  const [messageError, setMessageError] = useState<string | null>(null);
  const [sendBulkSms, { isLoading: isSending }] = useSendBulkCandidateSmsMutation();
  const [previewSms, { data: preview, isLoading: isPreviewing }] = usePreviewCandidateSmsMutation();
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
  const isFormValid = message.trim().length > 0;

  useEffect(() => {
    if (open) {
      // Prefilled with a greeting instead of left blank — the recruiter
      // still edits/replaces it before sending, but starting from "Hi
      // <Name>," means the candidate reliably gets addressed by name
      // without the recruiter having to remember to type it themselves.
      const firstName = toTitleCase(candidates[0]?.first_name ?? '');
      setMessage(firstName ? `Hi ${firstName}, ` : '');
      setResults([]);
      setIsPreviewOpen(false);
      setMessageError(null);
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

  const handleSend = async () => {
    const text = message.trim();
    if (!text) {
      showToast({ message: 'Message is required', type: 'error' });
      return;
    }
    if (candidates.length === 0) return;

    setMessageError(null);
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
      const message = getCandidateErrorMessage(e, 'Could not send SMS');
      setMessageError(message);
      showToast({ message, type: 'error' });
    }
  };

  return (
    <>
      <AntdCommonModal
        open={open}
        onClose={onClose}
        title={isSingleCandidate ? 'Send SMS' : 'Send SMS - Bulk SMS'}
        modalProps={{ width: 640 }}
      >
        <div className="flex flex-col gap-4">
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
              <label htmlFor="bulk-sms-message" className="mb-1 block text-sm text-gray-800">
                Message <span className="required-asterisk">*</span>
              </label>
              <TextArea
                id="bulk-sms-message"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (messageError) setMessageError(null);
                }}
                maxLength={SMS_MAX_LEN}
                showCount={{
                  formatter: ({ count, maxLength }) => `${count} / ${maxLength ?? SMS_MAX_LEN}`,
                }}
                placeholder="Type your SMS"
                rows={4}
                className="resize-y rounded-lg text-sm min-h-[100px]"
              />
              {messageError && <p className="text-red-500 text-sm px-2 py-1">{messageError}</p>}
              <p className="text-xs text-gray-400 px-2 py-1">
                Do not include discriminatory, abusive, or hateful language.
              </p>
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
          {results.length === 0 ? (
            <div className="flex gap-3">
              {canPreview && (
                <Button
                  type="button"
                  onClick={() => void handlePreview()}
                  disabled={isPreviewing || isSending || !isFormValid}
                  className="rounded-full border border-gray-300 px-5 py-2.5 text-center text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {isPreviewing ? 'Loading…' : 'Preview'}
                </Button>
              )}
              <Button
                type="button"
                onClick={() => void handleSend()}
                disabled={candidates.length === 0 || isSending || !isFormValid}
                className="flex-1 rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSending ? 'Sending…' : 'Send SMS'}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              onClick={onClose}
              className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-white"
            >
              Done
            </Button>
          )}
        </div>
      </AntdCommonModal>
      <TemplatePreviewModal
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        isLoading={isPreviewing}
        preview={preview}
      />
    </>
  );
};

export default BulkSendSmsModal;
