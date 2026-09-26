import type { TableProps } from 'antd';
import { PAGE_SIZE_OPTIONS } from '../../constants/app.constants';

/**
 * Drop-in `pagination` value for `CustomTable` — a size-changer dropdown
 * (same PAGE_SIZE_OPTIONS progression every other list in the app uses) plus
 * a running "X–Y of Z" total, uncontrolled (AntD tracks current page/size
 * itself; no extra state needed at the call site unless it wants to react to
 * page changes via `onChange`).
 *
 * Kept out of ui/table.tsx itself — that file exports the `CustomTable`
 * component, and mixing a component export with a plain function export in
 * the same file breaks Vite's Fast Refresh (react-refresh/only-export-components).
 */
export const paginationConfig = (totalLabel = 'items'): TableProps<object>['pagination'] => ({
  pageSize: 10,
  showSizeChanger: true,
  pageSizeOptions: PAGE_SIZE_OPTIONS.map(String),
  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} ${totalLabel}`,
});
