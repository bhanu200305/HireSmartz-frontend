import { useState } from 'react';
import { Spin, Upload, Modal } from 'antd';
import { MdClose } from 'react-icons/md';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { FiUploadCloud } from 'react-icons/fi';
import showToast from './toast';
import { Loader } from './loader';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => Promise<void>;
  allowedTypes?: string[];
  maxSizeMB?: number;
  maxFiles?: number;
  accept?: string;
  title?: string;
  uploadText?: string;
}

const FileUploadModal = ({
  isOpen,
  onClose,
  onUpload,
  allowedTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    '.xls',
    '.xlsx',
    '.csv',
  ],
  maxSizeMB = 5,
  maxFiles = 30,
  accept = '.xls,.xlsx,.csv',
  title = 'Upload Files',
  uploadText = 'UPLOAD',
}: FileUploadModalProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const isFileTypeAllowed = (file: File): boolean => {
    if (allowedTypes.includes(file.type)) {
      return true;
    }
    const fileName = file.name.toLowerCase();
    const allowedExtensions = allowedTypes.filter((type) => type.startsWith('.'));
    return allowedExtensions.some((ext) => fileName.endsWith(ext));
  };

  const getAllowedTypesDisplay = (): string => {
    const extensions = allowedTypes
      .filter((type) => type.startsWith('.'))
      .map((ext) => ext.toUpperCase().replace('.', ''));
    return extensions.join(', ');
  };

  const handleFileSelect = (selectedFiles: File[]) => {
    const newFiles: File[] = [];
    let hasInvalidFiles = false;

    for (const file of selectedFiles) {
      if (!isFileTypeAllowed(file)) {
        showToast({
          message: `${file.name} is not a supported file type. Allowed types: ${getAllowedTypesDisplay()}`,
          type: 'error',
        });
        hasInvalidFiles = true;
        continue;
      }
      if (file.size / 1024 / 1024 > maxSizeMB) {
        showToast({
          message: `${file.name} exceeds ${maxSizeMB}MB size limit.`,
          type: 'error',
        });
        hasInvalidFiles = true;
        continue;
      }

      newFiles.push(file);
    }
    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles]);
      if (newFiles.length === selectedFiles.length) {
        // showToast({
        //   message: `${newFiles.length} file(s) added successfully.`,
        //   type: 'success'
        // })
      }
    }

    // if (hasInvalidFiles && newFiles.length === 0) {
    //   showToast({
    //     message: 'No valid files were selected. Please check file types and sizes.',
    //     type: 'warning'
    //   })
    // }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      showToast({
        message: 'Please select at least one file to upload.',
        type: 'warning',
      });
      return;
    }
    if (files.length > maxFiles) {
      showToast({
        message: `You can upload a maximum of ${maxFiles} file(s).`,
        type: 'error',
      });
      return;
    }
    const invalidFiles: { fileName: string; reason: string }[] = [];

    files.forEach((file) => {
      if (!isFileTypeAllowed(file)) {
        invalidFiles.push({
          fileName: file.name,
          reason: 'Invalid file type',
        });
      } else if (file.size / 1024 / 1024 > maxSizeMB) {
        invalidFiles.push({
          fileName: file.name,
          reason: `File exceeds ${maxSizeMB}MB size limit`,
        });
      }
    });

    if (invalidFiles.length > 0) {
      showToast({
        message: `${invalidFiles.length} file(s) have validation errors. Please remove them before uploading.`,
        type: 'error',
      });
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(files);
      setFiles([]);
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    showToast({
      message: 'File removed from upload list.',
      type: 'info',
    });
  };

  const handleClose = () => {
    if (files.length > 0) {
      showToast({
        message: 'Upload canceled. Files have been cleared.',
        type: 'info',
      });
    }
    setFiles([]);
    onClose();
  };

  return (
    <>
      {isUploading && (
        <div className="fixed inset-0 flex items-center justify-center z-[1001]">
          <Loader />
        </div>
      )}
      <Modal
        open={isOpen}
        onCancel={handleClose}
        footer={null}
        closeIcon={null}
        width={500}
        className="file-upload-modal"
      >
        <div className="flex flex-col p-1">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-center flex-1">{title}</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 cursor-pointer p-1"
              disabled={isUploading}
            >
              <MdClose size={24} />
            </button>
          </div>
          <Upload.Dragger
            multiple
            accept={accept}
            beforeUpload={(file) => {
              handleFileSelect([file]);
              return Upload.LIST_IGNORE;
            }}
            fileList={[]}
            showUploadList={false}
            disabled={isUploading}
          >
            <div className="flex flex-col items-center p-4">
              <FiUploadCloud size={40} className="text-primary mb-2" />
              <p className="text-gray-600 text-sm mb-1">Click to upload or drag files here</p>
              <p className="text-xs text-gray-400 text-center">
                ({getAllowedTypesDisplay()} - max {maxSizeMB}MB each, up to {maxFiles} file(s))
              </p>
            </div>
          </Upload.Dragger>
          {files.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">Selected files: {files.length}</p>
              <div className="max-h-40 overflow-y-auto border rounded p-3">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm text-green-600 mb-2 last:mb-0"
                  >
                    <span className="truncate flex-1" title={file.name}>
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({(file.size / 1024 / 1024).toFixed(2)}MB)
                    </span>
                    <RiDeleteBin6Line
                      className="cursor-pointer text-red-500 ml-2 flex-shrink-0"
                      onClick={() => removeFile(index)}
                      title="Remove file"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className={`mt-6 w-full py-3 rounded-lg text-white font-semibold transition-colors ${
              files.length > 0 && !isUploading
                ? 'bg-primary cursor-pointer'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isUploading ? (
              <div className="flex items-center justify-center">
                <Spin size="small" className="mr-2" />
                UPLOADING...
              </div>
            ) : (
              `${uploadText} (${files.length})`
            )}
          </button>
        </div>
      </Modal>
    </>
  );
};

export default FileUploadModal;
