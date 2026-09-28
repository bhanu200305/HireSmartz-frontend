'use client';

import { useRef } from 'react';
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
   * Caps the table body's height — beyond that cap the ROWS scroll inside
   * their own bounded region (with a sticky header) instead of letting the
   * table grow without limit. Needed inside a modal that renders its own
   * pagination footer below the table — without this, a modal with many
   * rows has no bounded scroll region of its own, so the whole modal
   * (including that footer) scrolls together and a long result list buries
   * the pager at the bottom, several screens of rows away.
   *
   * Unlike antd's own `scroll.y`, this is a MAX, not a fixed height: with
   * few rows the table stays its natural (shorter) height and no scrollbar
   * appears at all, so a modal around it can shrink-wrap to content instead
   * of always reserving `scrollY` worth of space. That's what was
   * previously producing two scrollbars on the same list — antd's `scroll.y`
   * forced its own fixed-height internal scroll region regardless of row
   * count, while the modal's outer body *also* scrolled because the summed
   * height of everything (search row, filters, that fixed table region,
   * pagination) still didn't fit the modal's own max-height.
   *
   * Leave unset for a plain page table, where the page itself scrolling is
   * normal and there's no footer being pushed out of reach.
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

  // The scroll container for `scrollY` — antd's `sticky` is pointed at this
  // node (via `getContainer`) so the header row stays pinned to *this*
  // bounded region rather than to the window, without needing antd's own
  // `scroll.y` to force a fixed-height table.
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    <div
      ref={scrollContainerRef}
      className="customTable"
      style={scrollY ? { maxHeight: scrollY, overflowY: 'auto' } : undefined}
    >
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
        //
        // No `y` here: with `scrollY` set, height is capped by the wrapper
        // div's own `maxHeight`/`overflow-y` above instead, so a short
        // result list renders at its natural height (no scrollbar, no
        // reserved empty space) and only a list long enough to hit that cap
        // scrolls — within this one region only.
        scroll={{ x: 'max-content' }}
        sticky={scrollY ? { getContainer: () => scrollContainerRef.current ?? window } : undefined}
        // AntD's own default (`['ascend', 'descend']`) makes a 3rd click on
        // an already-`sorter: true` column cancel sorting entirely — its
        // tooltip then reads "Click to cancel sorting", and every caller
        // app-wide has to remember to treat that cancelled/`undefined` order
        // as "reset to my own default" in its own `onChange` (which they all
        // already do — see DepartmentsTab, PlatformCatalogTab,
        // JobOpeningsListModal). Repeating 'ascend' as the 3rd step here
        // means AntD's own click-cycle never reaches that state in the first
        // place: every CustomTable column just toggles ascending/descending
        // forever, and the tooltip never offers a "cancel" nothing here
        // actually implements as a real unsorted state.
        sortDirections={['ascend', 'descend', 'ascend']}
      />
    </div>
  );
};

export default CustomTable;
