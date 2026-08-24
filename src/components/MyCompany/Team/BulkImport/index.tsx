import { useState } from 'react';
import { Upload } from 'antd';
import { MdOutlineFileUpload, MdOutlineDownload } from 'react-icons/md';
import { FaCheckCircle } from 'react-icons/fa';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Button, showToast, StepIndicator, type Step } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import {
  useRequestRosterUploadMutation,
  useParseRosterMutation,
  useConfirmRosterImportMutation,
  uploadRosterFile,
  downloadRosterTemplate,
  type RosterRole,
} from '../../../../api/organization-service/Tenants/imports';
import { getOrgErrorMessage } from '../../../../shared/utils/auth/orgError.helpers';
import BulkImportRows, { ReviewRow, toReviewRows } from './BulkImportRows';

const IMPORT_STEPS: Step[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

// .xlsx ONLY. The parse step (ai-service's spreadsheet_parser.py) is
// openpyxl-based, which reads real .xlsx (OOXML/zip) content exclusively —
// it cannot open a genuine .csv or legacy binary .xls, regardless of what
// content-type or extension is attached. request_roster_upload.py's
// ROSTER_EXCEL_CONSTRAINT technically also accepts 'application/vnd.ms-excel'
// (.xls) at the upload step, but that would only defer the same failure to
// parse time with a more confusing error, so it's excluded here too. A .csv
// is rejected even earlier, at upload-url time — organization-service's
// constraint never accepted 'text/csv' at all.
const ALLOWED_IMPORT_TYPES = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

type BulkImportProps = {
  open: boolean;
  tenantId: string;
  onClose: () => void;
};

/** The real 3-step roster flow — request an upload URL, upload straight to
 * storage, parse; then review/edit the detected rows and confirm. */
const BulkImport = ({ open, tenantId, onClose }: BulkImportProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    suppressed: number;
  } | null>(null);

  const [requestUpload, { isLoading: isRequestingUrl }] = useRequestRosterUploadMutation();
  const [parseRoster, { isLoading: isParsing }] = useParseRosterMutation();
  const [confirmImport, { isLoading: isConfirming }] = useConfirmRosterImportMutation();
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const isBusy = isRequestingUrl || isParsing || isConfirming || isUploadingFile;

  const resetAndClose = () => {
    setStep(1);
    setRows([]);
    setResult(null);
    onClose();
  };

  const handleUpload = async (file: File) => {
    const isAllowedType = ALLOWED_IMPORT_TYPES.includes(file.type) || /\.xlsx$/i.test(file.name);
    if (!isAllowedType) {
      showToast({ message: 'Please upload a .xlsx file.', type: 'error' });
      return false;
    }

    try {
      const target = await requestUpload({
        tenantId,
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
      }).unwrap();

      setIsUploadingFile(true);
      await uploadRosterFile(target, file);
      setIsUploadingFile(false);

      const parsed = await parseRoster({ tenantId, storage_key: target.storage_key }).unwrap();
      setRows(toReviewRows(parsed.rows));
      setStep(2);
    } catch (error: unknown) {
      setIsUploadingFile(false);
      showToast({
        message: getOrgErrorMessage(error, 'Failed to parse the spreadsheet. Please try again.'),
        type: 'error',
      });
    }
    return false;
  };

  const handleConfirm = async () => {
    const confirmedRows = rows.filter((row) => row.include);
    const invalidRow = confirmedRows.find((row) => !row.role);
    if (invalidRow) {
      showToast({ message: `${invalidRow.email} needs a role before confirming.`, type: 'error' });
      return;
    }
    try {
      const response = await confirmImport({
        tenantId,
        rows: confirmedRows.map((row) => ({
          email: row.email,
          role: row.role as RosterRole,
          department: row.department || undefined,
          designation: row.designation || undefined,
        })),
      }).unwrap();
      setResult({
        created: response.created_count,
        skipped: response.skipped_duplicate_emails.length,
        suppressed: response.previously_suppressed_emails.length,
      });
      setStep(3);
    } catch (error: unknown) {
      showToast({
        message: getOrgErrorMessage(error, 'Failed to confirm the import. Please try again.'),
        type: 'error',
      });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadRosterTemplate(tenantId);
    } catch {
      showToast({ message: 'Failed to download the template.', type: 'error' });
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={resetAndClose}
      title="Import Team"
      modalProps={{ width: 560 }}
    >
      {isBusy && <Loader />}
      <StepIndicator steps={IMPORT_STEPS} currentStep={step} className="mb-6" />

      {step === 1 && (
        <div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1 text-sm text-primary hover:underline mb-3 cursor-pointer"
          >
            <MdOutlineDownload /> Download the roster template
          </button>
          <Upload.Dragger
            beforeUpload={handleUpload}
            maxCount={1}
            accept=".xlsx"
            showUploadList={false}
            className="border-dashed border-gray-300 rounded-lg p-6"
          >
            <MdOutlineFileUpload className="text-2xl mb-2 text-primary mx-auto" />
            <p className="text-gray-600">Upload a spreadsheet of existing employees</p>
            <p className="text-xs text-gray-400 mt-1">.xlsx only</p>
          </Upload.Dragger>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-xs text-gray-500 mb-3">
            {rows.filter((r) => r.include).length} of {rows.length} rows will be invited. Pick a
            role for each — a row with no role can&apos;t be confirmed.
          </p>
          <BulkImportRows rows={rows} onChange={setRows} />
          <div className="flex items-center gap-2 mt-4">
            <Button
              type="button"
              onClick={() => setStep(1)}
              className="w-full bg-white border text-black rounded-3xl py-2.5"
            >
              BACK
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isConfirming || rows.filter((r) => r.include).length === 0}
              className="w-full text-white bg-[var(--color-primary)] rounded-3xl py-2.5 disabled:opacity-50"
            >
              Confirm & Send Invites
            </Button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="flex flex-col items-center text-center gap-2 py-4">
          <FaCheckCircle className="text-4xl text-brand-600" />
          <p className="text-sm text-gray-700">
            {result.created} invitation{result.created !== 1 ? 's' : ''} sent.
          </p>
          {result.skipped > 0 && (
            <p className="text-xs text-gray-500">{result.skipped} skipped — already invited.</p>
          )}
          {result.suppressed > 0 && (
            <p className="text-xs text-amber-600">
              {result.suppressed} invited but flagged as a previously-bounced address.
            </p>
          )}
          <Button
            type="button"
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
