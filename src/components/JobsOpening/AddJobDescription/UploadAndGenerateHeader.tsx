import React from 'react';
import { Button, Typography } from '../../shared';
import { HiOutlineRefresh, HiOutlineUpload } from 'react-icons/hi';
import { MdDownload } from 'react-icons/md';

interface UploadAndGenerateHeaderProps {
  description: string;
  onGenerate: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadTemplate: () => void;
  uploadedFileName?: string;
  importedCount?: number;
  skippedCount?: number;
  warnings?: string[];
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
  skippedCount = 0,
  warnings = [],
  onClearDetails,
  isGenerating = false,
  isUploading = false,
  isDownloading = false,
}: UploadAndGenerateHeaderProps) => {
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
          <Typography variant="body2" className="text-brand-800 m-0">
            Successfully imported <strong>{importedCount}</strong> question(s). Skipped{' '}
            <strong>{skippedCount}</strong> row(s).
          </Typography>
          {warnings.length > 0 && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 max-h-36 overflow-y-auto">
              <Typography variant="overline" color="warning" className="font-semibold block mb-1">
                Warnings / Errors:
              </Typography>
              <ul className="list-disc pl-4 space-y-1">
                {warnings.map((warn, index) => (
                  <li key={index} className="text-xs text-amber-800 font-medium">
                    {warn}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default UploadAndGenerateHeader;
