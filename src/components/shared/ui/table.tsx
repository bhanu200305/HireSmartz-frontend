'use client';

import type { ReactNode, KeyboardEvent } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import './tableLayout.css';
import { useRovingFocus } from '../../../hooks/useRovingFocus';

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
   * Off by default (`false`) — every paginated list in the app pairs this
   * with `MasterPagination`/`RowsPerPageSelect` instead of antd's own pager,
   * so callers should leave this `false` and render those alongside the
   * table rather than passing a real antd pagination config here.
   */
  pagination?: TableProps<T>['pagination'];
  /**
   * Opt-in ArrowUp/ArrowDown roving focus + Enter-to-open across rows, off
   * by default so no existing call site changes behavior unless it asks
   * for this. Requires `onRowEnter`.
   */
  enableKeyboardNav?: boolean;
  /** What Enter does on the focused row — usually the same `navigate(...)` call the row's own `onRow.onClick` already makes. */
  onRowEnter?: (record: T, index: number) => void;
  /**
   * Caps the table body's height and makes it scroll internally (antd's
   * `scroll.y`, which also makes the header row sticky within that region)
   * instead of letting the table grow to fit every row. Needed inside a
   * modal that renders its own pagination footer below the table — without
   * this, a modal with many rows has no bounded scroll region of its own,
   * so the whole modal (including that footer) scrolls together and a long
   * result list buries the pager at the bottom, several screens of rows
   * away. Leave unset for a plain page table, where the page itself
   * scrolling is normal and there's no footer being pushed out of reach.
   */
  scrollY?: number | string;
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
  enableKeyboardNav = false,
  onRowEnter,
  scrollY,
}: CustomTableProps<T>) => {
  const { focusedIndex, handleKeyDown } = useRovingFocus({
    items: dataSource,
    isActive: enableKeyboardNav,
    onSelect: (record, index) => onRowEnter?.(record, index),
  });

  const mergedOnRow: TableProps<T>['onRow'] = enableKeyboardNav
    ? (record, index) => {
        const base = onRow?.(record, index) ?? {};
        const isFocused = index === focusedIndex;
        return {
          ...base,
          tabIndex: 0,
          onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
            handleKeyDown(e);
            base.onKeyDown?.(e);
          },
          className: [base.className, isFocused ? 'customTable-row-focused' : '']
            .filter(Boolean)
            .join(' '),
        };
      }
    : onRow;

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
        onRow={mergedOnRow}
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
        scroll={{ x: 'max-content', y: scrollY }}
      />
    </div>
  );
};

export default CustomTable;
