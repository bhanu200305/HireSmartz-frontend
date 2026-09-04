import React, { useMemo } from 'react';
import { Select } from 'antd';
import type { ParsedStaffRosterRow } from '../../../api/organization-service/Platform/staffImports';
import type { PlatformDepartment } from '../../../api/organization-service/Platform/staff';

export type StaffReviewRow = {
  include: boolean;
  email: string;
  role: string;
  departmentId: string | undefined;
};

// Preselect a row's role/department only when the parsed free-text value
// matches a real one in the platform catalogue (case-insensitive — the
// spreadsheet's own casing won't reliably match). Anything else is left
// blank for the reviewer to pick, same discipline the tenant roster's own
// toReviewRows uses for role.
export const toStaffReviewRows = (
  rows: ParsedStaffRosterRow[],
  knownRoleNames: string[],
  departments: PlatformDepartment[]
): StaffReviewRow[] => {
  const roleByLowerName = new Map(knownRoleNames.map((name) => [name.toLowerCase(), name]));
  const deptByLowerName = new Map(departments.map((d) => [d.name.toLowerCase(), d.department_id]));
  return rows.map((row) => ({
    include: true,
    email: row.email,
    role: roleByLowerName.get((row.role || '').toLowerCase()) ?? '',
    departmentId: deptByLowerName.get((row.department || '').toLowerCase()),
  }));
};

type StaffBulkImportRowsProps = {
  roleOptions: { label: string; value: string }[];
  isLoadingRoles?: boolean;
  departments: PlatformDepartment[];
  isLoadingDepartments?: boolean;
  rows: StaffReviewRow[];
  onChange: (rows: StaffReviewRow[]) => void;
};

/** Per-row review before confirming a platform staff bulk import — mirrors
 * MyCompany/Team/BulkImport/BulkImportRows.tsx, with two differences forced
 * by the backend contract (confirm_staff_roster_import.py): Department is a
 * Select against the real platform catalogue (department_id, not free
 * text — there's no get-or-create-by-name for platform departments), and
 * there is no Designation column — the backend accepts but silently drops
 * that field for staff rows, so showing an editable input for it here would
 * imply it does something it doesn't. */
const StaffBulkImportRows: React.FC<StaffBulkImportRowsProps> = ({
  roleOptions,
  isLoadingRoles,
  departments,
  isLoadingDepartments,
  rows,
  onChange,
}) => {
  const departmentOptions = useMemo(
    () => departments.map((d) => ({ label: d.name, value: d.department_id })),
    [departments]
  );

  const updateRow = (index: number, patch: Partial<StaffReviewRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const GRID_COLUMNS = '28px minmax(0,2fr) minmax(0,1.3fr) minmax(0,1.3fr)';

  return (
    <div className="overflow-x-auto rounded-xl border">
      <div className="min-w-[560px]">
        <div
          className="grid items-center gap-3 border-b bg-gray-50 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-500"
          style={{ gridTemplateColumns: GRID_COLUMNS }}
        >
          <span />
          <span>Email</span>
          <span>Role *</span>
          <span>Department</span>
        </div>
        <div className="max-h-72 overflow-y-auto divide-y">
          {rows.map((row, index) => (
            <div
              key={row.email + index}
              className="grid items-center gap-3 px-3 py-2"
              style={{ gridTemplateColumns: GRID_COLUMNS }}
            >
              <input
                type="checkbox"
                checked={row.include}
                onChange={(e) => updateRow(index, { include: e.target.checked })}
                aria-label={`Include ${row.email}`}
              />
              <span className="truncate text-sm" title={row.email}>
                {row.email}
              </span>
              <Select
                size="small"
                className="w-full"
                placeholder="Role *"
                value={row.role || undefined}
                onChange={(value) => updateRow(index, { role: value })}
                loading={isLoadingRoles}
                showSearch
                optionFilterProp="label"
                options={roleOptions}
              />
              <Select
                size="small"
                className="w-full"
                placeholder="Department (optional)"
                value={row.departmentId}
                onChange={(value) => updateRow(index, { departmentId: value })}
                loading={isLoadingDepartments}
                allowClear
                showSearch
                optionFilterProp="label"
                options={departmentOptions}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StaffBulkImportRows;
