import React from 'react';
import dayjs from 'dayjs';
import { Modal, Tooltip } from 'antd';
import { Button, Typography } from '../../shared';
import {
  HiOutlineRefresh,
  HiOutlineUpload,
  HiOutlineExclamationCircle,
  HiOutlineDocumentDuplicate,
} from 'react-icons/hi';
import { MdClose } from 'react-icons/md';
import { FALLBACK_EXTENSIONS } from './uploadFormats';

export interface ImportWarningItem {
  type: 'error' | 'duplicate';
  /** The file row, when the import reports one. */
  row?: number;
  /** Why this row was skipped, in plain words. */
  reason: string;
  /** The question on that row, when the file had one. */
  questionText?: string | null;
}

/** A file uploaded earlier, with what came of it. Counts are null on old files. */
export interface UploadedFileItem {
  id: string;
  fileName: string | null;
  uploadedAt: string | null;
  imported: number | null;
  failed: number | null;
  duplicates: number | null;
}

const MAX_SHOWN_QUESTION_CHARS = 400;
const shortened = (text: string): string =>
  text.length > MAX_SHOWN_QUESTION_CHARS ? `${text.slice(0, MAX_SHOWN_QUESTION_CHARS)}…` : text;

interface UploadAndGenerateHeaderProps {
  description: string;
  onGenerate: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadedFileName?: string;
  importedCount?: number;
  failedCount?: number;
  duplicateCount?: number;
  /** Some imported questions came back with an AI-written answer. */
  hasAiWrittenAnswers?: boolean;
  warnings?: ImportWarningItem[];
  /** Files uploaded to this round before, newest first. */
  uploadedFiles?: UploadedFileItem[];
  onClearDetails?: () => void;
  isGenerating?: boolean;
  isUploading?: boolean;
  generateDisabled?: boolean;
  /** Forces description-above-buttons layout for narrow-column callers. */
  stacked?: boolean;
  /** File types the upload takes, from the backend. */
  acceptedExtensions?: string[];
}

export const UploadAndGenerateHeader = ({
  description,
  onGenerate,
  onUpload,
  uploadedFileName = '',
  importedCount = 0,
  failedCount = 0,
  duplicateCount = 0,
  hasAiWrittenAnswers = false,
  warnings = [],
  uploadedFiles = [],
  onClearDetails,
  isGenerating = false,
  isUploading = false,
  generateDisabled = false,
  acceptedExtensions,
}: UploadAndGenerateHeaderProps) => {
  const extensions = acceptedExtensions?.length ? acceptedExtensions : FALLBACK_EXTENSIONS;
  const skippedCount = failedCount + duplicateCount;
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [filesOpen, setFilesOpen] = React.useState(false);
  // A fresh set of skipped rows opens the details once. Keyed on the rows, not the array.
  const warningsKey = warnings
    .map((warn) => `${warn.type}:${warn.row ?? ''}:${warn.reason}`)
    .join('|');
  React.useEffect(() => {
    if (warningsKey) setDetailsOpen(true);
  }, [warningsKey]);
  const generateButton = (
    <Button
      className="border border-primary text-primary bg-white hover:bg-gray-50 flex items-center gap-1.5 px-3.5 py-1.5 font-semibold text-sm rounded-full shadow-sm"
      onClick={onGenerate}
      disabled={isGenerating || generateDisabled}
    >
      <HiOutlineRefresh className="text-base" />
      Generate With AI
    </Button>
  );
  const uploadDisabled = isUploading || generateDisabled;
  const uploadLabel = (
    <label
      className={`bg-primary hover:bg-brand-700 text-white flex items-center gap-1.5 px-3.5 py-1.5 font-semibold text-sm rounded-full shadow-sm cursor-pointer ${uploadDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <HiOutlineUpload className="text-base" />
      {isUploading ? 'Reading file…' : 'Upload File'}
      <input
        type="file"
        accept={extensions.join(',')}
        className="hidden"
        onChange={onUpload}
        disabled={uploadDisabled}
      />
    </label>
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {description && <span className="w-full text-sm text-gray-500">{description}</span>}
        <Tooltip title="Generates questions from the job description and this round's focus areas.">
          <span>{generateButton}</span>
        </Tooltip>
        <Tooltip title="Upload your questions in any Excel, CSV, Word, PDF or text file.">
          <span>{uploadLabel}</span>
        </Tooltip>
      </div>
      <div className="flex flex-col gap-0.5 text-xs text-gray-500">
        <span>Upload your questions in any Excel, CSV, Word, PDF or text file.</span>
        <span>
          Tip: include answers and topics in the file — we&apos;ll write any missing answers for
          you.
        </span>
      </div>

      {uploadedFiles.length > 0 && (
        <button
          type="button"
          className="self-start text-sm font-semibold text-brand-500 hover:text-brand-800 cursor-pointer"
          onClick={() => setFilesOpen(true)}
        >
          Uploaded files ({uploadedFiles.length})
        </button>
      )}

      {/* Upload Details & Warning display */}
      {uploadedFileName && (
        <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex justify-between items-center border-b border-brand-100 pb-2">
            <Typography variant="subtitle2" className="text-brand-900 m-0">
              Uploaded File:{' '}
              <span className="font-mono text-xs font-semibold">{uploadedFileName}</span>
            </Typography>
            {onClearDetails && (
              <button
                type="button"
                aria-label="Clear details"
                className="text-brand-500 hover:text-brand-800 cursor-pointer"
                onClick={onClearDetails}
              >
                <MdClose size={18} />
              </button>
            )}
          </div>
          <Typography
            variant="body2"
            className="text-brand-800 m-0 flex items-center flex-wrap gap-1.5"
          >
            <span>
              {importedCount > 0 ? (
                <>
                  Successfully imported <strong>{importedCount}</strong> question(s).
                </>
              ) : (
                <>No new questions were added.</>
              )}
              {skippedCount > 0 && (
                <>
                  {' '}
                  Skipped <strong>{skippedCount}</strong> row(s)
                  {(failedCount > 0 || duplicateCount > 0) && (
                    <>
                      {' '}
                      (
                      {failedCount > 0 && (
                        <>
                          <strong>{failedCount}</strong> invalid
                        </>
                      )}
                      {failedCount > 0 && duplicateCount > 0 && ', '}
                      {duplicateCount > 0 && (
                        <>
                          <strong>{duplicateCount}</strong> duplicate
                        </>
                      )}
                      )
                    </>
                  )}
                  .
                </>
              )}
            </span>
          </Typography>
          {hasAiWrittenAnswers && importedCount > 0 && (
            <Typography variant="body2" className="m-0 text-amber-800">
              Some answers were written by AI. Please review them.
            </Typography>
          )}
          {warnings.length > 0 && (
            <button
              type="button"
              className="self-start text-xs font-semibold text-brand-500 hover:text-brand-800 cursor-pointer"
              onClick={() => setDetailsOpen(true)}
            >
              View details ({warnings.length})
            </button>
          )}
        </div>
      )}
      <Modal
        open={filesOpen && uploadedFiles.length > 0}
        onCancel={() => setFilesOpen(false)}
        title="Uploaded files"
        footer={
          <Button
            className="rounded-full bg-button px-6 py-1.5 text-sm font-semibold text-white"
            onClick={() => setFilesOpen(false)}
          >
            Close
          </Button>
        }
        width={560}
        style={{ top: 72 }}
        destroyOnClose
      >
        <ul className="m-0 flex max-h-[60vh] list-none flex-col gap-2 overflow-y-auto p-0 pr-1">
          {uploadedFiles.map((file) => {
            const parts = [
              file.imported !== null && `${file.imported} added`,
              file.failed ? `${file.failed} invalid` : null,
              file.duplicates ? `${file.duplicates} duplicate` : null,
            ].filter(Boolean);
            return (
              <li key={file.id} className="rounded-xl border border-gray-100 bg-white px-3 py-2.5">
                <p className="m-0 break-all text-sm font-medium text-gray-900">
                  {file.fileName ?? 'Uploaded file'}
                </p>
                <p className="m-0 mt-1 text-xs text-gray-500">
                  {file.uploadedAt ? dayjs(file.uploadedAt).format('MMM D, YYYY, h:mm A') : ''}
                  {file.uploadedAt && parts.length > 0 && ' · '}
                  {parts.join(' · ')}
                </p>
              </li>
            );
          })}
        </ul>
      </Modal>
      <Modal
        open={detailsOpen && warnings.length > 0}
        onCancel={() => setDetailsOpen(false)}
        title="Rows that were skipped"
        footer={
          <Button
            className="rounded-full bg-button px-6 py-1.5 text-sm font-semibold text-white"
            onClick={() => setDetailsOpen(false)}
          >
            Close
          </Button>
        }
        width={560}
        style={{ top: 72 }}
        destroyOnClose
      >
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
          {[
            {
              type: 'error' as const,
              title: 'Not imported',
              hint: null,
            },
            {
              type: 'duplicate' as const,
              title: 'Skipped duplicates',
              hint: 'The question is already in this round, so these were not added.',
            },
          ].map(({ type, title, hint }) => {
            const items = warnings.filter((warn) => warn.type === type);
            if (items.length === 0) return null;
            const isError = type === 'error';
            return (
              <div key={type} className="flex flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    {isError ? (
                      <HiOutlineExclamationCircle className="shrink-0 text-base text-red-600" />
                    ) : (
                      <HiOutlineDocumentDuplicate className="shrink-0 text-base text-amber-700" />
                    )}
                    <span
                      className={`text-sm font-bold ${isError ? 'text-red-700' : 'text-amber-800'}`}
                    >
                      {title} ({items.length})
                    </span>
                  </div>
                  {hint && <span className="text-xs text-gray-500">{hint}</span>}
                </div>
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {items.map((warn) => (
                    <li
                      key={`${warn.type}-${warn.row ?? warn.reason}-${warn.questionText ?? ''}`}
                      className={`rounded-xl border bg-white px-3 py-2.5 ${
                        isError ? 'border-red-100' : 'border-amber-100'
                      }`}
                    >
                      {warn.questionText ? (
                        <p className="m-0 break-words text-sm font-medium text-gray-900">
                          &ldquo;{shortened(warn.questionText)}&rdquo;
                        </p>
                      ) : (
                        <p className="m-0 text-sm italic text-gray-500">(empty row)</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                        {warn.row !== undefined && (
                          <span
                            className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                              isError ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            Row {warn.row}
                          </span>
                        )}
                        <span
                          className={`font-semibold ${isError ? 'text-red-700' : 'text-amber-800'}`}
                        >
                          {warn.reason}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};
export default UploadAndGenerateHeader;
