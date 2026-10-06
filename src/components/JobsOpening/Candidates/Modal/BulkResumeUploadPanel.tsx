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
// No change in parsed_files for this long: stop spinning and tell the user the
// rest is still being processed in the background.
const STALL_TIMEOUT_MS = 2 * 60 * 1000;
// Consecutive failed progress requests before treating the batch the same way.
const MAX_FAILED_POLLS = 3;

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

  // The batch whose screen was given up on (no progress for STALL_TIMEOUT_MS,
  // or the progress request kept failing). Keyed by batch id so a new upload
  // starts clean.
  const [stalledBatchId, setStalledBatchId] = useState<string | null>(null);
  const isStalled = !!batchId && stalledBatchId === batchId;
  const failedPollsRef = useRef(0);

  // Declared before the query so the polling interval can depend on it; set
  // from the query result below.
  const [isFinished, setIsFinished] = useState(false);

  const {
    data: batchProgress,
    error: pollError,
    fulfilledTimeStamp,
  } = useGetBatchProgressQuery(batchId ?? '', {
    skip: !batchId,
    // Stops once the batch is done or given up on.
    pollingInterval: batchId && !isFinished && !isStalled ? POLL_INTERVAL_MS : 0,
  });

  // Done on ANY real completion signal: the batch's own status, no uploaded
  // item with a candidate left to parse, or every valid file parsed.
  const items = batchProgress?.items ?? [];
  const finished =
    !!batchId &&
    !!batchProgress &&
    (batchProgress.status === 'completed' ||
      (items.length > 0 && !items.some((i) => i.candidate_id && i.status === 'uploaded')) ||
      batchProgress.parsed_files >= batchProgress.valid_files);
  useEffect(() => {
    setIsFinished(finished);
  }, [finished]);
  const isProcessing = !!batchId && !finished && !isStalled;
  const failedItems = items.filter((i) => i.status === 'failed');

  // A poll that keeps failing is treated like a stall (not "Starting…" forever).
  useEffect(() => {
    failedPollsRef.current = 0;
  }, [fulfilledTimeStamp]);
  useEffect(() => {
    if (!pollError || !batchId) return;
    failedPollsRef.current += 1;
    if (failedPollsRef.current >= MAX_FAILED_POLLS) setStalledBatchId(batchId);
  }, [pollError, batchId]);

  // No change in `parsed_files` for STALL_TIMEOUT_MS: stop spinning. Re-armed
  // whenever the count moves (and from the start, so a batch that never reports
  // anything is covered too).
  const parsedFiles = batchProgress?.parsed_files;
  useEffect(() => {
    if (!batchId || finished || isStalled) return;
    const timer = setTimeout(() => setStalledBatchId(batchId), STALL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [batchId, parsedFiles, finished, isStalled]);

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

  // Holds the pending auto-close timer's id, not local effect state — see
  // the unmount-only cleanup and the completion effect below for why it
  // can't be a plain `const timer = setTimeout(...); return () =>
  // clearTimeout(timer)` inside that effect.
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancels a still-pending auto-close timer only when this panel actually
  // unmounts (parent modal closed some other way, or navigated away) —
  // deliberately NOT tied to the completion effect's own re-runs, which is
  // exactly the bug this used to have when the timer lived in that effect's
  // cleanup instead: see the comment below.
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Once parsing finishes: tell the parent so it can refetch the candidate
  // list (guarded by completedBatchId so this fires exactly once per batch,
  // not on every 3s poll after done), then close the parent modal on its own
  // after a brief delay — the "Done" message above is enough of a hand-off,
  // no need to make the user click away themselves, but it should still be
  // readable for a moment before it disappears.
  //
  // The timer id lives in `closeTimerRef`, not this effect's own `return ()
  // => clearTimeout(timer)` cleanup. Polling keeps running for the full
  // AUTO_CLOSE_DELAY_MS window (nothing stops it until the timer below
  // itself clears batchId), so `batchProgress` keeps getting a new object
  // identity every ~3s tick even after completion — re-running this effect.
  // The completedBatchId guard above already makes every one of those
  // re-runs a no-op before reaching the timer, but a `clearTimeout`
  // returned as THIS effect's cleanup runs on every re-run regardless of
  // the guard (React always runs the previous cleanup before the next
  // effect body, whether or not that body does anything) — it cancelled
  // the correct, already-scheduled timer, and with the guard now blocking
  // a replacement, nothing ever rescheduled it: onDone() never fired, so
  // the "Done, you can close this now." message just sat there forever.
  //
  // Only a batch where everything succeeded closes itself. One with failed
  // files, or one given up on, stays open (with its list / message) until the
  // user presses Close; the list is refreshed either way.
  useEffect(() => {
    if (!batchId || isProcessing || completedBatchId === batchId) return;
    if (!finished && !isStalled) return;
    onCompletedRef.current();
    setCompletedBatchId(batchId);
    if (finished && failedItems.length === 0) {
      closeTimerRef.current = setTimeout(() => {
        setFiles([]);
        setBatchId(null);
        onDoneRef.current();
      }, AUTO_CLOSE_DELAY_MS);
    }
  }, [batchId, isProcessing, finished, isStalled, failedItems.length, completedBatchId]);

  const handleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setFiles([]);
    setBatchId(null);
    onDoneRef.current();
  };

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
        {isProcessing && <Spin size="large" />}
        {(batchProgress || isProcessing) && (
          <p className="text-sm text-gray-600 text-center">
            {batchProgress
              ? `Processed ${batchProgress.parsed_files} of ${batchProgress.valid_files} resume(s)${isProcessing ? '…' : '.'}`
              : 'Starting…'}
          </p>
        )}
        {finished && (
          <p className="text-sm font-semibold text-green-600">Done, you can close this now.</p>
        )}
        {!finished && isStalled && (
          <p className="text-sm text-center text-gray-600">
            Some resumes are still being processed in the background. You can close this and check
            the candidate list shortly.
          </p>
        )}
        {finished && failedItems.length > 0 && (
          <div className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="mb-1 text-sm font-semibold text-red-700">
              {failedItems.length === 1
                ? '1 resume could not be added:'
                : `${failedItems.length} resumes could not be added:`}
            </p>
            <ul className="m-0 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-xs text-red-700">
              {failedItems.map((item, i) => (
                <li key={`${item.filename}-${i}`}>
                  <span className="font-semibold">{item.filename}</span>
                  {item.error_message ? `: ${item.error_message}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
        {(isStalled || (finished && failedItems.length > 0)) && (
          <Button
            type="button"
            onClick={handleClose}
            className="mt-1 w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-white"
          >
            CLOSE
          </Button>
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
        className="mt-4 w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-white disabled:opacity-50"
      >
        {isUploading ? 'Uploading…' : `UPLOAD (${files.length})`}
      </Button>
    </div>
  );
};

export default BulkResumeUploadPanel;
