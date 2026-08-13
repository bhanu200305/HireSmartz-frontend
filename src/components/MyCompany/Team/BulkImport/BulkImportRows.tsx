import React from 'react';
import { Select } from 'antd';
import { Input } from '../../../shared';
import type { ParsedRosterRow } from '../../../../api/organization-service/Tenants/imports';

export type ReviewRow = {
  include: boolean;
  email: string;
  role: 'recruiter' | 'hiring_manager' | '';
  department: string;
};

export const toReviewRows = (rows: ParsedRosterRow[]): ReviewRow[] =>
  rows.map((row) => ({
    include: true,
    email: row.email,
    role: row.role === 'recruiter' || row.role === 'hiring_manager' ? row.role : '',
    department: row.department || '',
  }));

type BulkImportRowsProps = {
  rows: ReviewRow[];
  onChange: (rows: ReviewRow[]) => void;
};

/** Per-row review before confirming a bulk import — every parsed row needs a
 * valid role picked (the AI-detected value may be missing/ambiguous) before
 * it can become an invite; a row can be excluded instead of guessed at. */
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
              { label: 'Recruiter', value: 'recruiter' },
              { label: 'Hiring Manager', value: 'hiring_manager' },
            ]}
          />
          <Input
            className="w-32 h-8 text-sm"
            placeholder="Department"
            value={row.department}
            onChange={(e) => updateRow(index, { department: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
};

export default BulkImportRows;
