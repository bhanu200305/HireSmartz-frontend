import { useState } from 'react';
import { Upload } from 'antd';
import { MdOutlineFileUpload, MdOutlineDownload } from 'react-icons/md';
import { FaCheckCircle } from 'react-icons/fa';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import { Button, showToast, StepIndicator, type Step } from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  useUploadStaffRosterMutation,
  useParseStaffRosterMutation,
  useConfirmStaffRosterImportMutation,
  useLazyGetStaffRosterTemplateUrlQuery,
  downloadStaffRosterTemplate,
  type StaffRosterRowFailure,
} from '../../api/organization-service/Platform/staffImports';
import { useListPlatformDepartmentsQuery } from '../../api/organization-service/Platform/staff';
import { useRolesCatalog } from '../../hooks/useRolesCatalog';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import StaffBulkImportRows, { type StaffReviewRow, toReviewRows } from './StaffBulkImportRows';

const IMPORT_STEPS: Step[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

// .xlsx ONLY — same reasoning as Tenants/BulkImport/index.tsx's own
// ALLOWED_IMPORT_TYPES: ai-service's spreadsheet_parser.py is openpyxl-based
// and only reads real .xlsx content, regardless of what a .csv or legacy
// .xls claims its content-type is.
const ALLOWED_IMPORT_TYPES = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

type StaffBulkImportProps = {
  open: boolean;
  onClose: () => void;
};

/** Platform staff's own 3-step bulk-import flow — upload a spreadsheet,
 * review/edit the detected rows, confirm. Same shape as
 * Tenants/BulkImport/index.tsx, over /v1/platform/staff/bulk-import/* —
 * see staffImports.ts for why step 1 is a single server-mediated POST
 * instead of a presigned-S3 upload. */
const StaffBulkImport = ({ open, onClose }: StaffBulkImportProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rows, setRows] = useState<StaffReviewRow[]>([]);
  const [result, setResult] = useState<{
    created: number;
    failures: StaffRosterRowFailure[];
  } | null>(null);

  const { roles, isLoading: isLoadingRoles } = useRolesCatalog({
    scope: 'platform',
    isMaster: true,
  });
  const roleNames = roles.map((role) => role.roleName);
  const { data: departments = [] } = useListPlatformDepartmentsQuery(undefined, { skip: !open });

  const [uploadRoster, { isLoading: isUploading }] = useUploadStaffRosterMutation();
  const [parseRoster, { isLoading: isParsing }] = useParseStaffRosterMutation();
  const [confirmImport, { isLoading: isConfirming }] = useConfirmStaffRosterImportMutation();
  const [fetchTemplateUrl, { isFetching: isFetchingTemplate }] =
    useLazyGetStaffRosterTemplateUrlQuery();

  const isBusy = isUploading || isParsing || isConfirming;

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
      const { storage_key } = await uploadRoster(file).unwrap();
      const parsed = await parseRoster(storage_key).unwrap();
      setRows(toReviewRows(parsed.rows, roleNames, departments));
      setStep(2);
    } catch (error: unknown) {
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
        rows: confirmedRows.map((row) => ({
          email: row.email,
          role: row.role as string,
          department_id: row.departmentId || undefined,
          designation: row.designation || undefined,
        })),
      }).unwrap();
      setResult({ created: response.created_count, failures: response.failures ?? [] });
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
      const { download_url } = await fetchTemplateUrl().unwrap();
      await downloadStaffRosterTemplate(download_url);
    } catch {
      showToast({ message: 'Failed to download the template.', type: 'error' });
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={resetAndClose}
      title="Import Staff"
      modalProps={{ width: 560 }}
    >
      {(isBusy || isFetchingTemplate) && <Loader />}
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
            <p className="text-gray-600">Upload a spreadsheet of internal staff</p>
            <p className="text-xs text-gray-400 mt-1">.xlsx only</p>
          </Upload.Dragger>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="text-xs text-gray-500 mb-3">
            {rows.filter((r) => r.include).length} of {rows.length} rows will be invited. Pick a
            role for each — a row with no role can&apos;t be confirmed. Role must match a real
            platform role; department is optional.
          </p>
          <StaffBulkImportRows
            roleNames={roleNames}
            isLoadingRoles={isLoadingRoles}
            departments={departments}
            rows={rows}
            onChange={setRows}
          />
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
          {result.failures.length > 0 && (
            <div className="w-full text-left mt-2">
              <p className="text-xs font-medium text-red-600 mb-1">
                {result.failures.length} row{result.failures.length !== 1 ? 's' : ''} could not be
                imported:
              </p>
              <ul className="max-h-40 overflow-y-auto border border-red-100 rounded-lg divide-y">
                {result.failures.map((failure) => (
                  <li
                    key={`${failure.row_number}-${failure.email}`}
                    className="text-xs text-red-700 px-3 py-1.5"
                  >
                    Row {failure.row_number} ({failure.email}): {failure.reason}
                  </li>
                ))}
              </ul>
            </div>
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

export default StaffBulkImport;
