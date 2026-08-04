// 'use client'

// import { Table } from 'antd'
// import type { TableProps } from 'antd'
// import './tableLayout.css'

// interface CustomTableProps<T> {
//   columns: TableProps<T>['columns']
//   dataSource: T[]
//   rowClassName?: TableProps<T>['rowClassName']
// }

// const CustomTable = <T extends object>({
//   columns,
//   dataSource,
//   rowClassName
// }: CustomTableProps<T>) => {
//   return (
//     <div className="customTable">
//       <Table<T>
//         columns={columns}
//         className="customTable"
//         style={{ border: 'none !important' }}
//         dataSource={dataSource}
//         bordered={false}
//         pagination={false}
//         rowClassName={rowClassName}
//       />
//     </div>
//   )
// }

// export default CustomTable

'use client';

import { Table } from 'antd';
import type { TableProps } from 'antd';
import './tableLayout.css';

interface CustomTableProps<T> {
  columns: TableProps<T>['columns'];
  dataSource: T[];
  rowClassName?: TableProps<T>['rowClassName'];
  expandable?: TableProps<T>['expandable'];
  onChange?: TableProps<T>['onChange'];
}

const CustomTable = <T extends object>({
  columns,
  dataSource,
  rowClassName,
  expandable,
  onChange,
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
      />
    </div>
  );
};

export default CustomTable;
