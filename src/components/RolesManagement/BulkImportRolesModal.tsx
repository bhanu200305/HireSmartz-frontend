import React, { useState } from 'react';
import { Modal, Upload } from 'antd';
import { FiUploadCloud } from 'react-icons/fi';
import { showToast } from '../shared';
import BulkImportPreviewTable from './BulkImportPreviewTable';
import { bulkImportPlaceholderRows, bulkImportTemplatePreview } from './data/bulkImportFixtures';
import type { BulkImportRoleRow } from './types';
import type { Role, RoleScope } from '../../types';

type BulkImportRolesModalProps = {
  open: boolean;
  onClose: () => void;
  scope: RoleScope;
  onImport: (rows: BulkImportRoleRow[]) => Promise<Role[]>;
};

type Stage = 'upload' | 'parsing' | 'review';

/** 3-step local flow: template preview + dropzone → mock parse delay →
 * review table → import. Mirrors FileUploadModal's Upload.Dragger pattern
 * directly rather than nesting it, since this modal needs its own
 * multi-step footer instead of FileUploadModal's single upload button. */
const BulkImportRolesModal: React.FC<BulkImportRolesModalProps> = ({
  open,
  onClose,
  scope,
  onImport,
}) => {
  const [stage, setStage] = useState<Stage>('upload');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<BulkImportRoleRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const reset = () => {
    setStage('upload');
    setFileName('');
    setRows([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const runMockParse = (name: string) => {
    setFileName(name);
    setStage('parsing');
    setTimeout(() => {
      setRows(bulkImportPlaceholderRows(scope));
      setStage('review');
    }, 800);
  };

  const handleDownloadTemplate = () => {
    showToast({ message: 'Template downloaded (mock — nothing is persisted yet).', type: 'info' });
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await onImport(rows);
      showToast({
        message: `${rows.length} role${rows.length === 1 ? '' : 's'} imported.`,
        type: 'success',
      });
      handleClose();
    } catch {
      showToast({ message: 'Failed to import roles.', type: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      centered
      maskClosable={false}
      width={720}
      className="ant-custom-modal"
    >
      <div className="-mx-6 -mt-6 mb-5 px-6 py-4 rounded-t-2xl bg-gradient-to-r from-primary-700 via-primary-500 to-accent-500 text-white">
        <div className="text-[10.5px] font-bold uppercase tracking-wide text-white/70 mb-0.5">
          Bulk Import
        </div>
        <h2 className="font-display text-base font-bold">Import Roles from a Spreadsheet</h2>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Build several roles at once — download the template, fill in one row per role, then upload
        it back here.
      </p>

      <div className="font-semibold text-sm text-gray-900 mb-2">1. Download the template</div>
      <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-full px-3.5 py-2 flex items-center gap-1.5 cursor-pointer"
        >
          ⬇ Download Template (.xlsx)
        </button>
        <span className="text-[11px] text-gray-400">
          Mock action for the prototype — see the exact columns below.
        </span>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-xl mb-5">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 text-left text-[10.5px] uppercase tracking-wide text-gray-500">
              <th className="px-3.5 py-2.5 font-semibold">Designation</th>
              <th className="px-3.5 py-2.5 font-semibold">Tier</th>
              <th className="px-3.5 py-2.5 font-semibold">Base Template</th>
              <th className="px-3.5 py-2.5 font-semibold">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bulkImportTemplatePreview.map((row) => (
              <tr key={row.designation}>
                <td className="px-3.5 py-2.5">{row.designation}</td>
                <td className="px-3.5 py-2.5 text-gray-500">{row.tier}</td>
                <td className="px-3.5 py-2.5 text-gray-500 font-mono text-xs">
                  {row.baseTemplate}
                </td>
                <td className="px-3.5 py-2.5 text-gray-500">{row.locationLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stage === 'upload' && (
        <>
          <div className="font-semibold text-sm text-gray-900 mb-2">
            2. Upload your completed file
          </div>
          <Upload.Dragger
            accept=".xls,.xlsx,.csv"
            showUploadList={false}
            beforeUpload={(file) => {
              runMockParse(file.name);
              return Upload.LIST_IGNORE;
            }}
            className="mb-2.5"
          >
            <div className="flex flex-col items-center py-6">
              <FiUploadCloud size={22} className="text-primary-500 mb-1.5" />
              <p className="text-sm font-semibold text-gray-700">
                Drop your .xlsx or .csv file here, or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                One row per role · uses the columns above
              </p>
            </div>
          </Upload.Dragger>
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-gray-400">No file handy?</span>
            <button
              type="button"
              onClick={() => runMockParse('sample-import.xlsx')}
              className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-full px-3.5 py-1.5 cursor-pointer"
            >
              Next →
            </button>
          </div>
        </>
      )}

      {stage === 'parsing' && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <span className="animate-spin">⏳</span> Parsing {fileName}…
        </div>
      )}

      {stage === 'review' && (
        <>
          <div className="font-semibold text-sm text-gray-900 mb-2">3. Review &amp; import</div>
          <BulkImportPreviewTable rows={rows} />
          <p className="text-[11px] text-gray-400 mt-2">
            Parsed from <span className="font-semibold text-gray-600">{fileName}</span> — mock parse
            for the prototype; the real import would validate each row server-side.
          </p>
        </>
      )}

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={handleClose}
          className="text-sm font-semibold text-gray-600 border border-gray-200 rounded-full px-5 py-2 cursor-pointer"
        >
          Cancel
        </button>
        {stage === 'review' && (
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || rows.length === 0}
            className="text-sm font-semibold text-white bg-primary-600 rounded-full px-5 py-2 disabled:opacity-60 cursor-pointer"
          >
            {isImporting ? 'Importing…' : `✓ Import ${rows.length} Roles`}
          </button>
        )}
      </div>
    </Modal>
  );
};

export default BulkImportRolesModal;
