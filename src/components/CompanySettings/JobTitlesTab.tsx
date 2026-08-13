import React, { useState } from 'react';
import { MdDelete, MdEdit, MdOutlineAdd } from 'react-icons/md';
import { Button, Input, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import {
  useListPlatformJobTitlesQuery,
  useCreatePlatformJobTitleMutation,
  useUpdatePlatformJobTitleMutation,
  useDeletePlatformJobTitleMutation,
  PlatformJobTitle,
} from '../../api/organization-service/Platform/jobTitles';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

type FormState = { code: string; name: string; description: string };
const emptyForm: FormState = { code: '', name: '', description: '' };

/**
 * GET/POST/PUT/DELETE /v1/platform/job-titles — the platform's master
 * job-title catalogue only. Explicitly NOT a cross-tenant moderation view
 * into a company's own job titles (out of scope per the backend's own
 * router docstring) — same shape as IndustriesTab.tsx.
 */
const JobTitlesTab: React.FC = () => {
  const { data: jobTitles, isLoading } = useListPlatformJobTitlesQuery();
  const [createJobTitle, { isLoading: isCreating }] = useCreatePlatformJobTitleMutation();
  const [updateJobTitle, { isLoading: isUpdating }] = useUpdatePlatformJobTitleMutation();
  const [deleteJobTitle] = useDeletePlatformJobTitleMutation();

  const [modalState, setModalState] = useState<{
    mode: 'add' | 'edit';
    jobTitle?: PlatformJobTitle;
  } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [jobTitleToDelete, setJobTitleToDelete] = useState<PlatformJobTitle | null>(null);

  const openAdd = () => {
    setForm(emptyForm);
    setModalState({ mode: 'add' });
  };
  const openEdit = (jobTitle: PlatformJobTitle) => {
    setForm({ code: jobTitle.code, name: jobTitle.name, description: jobTitle.description || '' });
    setModalState({ mode: 'edit', jobTitle });
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || (modalState?.mode === 'add' && !form.code.trim())) {
      showToast({ message: 'Code and name are required.', type: 'error' });
      return;
    }
    try {
      if (modalState?.mode === 'edit' && modalState.jobTitle) {
        await updateJobTitle({
          jobTitleId: modalState.jobTitle.job_title_id,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        }).unwrap();
        showToast({ message: 'Job title updated.', type: 'success' });
      } else {
        await createJobTitle({
          code: form.code.trim(),
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        }).unwrap();
        showToast({ message: 'Job title added.', type: 'success' });
      }
      setModalState(null);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to save job title.'), type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!jobTitleToDelete) return;
    try {
      await deleteJobTitle(jobTitleToDelete.job_title_id).unwrap();
      showToast({ message: 'Job title removed.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(
          err,
          'Failed to remove job title — a company may still use it.'
        ),
        type: 'error',
      });
    } finally {
      setJobTitleToDelete(null);
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Typography variant="body2">Platform-wide job-title catalogue.</Typography>
        <Button
          className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1"
          onClick={openAdd}
        >
          <MdOutlineAdd /> Add job title
        </Button>
      </div>

      <div className="divide-y border rounded-xl overflow-hidden bg-white">
        {(jobTitles || []).map((jobTitle) => (
          <div key={jobTitle.job_title_id} className="flex items-center justify-between p-3">
            <div>
              <Typography variant="body1">
                {jobTitle.name} <span className="text-gray-400 text-xs">({jobTitle.code})</span>
              </Typography>
              {jobTitle.description && (
                <Typography variant="caption">{jobTitle.description}</Typography>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Edit job title"
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={() => openEdit(jobTitle)}
              >
                <MdEdit className="text-gray-600" />
              </button>
              <button
                type="button"
                aria-label="Delete job title"
                className="p-2 hover:bg-gray-100 rounded-full"
                onClick={() => setJobTitleToDelete(jobTitle)}
              >
                <MdDelete className="text-red-500" />
              </button>
            </div>
          </div>
        ))}
        {!jobTitles?.length && (
          <div className="p-6 text-center text-gray-400 text-sm">No job titles yet.</div>
        )}
      </div>

      <AntdCommonModal
        open={modalState !== null}
        onClose={() => setModalState(null)}
        title={modalState?.mode === 'edit' ? 'Edit job title' : 'Add job title'}
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

      {jobTitleToDelete && (
        <ConfirmationModal
          title={`Remove "${jobTitleToDelete.name}"? Blocked if a company's own title was seeded from it.`}
          confirmText="REMOVE"
          onConfirm={handleDelete}
          onClose={() => setJobTitleToDelete(null)}
        />
      )}
    </div>
  );
};

export default JobTitlesTab;
