import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { Select as AntSelect, Tooltip } from 'antd';
import { MdDelete, MdEdit, MdOutlineAdd, MdSearch } from 'react-icons/md';
import { Badge, Button, CustomTable, Input, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import StatusToggle from '../shared/ui/StatusToggle';
import MasterPagination from '../shared/ui/MasterPagination';
import { RowsPerPageSelect } from '../shared/ui/RowsPerPageSelect';
import { usePersistedPageSize } from '../../hooks/usePersistedPageSize';
import { useEnterToSubmit } from '../../hooks/useEnterToSubmit';
import { PAGE_SIZE_OPTIONS } from '../../constants/app.constants';
import {
  useListPlatformJobTitlesQuery,
  useCreatePlatformJobTitleMutation,
  useUpdatePlatformJobTitleMutation,
  useDeletePlatformJobTitleMutation,
  useDeactivatePlatformJobTitleMutation,
  useActivatePlatformJobTitleMutation,
  PlatformJobTitle,
} from '../../api/organization-service/Platform/jobTitles';
import {
  useListMasterDepartmentsQuery,
  useAssignJobTitleToDepartmentMutation,
} from '../../api/organization-service/Platform/masterDepartments';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

// `code` isn't collected here — the backend derives it from `name` (see
// CreateJobTitleRequest's docstring). A create seeds the first department
// mapping via `department_id`; the mapping is many-to-many
// (`master_department_job_title_mapping`), so the form takes a list and any
// extra departments are attached with one assign call each right after the
// title is created. Editing only ever touches name/description — departments
// are managed from DepartmentSettingsTab — so `departmentIds` is add-only state.
type FormState = { name: string; description: string; departmentIds: string[] };
const emptyForm: FormState = { name: '', description: '', departmentIds: [] };
type JobTitleRow = PlatformJobTitle & { key: string };
type SortKey = 'code' | 'name';

const SORT_COMPARATORS: Record<SortKey, (a: PlatformJobTitle, b: PlatformJobTitle) => number> = {
  code: (a, b) => a.code.localeCompare(b.code),
  name: (a, b) => a.name.localeCompare(b.name),
};

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
  const [assignJobTitleToDepartment] = useAssignJobTitleToDepartmentMutation();
  const [deactivateJobTitle] = useDeactivatePlatformJobTitleMutation();
  const [activateJobTitle] = useActivatePlatformJobTitleMutation();

  const [modalState, setModalState] = useState<{
    mode: 'add' | 'edit';
    jobTitle?: PlatformJobTitle;
  } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [jobTitleToDelete, setJobTitleToDelete] = useState<PlatformJobTitle | null>(null);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('company_settings_job_titles', 10);

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

  const sortedJobTitleList = useMemo(() => {
    const sorted = [...filteredJobTitleList].sort(SORT_COMPARATORS[sortBy]);
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [filteredJobTitleList, sortBy, sortOrder]);

  const sortOrderFor = (key: SortKey): 'ascend' | 'descend' | undefined =>
    sortBy === key ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined;

  const handleTableChange: TableProps<JobTitleRow>['onChange'] = (
    _pagination,
    _filters,
    sorter
  ) => {
    const active = Array.isArray(sorter) ? sorter[0] : (sorter as SorterResult<JobTitleRow>);
    setPage(0);
    if (!active?.order || !active.columnKey) {
      setSortBy('name');
      setSortOrder('asc');
      return;
    }
    setSortBy(active.columnKey as SortKey);
    setSortOrder(active.order === 'ascend' ? 'asc' : 'desc');
  };

  const openAdd = () => {
    setForm(emptyForm);
    setModalState({ mode: 'add' });
  };
  const openEdit = (jobTitle: PlatformJobTitle) => {
    setForm({ name: jobTitle.name, description: jobTitle.description || '', departmentIds: [] });
    setModalState({ mode: 'edit', jobTitle });
  };

  const isFormValid =
    form.name.trim().length > 0 && (modalState?.mode === 'edit' || form.departmentIds.length > 0);

  const handleSubmit = async () => {
    if (!isFormValid) {
      showToast({ message: 'Please fill the mandatory fields to save.', type: 'error' });
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
        showToast({ message: 'Job Title updated.', type: 'success' });
      } else {
        const [firstDepartmentId, ...extraDepartmentIds] = form.departmentIds;
        // The create endpoint seeds exactly one mapping; the rest are
        // attached with one assign call each (no bulk endpoint exists).
        const created = await createJobTitle({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          department_id: firstDepartmentId,
        }).unwrap();
        if (extraDepartmentIds.length > 0) {
          await Promise.all(
            extraDepartmentIds.map((departmentId) =>
              assignJobTitleToDepartment({
                departmentId,
                jobTitleId: created.job_title_id,
              }).unwrap()
            )
          );
        }
        showToast({
          message:
            form.departmentIds.length > 1
              ? `Job Title added to ${form.departmentIds.length} departments.`
              : 'Job Title added.',
          type: 'success',
        });
      }
      setModalState(null);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to save job title.'), type: 'error' });
    }
  };

  const { onKeyDown: handleEnterToSubmit } = useEnterToSubmit(handleSubmit, {
    enabled: modalState !== null && !isCreating && !isUpdating && isFormValid,
  });

  const handleDelete = async () => {
    if (!jobTitleToDelete) return;
    try {
      await deleteJobTitle(jobTitleToDelete.job_title_id).unwrap();
      showToast({ message: 'Job Title removed.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to remove job title; a company may still use it.'),
        type: 'error',
      });
    } finally {
      setJobTitleToDelete(null);
    }
  };

  const handleDeactivate = async (jobTitle: PlatformJobTitle) => {
    try {
      await deactivateJobTitle(jobTitle.job_title_id).unwrap();
      showToast({ message: `"${jobTitle.name}" was deactivated.`, type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to deactivate job title.'),
        type: 'error',
      });
    }
  };

  const handleActivate = async (jobTitle: PlatformJobTitle) => {
    try {
      await activateJobTitle(jobTitle.job_title_id).unwrap();
      showToast({ message: `"${jobTitle.name}" was activated.`, type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to activate job title.'),
        type: 'error',
      });
    }
  };

  if (isLoading) return <Loader />;

  const columns: TableProps<JobTitleRow>['columns'] = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 160,
      sorter: true,
      sortOrder: sortOrderFor('code'),
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
      sorter: true,
      sortOrder: sortOrderFor('name'),
      render: (_: unknown, jobTitle: JobTitleRow) => (
        <span className="font-semibold text-gray-900">{jobTitle.name}</span>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (_: unknown, jobTitle: JobTitleRow) => (
        <span className="text-gray-500 text-sm">{jobTitle.description || '-'}</span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_: unknown, jobTitle: JobTitleRow) => (
        <StatusToggle
          isActive={jobTitle.is_active}
          activateLabel="Activate job title"
          deactivateLabel="Deactivate job title"
          deactivateConfirmTitle={`Deactivate "${jobTitle.name}"? Companies won't be able to import it anymore.`}
          onActivate={() => handleActivate(jobTitle)}
          onDeactivate={() => handleDeactivate(jobTitle)}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 90,
      render: (_: unknown, jobTitle: JobTitleRow) => (
        <div className="flex items-center gap-1">
          <Tooltip title="Edit Job Title">
            <button
              type="button"
              aria-label="Edit job title"
              className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
              onClick={() => openEdit(jobTitle)}
            >
              <MdEdit className="text-gray-600" />
            </button>
          </Tooltip>
          <Tooltip title="Delete Job Title">
            <button
              type="button"
              aria-label="Delete job title"
              className="group p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
              onClick={() => setJobTitleToDelete(jobTitle)}
            >
              <MdDelete className="text-gray-600 transition-colors group-hover:text-red-600" />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  const dataSource: JobTitleRow[] = sortedJobTitleList
    .slice(page * pageSize, page * pageSize + pageSize)
    .map((jobTitle) => ({ ...jobTitle, key: jobTitle.job_title_id }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <Typography variant="body2">Platform-wide job-title catalog.</Typography>
          <span className="text-xs font-medium text-gray-400">
            {sortedJobTitleList.length}{' '}
            {sortedJobTitleList.length === 1 ? 'job title' : 'job titles'}
            {searchText.trim() && ` of ${jobTitles?.length ?? 0}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Input
            prefix={<MdSearch className="text-gray-400" />}
            placeholder="Search Job Titles..."
            className="w-64"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(0);
            }}
          />
          <Button
            className="rounded-full bg-button text-white px-4 py-2 flex items-center justify-center gap-1 shadow-sm hover:shadow-md transition-shadow shrink-0 min-w-[180px]"
            onClick={openAdd}
          >
            <MdOutlineAdd /> Add Job Title
          </Button>
        </div>
      </div>

      <RowsPerPageSelect
        pageSize={pageSize}
        options={PAGE_SIZE_OPTIONS}
        onChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
      />

      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <CustomTable<JobTitleRow>
          columns={columns}
          dataSource={dataSource}
          emptyText={searchText.trim() ? 'No job titles match your search.' : 'No job titles yet.'}
          pagination={false}
          onChange={handleTableChange}
        />
      </div>

      <MasterPagination
        current={page + 1}
        pageSize={pageSize}
        total={sortedJobTitleList.length}
        itemLabel="job titles"
        onPageChange={(nextPage) => setPage(nextPage - 1)}
      />

      <AntdCommonModal
        open={modalState !== null}
        onClose={() => setModalState(null)}
        title={modalState?.mode === 'edit' ? 'Edit Job Title' : 'Add Job Title'}
      >
        <div className="flex flex-col gap-4" onKeyDown={handleEnterToSubmit}>
          <Input
            placeholder="Name *"
            maxLength={120}
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          {modalState?.mode === 'add' && (
            <AntSelect
              mode="multiple"
              placeholder="Departments *"
              className="w-full"
              value={form.departmentIds}
              onChange={(value: string[]) => setForm((prev) => ({ ...prev, departmentIds: value }))}
              optionFilterProp="label"
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
              disabled={isCreating || isUpdating || !isFormValid}
            >
              {isCreating || isUpdating ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </AntdCommonModal>

      {jobTitleToDelete && (
        <ConfirmationModal
          title={`Remove "${jobTitleToDelete.name}"? Blocked if a company's own title was seeded from it.`}
          confirmText="Remove"
          onConfirm={handleDelete}
          onClose={() => setJobTitleToDelete(null)}
        />
      )}
    </div>
  );
};

export default JobTitlesTab;
