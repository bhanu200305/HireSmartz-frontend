'use client';

import type { ReactNode } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import './tableLayout.css';

interface CustomTableProps<T> {
  columns: TableProps<T>['columns'];
  dataSource: T[];
  rowClassName?: TableProps<T>['rowClassName'];
  expandable?: TableProps<T>['expandable'];
  onChange?: TableProps<T>['onChange'];
  onRow?: TableProps<T>['onRow'];
  /** Overrides AntD's default "No Data" empty state with a custom message/node. */
  emptyText?: ReactNode;
  /**
   * Off by default (`false`), same as every existing call site relied on
   * before this prop existed — pass a config object to turn it on for a
   * given table without changing anyone else's behavior. `paginationConfig`
   * (below) is a ready-made "10/25/50/100 per page" config most call sites
   * that want pagination can just pass straight through.
   */
  pagination?: TableProps<T>['pagination'];
}

const CustomTable = <T extends object>({
  columns,
  dataSource,
  rowClassName,
  expandable,
  onChange,
  onRow,
  emptyText,
  pagination = false,
}: CustomTableProps<T>) => {
  return (
    <div className="customTable">
      <Table<T>
        columns={columns}
        className="customTable border-none"
        style={{ border: 'none' }}
        expandable={expandable}
        dataSource={dataSource}
        bordered={false}
        pagination={pagination}
        rowClassName={rowClassName}
        onChange={onChange}
        onRow={onRow}
        locale={emptyText ? { emptyText } : undefined}
        // Without this, AntD renders every column at its natural content
        // width with no cap — on a narrow screen (a laptop with the
        // sidebar expanded, an iPad) a table with several columns simply
        // doesn't fit, and nothing here says what should happen then. Every
        // CustomTable call site app-wide gets the same answer now: the
        // table scrolls horizontally within itself (columns/sorting/
        // row clicks all unchanged), instead of either overflowing its
        // container or, combined with the site-wide overflow guard in
        // index.css, having its right-hand columns silently clipped away
        // and unreachable. `'max-content'` rather than a fixed pixel width
        // — it only ever activates the scroll when the columns actually
        // need more room than they have, so a table that already fits
        // (the common case) renders exactly as it did before this.
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
};

export default CustomTable;
