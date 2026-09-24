import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { MdDelete, MdEdit, MdOutlineAdd, MdSearch } from 'react-icons/md';
import { Button, CustomTable, Input, Typography, paginationConfig, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import CatalogFormFields, { type CatalogField } from './CatalogFormFields';

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
  /** Hides the "+ Add" button. Defaults true. */
  allowCreate?: boolean;
  /** Hides the row-level Edit action, independent of `onDelete`. Defaults true. */
  allowEdit?: boolean;
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
  allowCreate = true,
  allowEdit = true,
}: PlatformCatalogTabProps<TItem, TFormValues>) {
  const [modalState, setModalState] = useState<{ mode: 'add' | 'edit'; item?: TItem } | null>(null);
  const [form, setForm] = useState<TFormValues>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return items ?? [];
    return (items ?? []).filter((item) =>
      searchPredicate ? searchPredicate(item, q) : labelOf(item).toLowerCase().includes(q)
    );
  }, [items, searchText, searchPredicate, labelOf]);

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

  const allColumns: TableProps<TItem & { key: string }>['columns'] = [
    ...(columns ?? []),
    showActions && {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, item: TItem & { key: string }) => (
        <div className="flex items-center gap-1">
          {allowEdit && (
            <button
              type="button"
              aria-label={`Edit ${itemNounSingular.toLowerCase()}`}
              className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
              onClick={() => openEdit(item)}
            >
              <MdEdit className="text-gray-600" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              aria-label={`Delete ${itemNounSingular.toLowerCase()}`}
              className="p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
              onClick={() => setItemToDelete(item)}
            >
              <MdDelete className="text-red-500" />
            </button>
          )}
        </div>
      ),
    },
  ].filter(Boolean) as TableProps<TItem & { key: string }>['columns'];

  const dataSource = filtered.map((item) => ({ ...item, key: idOf(item) }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <Typography variant="body2">{title}</Typography>
          <span className="text-xs font-medium text-gray-400">
            {dataSource.length} {dataSource.length === 1 ? itemNounSingular : itemNounPlural}
            {searchText.trim() && ` of ${items?.length ?? 0}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Input
            prefix={<MdSearch className="text-gray-400" />}
            placeholder={`Search ${itemNounPlural.toLowerCase()}...`}
            className="w-56"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {allowCreate && (
            <Button
              className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1 shadow-sm hover:shadow-md transition-shadow shrink-0"
              onClick={openAdd}
            >
              <MdOutlineAdd /> Add {itemNounSingular.toLowerCase()}
            </Button>
          )}
        </div>
      </div>

      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <CustomTable
          columns={allColumns}
          dataSource={dataSource}
          emptyText={
            searchText.trim()
              ? `No ${itemNounPlural.toLowerCase()} match your search.`
              : `No ${itemNounPlural.toLowerCase()} yet.`
          }
          pagination={paginationConfig(itemNounPlural.toLowerCase())}
        />
      </div>

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
              disabled={isSaving}
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
