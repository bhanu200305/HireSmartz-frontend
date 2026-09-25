import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { Select as AntSelect } from 'antd';
import { MdDelete, MdEdit, MdOutlineAdd, MdSearch } from 'react-icons/md';
import { Button, CustomTable, Input, Typography, paginationConfig, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import {
  useListTenantJobTitlesQuery,
  useCreateTenantJobTitleMutation,
  useUpdateTenantJobTitleMutation,
  useDeleteTenantJobTitleMutation,
  useAssignTenantJobTitleToDepartmentMutation,
  tenantJobTitleFormId,
  TenantJobTitle,
} from '../../../api/organization-service/Tenants/jobTitles';
import { useListTenantDepartmentsQuery } from '../../../api/organization-service/Tenants/departments';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import useHasAccess from '../../../hooks/useHasAccess';
import { Authorities } from '../../../constants/authorities.constant';

// Editing only ever touches name/description - department assignment is
// managed from the Department Settings tab - same split as Super Admin's
// own JobTitlesTab.tsx. `departmentIds` is add-only state used on create.
type FormState = { name: string; description: string; departmentIds: string[] };
const emptyForm: FormState = { name: '', description: '', departmentIds: [] };
type JobTitleRow = TenantJobTitle & { key: string };

/** This organization's own job-title catalogue (`organization_job_title`). */
const TenantJobTitlesTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data: jobTitles, isLoading } = useListTenantJobTitlesQuery(tenantId, {
    skip: !tenantId,
  });
  const { data: departments } = useListTenantDepartmentsQuery(tenantId, { skip: !tenantId });
  const [createJobTitle, { isLoading: isCreating }] = useCreateTenantJobTitleMutation();
  const [updateJobTitle, { isLoading: isUpdating }] = useUpdateTenantJobTitleMutation();
  const [deleteJobTitle] = useDeleteTenantJobTitleMutation();
  const [assignJobTitle] = useAssignTenantJobTitleToDepartmentMutation();

  const canAdd = useHasAccess(Authorities.TENANT_JOB_TITLE_ADD);
  const canEdit = useHasAccess(Authorities.TENANT_JOB_TITLE_EDIT);
  const canDelete = useHasAccess(Authorities.TENANT_JOB_TITLE_DELETE);

  const [modalState, setModalState] = useState<{
    mode: 'add' | 'edit';
    jobTitle?: TenantJobTitle;
  } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [jobTitleToDelete, setJobTitleToDelete] = useState<TenantJobTitle | null>(null);
  const [searchText, setSearchText] = useState('');

  const filteredJobTitles = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return jobTitles ?? [];
    return (jobTitles ?? []).filter(
      (jobTitle) =>
        jobTitle.name.toLowerCase().includes(q) ||
        (jobTitle.description ?? '').toLowerCase().includes(q)
    );
  }, [jobTitles, searchText]);

  const openAdd = () => {
    setForm(emptyForm);
    setModalState({ mode: 'add' });
  };
  const openEdit = (jobTitle: TenantJobTitle) => {
    setForm({ name: jobTitle.name, description: jobTitle.description || '', departmentIds: [] });
    setModalState({ mode: 'edit', jobTitle });
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || (modalState?.mode === 'add' && form.departmentIds.length === 0)) {
      showToast({ message: 'Name and at least one department are required.', type: 'error' });
      return;
    }
    try {
      if (modalState?.mode === 'edit' && modalState.jobTitle) {
        await updateJobTitle({
          tenantId,
          jobTitleId: tenantJobTitleFormId(modalState.jobTitle),
          name: form.name.trim(),
          description: form.description.trim(),
        }).unwrap();
        showToast({ message: 'Job title updated.', type: 'success' });
      } else {
        const [firstDepartmentId, ...extraDepartmentIds] = form.departmentIds;
        // The create endpoint seeds exactly one mapping; the rest are
        // attached with one assign call each - no bulk endpoint exists.
        const created = await createJobTitle({
          tenantId,
          name: form.name.trim(),
          department_id: firstDepartmentId,
          description: form.description.trim() || undefined,
        }).unwrap();
        if (extraDepartmentIds.length > 0) {
          await Promise.all(
            extraDepartmentIds.map((departmentId) =>
              assignJobTitle({
                tenantId,
                departmentId,
                job_title_id: tenantJobTitleFormId(created),
              }).unwrap()
            )
          );
        }
        showToast({
          message:
            form.departmentIds.length > 1
              ? `Job title added to ${form.departmentIds.length} departments.`
              : 'Job title added.',
          type: 'success',
        });
      }
      setModalState(null);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to save job title.'), type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!jobTitleToDelete) return;
    try {
      await deleteJobTitle({
        tenantId,
        jobTitleId: tenantJobTitleFormId(jobTitleToDelete),
      }).unwrap();
      showToast({ message: 'Job title removed.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to remove job title; a job may still use it.'),
        type: 'error',
      });
    } finally {
      setJobTitleToDelete(null);
    }
  };

  if (isLoading) return <Loader />;

  const showActions = canEdit || canDelete;
  const columns: TableProps<JobTitleRow>['columns'] = [
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
      render: (_: unknown, jobTitle: JobTitleRow) => (
        <span className="text-gray-500 text-sm">{jobTitle.description || '-'}</span>
      ),
    },
    showActions && {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, jobTitle: JobTitleRow) => (
        <div className="flex items-center gap-1">
          {canEdit && (
            <button
              type="button"
              aria-label="Edit job title"
              className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
              onClick={() => openEdit(jobTitle)}
            >
              <MdEdit className="text-gray-600" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              aria-label="Delete job title"
              className="p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
              onClick={() => setJobTitleToDelete(jobTitle)}
            >
              <MdDelete className="text-red-500" />
            </button>
          )}
        </div>
      ),
    },
  ].filter(Boolean) as TableProps<JobTitleRow>['columns'];

  const dataSource: JobTitleRow[] = filteredJobTitles.map((jobTitle) => ({
    ...jobTitle,
    key: tenantJobTitleFormId(jobTitle),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <Typography variant="body2">Your company&apos;s own job-title catalog.</Typography>
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
          {canAdd && (
            <Button
              className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1 shadow-sm hover:shadow-md transition-shadow shrink-0"
              onClick={openAdd}
            >
              <MdOutlineAdd /> Add job title
            </Button>
          )}
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
              mode="multiple"
              placeholder="Departments *"
              className="w-full"
              value={form.departmentIds}
              onChange={(value: string[]) => setForm((prev) => ({ ...prev, departmentIds: value }))}
              optionFilterProp="label"
              options={(departments ?? []).map((department) => ({
                label: department.name,
                value: department.org_department_id,
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
          title={`Remove "${jobTitleToDelete.name}"? Blocked while a job still uses it.`}
          confirmText="REMOVE"
          onConfirm={handleDelete}
          onClose={() => setJobTitleToDelete(null)}
        />
      )}
    </div>
  );
};

export default TenantJobTitlesTab;
