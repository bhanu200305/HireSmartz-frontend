import React, { useRef, useState } from 'react';
import { MdDownload } from 'react-icons/md';
import { Button, Typography, showToast } from '../../shared';
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await upload(file).unwrap();
      setLastUploadedName(file.name);
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
        The bulk question-import template every tenant downloads when adding questions to a job's
        bank in bulk. Uploading a new file replaces it for everyone - there's no per-tenant version.
      </Typography>
      <Typography variant="body2" className="mt-2 text-neutral-500">
        Accepted formats: .xlsx or .csv.
      </Typography>

      <div className="mt-4 flex flex-wrap items-center gap-3">
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
          disabled={isUploading}
        >
          {isUploading ? 'Uploading…' : 'Upload replacement template'}
        </Button>
      </div>

      {lastUploadedName && (
        <p className="mt-2 text-xs text-gray-400">Last uploaded this session: {lastUploadedName}</p>
      )}
    </div>
  );
};

export default QuestionImportTemplateTab;
