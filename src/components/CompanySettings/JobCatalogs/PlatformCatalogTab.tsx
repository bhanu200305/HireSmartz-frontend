import React, { useEffect, useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { Tooltip } from 'antd';
import { MdDelete, MdEdit, MdOutlineAdd, MdSearch } from 'react-icons/md';
import { Button, CustomTable, Input, Typography, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import StatusToggle from '../../shared/ui/StatusToggle';
import MasterPagination from '../../shared/ui/MasterPagination';
import { RowsPerPageSelect } from '../../shared/ui/RowsPerPageSelect';
import { usePersistedPageSize } from '../../../hooks/usePersistedPageSize';
import { useDebouncedEffect } from '../../../hooks/useDebouncedEffect';
import { PAGE_SIZE_OPTIONS } from '../../../constants/app.constants';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import CatalogFormFields, { type CatalogField } from './CatalogFormFields';

/** Backend-driven list state — omit `serverQuery`/`onServerQueryChange`
 * entirely to fall back to the original client-side search+pagination
 * (still used by any catalogue whose backend hasn't been upgraded yet). */
export type CatalogServerQuery = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
};

/**
 * One reusable list+add+edit+delete screen for a job-service
 * /platform/master-* catalogue — the 9 of these (Interview Rounds, Closure
 * Reasons, Shift Types, Job Modes, Languages, Skill Categories, Skill Types,
 * Skills, and Job Types via catalogs.ts's isMaster branch) differ only in
 * field shape and id/label accessors, not in list/CRUD mechanics. Same
 * add/edit/delete-modal structure as JobTitlesTab.tsx (org-service's
 * equivalent Super Admin catalogue screen) — kept as a generic component
 * here instead of copied 9 times because these 9 really are that identical.
 */
/** `is_active` reflection for the Status Switch - defaults true so a row
 * from a backend that hasn't added the column yet still reads as active. */
const isActive = (item: unknown): boolean =>
  (item as { is_active?: boolean } | null)?.is_active ?? true;

export type PlatformCatalogTabProps<TItem, TFormValues extends Record<string, unknown>> = {
  title: string;
  itemNounSingular: string;
  itemNounPlural: string;
  items: TItem[] | undefined;
  isLoading: boolean;
  idOf: (item: TItem) => string;
  labelOf: (item: TItem) => string;
  columns: TableProps<TItem & { key: string }>['columns'];
  searchPredicate?: (item: TItem, query: string) => boolean;
  fields: CatalogField<TFormValues>[];
  emptyForm: TFormValues;
  toFormValues: (item: TItem) => TFormValues;
  onCreate: (values: TFormValues) => Promise<unknown>;
  onUpdate: (id: string, values: TFormValues) => Promise<unknown>;
  onDelete?: (item: TItem) => Promise<unknown>;
  deleteConfirmTitle?: (item: TItem) => string;
  /** Status column's Switch - flips `is_active` without touching
   * `is_deleted`, so the row stays visible either way. Only renders when
   * passed. */
  onToggleActive?: (item: TItem, nextActive: boolean) => Promise<unknown>;
  /** Hides the "+ Add" button. Defaults true. */
  allowCreate?: boolean;
  /** Hides the row-level Edit action, independent of `onDelete`. Defaults true. */
  allowEdit?: boolean;
  /** Per-row override on top of `allowEdit`/`onDelete`. Defaults true. */
  canEditRow?: (item: TItem) => boolean;
  canDeleteRow?: (item: TItem) => boolean;
  /** Total match count from the backend. Only meaningful with `serverQuery`. */
  total?: number;
  /** Extra control rendered in the header row, before the search box. */
  headerExtra?: React.ReactNode;
  /** Current backend search/sort/pagination state. Presence of this prop
   * switches the whole component from client-side filtering to
   * backend-driven search/sort/pagination — `items` is then just the
   * current page, not the full catalogue. */
  serverQuery?: CatalogServerQuery;
  onServerQueryChange?: (next: CatalogServerQuery) => void;
};

function PlatformCatalogTab<TItem, TFormValues extends Record<string, unknown>>({
  title,
  itemNounSingular,
  itemNounPlural,
  items,
  isLoading,
  idOf,
  labelOf,
  columns,
  searchPredicate,
  fields,
  emptyForm,
  toFormValues,
  onCreate,
  onUpdate,
  onDelete,
  deleteConfirmTitle,
  onToggleActive,
  allowCreate = true,
  allowEdit = true,
  canEditRow = () => true,
  canDeleteRow = () => true,
  total,
  headerExtra,
  serverQuery,
  onServerQueryChange,
}: PlatformCatalogTabProps<TItem, TFormValues>) {
  const [modalState, setModalState] = useState<{ mode: 'add' | 'edit'; item?: TItem } | null>(null);
  const [form, setForm] = useState<TFormValues>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchText, setSearchText] = useState('');
  // Server-driven search: typing updates this instantly (so the box feels
  // responsive), but the actual query only fires 400ms after typing stops -
  // was firing a fresh request on every keystroke before this.
  const [searchInput, setSearchInput] = useState(serverQuery?.search ?? '');
  useEffect(() => {
    setSearchInput(serverQuery?.search ?? '');
    // Only resync from external changes (e.g. a reset), not our own typing.
  }, [serverQuery?.search]);
  useDebouncedEffect(
    () => {
      if (isServerDriven && searchInput !== serverQuery!.search) {
        onServerQueryChange!({ ...serverQuery!, search: searchInput, page: 1 });
      }
    },
    [searchInput],
    400
  );
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize(
    `company_settings_catalog_${itemNounPlural.trim().toLowerCase().replace(/\s+/g, '_')}`,
    10
  );

  const isServerDriven = !!serverQuery && !!onServerQueryChange;

  const filtered = useMemo(() => {
    if (isServerDriven) return items ?? [];
    const q = searchText.trim().toLowerCase();
    if (!q) return items ?? [];
    return (items ?? []).filter((item) =>
      searchPredicate ? searchPredicate(item, q) : labelOf(item).toLowerCase().includes(q)
    );
  }, [items, searchText, searchPredicate, labelOf, isServerDriven]);

  const openAdd = () => {
    setForm(emptyForm);
    setModalState({ mode: 'add' });
  };
  const openEdit = (item: TItem) => {
    setForm(toFormValues(item));
    setModalState({ mode: 'edit', item });
  };

  const missingRequired = fields.some(
    (f) => f.required && !String(form[f.name] ?? '').trim() && f.type !== 'boolean'
  );

  const handleSubmit = async () => {
    if (missingRequired) {
      showToast({ message: 'Please fill in the required fields.', type: 'error' });
      return;
    }
    setIsSaving(true);
    try {
      if (modalState?.mode === 'edit' && modalState.item) {
        await onUpdate(idOf(modalState.item), form);
        showToast({ message: `${itemNounSingular} updated.`, type: 'success' });
      } else {
        await onCreate(form);
        showToast({ message: `${itemNounSingular} added.`, type: 'success' });
      }
      setModalState(null);
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, `Failed to save ${itemNounSingular.toLowerCase()}.`),
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(itemToDelete);
      showToast({ message: `${itemNounSingular} removed.`, type: 'success' });
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, `Failed to remove ${itemNounSingular.toLowerCase()}.`),
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  if (isLoading) return <Loader />;

  const showActions = allowEdit || !!onDelete;

  // Server-driven mode: the "Name" column (assumed first) becomes remotely
  // sortable via antd's built-in sorter UI, reporting through onChange below
  // rather than sorting anything client-side itself.
  const baseColumns = isServerDriven
    ? (columns ?? []).map((col, index) =>
        index === 0
          ? {
              ...col,
              sorter: true,
              sortOrder:
                serverQuery!.sortBy === 'name'
                  ? serverQuery!.sortDir === 'desc'
                    ? ('descend' as const)
                    : ('ascend' as const)
                  : undefined,
            }
          : col
      )
    : columns;

  const allColumns: TableProps<TItem & { key: string }>['columns'] = [
    ...(baseColumns ?? []),
    onToggleActive && {
      title: 'Status',
      key: 'status',
      width: 90,
      render: (_: unknown, item: TItem & { key: string }) => (
        <StatusToggle
          isActive={isActive(item)}
          activateLabel={`Activate ${itemNounSingular.toLowerCase()}`}
          deactivateLabel={`Deactivate ${itemNounSingular.toLowerCase()}`}
          deactivateConfirmTitle={`Deactivate "${labelOf(item)}"?`}
          onActivate={() => onToggleActive(item, true)}
          onDeactivate={() => onToggleActive(item, false)}
        />
      ),
    },
    showActions && {
      title: 'Actions',
      key: 'actions',
      width: 90,
      render: (_: unknown, item: TItem & { key: string }) => (
        <div className="flex items-center gap-1">
          {allowEdit && canEditRow(item) && (
            <Tooltip title={`Edit ${itemNounSingular.toLowerCase()}`}>
              <button
                type="button"
                aria-label={`Edit ${itemNounSingular.toLowerCase()}`}
                className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
                onClick={() => openEdit(item)}
              >
                <MdEdit size={18} className="text-gray-600" />
              </button>
            </Tooltip>
          )}
          {onDelete && canDeleteRow(item) && (
            <Tooltip title={`Delete ${itemNounSingular.toLowerCase()}`}>
              <button
                type="button"
                aria-label={`Delete ${itemNounSingular.toLowerCase()}`}
                className="group p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
                onClick={() => setItemToDelete(item)}
              >
                <MdDelete
                  size={18}
                  className="text-gray-600 transition-colors group-hover:text-red-600"
                />
              </button>
            </Tooltip>
          )}
        </div>
      ),
    },
  ].filter(Boolean) as TableProps<TItem & { key: string }>['columns'];

  // Server-driven mode: `filtered` (== `items`) is already exactly one
  // backend page, so slicing it again by the *local* pageSize state (which
  // the server-driven UI never updates — only serverQuery.pageSize matters
  // there) would silently truncate rows whenever the two diverge.
  const dataSource = (
    isServerDriven ? filtered : filtered.slice(page * pageSize, page * pageSize + pageSize)
  ).map((item) => ({ ...item, key: idOf(item) }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <Typography variant="body2">{title}</Typography>
          <span className="text-xs font-medium text-gray-400">
            {isServerDriven ? (
              `${total ?? dataSource.length} ${
                (total ?? dataSource.length) === 1 ? itemNounSingular : itemNounPlural
              }`
            ) : (
              <>
                {dataSource.length} {dataSource.length === 1 ? itemNounSingular : itemNounPlural}
                {searchText.trim() && ` of ${items?.length ?? 0}`}
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {headerExtra}
          <Input
            prefix={<MdSearch className="text-gray-400" />}
            placeholder={`Search ${itemNounPlural.toLowerCase()}...`}
            className="w-56"
            value={isServerDriven ? searchInput : searchText}
            onChange={(e) => {
              if (isServerDriven) {
                // Query fires later, debounced - see the useDebouncedEffect above.
                setSearchInput(e.target.value);
              } else {
                setSearchText(e.target.value);
                setPage(0);
              }
            }}
          />
          {allowCreate && (
            <Button
              className="rounded-full bg-button text-white px-4 py-2 flex items-center justify-center gap-1 shadow-sm hover:shadow-md transition-shadow shrink-0 min-w-[180px]"
              onClick={openAdd}
            >
              <MdOutlineAdd /> Add {itemNounSingular.toLowerCase()}
            </Button>
          )}
        </div>
      </div>

      <RowsPerPageSelect
        pageSize={isServerDriven ? serverQuery!.pageSize : pageSize}
        options={PAGE_SIZE_OPTIONS}
        onChange={(size) => {
          if (isServerDriven) {
            onServerQueryChange!({ ...serverQuery!, pageSize: size, page: 1 });
          } else {
            setPageSize(size);
            setPage(0);
          }
        }}
      />

      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <CustomTable
          columns={allColumns}
          dataSource={dataSource}
          emptyText={
            (isServerDriven ? serverQuery!.search.trim() : searchText.trim())
              ? `No ${itemNounPlural.toLowerCase()} match your search.`
              : `No ${itemNounPlural.toLowerCase()} yet.`
          }
          pagination={false}
          onChange={
            isServerDriven
              ? (_pagination, _filters, sorter) => {
                  const sort = Array.isArray(sorter) ? sorter[0] : sorter;
                  const sortDir: 'asc' | 'desc' = sort?.order === 'descend' ? 'desc' : 'asc';
                  if (!sort?.order) return;
                  onServerQueryChange!({
                    ...serverQuery!,
                    page: 1,
                    sortBy: 'name',
                    sortDir,
                  });
                }
              : undefined
          }
        />
      </div>

      {isServerDriven ? (
        <MasterPagination
          current={serverQuery!.page}
          pageSize={serverQuery!.pageSize}
          total={total ?? 0}
          itemLabel={itemNounPlural.toLowerCase()}
          onPageChange={(nextPage) => onServerQueryChange!({ ...serverQuery!, page: nextPage })}
        />
      ) : (
        <MasterPagination
          current={page + 1}
          pageSize={pageSize}
          total={filtered.length}
          itemLabel={itemNounPlural.toLowerCase()}
          onPageChange={(nextPage) => setPage(nextPage - 1)}
        />
      )}

      <AntdCommonModal
        open={modalState !== null}
        onClose={() => setModalState(null)}
        title={
          modalState?.mode === 'edit'
            ? `Edit ${itemNounSingular.toLowerCase()}`
            : `Add ${itemNounSingular.toLowerCase()}`
        }
      >
        <div className="flex flex-col gap-4">
          <CatalogFormFields fields={fields} values={form} onChange={setForm} />
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="w-full border border-gray-300 rounded-full py-2"
              onClick={() => setModalState(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              className="w-full bg-button text-white rounded-full py-2"
              onClick={handleSubmit}
              disabled={isSaving || missingRequired}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </AntdCommonModal>

      {itemToDelete && (
        <ConfirmationModal
          title={
            deleteConfirmTitle
              ? deleteConfirmTitle(itemToDelete)
              : `Remove "${labelOf(itemToDelete)}"?`
          }
          confirmText="REMOVE"
          isLoading={isDeleting}
          onConfirm={handleDelete}
          onClose={() => setItemToDelete(null)}
        />
      )}
    </div>
  );
}

export default PlatformCatalogTab;
