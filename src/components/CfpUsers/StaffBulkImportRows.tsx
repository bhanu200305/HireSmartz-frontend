import React, { useMemo } from 'react';
import { Select } from 'antd';
import { Input } from '../shared';
import type {
  ParsedStaffRosterRow,
  StaffRosterRole,
} from '../../api/organization-service/Platform/staffImports';
import type { PlatformDepartment } from '../../api/organization-service/Platform/staff';

export type StaffReviewRow = {
  include: boolean;
  email: string;
  role: StaffRosterRole | '';
  /** A real PlatformDepartment.department_id, unlike the tenant roster
   * flow's free-text department name — confirm_staff_roster_import.py
   * validates this as a foreign key, not a string to create-or-match. */
  departmentId: string | undefined;
  designation: string;
};

// Preselect a row's role/department only when the parsed spreadsheet value
// matches a real one — same "leave it blank for the reviewer to pick rather
// than guess" precedent Tenants/BulkImportRows.tsx's toReviewRows sets, for
// the same reason: the sheet's free-text columns won't reliably match the
// catalogue's exact spelling or casing.
export const toReviewRows = (
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
    designation: row.designation || '',
  }));
};

type StaffBulkImportRowsProps = {
  roleNames: string[];
  isLoadingRoles?: boolean;
  departments: PlatformDepartment[];
  rows: StaffReviewRow[];
  onChange: (rows: StaffReviewRow[]) => void;
};

/** Per-row review before confirming a platform-staff bulk import — mirrors
 * Tenants/BulkImportRows.tsx's shape (checkbox, role, designation), with
 * department as a catalogue SELECT instead of free text, since this flow's
 * department is a real foreign key rather than a create-or-match name. */
const StaffBulkImportRows: React.FC<StaffBulkImportRowsProps> = ({
  roleNames,
  isLoadingRoles,
  departments,
  rows,
  onChange,
}) => {
  const roleOptions = useMemo(
    () => roleNames.map((name) => ({ label: name, value: name })),
    [roleNames]
  );
  const departmentOptions = useMemo(
    () => departments.map((d) => ({ label: d.name, value: d.department_id })),
    [departments]
  );

  const updateRow = (index: number, patch: Partial<StaffReviewRow>) => {
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
            className="w-32"
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
            className="w-32"
            placeholder="Department"
            value={row.departmentId}
            onChange={(value) => updateRow(index, { departmentId: value })}
            allowClear
            showSearch
            optionFilterProp="label"
            options={departmentOptions}
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

export default StaffBulkImportRows;
