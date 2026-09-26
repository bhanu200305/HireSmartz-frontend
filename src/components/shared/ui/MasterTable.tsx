import React from 'react';
import { Row, Col, Select } from 'antd';
import { Search } from './search';
import { Button } from './button';
import { FilterSelectIcon } from './FilterSelectIcon';
import { CommonCard } from './card';
import { COL } from './Columns';
import MasterPagination from './MasterPagination';
import type { SortDirection } from '../../../types';
import './masterTable.css';

interface FilterOption {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
}

export interface MasterTableColumn<T = any> {
  title: string;
  dataIndex?: string;
  key: string;
  span: number;
  sortKey?: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

export interface MasterTableProps<T = any> {
  title: string;
  icon?: React.ReactNode;
  columns: MasterTableColumn<T>[];
  dataSource: T[];
  error?: Error | null;
  onAddClick?: () => void;
  addButtonLabel?: string;
  filters?: {
    searchPlaceholder?: string;
    filterOptions?: FilterOption[];
    extraActions?: React.ReactNode;
  };
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  currentSortKey?: string;
  onSort?: (key: string, direction: SortDirection) => void;
  onSearch?: (searchTerm: string) => void;
  onFilterChange?: (filterKey: string, value: string) => void;
}

export const MasterTable = React.forwardRef<HTMLDivElement, MasterTableProps<any>>(
  (
    {
      title,
      icon,
      columns,
      dataSource,
      error = null,
      onAddClick,
      addButtonLabel,
      filters,
      pagination,
      currentSortKey,
      onSort,
      onSearch,
      onFilterChange,
    },
    ref
  ) => {
    const handleSort = (key: string, direction: SortDirection): void => {
      onSort?.(key, direction);
    };

    return (
      <div ref={ref}>
        {/* Row 1: title on left, add button on right */}
        <div className="flex items-center justify-between p-2 pb-0">
          <div className="flex items-center space-x-2">
            {icon !== undefined && (
              <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
                {icon}
              </span>
            )}
            <h2 className="text-xl font-semibold">{title}</h2>
          </div>

          {onAddClick && (
            <Button
              appname={`add ${title}`}
              className="text-white bg-button rounded-3xl px-3 py-2 flex items-center"
              onClick={onAddClick}
            >
              <span className="text-sm whitespace-nowrap">
                {addButtonLabel || `+ ADD ${title.toUpperCase()}`}
              </span>
            </Button>
          )}
        </div>

        {/* Row 2: search + filters */}
        {filters && (
          <div className="flex space-x-4 items-center flex-wrap gap-y-2 p-2 pt-3">
            <Search
              appname={title}
              placeholder={filters.searchPlaceholder || `Search ${title}...`}
              onSearch={(value) => onSearch?.(value)}
              allowClear
            />

            {filters?.filterOptions?.map((filter) => (
              <div key={filter.value} className="cfp-dropdown-trigger w-40">
                <FilterSelectIcon />
                <Select
                  placeholder={filter.label}
                  onChange={(value: string | undefined) =>
                    onFilterChange?.(filter.value, value || '')
                  }
                  allowClear
                  className="w-full custom-select"
                  variant="borderless"
                  options={filter.options}
                />
              </div>
            ))}

            {filters?.extraActions}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="p-4 bg-[#fff2e8] border border-[#ffbb96] rounded mb-4 text-[#d4380d]">
            <p className="m-0">
              Error loading {title.toLowerCase()}: {error.message}
            </p>
          </div>
        )}

        {/* Table: identical Row/Col structure to Job Openings. This grid is
            built from fixed antd `Col span`s (out of 24), not antd `<Table>`
            (which has its own `scroll={{x:'max-content'}}` elsewhere in the
            app) — so on a narrow viewport the columns have nowhere to shrink
            to. `overflow-x-auto` + a `min-w` on the inner block gives the
            same "swipe to see the rest" fallback CustomTable already gets
            for free, without touching any column's span/width. */}
        <div className="w-full p-2 justify-start overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Column header - bg-[#FAFAFA] + heading-font (Sora), same as Job Openings */}
            <Row
              gutter={[16, 16]}
              className="font-bold py-2 px-2 bg-[#FAFAFA] border border-[var(--border)] heading-font"
            >
              {columns.map((col) =>
                col.sortKey ? (
                  <COL
                    key={col.key}
                    span={col.span}
                    sortable
                    sortKey={col.sortKey}
                    currentSortKey={currentSortKey}
                    onSort={handleSort}
                    className="px-4 py-2 border-[var(--border)]"
                  >
                    {col.title}
                  </COL>
                ) : (
                  <Col key={col.key} span={col.span} className="px-4 py-2">
                    {col.title}
                  </Col>
                )
              )}
            </Row>

            {/* Data rows - CommonCard per row with mb-2 gap, identical to Job Openings */}
            <div className="w-full mt-2">
              {dataSource.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No data</div>
              ) : (
                dataSource.map((row, rowIndex) => (
                  <div key={row.key ?? rowIndex} className="mb-2">
                    <CommonCard>
                      <Row gutter={[16, 16]} align="middle">
                        {columns.map((col) => (
                          <Col key={col.key} span={col.span} className="px-4 roboto-font">
                            {col.render
                              ? col.render(
                                  col.dataIndex ? row[col.dataIndex] : undefined,
                                  row,
                                  rowIndex
                                )
                              : col.dataIndex
                                ? row[col.dataIndex]
                                : null}
                          </Col>
                        ))}
                      </Row>
                    </CommonCard>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Pagination */}
        {pagination && (
          <MasterPagination
            current={pagination.current}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
            itemLabel={title}
          />
        )}
      </div>
    );
  }
);

MasterTable.displayName = 'MasterTable';

export default MasterTable;
