import React from 'react';
import { Select } from 'antd';
import { Input } from '../../../shared';
import type {
  ParsedRosterRow,
  RosterRole,
} from '../../../../api/organization-service/Tenants/imports';

const KNOWN_ROLES: RosterRole[] = ['hiring_manager', 'recruiter'];

export type ReviewRow = {
  include: boolean;
  email: string;
  role: RosterRole | '';
  department: string;
  designation: string;
};

export const toReviewRows = (rows: ParsedRosterRow[]): ReviewRow[] =>
  rows.map((row) => ({
    include: true,
    email: row.email,
    role: (KNOWN_ROLES as string[]).includes(row.role || '') ? (row.role as RosterRole) : '',
    department: row.department || '',
    designation: row.designation || '',
  }));

type BulkImportRowsProps = {
  rows: ReviewRow[];
  onChange: (rows: ReviewRow[]) => void;
};

/** Per-row review before confirming a bulk import — every parsed row needs a
 * valid role picked (the AI-detected value may be missing/ambiguous) before
 * it can become an invite; a row can be excluded instead of guessed at.
 * Only `hiring_manager`/`recruiter` are real options — RosterRowRequest's
 * `extra="forbid"` Literal role on the backend rejects anything else for the
 * WHOLE batch, not just the one row. */
const BulkImportRows: React.FC<BulkImportRowsProps> = ({ rows, onChange }) => {
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
            options={[
              { label: 'Hiring Manager', value: 'hiring_manager' },
              { label: 'Recruiter', value: 'recruiter' },
            ]}
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
