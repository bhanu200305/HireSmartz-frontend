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
  /**
   * On by default (`true`) — lets a column whose content genuinely doesn't
   * fit (real `minWidth` columns, e.g. `CandidatesListModal`) scroll into
   * view horizontally instead of being unreadably squeezed. Pass `false`
   * for a table whose columns were never given a `minWidth` floor to
   * defend in the first place — without one, `table-layout: auto` already
   * fits/wraps content to the container on its own, and the only thing a
   * horizontal scrollbar can still trigger there is a false one: a few
   * stray px of overflow from font-metric/rounding noise, wide enough to
   * show a scrollbar but never wide enough to visibly cut anything off.
   * `LoginUsersListModal`/`ActiveSessionsListModal` hit exactly that —
   * real user feedback on real data, not reproducible against any fixed
   * mock — and asked for it to just not scroll at all, since there was
   * never anything real to scroll to.
   */
  scrollX?: boolean;
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
  scrollX = true,
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

  // `scrollY="100%"` (every fillHeight modal call site) deliberately does NOT
  // become `maxHeight: '100%'` here. A flex item's own resolved height IS a
  // definite pixel value once the flex algorithm runs, but a CHILD reading
  // that back via a percentage (`maxHeight: 100%`) doesn't reliably see it as
  // definite — measured on the real page (not just reasoned from spec):
  // this div's own content came out to 350px while its parent's available
  // box was only 347px, `maxHeight: 100%` never kicked in to cap it, and the
  // parent's `overflow: hidden` silently clipped the 3px difference — right
  // where this table's own horizontal scrollbar lives, cutting it down to an
  // unrecognizable sliver. Every `scrollY="100%"` caller's wrapper div is
  // `flex` (row, default `align-items: stretch`) specifically so this can
  // instead rely on flex's OWN stretch-to-fill sizing, which resolves to a
  // real used height, not a percentage: no explicit height here at all, we
  // just take whatever the parent's stretch already computed and cap
  // overflow within it.
  const fillsParent = scrollY === '100%';

  // Horizontal AND vertical scroll are now the SAME element's overflow, not
  // two nested ones — that used to mean a horizontal scrollbar that was only
  // visible once you'd scrolled all the way to the bottom. A scrollbar
  // always sits at the edge of its OWN element's visible viewport, not at
  // the edge of that element's content: with vertical scroll on this outer
  // `.customTable` div and horizontal scroll on an inner `.cfp-h-scroll` div
  // nested inside it, the inner div had no height cap of its own, so it was
  // exactly as tall as the full table (every row) — meaning ITS bottom edge
  // (where its horizontal scrollbar lives) was only reached once the OUTER
  // div's vertical scroll had been dragged all the way down. Putting both
  // overflows on one div means there's only one viewport, so the horizontal
  // scrollbar sits at the bottom of what's actually visible right now,
  // regardless of vertical scroll position — same fix, applied to both axes
  // at once instead of layering one inside the other.
  return (
    <div
      className={
        fillsParent ? 'customTable customTable-fill cfp-h-scroll' : 'customTable cfp-h-scroll'
      }
      style={{
        // An inline style always wins over the CSS class — this used to be
        // hardcoded to `'scroll'` regardless of `.cfp-h-scroll`'s own CSS
        // rule (tableLayout.css), which silently made an earlier edit to
        // that rule (switching it to `auto`, so a table that fits its
        // container shows no scrollbar at all) completely inert: every
        // `CustomTable` in the app was still force-showing a horizontal
        // scrollbar, real overflow or not, because this inline value was
        // the one actually taking effect. Now driven by `scrollX` like the
        // rest of this component's overflow behavior.
        overflowX: scrollX ? 'auto' : 'hidden',
        ...(fillsParent
          ? { overflowY: 'auto', minHeight: 0 }
          : scrollY
            ? { maxHeight: scrollY, overflowY: 'auto' }
            : undefined),
      }}
    >
      {/*
       * Horizontal scroll is handled entirely by THIS plain div — not by
       * AntD's own `scroll.x`. A table with `table-layout: auto` and no
       * `width` of its own is, by ordinary browser behavior, never narrower
       * than its content actually needs — confirmed with real DOM
       * measurements (not just reading AntD's source) that it correctly
       * overflows this div the moment a column's `minWidth` (still read
       * from AntD's own `<colgroup>`) pushes the total past what's
       * available, and that scrolling this div (`scrollLeft`) correctly
       * reveals the rest of the table.
       *
       * `cfp-h-scroll` (not Tailwind's `overflow-x-auto`) on purpose: it's
       * paired with a thicker, higher-contrast bar (tableLayout.css) than
       * this app's normal thin/subtle global scrollbar style, specifically
       * for this one region, since an `auto` scrollbar styled only with
       * the app-wide default was easy to miss even when a table genuinely
       * had more to scroll to. Whether it can appear AT ALL is `scrollX`
       * above (default on) — off for a table with no column `minWidth` to
       * defend, where the only overflow left to trigger it would be noise,
       * never real cut-off content (see `scrollX`'s own docstring).
       */}
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
        // No `scroll.x` — see the wrapper div's comment above for why this
        // table now handles horizontal overflow via that plain CSS wrapper
        // instead of AntD's own scroll.x/tableLayout machinery.
        //
        // No `y` either: with `scrollY` set, height is capped by the OUTER
        // wrapper div's own `maxHeight`/`overflow-y` instead, so a short
        // result list renders at its natural height (no scrollbar, no
        // reserved empty space) and only a list long enough to hit that cap
        // scrolls — within that one region only.
        //
        // No `sticky` either — pinning the header while the body scrolls
        // vertically would need AntD's own sticky/fixed-header mode, which
        // showed the same kind of AntD-internal-only horizontal scroll
        // trouble this whole comment is about. Not worth the risk a second
        // time; the header now scrolls away with the rows in a capped
        // `scrollY` table instead of staying pinned.
        // AntD's own default (`['ascend', 'descend']`) makes a 3rd click
        // on an already-`sorter: true` column cancel sorting entirely —
        // its tooltip then reads "Click to cancel sorting", and every
        // caller app-wide has to remember to treat that cancelled/
        // `undefined` order as "reset to my own default" in its own
        // `onChange` (which they all already do — see DepartmentsTab,
        // PlatformCatalogTab, JobOpeningsListModal). Repeating 'ascend'
        // as the 3rd step here means AntD's own click-cycle never
        // reaches that state in the first place: every CustomTable
        // column just toggles ascending/descending forever, and the
        // tooltip never offers a "cancel" nothing here actually
        // implements as a real unsorted state.
        sortDirections={['ascend', 'descend', 'ascend']}
      />
    </div>
  );
};

export default CustomTable;
