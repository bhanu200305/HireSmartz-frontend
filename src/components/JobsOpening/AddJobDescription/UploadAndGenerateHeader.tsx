import React from 'react';
import { createPortal } from 'react-dom';
import { Dropdown, Modal, Tooltip } from 'antd';
import { Button, Typography } from '../../shared';
import {
  HiOutlineUpload,
  HiOutlineExclamationCircle,
  HiOutlineDocumentDuplicate,
} from 'react-icons/hi';
import { MdAdd, MdDownload, MdInfoOutline, MdOutlineEdit } from 'react-icons/md';
import dayjs from 'dayjs';

const SparkleIcon = ({ size, className }: { size?: number; className?: string }) => (
  <span aria-hidden="true" className={className} style={size ? { fontSize: size } : undefined}>
    ✨
  </span>
);

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
  empty?: boolean;
  onWrite?: () => void;
  onGenerate: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadedFileName?: string;
  importedCount?: number;
  failedCount?: number;
  duplicateCount?: number;
  warnings?: ImportWarningItem[];
  /** Files uploaded to this round before, newest first. */
  uploadedFiles?: UploadedFileItem[];
  onClearDetails?: () => void;
  isGenerating?: boolean;
  isUploading?: boolean;
  generateDisabled?: boolean;
  /** Forces description-above-buttons layout for narrow-column callers. */
  stacked?: boolean;
  actionsContainer?: HTMLElement | null;
  onDownloadTemplate?: () => void;
  isDownloading?: boolean;
  /** File types the upload accepts, e.g. ['.xlsx', '.csv'], from the backend. Empty: any file. */
  acceptedExtensions?: string[];
}

export const UploadAndGenerateHeader = ({
  description,
  empty = false,
  onWrite,
  onGenerate,
  onUpload,
  uploadedFileName: _uploadedFileName = '',
  importedCount: _importedCount = 0,
  failedCount = 0,
  duplicateCount = 0,
  warnings = [],
  uploadedFiles = [],
  onClearDetails: _onClearDetails,
  isGenerating = false,
  isUploading = false,
  generateDisabled = false,
  actionsContainer,
  onDownloadTemplate,
  isDownloading = false,
  acceptedExtensions,
}: UploadAndGenerateHeaderProps) => {
  // Non-empty action buttons render in the caller's slot (beside the round chip) when given.
  const place = (node: React.ReactNode) =>
    actionsContainer ? createPortal(node, actionsContainer) : node;
  // Retained for the commented-out upload summary panel below; not currently rendered.
  void (failedCount + duplicateCount);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
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
      className="border border-primary text-primary bg-white hover:bg-gray-50 flex h-8 items-center gap-1.5 px-4 font-semibold text-sm leading-none rounded-full shadow-sm"
      onClick={onGenerate}
      disabled={isGenerating || generateDisabled}
    >
      <SparkleIcon className="text-base" />
      Generate With AI
    </Button>
  );
  const uploadDisabled = isUploading || generateDisabled;
  const uploadLabel = (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploadDisabled}
        className={`bg-primary hover:bg-brand-700 text-white flex h-8 items-center gap-1.5 px-4 font-semibold text-sm leading-none rounded-full shadow-sm cursor-pointer ${uploadDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <HiOutlineUpload className="text-base" />
        Upload File
      </button>
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Upload questions file"
        accept={acceptedExtensions?.length ? acceptedExtensions.join(',') : undefined}
        className="hidden"
        onChange={onUpload}
        disabled={uploadDisabled}
      />
    </>
  );
  const writeButton = onWrite && (
    <Button
      className="border border-primary text-primary bg-white hover:bg-gray-50 flex h-8 items-center gap-1.5 px-4 font-semibold text-sm leading-none rounded-full shadow-sm"
      onClick={onWrite}
      disabled={generateDisabled}
    >
      <MdOutlineEdit className="text-base" />
      Write Questions
    </Button>
  );
  const iconButtonClassName =
    'border border-primary text-primary hover:bg-gray-50 bg-white h-8 w-8 shrink-0 rounded-full flex items-center justify-center shadow-sm cursor-pointer disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary';
  const downloadButton = (
    <Tooltip title="Download the .xlsx import template.">
      <button
        type="button"
        className={iconButtonClassName}
        onClick={onDownloadTemplate}
        disabled={isDownloading}
        aria-label="Download template"
      >
        <MdDownload className="text-base" />
      </button>
    </Tooltip>
  );
  const uploadedFilesButton = (
    <Tooltip
      title={
        uploadedFiles.length > 0 ? `Uploaded files (${uploadedFiles.length})` : 'No files uploaded'
      }
    >
      <button
        type="button"
        className={iconButtonClassName}
        onClick={() => setFilesOpen(true)}
        aria-label="View uploaded files"
        aria-haspopup="dialog"
      >
        <MdInfoOutline className="text-base" />
      </button>
    </Tooltip>
  );
  return (
    <div className="flex min-w-0 flex-col gap-3 [&_button]:min-h-11 [&_label]:min-h-11 [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-primary [&_label:focus-within]:outline [&_label:focus-within]:outline-2 [&_label:focus-within]:outline-primary">
      {empty ? (
        <div className="flex min-w-0 flex-col gap-1">
          <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50/30 px-4 py-3 text-center sm:px-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'Upload a file',
                  description: 'Excel (.xlsx) or CSV, one question per row.',
                  icon: HiOutlineUpload,
                  button: uploadLabel,
                },
                {
                  title: 'Generate with AI',
                  description: 'Suggested questions from your job description.',
                  icon: SparkleIcon,
                  button: generateButton,
                },
                {
                  title: 'Write Questions',
                  description: 'One question per line, or paste a list.',
                  icon: MdOutlineEdit,
                  button: writeButton,
                },
              ].map(({ title, description: hint, button }) => (
                <div
                  key={title}
                  className="group relative flex min-w-0 flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
                >
                  <Typography variant="body2" className="m-0 text-gray-500">
                    {hint}
                  </Typography>
                  <div className="mt-auto flex justify-center">{button}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-1 text-xs text-gray-500">
              <span>Or drag and drop a file anywhere on this page.</span>
              <button
                type="button"
                onClick={onDownloadTemplate}
                disabled={isDownloading}
                className="cursor-pointer text-primary underline disabled:opacity-50"
              >
                Download template
              </button>
              {/* {uploadedFilesButton} */}
            </div>
          </div>
        </div>
      ) : (
        place(
          <>
            {onWrite && (
              <div className="flex items-center gap-2 sm:hidden">
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      {
                        key: 'write',
                        label: 'Write Questions',
                        icon: <MdOutlineEdit />,
                        disabled: generateDisabled,
                        onClick: onWrite,
                      },
                      {
                        key: 'generate',
                        label: 'Generate With AI',
                        icon: <SparkleIcon />,
                        disabled: isGenerating || generateDisabled,
                        onClick: onGenerate,
                      },
                      {
                        key: 'upload',
                        label: 'Upload File',
                        icon: <HiOutlineUpload />,
                        disabled: uploadDisabled,
                        onClick: () => fileInputRef.current?.click(),
                      },
                      {
                        key: 'download',
                        label: 'Download template',
                        icon: <MdDownload />,
                        disabled: isDownloading,
                        onClick: onDownloadTemplate,
                      },
                    ],
                  }}
                  overlayClassName="[&_.ant-dropdown-menu-item]:min-h-11"
                >
                  <Button className="border border-primary text-primary bg-white flex w-full items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 font-semibold text-sm">
                    <MdAdd />
                    Add questions
                  </Button>
                </Dropdown>
                {uploadedFilesButton}
              </div>
            )}
            <div className={`${onWrite ? 'hidden sm:flex' : 'flex'} flex-wrap items-center gap-2`}>
              {description && <span className="w-full text-sm text-gray-500">{description}</span>}
              <Tooltip title="Import questions from an .xlsx or .csv file.">
                <span>{uploadLabel}</span>
              </Tooltip>
              <Tooltip title="Generates questions from the job description and this round's focus areas.">
                <span>{generateButton}</span>
              </Tooltip>
              {writeButton}
              {downloadButton}
              {uploadedFilesButton}
            </div>
          </>
        )
      )}

      {/* Upload Details & Warning display */}
      {/* {uploadedFileName && (
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
      )} */}
      <Modal
        open={filesOpen}
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
        {uploadedFiles.length === 0 && (
          <Typography variant="body2" className="m-0 py-4 text-gray-500">
            No files uploaded
          </Typography>
        )}
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
                      className={`rounded-xl border bg-white px-3 py-2.5 ${isError ? 'border-red-100' : 'border-amber-100'}`}
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
                            className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold ${isError ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}
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
