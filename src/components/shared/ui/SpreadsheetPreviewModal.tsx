import React, { useEffect, useState } from 'react';
import { Modal } from 'antd';
import * as XLSX from 'xlsx';
import { MdClose } from 'react-icons/md';
// `.cfp-h-scroll` (bold, always-visible horizontal scrollbar) — see this
// file's own table wrapper below for why: an arbitrary uploaded spreadsheet
// can run many columns wide, and the app's normal subtle/thin scrollbar
// style left that horizontal overflow undiscoverable, same fix CustomTable
// already applies to every other wide table in the app.
import './tableLayout.css';

const MAX_PREVIEW_ROWS = 50;

export type SpreadsheetPreviewSource = { kind: 'file'; file: File } | { kind: 'url'; url: string };

type SpreadsheetPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  source: SpreadsheetPreviewSource | null;
};

/** Reads a .xlsx/.csv file — either picked locally or fetched from a
 * (possibly cross-origin) download URL — and renders its first sheet as a
 * table, entirely client-side. No backend parsing endpoint involved. */
const SpreadsheetPreviewModal: React.FC<SpreadsheetPreviewModalProps> = ({
  open,
  onClose,
  title = 'Preview',
  source,
}) => {
  const [rows, setRows] = useState<unknown[][] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !source) {
      setRows(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setRows(null);

    (async () => {
      try {
        const buffer =
          source.kind === 'file'
            ? await source.file.arrayBuffer()
            : await fetch(source.url).then((res) => {
                if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
                return res.arrayBuffer();
              });
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          blankrows: false,
        });
        if (!cancelled) setRows(parsed.slice(0, MAX_PREVIEW_ROWS));
      } catch {
        if (!cancelled) {
          setError(
            source.kind === 'url'
              ? 'Could not load a preview of this file. The file storage may not allow in-browser preview from here — try "Download current template" instead.'
              : 'Could not preview this file. It may not be a valid .xlsx or .csv file.'
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, source]);

  const columnCount = rows?.reduce((max, row) => Math.max(max, row.length), 0) ?? 0;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closeIcon={<MdClose size={20} />}
      width={840}
    >
      {/* `modal-content cfp-modal-fill` (see index.css) stops antd's own
          `.ant-modal-body` fallback scrollbar from also kicking in once this
          grows past the viewport — that used to stack a second, outer
          scrollbar on top of the table's own below. `flex-1 min-h-0` on the
          table wrapper then lets it size to whatever space that actually
          leaves, instead of guessing a flat vh figure that can still be too
          tall on a shorter window. */}
      <div className="modal-content cfp-modal-fill gap-4">
        <h3 className="text-lg font-semibold mb-4 shrink-0">{title}</h3>

        {isLoading && <p className="text-sm text-gray-500">Loading preview…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {rows && rows.length === 0 && !isLoading && !error && (
          <p className="text-sm text-gray-500">This file has no rows to preview.</p>
        )}

        {rows && rows.length > 0 && (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto cfp-h-scroll border rounded-lg">
              <table className="min-w-full text-xs border-collapse">
                <thead>
                  <tr>
                    {Array.from({ length: columnCount }).map((_, i) => (
                      <th
                        key={i}
                        className="sticky top-0 bg-neutral-100 border-b px-3 py-2 text-left font-semibold text-neutral-600 whitespace-nowrap"
                      >
                        {String(rows[0]?.[i] ?? '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(1).map((row, ri) => (
                    <tr key={ri} className="border-b last:border-0">
                      {Array.from({ length: columnCount }).map((_, ci) => (
                        <td key={ci} className="px-3 py-2 whitespace-nowrap text-neutral-700">
                          {String(row[ci] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length >= MAX_PREVIEW_ROWS && (
              <p className="mt-2 text-xs text-gray-400 shrink-0">
                Showing first {MAX_PREVIEW_ROWS} rows.
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default SpreadsheetPreviewModal;
