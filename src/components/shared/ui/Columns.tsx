import { Col, ColProps as AntdColProps } from 'antd';
import React from 'react';
import { MdOutlineArrowDownward, MdOutlineArrowUpward } from 'react-icons/md';
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
  filterable = false,
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

    return (
      <span
        style={{
          marginLeft: 2,
          display: 'inline-flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MdOutlineArrowUpward
          size={14}
          style={{
            color: currentSortDirection === 'asc' ? 'var(--primary)' : 'black',
            transition: 'color 0.3s',
          }}
        />
        <MdOutlineArrowDownward
          size={14}
          style={{
            color: currentSortDirection === 'desc' ? 'var(--primary)' : 'black',
            transition: 'color 0.3s',
          }}
        />
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
          whiteSpace: 'nowrap',
          //   fontWeight: isActiveSort ? 600 : 'normal'
        }}
      >
        {children}
        {renderSortIcons()}
      </div>
    </Col>
  );
};
