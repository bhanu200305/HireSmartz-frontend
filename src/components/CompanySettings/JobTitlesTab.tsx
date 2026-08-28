import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { Select as AntSelect } from 'antd';
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
  useListPlatformJobTitlesQuery,
  useCreatePlatformJobTitleMutation,
  useUpdatePlatformJobTitleMutation,
  useDeletePlatformJobTitleMutation,
  PlatformJobTitle,
} from '../../api/organization-service/Platform/jobTitles';
import { useListMasterDepartmentsQuery } from '../../api/organization-service/Platform/masterDepartments';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

// `code` isn't collected here — the backend derives it from `name` (see
// CreateJobTitleRequest's docstring) and a create requires a `department_id`
// to seed the title's first department mapping (many-to-many after that,
// managed from DepartmentSettingsTab). Editing only ever touches name/
// description, never the department, so departmentId is add-only state.
type FormState = { name: string; description: string; departmentId: string | null };
const emptyForm: FormState = { name: '', description: '', departmentId: null };
type JobTitleRow = PlatformJobTitle & { key: string };

/**
 * GET/POST/PUT/DELETE /v1/platform/job-titles — the platform's master
 * job-title catalogue only. Explicitly NOT a cross-tenant moderation view
 * into a company's own job titles (out of scope per the backend's own
 * router docstring) — same shape as IndustriesTab.tsx.
 */
const JobTitlesTab: React.FC = () => {
  const { data: jobTitles, isLoading } = useListPlatformJobTitlesQuery();
  const { data: departments } = useListMasterDepartmentsQuery();
  const [createJobTitle, { isLoading: isCreating }] = useCreatePlatformJobTitleMutation();
  const [updateJobTitle, { isLoading: isUpdating }] = useUpdatePlatformJobTitleMutation();
  const [deleteJobTitle] = useDeletePlatformJobTitleMutation();

  const [modalState, setModalState] = useState<{
    mode: 'add' | 'edit';
    jobTitle?: PlatformJobTitle;
  } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [jobTitleToDelete, setJobTitleToDelete] = useState<PlatformJobTitle | null>(null);
  const [searchText, setSearchText] = useState('');

  // Hooks must run unconditionally on every render — kept above the
  // `if (isLoading) return` below, not after it, or React sees a different
  // number of hooks between the loading and loaded renders and throws.
  const filteredJobTitleList = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return jobTitles ?? [];
    return (jobTitles ?? []).filter(
      (jobTitle) =>
        jobTitle.name.toLowerCase().includes(q) ||
        jobTitle.code.toLowerCase().includes(q) ||
        (jobTitle.description ?? '').toLowerCase().includes(q)
    );
  }, [jobTitles, searchText]);

  const openAdd = () => {
    setForm(emptyForm);
    setModalState({ mode: 'add' });
  };
  const openEdit = (jobTitle: PlatformJobTitle) => {
    setForm({ name: jobTitle.name, description: jobTitle.description || '', departmentId: null });
    setModalState({ mode: 'edit', jobTitle });
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || (modalState?.mode === 'add' && !form.departmentId)) {
      showToast({ message: 'Name and department are required.', type: 'error' });
      return;
    }
    try {
      if (modalState?.mode === 'edit' && modalState.jobTitle) {
        await updateJobTitle({
          jobTitleId: modalState.jobTitle.job_title_id,
          name: form.name.trim(),
          // Always sent, even empty — same reasoning as IndustriesTab: the
          // backend only clears a description when the field is explicitly
          // present as '', not when it's omitted from the request.
          description: form.description.trim(),
        }).unwrap();
        showToast({ message: 'Job title updated.', type: 'success' });
      } else {
        await createJobTitle({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          department_id: form.departmentId as string,
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

  const columns: TableProps<JobTitleRow>['columns'] = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 160,
      sorter: (a: JobTitleRow, b: JobTitleRow) => a.code.localeCompare(b.code),
      render: (_: unknown, jobTitle: JobTitleRow) => (
        <Badge status="neutral" dot={false} className="font-mono tracking-wide">
          {jobTitle.code}
        </Badge>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: JobTitleRow, b: JobTitleRow) => a.name.localeCompare(b.name),
      render: (_: unknown, jobTitle: JobTitleRow) => (
        <span className="font-semibold text-gray-900">{jobTitle.name}</span>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      sorter: (a: JobTitleRow, b: JobTitleRow) =>
        (a.description ?? '').localeCompare(b.description ?? ''),
      render: (_: unknown, jobTitle: JobTitleRow) => (
        <span className="text-gray-500 text-sm">{jobTitle.description || '—'}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, jobTitle: JobTitleRow) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Edit job title"
            className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
            onClick={() => openEdit(jobTitle)}
          >
            <MdEdit className="text-gray-600" />
          </button>
          <button
            type="button"
            aria-label="Delete job title"
            className="p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
            onClick={() => setJobTitleToDelete(jobTitle)}
          >
            <MdDelete className="text-red-500" />
          </button>
        </div>
      ),
    },
  ];

  const dataSource: JobTitleRow[] = filteredJobTitleList.map((jobTitle) => ({
    ...jobTitle,
    key: jobTitle.job_title_id,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <Typography variant="body2">Platform-wide job-title catalogue.</Typography>
          <span className="text-xs font-medium text-gray-400">
            {dataSource.length} {dataSource.length === 1 ? 'job title' : 'job titles'}
            {searchText.trim() && ` of ${jobTitles?.length ?? 0}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Input
            prefix={<MdSearch className="text-gray-400" />}
            placeholder="Search job titles..."
            className="w-64"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Button
            className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1 shadow-sm hover:shadow-md transition-shadow shrink-0"
            onClick={openAdd}
          >
            <MdOutlineAdd /> Add job title
          </Button>
        </div>
      </div>

      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <CustomTable<JobTitleRow>
          columns={columns}
          dataSource={dataSource}
          emptyText={searchText.trim() ? 'No job titles match your search.' : 'No job titles yet.'}
          pagination={paginationConfig('job titles')}
        />
      </div>

      <AntdCommonModal
        open={modalState !== null}
        onClose={() => setModalState(null)}
        title={modalState?.mode === 'edit' ? 'Edit job title' : 'Add job title'}
      >
        <div className="flex flex-col gap-4">
          <Input
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          {modalState?.mode === 'add' && (
            <AntSelect
              placeholder="Department *"
              className="w-full"
              value={form.departmentId ?? undefined}
              onChange={(value) => setForm((prev) => ({ ...prev, departmentId: value }))}
              options={(departments ?? []).map((department) => ({
                label: department.name,
                value: department.department_id,
              }))}
            />
          )}
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
