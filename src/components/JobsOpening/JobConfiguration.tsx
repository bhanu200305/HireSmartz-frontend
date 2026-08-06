import { useNavigate } from 'react-router-dom';
import { MdOutlineArrowBack, MdUpload, MdDownload, MdClose, MdInfoOutline } from 'react-icons/md';
import MainLayout from '../../layouts/MainLayout';
import { useState } from 'react';
import { Select, Tooltip, message } from 'antd';
import {
  useLazyDownloadSampleExcelQuery,
  useLazyDownloadTemplateExcelQuery,
  useUploadJobOpeningFileMutation,
} from '../../api/job-service/JobOpening/JobFieldsConfiguration';
import FileUploadModal from '../shared/ui/FileUploadModal';
import { showToast } from '../shared';
import ScoringCriteriaModal from './Candidates/Modal/ScoringCriteriaModal';

const { Option } = Select;

const JobConfiguration = () => {
  const navigate = useNavigate();
  const [selectedField, setSelectedField] = useState<string | undefined>(undefined);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showConfigurationInstructions, setShowConfigurationInstructions] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    successCount: number;
    errorCount: number;
    message: string;
    reportFileUrl?: string;
    reportFileName?: string;
    uploadedFileName?: string;
    errors?: Array<{
      rowNumber: number;
      errorMessage: string;
      rowData: any;
    }>;
  } | null>(null);
  const allowedFileTypes = ['.xls', '.xlsx'];

  const jobFields = [
    { id: 'MANDATORY_SKILLS', name: 'Required Skills' },
    { id: 'OPTIONAL_SKILLS', name: 'Optional Skills' },
  ];

  const [downloadTemplateExcel, { isLoading: loadingTemplate }] =
    useLazyDownloadTemplateExcelQuery();
  // isLoading unused below — the "View Sample" button that would read it is
  // commented out further down; kept the query hook (not deleted) since it's
  // real logic, just currently unreferenced.
  // eslint-disable-next-line unused-imports/no-unused-vars
  const [downloadSampleExcel, { isLoading: loadingSample }] = useLazyDownloadSampleExcelQuery();
  const [uploadJobOpeningFile] = useUploadJobOpeningFileMutation();

  const handleDownload = async () => {
    if (!selectedField) {
      message.warning('Please select a job field first.');
      return;
    }

    try {
      const { data } = await downloadTemplateExcel({
        type: selectedField,
      });

      if (data) {
        const url = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedField}_Template.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast({
          message: 'Template downloaded successfully!',
          type: 'success',
        });
      }
    } catch {
      showToast({
        message: 'Failed to download template. Please try again.',
        type: 'error',
      });
    }
  };

  // TODO: not currently called — the "View Sample" button that would
  // trigger this is commented out further down. Kept (not deleted) since
  // it's real logic; flagged rather than silently deleted during the lint
  // cleanup pass.
  // eslint-disable-next-line unused-imports/no-unused-vars
  const handleView = async () => {
    if (!selectedField) {
      message.warning('Please select a job field first.');
      return;
    }

    try {
      const { data } = await downloadSampleExcel({
        type: selectedField,
      });

      if (data) {
        const url = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedField}_Sample.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast({
          message: 'Sample file downloaded successfully!',
          type: 'success',
        });
      }
    } catch {
      showToast({
        message: 'Failed to download sample file. Please try again.',
        type: 'error',
      });
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (!selectedField) {
      message.warning('Please select a job field before uploading.');
      throw new Error('No field selected');
    }

    try {
      const file = files[0];
      const response = await uploadJobOpeningFile({
        dropdownName: selectedField,
        file,
      }).unwrap();
      showToast({
        message: 'File uploaded successfully!',
        type: 'success',
      });
      setUploadResult(response);
      setShowUploadModal(false);
    } catch (error: any) {
      if (error.data) {
        showToast({
          message: error.data.message || 'Failed to upload file',
          type: 'error',
        });
        setUploadResult(error.data);
      } else {
        showToast({
          message: 'Failed to upload file. Please try again.',
          type: 'error',
        });
      }
      setShowUploadModal(false);
      throw error;
    }
  };

  const clearUploadResult = () => {
    setUploadResult(null);
  };

  return (
    <MainLayout>
      <div className="flex flex-col items-center bg-white px-4 mt-4 relative pt-16">
        {/* Back Button */}
        <div className="mb-4 self-start px-4 absolute">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
          >
            <MdOutlineArrowBack className="mr-2" />
            <span>Back</span>
          </button>
        </div>

        <div className="bg-[#FAFAFA] p-6 md:p-10 rounded-2xl shadow-lg w-full max-w-6xl flex flex-col">
          <h2 className="text-center text-2xl font-semibold mb-6">Job Fields Configuration</h2>

          {/* Configuration Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
              <div className="flex-1 w-full">
                <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                  <Select
                    allowClear
                    value={selectedField || undefined}
                    onChange={(value: string | undefined) => {
                      setSelectedField(value);
                      setUploadResult(null);
                    }}
                    placeholder="Select Job Field"
                    className="w-full custom-select-jobs placeholder-style"
                  >
                    {jobFields.map((field) => (
                      <Option key={field.id} value={field.id}>
                        {field.name}
                      </Option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-5">
                {/* Upload */}
                <Tooltip title={selectedField ? 'Upload XLS' : 'Select a job field first'}>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    disabled={!selectedField}
                    className={`transition-colors ${
                      selectedField
                        ? 'text-brand-600 hover:text-brand-800 cursor-pointer'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <MdUpload size={28} />
                  </button>
                </Tooltip>

                {/* Download (Template) */}
                <Tooltip title={selectedField ? 'Download Template' : 'Select a job field first'}>
                  <button
                    onClick={handleDownload}
                    disabled={!selectedField || loadingTemplate}
                    className={`transition-colors ${
                      selectedField && !loadingTemplate
                        ? 'text-purple-600 hover:text-purple-800 cursor-pointer'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <MdDownload size={28} />
                  </button>
                </Tooltip>
                {/* View (Sample) */}
                {/* <Tooltip title={selectedField ? 'Download Sample' : 'Select a job field first'}>
                  <button
                    onClick={handleView}
                    disabled={!selectedField || loadingSample}
                    className={`transition-colors ${
                      selectedField && !loadingSample
                        ? 'text-green-600 hover:text-green-800 cursor-pointer'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <MdVisibility size={28} />
                  </button>
                </Tooltip> */}
                <Tooltip title="File Validation Rules">
                  <button
                    onClick={() => setShowConfigurationInstructions(true)}
                    className="text-primary hover:text-brand-800 transition-colors cursor-pointer"
                  >
                    <MdInfoOutline size={28} />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Selected Field Info */}
            {selectedField && (
              <div className="mt-4 p-4 bg-brand-50 rounded-lg">
                <p className="text-sm text-brand-800">
                  Selected: <strong>{jobFields.find((f) => f.id === selectedField)?.name}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Upload Results Section */}
          {uploadResult && (
            <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Upload Results</h3>
                <button
                  onClick={clearUploadResult}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <MdClose size={20} />
                </button>
              </div>

              {uploadResult.uploadedFileName && (
                <div className="mb-4 p-3 bg-brand-50 rounded-lg border border-brand-200">
                  <p className="text-sm text-brand-800">
                    <span className="font-medium">Uploaded File:</span>{' '}
                    {uploadResult.uploadedFileName}
                  </p>
                </div>
              )}
              {/* Summary Card */}
              <div
                className={`p-4 rounded-lg mb-4 ${
                  uploadResult.errorCount > 0
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-green-50 border border-green-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-800">{uploadResult.message}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-green-600 font-medium">
                        Success: {uploadResult.successCount}
                      </span>
                      <span className="text-red-600 font-medium">
                        Errors: {uploadResult.errorCount}
                      </span>
                    </div>
                  </div>
                  {uploadResult.reportFileUrl && (
                    <a
                      href={uploadResult.reportFileUrl}
                      download={uploadResult.reportFileName}
                      className="bg-primary text-white px-4 py-2 rounded transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      Download Detailed Report
                    </a>
                  )}
                </div>
              </div>

              {/* Errors List - Show only if there are errors */}
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-red-700 mb-3">Error Details:</h4>
                  <div className="border border-red-200 rounded-lg max-h-60 overflow-y-auto">
                    {uploadResult.errors.map((error, index) => (
                      <div
                        key={index}
                        className="p-3 border-b border-red-100 last:border-b-0 hover:bg-red-50"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-red-800">
                              Row {error.rowNumber}: {error.errorMessage}
                            </p>
                            {/* <p className="text-xs text-gray-600 mt-1">
                              Data: {JSON.stringify(error.rowData)}
                            </p> */}
                          </div>
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded whitespace-nowrap sm:self-start">
                            Failed
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">Instructions:</h3>
            <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
              <li>Select a job field from the dropdown.</li>
              <li>Use the icons to upload, view (sample), or download (template) XLS files.</li>
              <li>File supported formats: .xls, .xlsx</li>
              <li>Make sure to select a job field before performing any actions.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleFileUpload}
        title={`Upload ${selectedField ? jobFields.find((f) => f.id === selectedField)?.name : 'File'}`}
        uploadText="UPLOAD FILE"
        maxFiles={1}
        allowedTypes={allowedFileTypes}
        accept=".xls,.xlsx,.csv"
      />
      <ScoringCriteriaModal
        visible={showConfigurationInstructions}
        onClose={() => setShowConfigurationInstructions(false)}
        title="File Validation Rules"
        footer={null}
      />
    </MainLayout>
  );
};

export default JobConfiguration;
