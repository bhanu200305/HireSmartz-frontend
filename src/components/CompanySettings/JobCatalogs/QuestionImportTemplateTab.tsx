import React, { useRef, useState } from 'react';
import { MdDownload, MdOutlineRemoveRedEye, MdClose } from 'react-icons/md';
import { Button, Typography, showToast } from '../../shared';
import SpreadsheetPreviewModal, {
  type SpreadsheetPreviewSource,
} from '../../shared/ui/SpreadsheetPreviewModal';
import {
  useUploadQuestionImportTemplateMutation,
  useLazyGetPlatformQuestionImportTemplateQuery,
} from '../../../api/job-service/Platform/questionImportTemplate';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';

/** POST /platform/question-import-template — replaces the one fixed .xlsx/
 * .csv template every tenant downloads. One shared file, no per-tenant
 * list here — just a replace action, plus a way to check what's live. */
const QuestionImportTemplateTab: React.FC = () => {
  const [upload, { isLoading: isUploading }] = useUploadQuestionImportTemplateMutation();
  const [downloadTemplate, { isLoading: isDownloading }] =
    useLazyGetPlatformQuestionImportTemplateQuery();
  const [lastUploadedName, setLastUploadedName] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewSource, setPreviewSource] = useState<SpreadsheetPreviewSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownload = async () => {
    try {
      const result = await downloadTemplate().unwrap();
      if (result?.download_url) {
        window.open(result.download_url, '_blank');
      }
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Failed to download the current template.'),
        type: 'error',
      });
    }
  };

  const handlePreviewCurrent = async () => {
    try {
      const result = await downloadTemplate().unwrap();
      if (result?.download_url) {
        setPreviewSource({ kind: 'url', url: result.download_url });
      }
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Failed to load the current template.'),
        type: 'error',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPendingFile(file);
  };

  const handleCancelPendingFile = () => {
    setPendingFile(null);
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;
    try {
      await upload(pendingFile).unwrap();
      setLastUploadedName(pendingFile.name);
      setPendingFile(null);
      showToast({ message: 'Question-import template uploaded.', type: 'success' });
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Failed to upload the template.'),
        type: 'error',
      });
    }
  };

  return (
    <div className="max-w-xl">
      <Typography variant="body2">
        The bulk question-import template every tenant downloads when adding questions to a
        job&apos;s bank in bulk. Uploading a new file replaces it for everyone - there&apos;s no
        per-tenant version.
      </Typography>
      <Typography variant="body2" className="mt-2 text-neutral-500">
        Accepted formats: .xlsx or .csv.
      </Typography>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700"
          onClick={handlePreviewCurrent}
          disabled={isDownloading}
        >
          <MdOutlineRemoveRedEye size={16} />
          Preview current template
        </Button>

        <Button
          className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-700"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          <MdDownload size={16} />
          {isDownloading ? 'Downloading…' : 'Download current template'}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          className="rounded-full bg-button text-white px-5 py-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || !!pendingFile}
        >
          Choose replacement template
        </Button>
      </div>

      {pendingFile && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
          <span className="text-sm text-neutral-700 truncate" title={pendingFile.name}>
            {pendingFile.name}
          </span>
          <Button
            className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700"
            onClick={() => setPreviewSource({ kind: 'file', file: pendingFile })}
          >
            <MdOutlineRemoveRedEye size={14} />
            Preview
          </Button>
          <Button
            className="rounded-full bg-button text-white px-4 py-1.5 text-xs"
            onClick={handleConfirmUpload}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading…' : 'Confirm & upload'}
          </Button>
          <button
            type="button"
            onClick={handleCancelPendingFile}
            disabled={isUploading}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700"
          >
            <MdClose size={14} />
            Cancel
          </button>
        </div>
      )}

      {lastUploadedName && (
        <p className="mt-2 text-xs text-gray-400">Last uploaded this session: {lastUploadedName}</p>
      )}

      <SpreadsheetPreviewModal
        open={!!previewSource}
        onClose={() => setPreviewSource(null)}
        title={
          previewSource?.kind === 'file' ? 'Preview: file to upload' : 'Preview: current template'
        }
        source={previewSource}
      />
    </div>
  );
};

export default QuestionImportTemplateTab;
