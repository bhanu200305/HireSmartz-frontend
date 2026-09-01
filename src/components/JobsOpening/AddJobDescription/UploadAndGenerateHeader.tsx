import React from 'react';
import { Tooltip } from 'antd';
import { Button, Typography } from '../../shared';
import {
  HiOutlineRefresh,
  HiOutlineUpload,
  HiOutlineExclamationCircle,
  HiOutlineDocumentDuplicate,
} from 'react-icons/hi';
import { MdDownload, MdInfo } from 'react-icons/md';

export interface ImportWarningItem {
  type: 'error' | 'duplicate';
  message: string;
}

interface UploadAndGenerateHeaderProps {
  description: string;
  onGenerate: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  uploadedFileName?: string;
  importedCount?: number;
  failedCount?: number;
  duplicateCount?: number;
  warnings?: ImportWarningItem[];
  onClearDetails?: () => void;
  isGenerating?: boolean;
  isUploading?: boolean;
  isDownloading?: boolean;
}

export const UploadAndGenerateHeader = ({
  description,
  onGenerate,
  onUpload,
  onDownloadTemplate,
  uploadedFileName = '',
  importedCount = 0,
  failedCount = 0,
  duplicateCount = 0,
  warnings = [],
  onClearDetails,
  isGenerating = false,
  isUploading = false,
  isDownloading = false,
}: UploadAndGenerateHeaderProps) => {
  const skippedCount = failedCount + duplicateCount;
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#F8F9FA] rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center border border-gray-200 gap-4">
        <div className="flex-1">
          <Typography variant="body1" className="text-gray-600 m-0">
            {description}
          </Typography>
        </div>
        <div className="flex items-center gap-3">
          <Button
            className="border border-primary text-primary bg-white hover:bg-gray-50 flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-full shadow-sm"
            onClick={onGenerate}
            disabled={isGenerating}
          >
            <HiOutlineRefresh className="text-lg" />
            GENERATE DEFAULT QUESTIONS
          </Button>

          <div className="relative flex flex-col items-center">
            <label
              className={`bg-primary hover:bg-brand-700 text-white flex items-center gap-2 px-5 py-2 font-semibold text-sm rounded-full shadow-sm cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <HiOutlineUpload className="text-lg" />
              UPLOAD FILE
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={onUpload}
                disabled={isUploading}
              />
            </label>
            <Typography
              variant="caption"
              className="text-gray-400 font-medium absolute top-full mt-0.5 whitespace-nowrap"
            >
              Supports .xlsx format only
            </Typography>
          </div>

          <button
            className="border border-primary text-primary hover:bg-gray-50 bg-white p-2.5 rounded-full flex items-center justify-center shadow-sm relative group"
            onClick={onDownloadTemplate}
            disabled={isDownloading}
            title="Download Template"
          >
            <MdDownload className="text-lg" />
            <span className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap z-50">
              Download Template
            </span>
          </button>
        </div>
      </div>

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
                className="text-brand-500 hover:text-brand-800 text-xs font-semibold"
                onClick={onClearDetails}
              >
                Clear Details [x]
              </button>
            )}
          </div>
          <Typography
            variant="body2"
            className="text-brand-800 m-0 flex items-center flex-wrap gap-1.5"
          >
            <span>
              Successfully imported <strong>{importedCount}</strong> question(s).
              {skippedCount > 0 && (
                <>
                  {' '}
                  Skipped <strong>{skippedCount}</strong> row(s)
                  {failedCount > 0 && duplicateCount > 0 && (
                    <>
                      {' '}
                      (<strong>{failedCount}</strong> invalid, <strong>{duplicateCount}</strong>{' '}
                      duplicate)
                    </>
                  )}
                  .
                </>
              )}
            </span>
            {/* Validation detail (which row failed and why) sits behind this
                icon instead of an always-open block — a hover away rather
                than pushing the question list down every time a file has
                any skipped rows. */}
            {warnings.length > 0 && (
              <Tooltip
                title={
                  <div className="py-1">
                    <div className="flex items-center justify-between gap-3 px-3 pb-2 mb-1.5 border-b border-gray-100">
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                        Row issues
                      </span>
                      <span className="text-[11px] font-semibold text-gray-400">
                        {warnings.length} {warnings.length === 1 ? 'row' : 'rows'}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-1 max-h-48 overflow-y-auto px-1">
                      {warnings.map((warn, index) => (
                        <li
                          key={index}
                          className={`flex items-start gap-2 text-xs leading-snug px-2 py-1.5 rounded-lg ${
                            warn.type === 'error'
                              ? 'text-red-700 bg-red-50/70'
                              : 'text-amber-800 bg-amber-50/70'
                          }`}
                        >
                          {warn.type === 'error' ? (
                            <HiOutlineExclamationCircle className="shrink-0 mt-0.5 text-sm" />
                          ) : (
                            <HiOutlineDocumentDuplicate className="shrink-0 mt-0.5 text-sm" />
                          )}
                          <span className="font-medium">{warn.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                }
                color="#fff"
                overlayInnerStyle={{
                  maxWidth: 360,
                  padding: '10px 4px',
                  borderRadius: 14,
                  boxShadow: '0 12px 32px -8px rgba(0,0,0,0.18)',
                }}
                placement="bottom"
              >
                <span
                  role="img"
                  aria-label={`${warnings.length} validation ${warnings.length === 1 ? 'issue' : 'issues'}`}
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-red-600 bg-red-50 ring-1 ring-red-200 hover:bg-red-100 hover:ring-red-300 transition-colors cursor-help shrink-0"
                >
                  <MdInfo size={13} />
                </span>
              </Tooltip>
            )}
          </Typography>
        </div>
      )}
    </div>
  );
};
export default UploadAndGenerateHeader;
