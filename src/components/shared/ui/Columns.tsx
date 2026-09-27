import { Col, ColProps as AntdColProps } from 'antd';
import { CaretUpOutlined, CaretDownOutlined } from '@ant-design/icons';
import React from 'react';
import { SortDirection } from '../../../types';

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

    let newDirection: SortDirection = 'asc';
    if (isActiveSort) {
      newDirection = currentSortDirection === 'asc' ? 'desc' : null;
    }

    onSort(sortKey, newDirection);
  };

  const renderSortIcons = () => {
    if (!sortable) return null;

    // Reuses AntD Table's own sorter markup/classes (already loaded app-wide
    // wherever a real `<Table>` renders) instead of a hand-rolled icon, so
    // this plain-div "table" looks identical to every other sortable list
    // in the app rather than showing its own arrow style.
    return (
      <span className="ant-table-column-sorter">
        <span className="ant-table-column-sorter-inner">
          <CaretUpOutlined
            className={`ant-table-column-sorter-up ${currentSortDirection === 'asc' ? 'active' : ''}`}
          />
          <CaretDownOutlined
            className={`ant-table-column-sorter-down ${currentSortDirection === 'desc' ? 'active' : ''}`}
          />
        </span>
      </span>
    );
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
