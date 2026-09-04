import { useState } from 'react';
import { Upload } from 'antd';
import { MdOutlineFileUpload, MdOutlineDownload } from 'react-icons/md';
import { FaCheckCircle } from 'react-icons/fa';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Button, showToast, StepIndicator, type Step } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import {
  useUploadRosterMutation,
  useParseRosterMutation,
  useConfirmRosterImportMutation,
  useLazyGetRosterImportTemplateUrlQuery,
  downloadRosterTemplate,
  type RosterRole,
  type RosterRowFailure,
} from '../../../../api/organization-service/Tenants/imports';
import {
  useUploadPlatformRosterMutation,
  useParsePlatformRosterMutation,
  useConfirmPlatformRosterImportMutation,
  useLazyGetPlatformRosterImportTemplateUrlQuery,
  downloadPlatformRosterTemplate,
} from '../../../../api/organization-service/Platform/imports';
import { useListRolesQuery } from '../../../../api/organization-service/Roles/roles';
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
// is rejected even earlier, at upload time — organization-service's
// constraint never accepted 'text/csv' at all.
const ALLOWED_IMPORT_TYPES = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

type BulkImportProps = {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  // Set from Super Admin's per-tenant Users tab, running this exact same
  // flow on behalf of a tenant it doesn't own — same platform_router.py
  // "everything below reuses a use case Company Admin already has" pattern
  // as the rest of that surface. Switches every call over to the
  // /v1/platform/tenants/{tenant_id}/... mirror endpoints.
  isMaster?: boolean;
};

/** The real 3-step roster flow — upload the file directly to
 * organization-service, parse; then review/edit the detected rows and
 * confirm. */
const BulkImport = ({ open, tenantId, onClose, isMaster = false }: BulkImportProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    suppressed: number;
    failures: RosterRowFailure[];
  } | null>(null);

  // This tenant's own role catalog — the role select in the review step
  // offers every role here (system or custom), not a fixed two-option list.
  const { data: roles, isLoading: isLoadingRoles } = useListRolesQuery(
    { scope: 'tenant', tenantId, isMaster },
    { skip: !open || !tenantId }
  );

  // Both tenant-self and platform-mirror mutation hooks are always called
  // (React's rules of hooks — a hook can't be called conditionally), only
  // one pair is ever actually invoked below, picked by `isMaster`.
  const [uploadTenantRoster, uploadTenantRosterState] = useUploadRosterMutation();
  const [uploadPlatformRoster, uploadPlatformRosterState] = useUploadPlatformRosterMutation();
  const [parseTenantRoster, parseTenantRosterState] = useParseRosterMutation();
  const [parsePlatformRoster, parsePlatformRosterState] = useParsePlatformRosterMutation();
  const [confirmTenantImport, confirmTenantImportState] = useConfirmRosterImportMutation();
  const [confirmPlatformImport, confirmPlatformImportState] =
    useConfirmPlatformRosterImportMutation();
  const [fetchTenantTemplateUrl, tenantTemplateState] = useLazyGetRosterImportTemplateUrlQuery();
  const [fetchPlatformTemplateUrl, platformTemplateState] =
    useLazyGetPlatformRosterImportTemplateUrlQuery();

  const uploadRoster = isMaster ? uploadPlatformRoster : uploadTenantRoster;
  const parseRoster = isMaster ? parsePlatformRoster : parseTenantRoster;
  const confirmImport = isMaster ? confirmPlatformImport : confirmTenantImport;
  const isUploading = isMaster
    ? uploadPlatformRosterState.isLoading
    : uploadTenantRosterState.isLoading;
  const isParsing = isMaster
    ? parsePlatformRosterState.isLoading
    : parseTenantRosterState.isLoading;
  const isConfirming = isMaster
    ? confirmPlatformImportState.isLoading
    : confirmTenantImportState.isLoading;
  const isFetchingTemplate = isMaster
    ? platformTemplateState.isFetching
    : tenantTemplateState.isFetching;

  const isBusy = isUploading || isParsing || isConfirming || isFetchingTemplate;

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
      const { storage_key } = await uploadRoster({ tenantId, file }).unwrap();
      const parsed = await parseRoster({ tenantId, storage_key }).unwrap();
      setRows(
        toReviewRows(
          parsed.rows,
          (roles ?? []).map((role) => role.name)
        )
      );
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
        failures: response.failures ?? [],
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
      const fetchTemplateUrl = isMaster ? fetchPlatformTemplateUrl : fetchTenantTemplateUrl;
      const download = isMaster ? downloadPlatformRosterTemplate : downloadRosterTemplate;
      const { download_url } = await fetchTemplateUrl(tenantId).unwrap();
      await download(download_url);
    } catch {
      showToast({ message: 'Failed to download the template.', type: 'error' });
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={resetAndClose}
      title="Import Team"
      // Step 2's review table needs real room for five columns
      // (checkbox/email/role/department/designation) — 560px is enough for
      // steps 1 and 3 (a dropzone, a result summary) but squeezed everything
      // in step 2 down to illegible, truncated pills.
      modalProps={{ width: step === 2 ? 880 : 560 }}
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
          <BulkImportRows
            roles={roles ?? []}
            isLoadingRoles={isLoadingRoles}
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
          {result.skipped > 0 && (
            <p className="text-xs text-gray-500">{result.skipped} skipped — already invited.</p>
          )}
          {result.suppressed > 0 && (
            <p className="text-xs text-amber-600">
              {result.suppressed} invited but flagged as a previously-bounced address.
            </p>
          )}
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

export default BulkImport;
