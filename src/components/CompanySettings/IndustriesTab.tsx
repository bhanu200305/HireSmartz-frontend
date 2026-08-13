import React, { useState } from 'react';
import { MdDelete, MdEdit, MdOutlineAdd } from 'react-icons/md';
import { Button, Input, Typography, showToast } from '../shared';
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
          description: form.description.trim() || undefined,
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Typography variant="body2">
          Assigned to a company at creation. The code can&apos;t change once created.
        </Typography>
        <Button
          className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1"
          onClick={openAdd}
        >
          <MdOutlineAdd /> Add industry
        </Button>
      </div>

      <div className="divide-y border rounded-xl overflow-hidden bg-white">
        {(industries || []).map((industry) => (
          <div key={industry.industry_id} className="flex items-center justify-between p-3">
            <div>
              <Typography variant="body1">
                {industry.name} <span className="text-gray-400 text-xs">({industry.code})</span>
              </Typography>
              {industry.description && (
                <Typography variant="caption">{industry.description}</Typography>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Edit industry"
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={() => openEdit(industry)}
              >
                <MdEdit className="text-gray-600" />
              </button>
              <button
                type="button"
                aria-label="Delete industry"
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={() => setIndustryToDelete(industry)}
              >
                <MdDelete className="text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {!industries?.length && (
          <div className="p-6 text-center text-gray-400 text-sm">No industries yet.</div>
        )}
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
