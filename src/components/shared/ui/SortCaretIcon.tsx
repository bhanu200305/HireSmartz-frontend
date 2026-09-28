import React from 'react';
import { CaretUpOutlined, CaretDownOutlined } from '@ant-design/icons';
import type { SortDirection } from '../../../types';

/**
 * AntD Table's own sorter markup/classes (already loaded app-wide wherever
 * a real `<Table>`/`CustomTable` renders — see table.tsx's `sorter: true`
 * columns) reused here so a hand-rolled sortable header — a plain
 * `<table>`'s `<th>` (OpenJobsSection, TenantsPreviewCard), a grid `<Col>`
 * (Columns.tsx) — looks and behaves identically to a real column sorter
 * instead of each one drifting into its own arrow style (a plain text " ↑"
 * only visible once a column IS sorted gives no affordance beforehand that
 * it's even sortable, unlike this — the pair of carets is always visible,
 * with the active direction highlighted).
 */
export const SortCaretIcon: React.FC<{ direction: SortDirection }> = ({ direction }) => (
  <span className="ant-table-column-sorter">
    <span className="ant-table-column-sorter-inner" aria-hidden="true">
      <CaretUpOutlined
        className={`ant-table-column-sorter-up ${direction === 'asc' ? 'active' : ''}`}
      />
      <CaretDownOutlined
        className={`ant-table-column-sorter-down ${direction === 'desc' ? 'active' : ''}`}
      />
    </span>
  </span>
);

export default SortCaretIcon;
