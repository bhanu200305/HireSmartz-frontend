import React from 'react';
import type { BulkImportRoleRow } from './types';

type BulkImportPreviewTableProps = {
  rows: BulkImportRoleRow[];
};

/** Review-table rendering for the bulk-import flow's parsed rows. */
const BulkImportPreviewTable: React.FC<BulkImportPreviewTableProps> = ({ rows }) => (
  <div className="overflow-x-auto border border-gray-200 rounded-xl">
    <table className="w-full text-sm min-w-[560px]">
      <thead>
        <tr className="bg-gray-50 text-left text-[10.5px] uppercase tracking-wide text-gray-500">
          <th className="px-3.5 py-2.5 font-semibold">Designation</th>
          <th className="px-3.5 py-2.5 font-semibold">Tier</th>
          <th className="px-3.5 py-2.5 font-semibold">Base Template</th>
          <th className="px-3.5 py-2.5 font-semibold">Permissions</th>
          <th className="px-3.5 py-2.5 font-semibold">Location</th>
          <th className="px-3.5 py-2.5 font-semibold">Status</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="px-3.5 py-2.5">{row.roleName}</td>
            <td className="px-3.5 py-2.5">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                  row.scope === 'platform' ? 'bg-info-bg text-info-text' : 'bg-neutral-100 text-neutral-600'
                }`}
              >
                {row.scope === 'platform' ? 'Platform' : 'Company'}
              </span>
            </td>
            <td className="px-3.5 py-2.5 text-gray-500 font-mono text-xs">{row.templateKey}</td>
            <td className="px-3.5 py-2.5 text-gray-500">{row.permissions.length}</td>
            <td className="px-3.5 py-2.5 text-gray-500">
              {row.locationPermissions.length > 0
                ? row.locationPermissions.map((loc) => loc.locationName).join(', ')
                : '—'}
            </td>
            <td className="px-3.5 py-2.5">
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold bg-success-bg text-success-text">
                ✓ Ready
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default BulkImportPreviewTable;
