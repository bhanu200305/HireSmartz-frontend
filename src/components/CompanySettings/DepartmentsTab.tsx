import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { MdDelete, MdEdit, MdOutlineAdd, MdSearch } from 'react-icons/md';
import { Badge, Button, CustomTable, Input, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import {
  useListMasterDepartmentsQuery,
  useCreateMasterDepartmentMutation,
  useUpdateMasterDepartmentMutation,
  useDeleteMasterDepartmentMutation,
  MasterDepartment,
} from '../../api/organization-service/Platform/masterDepartments';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

type FormState = { code: string; name: string; description: string };
const emptyForm: FormState = { code: '', name: '', description: '' };
type DepartmentRow = MasterDepartment & { key: string };

/**
 * GET/POST/PUT/DELETE /v1/platform/master-departments — the platform's
 * department catalogue. Same shape as IndustriesTab.tsx (code/name/
 * description, code immutable once created); no active/inactive concept —
 * DepartmentView on the backend has no status field.
 */
const DepartmentsTab: React.FC = () => {
  const { data: departments, isLoading } = useListMasterDepartmentsQuery();
  const [createDepartment, { isLoading: isCreating }] = useCreateMasterDepartmentMutation();
  const [updateDepartment, { isLoading: isUpdating }] = useUpdateMasterDepartmentMutation();
  const [deleteDepartment] = useDeleteMasterDepartmentMutation();

  const [modalState, setModalState] = useState<{
    mode: 'add' | 'edit';
    department?: MasterDepartment;
  } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [departmentToDelete, setDepartmentToDelete] = useState<MasterDepartment | null>(null);
  const [searchText, setSearchText] = useState('');

  // Hooks must run unconditionally on every render — kept above the
  // `if (isLoading) return` below, not after it, or React sees a different
  // number of hooks between the loading and loaded renders and throws.
  const filteredDepartments = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return departments ?? [];
    return (departments ?? []).filter(
      (department) =>
        department.name.toLowerCase().includes(q) ||
        department.code.toLowerCase().includes(q) ||
        (department.description ?? '').toLowerCase().includes(q)
    );
  }, [departments, searchText]);

  const openAdd = () => {
    setForm(emptyForm);
    setModalState({ mode: 'add' });
  };
  const openEdit = (department: MasterDepartment) => {
    setForm({
      code: department.code,
      name: department.name,
      description: department.description || '',
    });
    setModalState({ mode: 'edit', department });
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || (modalState?.mode === 'add' && !form.code.trim())) {
      showToast({ message: 'Code and name are required.', type: 'error' });
      return;
    }
    try {
      if (modalState?.mode === 'edit' && modalState.department) {
        await updateDepartment({
          departmentId: modalState.department.department_id,
          name: form.name.trim(),
          description: form.description.trim(),
        }).unwrap();
        showToast({ message: 'Department updated.', type: 'success' });
      } else {
        await createDepartment({
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        }).unwrap();
        showToast({ message: 'Department added.', type: 'success' });
      }
      setModalState(null);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to save department.'), type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!departmentToDelete) return;
    try {
      await deleteDepartment(departmentToDelete.department_id).unwrap();
      showToast({ message: 'Department removed.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(
          err,
          'Failed to remove department — a company may still use it.'
        ),
        type: 'error',
      });
    } finally {
      setDepartmentToDelete(null);
    }
  };

  if (isLoading) return <Loader />;

  const columns: TableProps<DepartmentRow>['columns'] = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 160,
      sorter: (a: DepartmentRow, b: DepartmentRow) => a.code.localeCompare(b.code),
      render: (_: unknown, department: DepartmentRow) => (
        <Badge status="neutral" dot={false} className="font-mono tracking-wide">
          {department.code}
        </Badge>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: DepartmentRow, b: DepartmentRow) => a.name.localeCompare(b.name),
      render: (_: unknown, department: DepartmentRow) => (
        <span className="font-semibold text-gray-900">{department.name}</span>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      sorter: (a: DepartmentRow, b: DepartmentRow) =>
        (a.description ?? '').localeCompare(b.description ?? ''),
      render: (_: unknown, department: DepartmentRow) => (
        <span className="text-gray-500 text-sm">{department.description || '—'}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, department: DepartmentRow) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Edit department"
            className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
            onClick={() => openEdit(department)}
          >
            <MdEdit className="text-gray-600" />
          </button>
          <button
            type="button"
            aria-label="Delete department"
            className="p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
            onClick={() => setDepartmentToDelete(department)}
          >
            <MdDelete className="text-red-500" />
          </button>
        </div>
      ),
    },
  ];

  const dataSource: DepartmentRow[] = filteredDepartments.map((department) => ({
    ...department,
    key: department.department_id,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <Typography variant="body2">
            Global list of functional organizational units. Departments are industry-agnostic here.
          </Typography>
          <span className="text-xs font-medium text-gray-400">
            {dataSource.length} {dataSource.length === 1 ? 'department' : 'departments'}
            {searchText.trim() && ` of ${departments?.length ?? 0}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Input
            prefix={<MdSearch className="text-gray-400" />}
            placeholder="Search departments..."
            className="w-64"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button
            className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1 shadow-sm hover:shadow-md transition-shadow shrink-0"
            onClick={openAdd}
          >
            <MdOutlineAdd /> Add department
          </Button>
        </div>
      </div>

      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <CustomTable<DepartmentRow>
          columns={columns}
          dataSource={dataSource}
          emptyText={
            searchText.trim() ? 'No departments match your search.' : 'No departments yet.'
          }
        />
      </div>

      <AntdCommonModal
        open={modalState !== null}
        onClose={() => setModalState(null)}
        title={modalState?.mode === 'edit' ? 'Edit department' : 'Add department'}
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

      {departmentToDelete && (
        <ConfirmationModal
          title={`Remove "${departmentToDelete.name}"? Blocked if a company still uses it.`}
          confirmText="REMOVE"
          onConfirm={handleDelete}
          onClose={() => setDepartmentToDelete(null)}
        />
      )}
    </div>
  );
};

export default DepartmentsTab;
