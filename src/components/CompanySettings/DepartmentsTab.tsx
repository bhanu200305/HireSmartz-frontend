import React, { useState } from 'react';
import { MdDelete, MdEdit, MdOutlineAdd } from 'react-icons/md';
import { Button, Input, Typography, showToast } from '../shared';
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Typography variant="body2">
          Global list of functional organizational units. Departments are industry-agnostic here.
        </Typography>
        <Button
          className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1"
          onClick={openAdd}
        >
          <MdOutlineAdd /> Add department
        </Button>
      </div>

      <div className="divide-y border rounded-xl overflow-hidden bg-white">
        {(departments || []).map((department) => (
          <div key={department.department_id} className="flex items-center justify-between p-3">
            <div>
              <Typography variant="body1">
                {department.name} <span className="text-gray-400 text-xs">({department.code})</span>
              </Typography>
              {department.description && (
                <Typography variant="caption">{department.description}</Typography>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Edit department"
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={() => openEdit(department)}
              >
                <MdEdit className="text-gray-600" />
              </button>
              <button
                type="button"
                aria-label="Delete department"
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={() => setDepartmentToDelete(department)}
              >
                <MdDelete className="text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {!departments?.length && (
          <div className="p-6 text-center text-gray-400 text-sm">No departments yet.</div>
        )}
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
