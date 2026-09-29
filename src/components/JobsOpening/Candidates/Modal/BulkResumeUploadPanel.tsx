import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Upload } from 'antd';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { FiUploadCloud } from 'react-icons/fi';
import { Button, showToast } from '../../../shared';
import { useSessionTenantId } from '../../../../hooks/useSessionTenantId';
import {
  useBulkUploadResumesMutation,
  useGetBatchProgressQuery,
} from '../../../../api/candidate-service/Candidates/CandidateLifecycle';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';

// The bulk-resume side of Add Candidate's "Bulk Import Resume" tab — same
// `POST /candidates/bulk-resume` (up to 30 files, invalid ones rejected
// synchronously and listed in `invalid_files`) + polled
// `GET /candidates/batches/{batch_id}` (FRONTEND_INTEGRATION_DETAILS.md
// §4.2) the standalone "Upload Resume" button used to open in its own
// modal. Extracted from that modal (formerly UploadCvModal) into a plain
// content panel — no backdrop, no own header/close button — since it now
// renders INSIDE AddCandidateModal's own AntdCommonModal chrome instead of
// popping its own. `onDone` is that reason: the old modal closed itself on
// a timer once parsing finished; this one instead tells the PARENT modal to
// close, so the same "batch finished, hand back to the list" UX survives
// the move.

const MAX_FILES = 30;
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE_MB = 5;
const POLL_INTERVAL_MS = 3000;
const AUTO_CLOSE_DELAY_MS = 1500;

type BulkResumeUploadPanelProps = {
  /** Fires once parsing finishes (not merely once the files are accepted) —
   * the parent's cue to refetch its candidate list. Same timing UploadCvModal
   * used to hand back via its own `onCompleted`. */
  onCompleted: () => void;
  /** Fires after the same post-completion delay the old modal used before
   * closing itself — now closes the PARENT (AddCandidateModal) instead. */
  onDone: () => void;
};

const BulkResumeUploadPanel = ({ onCompleted, onDone }: BulkResumeUploadPanelProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [completedBatchId, setCompletedBatchId] = useState<string | null>(null);

  const { id: jobOpeningId } = useParams<{ id: string }>();
  const tenantId = useSessionTenantId();
  const [bulkUploadResumes, { isLoading: isUploading }] = useBulkUploadResumesMutation();

  const { data: batchProgress } = useGetBatchProgressQuery(batchId ?? '', {
    skip: !batchId,
    pollingInterval: batchId ? POLL_INTERVAL_MS : 0,
  });

  const isProcessing =
    !!batchId && !!batchProgress && batchProgress.parsed_files < batchProgress.valid_files;

  // `onCompleted`/`onDone` come from `AddCandidateModal` as inline
  // functions (`onDone={handleClose}`, `onCompleted={() =>
  // onBulkImportCompleted?.()}`), neither wrapped in `useCallback` — so
  // they get a new reference on literally every render of that modal, for
  // any reason, not just ones related to this panel. Kept out of the
  // effect below via refs (updated every render, but never a dependency)
  // rather than put directly in its dependency array: `onCompleted` itself
  // calls `refetch()` on the candidate list, which re-renders the modal,
  // which changes `onDone`'s identity — if that identity were a
  // dependency, the effect would re-run, its cleanup would cancel the
  // pending auto-close timer below, and the `completedBatchId === batchId`
  // guard would then block scheduling a new one, since as far as this
  // effect can tell, "the completion already happened." The result: the
  // "Done" message shows (it isn't gated on this effect), but the modal
  // never actually closes on its own — exactly the reported symptom,
  // reliably reproducible any time something else in the tree happens to
  // re-render this modal in the 1.5s window, which real usage's live
  // polling/notification queries elsewhere on the page make routine.
  const onCompletedRef = useRef(onCompleted);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onCompletedRef.current = onCompleted;
    onDoneRef.current = onDone;
  });

  // Once parsing finishes: tell the parent so it can refetch the candidate
  // list (guarded by completedBatchId so this fires exactly once per batch,
  // not on every 3s poll after done), then close the parent modal on its own
  // after a brief delay — the "Done" message above is enough of a hand-off,
  // no need to make the user click away themselves, but it should still be
  // readable for a moment before it disappears.
  useEffect(() => {
    if (!batchId || !batchProgress || isProcessing || completedBatchId === batchId) return;
    onCompletedRef.current();
    setCompletedBatchId(batchId);
    const timer = setTimeout(() => {
      setFiles([]);
      setBatchId(null);
      onDoneRef.current();
    }, AUTO_CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [batchId, batchProgress, isProcessing, completedBatchId]);

  const handleFileSelect = (selectedFiles: File[]) => {
    const accepted: File[] = [];
    for (const f of selectedFiles) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        showToast({ message: `${f.name} is not a valid file type.`, type: 'error' });
        continue;
      }
      if (f.size / 1024 / 1024 > MAX_SIZE_MB) {
        showToast({ message: `${f.name} exceeds ${MAX_SIZE_MB}MB size limit.`, type: 'error' });
        continue;
      }
      accepted.push(f);
    }
    setFiles((prev) => [...prev, ...accepted]);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      showToast({ message: 'Please select at least one file to upload.', type: 'error' });
      return;
    }
    if (files.length > MAX_FILES) {
      showToast({ message: `You can upload a maximum of ${MAX_FILES} files.`, type: 'error' });
      return;
    }
    if (!jobOpeningId || !tenantId) {
      showToast({ message: 'Job opening or organization is missing.', type: 'error' });
      return;
    }

    try {
      const res = await bulkUploadResumes({
        organizationId: tenantId,
        jobOpeningId,
        files,
      }).unwrap();

      showToast({
        message: `${res.valid_files} of ${res.total_files} resume(s) accepted and are being processed.`,
        type: 'success',
      });
      if (res.invalid_files.length > 0) {
        showToast({
          message: `Rejected: ${res.invalid_files.map((f) => `${f.filename} (${f.reason})`).join(', ')}`,
          type: 'error',
        });
      }

      setFiles([]);
      if (res.valid_files > 0) {
        // Keep the panel mounted, tracking parse progress, rather than
        // closing immediately — ai-service parsing 30 resumes isn't instant
        // (FRONTEND_INTEGRATION_DETAILS.md §4.2's own "poll, don't assume a
        // fixed completion time").
        setBatchId(res.batch_id);
        setCompletedBatchId(null);
      } else {
        onDone();
      }
    } catch (error) {
      showToast({
        message: getCandidateErrorMessage(error, 'An error occurred while uploading resumes.'),
        type: 'error',
      });
    }
  };

  if (batchId) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Spin size="large" />
        <p className="text-sm text-gray-600 text-center">
          {batchProgress
            ? `Processed ${batchProgress.parsed_files} of ${batchProgress.valid_files} resume(s)…`
            : 'Starting…'}
        </p>
        {!isProcessing && batchProgress && (
          <p className="text-sm font-semibold text-green-600">Done, you can close this now.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Upload.Dragger
        multiple
        beforeUpload={(file) => {
          handleFileSelect([file]);
          return Upload.LIST_IGNORE;
        }}
        fileList={[]}
        showUploadList={false}
      >
        <div className="flex flex-col items-center py-2">
          <FiUploadCloud size={28} className="mb-1 text-primary" />
          <p className="text-xs text-gray-500">Click to upload or drag files here</p>
          <p className="text-xs text-gray-400">
            PDF or DOCX, max {MAX_SIZE_MB}MB each, up to {MAX_FILES} files
          </p>
        </div>
      </Upload.Dragger>

      {files.length > 0 && (
        <div className="mt-3 max-h-40 overflow-y-auto border rounded p-2">
          {files.map((f, i) => (
            <div key={i} className="flex justify-between items-center text-sm text-green-600 mb-1">
              <span className="truncate">{f.name}</span>
              <RiDeleteBin6Line
                className="ml-2 shrink-0 cursor-pointer text-red-500"
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
              />
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        onClick={() => void handleUpload()}
        disabled={files.length === 0 || isUploading}
        className="mt-4 w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-50"
      >
        {isUploading ? 'UPLOADING…' : `UPLOAD (${files.length})`}
      </Button>
    </div>
  );
};

export default BulkResumeUploadPanel;
