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
}

const CustomTable = <T extends object>({
  columns,
  dataSource,
  rowClassName,
  expandable,
  onChange,
  onRow,
  emptyText,
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
        pagination={false}
        rowClassName={rowClassName}
        onChange={onChange}
        onRow={onRow}
        locale={emptyText ? { emptyText } : undefined}
      />
    </div>
  );
};

export default CustomTable;
