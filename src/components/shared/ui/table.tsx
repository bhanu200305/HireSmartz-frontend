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
      />
    </div>
  );
};

export default CustomTable;
