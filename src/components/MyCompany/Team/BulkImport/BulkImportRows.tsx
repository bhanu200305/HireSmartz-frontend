import React, { useMemo } from 'react';
import { Select } from 'antd';
import { Input } from '../../../shared';
import type {
  ParsedRosterRow,
  RosterRole,
} from '../../../../api/organization-service/Tenants/imports';
import type { Role } from '../../../../api/organization-service/Roles/roles';

export type ReviewRow = {
  include: boolean;
  email: string;
  role: RosterRole | '';
  department: string;
  designation: string;
};

// Preselect a row's role only when the parsed value matches a real role in
// this tenant's catalog (case-insensitive — the spreadsheet's free-text role
// column won't reliably match the catalog's exact casing). Anything else is
// left blank for the reviewer to pick, same as an unrecognised value always
// has been.
export const toReviewRows = (rows: ParsedRosterRow[], knownRoleNames: string[]): ReviewRow[] => {
  const byLowerName = new Map(knownRoleNames.map((name) => [name.toLowerCase(), name]));
  return rows.map((row) => ({
    include: true,
    email: row.email,
    role: byLowerName.get((row.role || '').toLowerCase()) ?? '',
    department: row.department || '',
    designation: row.designation || '',
  }));
};

type BulkImportRowsProps = {
  roles: Role[];
  isLoadingRoles?: boolean;
  rows: ReviewRow[];
  onChange: (rows: ReviewRow[]) => void;
};

/** Per-row review before confirming a bulk import — every parsed row needs a
 * valid role picked (the AI-detected value may be missing/ambiguous) before
 * it can become an invite; a row can be excluded instead of guessed at.
 * The role options come from this tenant's own role catalog (GET /v1/roles)
 * — RosterRowRequest.role is free text on the backend, validated per-row
 * against that same catalog at confirm time, so any role name the tenant has
 * defined (system or custom) is a valid pick here, not just
 * hiring_manager/recruiter. */
const BulkImportRows: React.FC<BulkImportRowsProps> = ({
  roles,
  isLoadingRoles,
  rows,
  onChange,
}) => {
  const roleOptions = useMemo(
    () => roles.map((role) => ({ label: role.name, value: role.name })),
    [roles]
  );

  const updateRow = (index: number, patch: Partial<ReviewRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  return (
    <div className="max-h-72 overflow-y-auto border rounded-xl divide-y">
      {rows.map((row, index) => (
        <div key={row.email + index} className="flex items-center gap-2 p-2">
          <input
            type="checkbox"
            checked={row.include}
            onChange={(e) => updateRow(index, { include: e.target.checked })}
            aria-label={`Include ${row.email}`}
          />
          <span className="flex-1 text-sm truncate" title={row.email}>
            {row.email}
          </span>
          <Select
            size="small"
            className="w-36"
            placeholder="Role *"
            value={row.role || undefined}
            onChange={(value) => updateRow(index, { role: value })}
            loading={isLoadingRoles}
            showSearch
            optionFilterProp="label"
            options={roleOptions}
          />
          <Input
            className="w-28 h-8 text-sm"
            placeholder="Department"
            value={row.department}
            onChange={(e) => updateRow(index, { department: e.target.value })}
          />
          <Input
            className="w-28 h-8 text-sm"
            placeholder="Designation"
            value={row.designation}
            onChange={(e) => updateRow(index, { designation: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
};

export default BulkImportRows;
