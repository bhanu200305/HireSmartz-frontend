import { useState } from 'react';
import { Spin, Upload } from 'antd';
import { MdClose } from 'react-icons/md';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { FiUploadCloud } from 'react-icons/fi';
import {
  useExtractMultipleResumesMutation,
  useExtractResumeMutation,
} from '../../../../api/candidate-service/Candidates/Candidates';
import { Button, showToast } from '../../../shared';
import { useParams } from 'react-router-dom';
import { get } from 'lodash-es';
import { toast } from 'react-toastify';

interface UploadCvModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAX_FILES = 30;
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE_MB = 5;

const UploadCvModal = ({ isOpen, onClose }: UploadCvModalProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { id } = useParams();
  const [extractResume] = useExtractResumeMutation();
  const [extractMultipleResumes] = useExtractMultipleResumesMutation();

  const handleFileSelect = (selectedFiles: File[]) => {
    const newFiles: File[] = [];

    for (const f of selectedFiles) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        showToast({
          message: `${f.name} is not a valid file type.`,
          type: 'error',
        });
        continue;
      }
      if (f.size / 1024 / 1024 > MAX_SIZE_MB) {
        showToast({
          message: `${f.name} exceeds ${MAX_SIZE_MB}MB size limit.`,
          type: 'error',
        });
        continue;
      }
      newFiles.push(f);
    }

    // if (files.length + newFiles.length > MAX_FILES) {
    //   showToast({
    //     message: `You can upload a maximum of ${MAX_FILES} files.`,
    //     type: 'error'
    //   })
    //   return
    // }

    setFiles((prev) => [...prev, ...newFiles]);
  };
  const handleUpload = async () => {
    // Add validation before upload
    if (files.length === 0) {
      showToast({
        message: 'Please select at least one file to upload.',
        type: 'error',
      });
      return;
    }

    if (files.length > MAX_FILES) {
      showToast({
        message: `You can upload a maximum of ${MAX_FILES} files.`,
        type: 'error',
      });
      return;
    }
    const invalidFiles: { fileName: string; reason: string }[] = [];

    files.forEach((file) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        invalidFiles.push({
          fileName: file.name,
          reason: 'Invalid file type',
        });
      } else if (file.size / 1024 / 1024 > MAX_SIZE_MB) {
        invalidFiles.push({
          fileName: file.name,
          reason: `File exceeds ${MAX_SIZE_MB}MB size limit`,
        });
      }
    });

    if (invalidFiles.length > 0) {
      showToast({
        message: `${invalidFiles.length} file(s) have validation errors.`,
        type: 'error',
      });

      invalidFiles.forEach((invalidFile) => {
        showToast({
          message: `${invalidFile.fileName}: ${invalidFile.reason}`,
          type: 'error',
        });
      });
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    if (id) formData.append('jobOpeningId', id.toString());

    let loadingToastId: string | number | null = null;
    const notifyTimeout = setTimeout(() => {
      loadingToastId = toast.loading(
        `Processing ${files.length} resume(s)... You'll be notified once the analysis is complete.`
      );
    }, 1000);

    extractMultipleResumes(formData)
      .unwrap()
      .then((res) => {
        clearTimeout(notifyTimeout);
        if (loadingToastId) toast.dismiss(loadingToastId);

        showToast({
          message: `${res.validFiles} resume(s) processed successfully. ${
            res.invalidFiles.length > 0 ? res.invalidFiles.length + ' invalid files.' : ''
          }`,
          type: 'success',
        });

        if (res.invalidFiles.length > 0) {
          const message = res.invalidFiles.map((f) => f.fileName).join(', ');
          showToast({
            message: `Invalid file(s): ${message}`,
            type: 'error',
          });
        }

        // fire custom event so other parts of app can refresh
        const event = new CustomEvent('resumeUploadSuccess', {
          detail: { jobOpeningId: id, batchId: res.batchId },
        });
        window.dispatchEvent(event);

        setFiles([]);
        onClose();
      })
      .catch((error) => {
        clearTimeout(notifyTimeout);
        if (loadingToastId) toast.dismiss(loadingToastId);

        showToast({
          message: get(
            (error as any)?.data,
            'message',
            `An error occurred while uploading resumes. Please try again.`
          ),
          type: 'error',
        });
      })
      .finally(() => setIsUploading(false));
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="flex flex-col justify-center bg-white p-6 rounded-xl w-[500px] relative">
        <h2 className="text-xl font-bold text-center mb-6">Upload Resumes</h2>
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

        {/* Close Button */}
        <Button
          className="absolute top-4 right-4 cursor-pointer text-primary"
          onClick={() => {
            setFiles([]);
            setIsUploading(false);
            onClose();
          }}
        >
          <MdClose size={24} />
        </Button>
      </div>
    </div>
  );
};

export default UploadCvModal;
