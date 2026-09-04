import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Upload } from 'antd';
import { MdClose } from 'react-icons/md';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { FiUploadCloud } from 'react-icons/fi';
import { Button, showToast } from '../../../shared';
import { useSessionTenantId } from '../../../../hooks/useSessionTenantId';
import {
  useBulkUploadResumesMutation,
  useGetBatchProgressQuery,
} from '../../../../api/candidate-service/Candidates/CandidateLifecycle';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';

// Rewritten against candidate-service's real `POST /candidates/bulk-resume`
// (up to 30 files, invalid ones rejected synchronously and listed in
// `invalid_files`) + polled `GET /candidates/batches/{batch_id}`
// (FRONTEND_INTEGRATION_DETAILS.md §4.2) — replaces the legacy
// `extractMultipleResumes` call against a now-nonexistent endpoint. Polls
// via RTK Query's own `pollingInterval` instead of the legacy SSE stream
// (`/candidate/extract/progress`), which candidate-service has no
// equivalent for — it's a plain polled GET, not a push stream. Sole
// consumer is `CandidatesListing.tsx` — safe to replace in place.

interface UploadCvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

const MAX_FILES = 30;
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE_MB = 5;
const POLL_INTERVAL_MS = 3000;

const UploadCvModal = ({ isOpen, onClose, onCompleted }: UploadCvModalProps) => {
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

  useEffect(() => {
    if (batchId && batchProgress && !isProcessing && completedBatchId !== batchId) {
      onCompleted();
      setCompletedBatchId(batchId);
    }
  }, [batchId, batchProgress, completedBatchId, isProcessing, onCompleted]);

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
        // Keep the modal open, tracking parse progress, rather than closing
        // immediately — ai-service parsing 30 resumes isn't instant
        // (FRONTEND_INTEGRATION_DETAILS.md §4.2's own "poll, don't assume a
        // fixed completion time").
        setBatchId(res.batch_id);
        setCompletedBatchId(null);
      } else {
        onClose();
      }
    } catch (error) {
      showToast({
        message: getCandidateErrorMessage(error, 'An error occurred while uploading resumes.'),
        type: 'error',
      });
    }
  };

  const handleClose = () => {
    setFiles([]);
    setBatchId(null);
    setCompletedBatchId(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="flex flex-col justify-center bg-white p-6 rounded-xl w-[500px] relative">
        <h2 className="text-xl font-bold text-center mb-6">Upload Resumes</h2>

        {batchId ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <Spin size="large" />
            <p className="text-sm text-gray-600 text-center">
              {batchProgress
                ? `Processed ${batchProgress.parsed_files} of ${batchProgress.valid_files} resume(s)…`
                : 'Starting…'}
            </p>
            {!isProcessing && batchProgress && (
              <p className="text-sm font-semibold text-green-600">Done — you can close this now.</p>
            )}
          </div>
        ) : (
          <>
            <Upload.Dragger
              multiple
              beforeUpload={(file) => {
                handleFileSelect([file]);
                return Upload.LIST_IGNORE;
              }}
              fileList={[]}
              showUploadList={false}
            >
              <div className="flex flex-col items-center">
                <FiUploadCloud size={40} className="text-primary mb-2" />
                <p className="text-gray-600 text-sm mb-1">Click to upload or drag files here</p>
                <p className="text-xs text-gray-400">(PDF, DOCX - max 5MB each, up to 30 files)</p>
              </div>
            </Upload.Dragger>

            {files.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto border rounded p-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center text-sm text-green-600 mb-1"
                  >
                    <span>{f.name}</span>
                    <RiDeleteBin6Line
                      className="cursor-pointer text-red-500"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    />
                  </div>
                ))}
              </div>
            )}
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || isUploading}
              className={`mt-6 w-full py-2 rounded-full text-white cursor-pointer font-semibold transition ${
                files.length > 0 && !isUploading
                  ? 'bg-primary hover:bg-primary/90'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isUploading ? <Spin /> : `UPLOAD (${files.length})`}
            </Button>
          </>
        )}

        <Button
          className="absolute top-4 right-4 cursor-pointer text-primary"
          onClick={handleClose}
        >
          <MdClose size={24} />
        </Button>
      </div>
    </div>
  );
};

export default UploadCvModal;
