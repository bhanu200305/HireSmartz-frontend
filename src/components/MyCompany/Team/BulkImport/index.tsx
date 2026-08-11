import { useState } from 'react';
import { Upload } from 'antd';
import { get } from 'lodash-es';
import { MdOutlineFileUpload } from 'react-icons/md';
import { FaCheckCircle } from 'react-icons/fa';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Button, showToast, StepIndicator, type Step } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import {
  useUploadTenantImportMutation,
  useConfirmTenantImportMutation,
} from '../../../../api/organization-service/Tenants/imports';

const IMPORT_STEPS: Step[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'preview', label: 'Preview' },
  { key: 'done', label: 'Done' },
];

const ALLOWED_IMPORT_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv',
];

type BulkImportProps = {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  onCompleted: () => void;
};

const BulkImport = ({ open, tenantId, onClose, onCompleted }: BulkImportProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    detectedDepartments: number;
    detectedUsers: number;
    warnings: string[];
  } | null>(null);
  const [invitationsSent, setInvitationsSent] = useState<number | null>(null);

  const [uploadImport, { isLoading: isUploading }] = useUploadTenantImportMutation();
  const [confirmImport, { isLoading: isConfirming }] = useConfirmTenantImportMutation();

  const resetAndClose = () => {
    setStep(1);
    setBatchId(null);
    setPreview(null);
    setInvitationsSent(null);
    onClose();
  };

  const handleUpload = async (file: File) => {
    const isAllowedType =
      ALLOWED_IMPORT_TYPES.includes(file.type) || /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!isAllowedType) {
      showToast({ message: 'Please upload a .xlsx, .xls, or .csv file.', type: 'error' });
      return false;
    }

    try {
      const response = await uploadImport({ tenantId, file }).unwrap();
      setBatchId(response.batch_id);
      setPreview({
        detectedDepartments: response.detected_departments,
        detectedUsers: response.detected_users,
        warnings: response.warnings || [],
      });
      setStep(2);
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to parse the spreadsheet. Please try again.'),
        type: 'error',
      });
    }
    return false;
  };

  const handleConfirm = async () => {
    if (!batchId) return;
    try {
      // The upload response only returns counts + warnings, not per-row detail, so
      // there's nothing row-level for the admin to edit here — confirming just
      // greenlights the batch that was already detected server-side.
      const response = await confirmImport({ tenantId, batchId, confirmed_rows: [] }).unwrap();
      setInvitationsSent(response.invitations_sent);
      setStep(3);
      onCompleted();
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to confirm the import. Please try again.'),
        type: 'error',
      });
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={resetAndClose}
      title="Import Team"
      modalProps={{ width: 560 }}
    >
      {(isUploading || isConfirming) && <Loader />}
      <StepIndicator steps={IMPORT_STEPS} currentStep={step} className="mb-6" />

      {step === 1 && (
        <div>
          <Upload.Dragger
            beforeUpload={handleUpload}
            maxCount={1}
            accept=".xlsx,.xls,.csv"
            showUploadList={false}
            className="border-dashed border-gray-300 rounded-lg p-6"
          >
            <MdOutlineFileUpload className="text-2xl mb-2 text-primary mx-auto" />
            <p className="text-gray-600">Upload a spreadsheet of existing employees</p>
            <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, or .csv</p>
          </Upload.Dragger>
        </div>
      )}

      {step === 2 && preview && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-[var(--border)] bg-gray-50 p-4 text-center">
              <p className="text-2xl font-semibold text-gray-900">{preview.detectedDepartments}</p>
              <p className="text-xs text-gray-500">Departments detected</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-gray-50 p-4 text-center">
              <p className="text-2xl font-semibold text-gray-900">{preview.detectedUsers}</p>
              <p className="text-xs text-gray-500">People detected</p>
            </div>
          </div>

          {preview.warnings.length > 0 && (
            <div className="rounded-xl border border-warning-bg bg-warning-bg/40 p-3 mb-4">
              <p className="text-xs font-medium text-warning-text mb-1">
                {preview.warnings.length} row{preview.warnings.length > 1 ? 's' : ''} need attention
              </p>
              <ul className="text-xs text-warning-text list-disc list-inside space-y-0.5 max-h-32 overflow-auto">
                {preview.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-400 mb-4">
            Confirming creates {preview.detectedDepartments} department
            {preview.detectedDepartments !== 1 ? 's' : ''} and sends {preview.detectedUsers} invite
            {preview.detectedUsers !== 1 ? 's' : ''} in one batch.
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              appname="back to upload"
              onClick={() => setStep(1)}
              className="w-full bg-white border text-black rounded-3xl py-2.5"
            >
              BACK
            </Button>
            <Button
              type="button"
              appname="confirm import"
              onClick={handleConfirm}
              disabled={isConfirming}
              className="w-full text-white bg-[var(--color-primary)] rounded-3xl py-2.5 disabled:opacity-50"
            >
              Confirm & Send Invites
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center text-center gap-2 py-4">
          <FaCheckCircle className="text-4xl text-brand-600" />
          <p className="text-sm text-gray-700">
            {invitationsSent} invitation{invitationsSent !== 1 ? 's' : ''} sent.
          </p>
          <Button
            type="button"
            appname="close import"
            onClick={resetAndClose}
            className="mt-2 w-full max-w-xs text-white bg-[var(--color-primary)] rounded-3xl py-2.5"
          >
            Done
          </Button>
        </div>
      )}
    </AntdCommonModal>
  );
};

export default BulkImport;
