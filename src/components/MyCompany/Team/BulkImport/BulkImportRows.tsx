import React from 'react';
import { Select } from 'antd';
import { Input } from '../../../shared';
import type { ParsedRosterRow, RosterRole } from '../../../../api/organization-service/Tenants/imports';

const KNOWN_ROLES: RosterRole[] = ['company_admin', 'hiring_manager', 'recruiter', 'interviewer'];

export type ReviewRow = {
  include: boolean;
  email: string;
  role: RosterRole | '';
  department: string;
  location: string;
};

export const toReviewRows = (rows: ParsedRosterRow[]): ReviewRow[] =>
  rows.map((row) => ({
    include: true,
    email: row.email,
    role: (KNOWN_ROLES as string[]).includes(row.role || '') ? (row.role as RosterRole) : '',
    department: row.department || '',
    location: row.location || '',
  }));

type BulkImportRowsProps = {
  rows: ReviewRow[];
  onChange: (rows: ReviewRow[]) => void;
};

/** Per-row review before confirming a bulk import — every parsed row needs a
 * valid role picked (the AI-detected value may be missing/ambiguous) before
 * it can become an invite; a row can be excluded instead of guessed at.
 * Location is free text matched against this tenant's existing offices by
 * city (see ConfirmRosterRow.location) — left blank, the grant applies
 * everywhere rather than one location. */
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
              { label: 'Admin', value: 'company_admin' },
              { label: 'Hiring Manager', value: 'hiring_manager' },
              { label: 'Recruiter', value: 'recruiter' },
              { label: 'Interviewer', value: 'interviewer' },
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
            placeholder="Location"
            value={row.location}
            onChange={(e) => updateRow(index, { location: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
};

export default BulkImportRows;
