import { Col, ColProps as AntdColProps } from 'antd';
import React from 'react';
import { SortDirection } from '../../../types';
import { SortCaretIcon } from './SortCaretIcon';

type ColProps = AntdColProps & {
  children: React.ReactNode;
  filterable?: boolean;
  sortable?: boolean;
  currentSortKey?: string;
  sortKey?: string;
  onSort?: (key: string, direction: SortDirection) => void;
};

export const COL = ({
  children,
  filterable: _filterable = false,
  sortable = false,
  currentSortKey,
  sortKey,
  onSort,
  ...rest
}: ColProps) => {
  const isActiveSort = currentSortKey?.replace('-', '') === sortKey;
  let currentSortDirection: SortDirection = null;

  if (isActiveSort) {
    currentSortDirection = currentSortKey?.startsWith('-') ? 'desc' : 'asc';
  }

  const handleSort = () => {
    if (!sortable || !sortKey || !onSort) return;

    // Toggles ascending/descending forever rather than cancelling to
    // unsorted on a 3rd click — matches CustomTable's own `sortDirections`
    // (table.tsx), so every sortable list in the app behaves the same way:
    // there's no "click to cancel sorting" step anywhere.
    const newDirection: SortDirection =
      isActiveSort && currentSortDirection === 'asc' ? 'desc' : 'asc';

    onSort(sortKey, newDirection);
  };

  const renderSortIcons = () => {
    if (!sortable) return null;
    return <SortCaretIcon direction={currentSortDirection} />;
  };

  return (
    <Col
      {...rest}
      onClick={handleSort}
      style={{
        cursor: sortable ? 'pointer' : 'default',
        userSelect: 'none',
        ...rest.style,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'nowrap',
          minWidth: 0,
          //   fontWeight: isActiveSort ? 600 : 'normal'
        }}
      >
        {/* No forced `whiteSpace: nowrap` here (and `minWidth: 0` above, the
            usual flex fix that lets a child actually shrink/wrap instead of
            refusing to go below its content's natural width) — a label
            wider than its column's span (e.g. "CANDIDATES" at a narrow
            viewport) needs to be free to wrap onto a second line the same
            way the plain, non-sortable header cells beside it already do
            ("NOT SELECTED"), rather than overflowing past its own column
            into the next one. `break-words` on the label itself (see call
            sites) handles the case where it's a single word with nowhere
            natural to break. */}
        <span className="min-w-0 break-words">{children}</span>
        {renderSortIcons()}
      </div>
    </Col>
  );
};
