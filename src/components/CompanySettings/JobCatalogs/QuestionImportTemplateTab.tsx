import React, { useRef, useState } from 'react';
import { MdUploadFile } from 'react-icons/md';
import { Button, Typography, showToast } from '../../shared';
import { useUploadQuestionImportTemplateMutation } from '../../../api/job-service/Platform/questionImportTemplate';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';

/** POST /platform/question-import-template — replaces the one fixed .xlsx
 * template every tenant downloads (GET /master/question-import-template)
 * to bulk-import a job's question bank. One shared file, no per-tenant
 * list here — just a replace action. */
const QuestionImportTemplateTab: React.FC = () => {
  const [upload, { isLoading }] = useUploadQuestionImportTemplateMutation();
  const [lastUploadedName, setLastUploadedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        bank in bulk. Uploading a new file replaces it for everyone — there's no per-tenant
        version.
      </Typography>

      <div className="mt-4 border border-dashed border-neutral-300 rounded-xl p-6 flex flex-col items-center gap-3 bg-neutral-50">
        <MdUploadFile size={32} className="text-gray-400" />
        <input
          ref={fileInputRef}
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          className="rounded-full bg-button text-white px-5 py-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          {isLoading ? 'Uploading…' : 'Upload replacement template'}
        </Button>
        {lastUploadedName && (
          <p className="text-xs text-gray-400">Last uploaded this session: {lastUploadedName}</p>
        )}
      </div>
    </div>
  );
};

export default QuestionImportTemplateTab;
