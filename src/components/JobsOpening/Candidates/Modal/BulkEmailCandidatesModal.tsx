import { useEffect, useState } from 'react';
import TextArea from 'antd/es/input/TextArea';
import {
  useSendBulkCandidateEmailMutation,
  usePreviewCandidateEmailMutation,
} from '../../../../api/candidate-service/Candidates/messaging';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';
import { Button, Input, showToast } from '../../../shared';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import TemplatePreviewModal from '../../../shared/ui/TemplatePreviewModal';
import type { CandidateView } from '../../../../api/candidate-service/Candidates/CandidateLifecycle';

// New — candidate-service's own bulk email
// (`POST /candidates/messages/email/bulk`) has no legacy equivalent to
// rewire; the old `SendEmailToCandidateModal` (1230 lines, still used by
// `CandidateDetails.tsx`) modeled an entirely different, richer
// template/merge-field system against a now-nonexistent endpoint — kept
// separate rather than replaced in place for the same reason as
// `BulkEmailCandidatesModal`'s sibling components in this folder. Unlike
// SMS, there is no bulk email preview endpoint on the real contract (only
// the single-candidate `POST /candidates/{id}/messages/email/preview`) —
// this composes and sends directly, same "no per-candidate cap documented
// beyond min_length=1" caveat FRONTEND_INTEGRATION_DETAILS.md §4.9 flags.
// Preview is offered only when exactly one candidate is selected (the only
// shape the real preview endpoint supports) — reuses the same sandboxed
// `TemplatePreviewModal` notification-service's own template editor uses,
// since `CandidateMessagePreviewResponse` is structurally the same shape as
// `TemplatePreview`.

type BulkEmailCandidatesModalProps = {
  open: boolean;
  onClose: () => void;
  candidates: CandidateView[];
};

const candidateDisplayName = (c: CandidateView) =>
  `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Candidate';

const BulkEmailCandidatesModal = ({ open, onClose, candidates }: BulkEmailCandidatesModalProps) => {
  const [subject, setSubject] = useState('');
  const [header, setHeader] = useState('');
  const [body, setBody] = useState('');
  const [results, setResults] = useState<{ name: string; sent: boolean; reason: string | null }[]>(
    []
  );
  const [sendBulkEmail, { isLoading: isSending }] = useSendBulkCandidateEmailMutation();
  const [previewEmail, { data: preview, isLoading: isPreviewing }] =
    usePreviewCandidateEmailMutation();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const canPreview = candidates.length === 1;

  useEffect(() => {
    if (open) {
      setSubject('');
      setHeader('');
      setBody('');
      setResults([]);
      setIsPreviewOpen(false);
    }
  }, [open]);

  const handlePreview = async () => {
    const target = candidates[0];
    if (!target || !subject.trim() || !body.trim()) {
      showToast({ message: 'Subject and message body are required', type: 'error' });
      return;
    }
    try {
      await previewEmail({
        candidateId: target.id,
        body: { subject: subject.trim(), header: header.trim() || undefined, body: body.trim() },
      }).unwrap();
      setIsPreviewOpen(true);
    } catch (e) {
      showToast({ message: getCandidateErrorMessage(e, 'Could not build preview'), type: 'error' });
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      showToast({ message: 'Subject and message body are required', type: 'error' });
      return;
    }
    if (candidates.length === 0) return;

    try {
      const res = await sendBulkEmail({
        candidateIds: candidates.map((c) => c.id),
        subject: subject.trim(),
        header: header.trim() || undefined,
        body: body.trim(),
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
            ? `Email sent to ${sentCount} candidate${sentCount === 1 ? '' : 's'}.`
            : `Email sent to ${sentCount} of ${res.results.length} — see skipped reasons below.`,
        type: sentCount > 0 ? 'success' : 'warning',
      });
    } catch (e) {
      showToast({ message: getCandidateErrorMessage(e, 'Could not send email'), type: 'error' });
    }
  };

  return (
    <>
      <AntdCommonModal
        open={open}
        onClose={onClose}
        title="Send Email"
        subtitle={`${candidates.length} candidate${candidates.length === 1 ? '' : 's'} selected`}
        modalProps={{ width: 640 }}
      >
        {results.length === 0 ? (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="bulk-email-subject" className="mb-1 block text-sm text-gray-800">
                Subject <span className="required-asterisk">*</span>
              </label>
              <Input
                id="bulk-email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="h-10 rounded-lg border border-gray-300 text-sm"
              />
            </div>
            <div>
              <label htmlFor="bulk-email-header" className="mb-1 block text-sm text-gray-800">
                Header (optional)
              </label>
              <Input
                id="bulk-email-header"
                value={header}
                onChange={(e) => setHeader(e.target.value)}
                placeholder="e.g. Hi {{candidate_first_name}}"
                className="h-10 rounded-lg border border-gray-300 text-sm"
              />
            </div>
            <div>
              <label htmlFor="bulk-email-body" className="mb-1 block text-sm text-gray-800">
                Message <span className="required-asterisk">*</span>
              </label>
              <TextArea
                id="bulk-email-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Type your message"
                rows={8}
                className="resize-y rounded-lg text-sm"
              />
            </div>
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
                {isSending ? 'SENDING…' : 'SEND EMAIL'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex max-h-[min(320px,55vh)] flex-col gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3">
              {results.map((r, i) => (
                <div key={i} className="flex items-start justify-between gap-3 text-sm">
                  <span className="font-medium text-gray-900">{r.name}</span>
                  {r.sent ? (
                    <span className="text-green-600 shrink-0">Sent</span>
                  ) : (
                    <span className="text-red-500 text-right shrink-0">
                      Skipped{r.reason ? ` — ${r.reason}` : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              onClick={onClose}
              className="w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white"
            >
              DONE
            </Button>
          </div>
        )}
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

export default BulkEmailCandidatesModal;
