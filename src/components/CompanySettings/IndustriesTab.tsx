import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { MdDelete, MdEdit, MdOutlineAdd, MdSearch } from 'react-icons/md';
import {
  Badge,
  Button,
  CustomTable,
  Input,
  Typography,
  paginationConfig,
  showToast,
} from '../shared';
import { Loader } from '../shared/ui/loader';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import {
  useListIndustriesQuery,
  useCreateIndustryMutation,
  useUpdateIndustryMutation,
  useDeleteIndustryMutation,
  Industry,
} from '../../api/organization-service/Platform/industries';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

type FormState = { code: string; name: string; description: string };
const emptyForm: FormState = { code: '', name: '', description: '' };
type IndustryRow = Industry & { key: string };

/**
 * GET/POST/PUT/DELETE /v1/platform/industries. No pagination or search on
 * this endpoint (it returns the whole catalogue, not a page of it) — this
 * is a flat list, not the heavier paginated MasterTable pattern used
 * elsewhere. Code is immutable once created (only name/description PUT).
 */
const IndustriesTab: React.FC = () => {
  const { data: industries, isLoading } = useListIndustriesQuery();
  const [createIndustry, { isLoading: isCreating }] = useCreateIndustryMutation();
  const [updateIndustry, { isLoading: isUpdating }] = useUpdateIndustryMutation();
  const [deleteIndustry] = useDeleteIndustryMutation();

  const [modalState, setModalState] = useState<{
    mode: 'add' | 'edit';
    industry?: Industry;
  } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [industryToDelete, setIndustryToDelete] = useState<Industry | null>(null);
  const [searchText, setSearchText] = useState('');

  // Hooks must run unconditionally on every render — kept above the
  // `if (isLoading) return` below, not after it, or React sees a different
  // number of hooks between the loading and loaded renders and throws.
  const filteredIndustries = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return industries ?? [];
    return (industries ?? []).filter(
      (industry) =>
        industry.name.toLowerCase().includes(q) ||
        industry.code.toLowerCase().includes(q) ||
        (industry.description ?? '').toLowerCase().includes(q)
    );
  }, [industries, searchText]);

  const openAdd = () => {
    setForm(emptyForm);
    setModalState({ mode: 'add' });
  };
  const openEdit = (industry: Industry) => {
    setForm({ code: industry.code, name: industry.name, description: industry.description || '' });
    setModalState({ mode: 'edit', industry });
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || (modalState?.mode === 'add' && !form.code.trim())) {
      showToast({ message: 'Code and name are required.', type: 'error' });
      return;
    }
    try {
      if (modalState?.mode === 'edit' && modalState.industry) {
        await updateIndustry({
          industryId: modalState.industry.industry_id,
          name: form.name.trim(),
          // Always sent, even empty: the backend's Industry.update() treats
          // an OMITTED description as "leave it alone" (only `undefined`
          // skips the field) and an EXPLICIT '' as "clear it" — they are not
          // the same thing server-side, so clearing the box has to send ''.
          description: form.description.trim(),
        }).unwrap();
        showToast({ message: 'Industry updated.', type: 'success' });
      } else {
        await createIndustry({
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        }).unwrap();
        showToast({ message: 'Industry added.', type: 'success' });
      }
      setModalState(null);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to save industry.'), type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!industryToDelete) return;
    try {
      await deleteIndustry(industryToDelete.industry_id).unwrap();
      showToast({ message: 'Industry removed.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to remove industry — a company may still use it.'),
        type: 'error',
      });
    } finally {
      setIndustryToDelete(null);
    }
  };

  if (isLoading) return <Loader />;

  const columns: TableProps<IndustryRow>['columns'] = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 160,
      sorter: (a: IndustryRow, b: IndustryRow) => a.code.localeCompare(b.code),
      render: (_: unknown, industry: IndustryRow) => (
        <Badge status="neutral" dot={false} className="font-mono tracking-wide">
          {industry.code}
        </Badge>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: IndustryRow, b: IndustryRow) => a.name.localeCompare(b.name),
      render: (_: unknown, industry: IndustryRow) => (
        <span className="font-semibold text-gray-900">{industry.name}</span>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      sorter: (a: IndustryRow, b: IndustryRow) =>
        (a.description ?? '').localeCompare(b.description ?? ''),
      render: (_: unknown, industry: IndustryRow) => (
        <span className="text-gray-500 text-sm">{industry.description || '—'}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, industry: IndustryRow) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Edit industry"
            className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
            onClick={() => openEdit(industry)}
          >
            <MdEdit className="text-gray-600" />
          </button>
          <button
            type="button"
            aria-label="Delete industry"
            className="p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
            onClick={() => setIndustryToDelete(industry)}
          >
            <MdDelete className="text-red-500" />
          </button>
        </div>
      ),
    },
  ];

  const dataSource: IndustryRow[] = filteredIndustries.map((industry) => ({
    ...industry,
    key: industry.industry_id,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <Typography variant="body2">
            Assigned to a company at creation. The code can&apos;t change once created.
          </Typography>
          <span className="text-xs font-medium text-gray-400">
            {dataSource.length} {dataSource.length === 1 ? 'industry' : 'industries'}
            {searchText.trim() && ` of ${industries?.length ?? 0}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Input
            prefix={<MdSearch className="text-gray-400" />}
            placeholder="Search industries..."
            className="w-64"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button
            className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1 shadow-sm hover:shadow-md transition-shadow shrink-0"
            onClick={openAdd}
          >
            <MdOutlineAdd /> Add industry
          </Button>
        </div>
      </div>

      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <CustomTable<IndustryRow>
          columns={columns}
          dataSource={dataSource}
          emptyText={searchText.trim() ? 'No industries match your search.' : 'No industries yet.'}
          pagination={paginationConfig('industries')}
        />
      </div>

      <AntdCommonModal
        open={modalState !== null}
        onClose={() => setModalState(null)}
        title={modalState?.mode === 'edit' ? 'Edit industry' : 'Add industry'}
      >
        <div className="flex flex-col gap-4">
          <Input
            placeholder="Code *"
            value={form.code}
            disabled={modalState?.mode === 'edit'}
            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
          />
          <Input
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="w-full border border-gray-300 rounded-full py-2"
              onClick={() => setModalState(null)}
              disabled={isCreating || isUpdating}
            >
              Cancel
            </Button>
            <Button
              className="w-full bg-button text-white rounded-full py-2"
              onClick={handleSubmit}
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </AntdCommonModal>

      {industryToDelete && (
        <ConfirmationModal
          title={`Remove "${industryToDelete.name}"? Blocked if a company still uses it.`}
          confirmText="REMOVE"
          onConfirm={handleDelete}
          onClose={() => setIndustryToDelete(null)}
        />
      )}
    </div>
  );
};

export default IndustriesTab;
