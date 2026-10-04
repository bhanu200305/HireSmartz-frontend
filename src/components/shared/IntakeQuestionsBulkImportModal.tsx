import { useRef, useState } from 'react';
import { Modal } from 'antd';
import {
  MdOutlineFileDownload,
  MdOutlineUploadFile,
  MdErrorOutline,
  MdOutlineRemoveRedEye,
} from 'react-icons/md';
import { Button, showToast } from './index';
import { Loader } from './ui/loader';
import SpreadsheetPreviewModal, {
  type SpreadsheetPreviewSource,
} from './ui/SpreadsheetPreviewModal';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

type BulkImportRowError = { row_number: number; message: string };

type BulkImportResult = {
  created: Array<{ question_text: string }>;
  replaced_count: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** How many questions are currently in effect for whatever's about to be
   * replaced — shown in the confirmation step so it's a concrete number,
   * not a vague warning. */
  currentCount: number;
  onDownloadTemplate: () => Promise<Blob>;
  onUpload: (file: File) => Promise<BulkImportResult>;
  /** "the platform default" / "Acme Corp" / "your company" — filled into
   * the confirmation copy so the same modal reads correctly for all three
   * surfaces this is used from. */
  targetLabel: string;
  /** Platform-wide replace only: this also wipes every company's own
   * custom/added questions, not just the platform default's own list — a
   * much bigger blast radius than the per-company/own-company surfaces,
   * where only that one target's list is touched. Shown as an extra,
   * more emphatic line in the confirmation step when set. */
  extraWarning?: string;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};

/**
 * Bulk-import UI shared by all three Intake Questions surfaces — the
 * platform default, a Super Admin editing one company, and a Company
 * Admin's own screen. REPLACES the target's entire question list, it never
 * adds to it — see BulkImportInterviewQuestionsUseCase/
 * BulkImportJobQuestionsUseCase's own docstrings on the backend for why
 * that's the deliberate behavior, not a bug.
 */
const IntakeQuestionsBulkImportModal: React.FC<Props> = ({
  open,
  onClose,
  currentCount,
  onDownloadTemplate,
  onUpload,
  targetLabel,
  extraWarning,
}) => {
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [step, setStep] = useState<'pick' | 'confirm'>('pick');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewingTemplate, setIsPreviewingTemplate] = useState(false);
  const [rowErrors, setRowErrors] = useState<BulkImportRowError[] | null>(null);
  const [previewSource, setPreviewSource] = useState<SpreadsheetPreviewSource | null>(null);
  const [previewTitle, setPreviewTitle] = useState('Preview');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPickedFile(null);
    setStep('pick');
    setRowErrors(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const blob = await onDownloadTemplate();
      downloadBlob(blob, 'intake_questions_template.xlsx');
    } catch (error: unknown) {
      showToast({
        message: getOrgErrorMessage(error, "Couldn't download the template."),
        type: 'error',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePreviewTemplate = async () => {
    setIsPreviewingTemplate(true);
    try {
      const blob = await onDownloadTemplate();
      setPreviewSource({
        kind: 'file',
        file: new File([blob], 'intake_questions_template.xlsx', { type: blob.type }),
      });
      setPreviewTitle('Preview: template');
    } catch (error: unknown) {
      showToast({
        message: getOrgErrorMessage(error, "Couldn't load a preview of the template."),
        type: 'error',
      });
    } finally {
      setIsPreviewingTemplate(false);
    }
  };

  const handleFilePicked = (file: File | undefined) => {
    if (!file) return;
    setPickedFile(file);
    setRowErrors(null);
    setStep('confirm');
  };

  const handleConfirmUpload = async () => {
    if (!pickedFile) return;
    setIsUploading(true);
    setRowErrors(null);
    try {
      const result = await onUpload(pickedFile);
      showToast({
        message: `Replaced ${targetLabel}'s question list, now has ${result.created.length} question${
          result.created.length === 1 ? '' : 's'
        }.`,
        type: 'success',
      });
      handleClose();
    } catch (error: unknown) {
      // CfpError's **details kwargs (row_errors here) land under
      // `error.data.data.details` on the wire — `message` alone gets
      // promoted a level up by ResponseEnvelopeMiddleware, everything else
      // (including error_code) stays one level deeper. See
      // platformErrorEnvelope.ts's own module docstring for the full shape.
      const rowErrorDetails = (
        error as { data?: { data?: { details?: { row_errors?: BulkImportRowError[] } } } }
      )?.data?.data?.details?.row_errors;
      if (rowErrorDetails && rowErrorDetails.length > 0) {
        setRowErrors(rowErrorDetails);
      } else {
        showToast({
          message: getOrgErrorMessage(error, "Couldn't import this file."),
          type: 'error',
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      title="Bulk Import Intake Questions"
      destroyOnClose
    >
      <p className="text-sm text-gray-500 mb-4">
        Uploading a file <strong>replaces</strong> {targetLabel}&apos;s entire question list; it
        does not add to it.
      </p>

      {step === 'pick' && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
              className="flex-1 flex items-center justify-center gap-2 border border-[var(--border)] bg-white text-gray-700 rounded-3xl px-4 py-2 hover:bg-gray-50"
            >
              <MdOutlineFileDownload />
              {isDownloading ? 'Downloading…' : 'Download Template'}
            </Button>
            <Button
              type="button"
              onClick={handlePreviewTemplate}
              disabled={isPreviewingTemplate}
              className="flex items-center justify-center gap-2 border border-[var(--border)] bg-white text-gray-700 rounded-3xl px-4 py-2 hover:bg-gray-50"
            >
              <MdOutlineRemoveRedEye />
              {isPreviewingTemplate ? 'Loading…' : 'Preview'}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => handleFilePicked(e.target.files?.[0])}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 text-white bg-button rounded-3xl px-4 py-2"
          >
            <MdOutlineUploadFile />
            Choose a filled-in file to upload
          </Button>
        </div>
      )}

      {step === 'confirm' && pickedFile && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-700">
            <strong>{pickedFile.name}</strong> is ready to upload. This will replace all{' '}
            <strong>{currentCount}</strong> current question{currentCount === 1 ? '' : 's'} in{' '}
            {targetLabel} with whatever is in this file. This can&apos;t be undone.
          </p>

          <button
            type="button"
            onClick={() => {
              setPreviewSource({ kind: 'file', file: pickedFile });
              setPreviewTitle('Preview: file to upload');
            }}
            className="flex items-center gap-1 text-sm text-primary hover:underline self-start cursor-pointer"
          >
            <MdOutlineRemoveRedEye /> Preview This File
          </button>

          {extraWarning && (
            <p className="text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
              {extraWarning}
            </p>
          )}

          {rowErrors && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <div className="flex items-center gap-1.5 font-medium mb-1.5">
                <MdErrorOutline />
                This file couldn&apos;t be imported; nothing was changed:
              </div>
              <ul className="list-disc list-inside space-y-0.5 max-h-40 overflow-y-auto">
                {rowErrors.map((rowError, index) => (
                  <li key={index}>
                    {rowError.row_number > 0 ? `Row ${rowError.row_number}: ` : ''}
                    {rowError.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isUploading ? (
            <Loader />
          ) : (
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                onClick={reset}
                className="border border-[var(--border)] bg-white text-gray-700 rounded-3xl px-4 py-2"
              >
                Choose A Different File
              </Button>
              <Button
                type="button"
                onClick={handleConfirmUpload}
                className="text-white bg-red-600 hover:bg-red-700 rounded-3xl px-4 py-2"
              >
                Replace {targetLabel}&apos;s questions
              </Button>
            </div>
          )}
        </div>
      )}

      <SpreadsheetPreviewModal
        open={!!previewSource}
        onClose={() => setPreviewSource(null)}
        title={previewTitle}
        source={previewSource}
      />
    </Modal>
  );
};

export default IntakeQuestionsBulkImportModal;
