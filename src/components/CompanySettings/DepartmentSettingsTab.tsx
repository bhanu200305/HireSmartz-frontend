import React, { useEffect, useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { Select as AntSelect } from 'antd';
import { MdSearch } from 'react-icons/md';
import {
  Badge,
  CustomTable,
  Input,
  Typography,
  Button,
  paginationConfig,
  showToast,
} from '../shared';
import { Loader } from '../shared/ui/loader';
import {
  useListMasterDepartmentsQuery,
  useListMasterDepartmentJobTitlesQuery,
  useAssignJobTitleToDepartmentMutation,
  useRemoveJobTitleFromDepartmentMutation,
} from '../../api/organization-service/Platform/masterDepartments';
import {
  PlatformJobTitle,
  useListPlatformJobTitlesQuery,
} from '../../api/organization-service/Platform/jobTitles';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';

type JobTitleAssignRow = PlatformJobTitle & { key: string; isMapped: boolean };

/**
 * Assign job titles to a department — GET .../master-departments/{id}/job-titles
 * for the current mapping, POST/DELETE .../job-titles[/{id}] to change it.
 * No bulk "set the whole mapping" endpoint exists, so unlike a typical
 * checklist-then-Save form, Save here computes the diff against what's
 * currently mapped and fires one assign or remove call per changed row.
 */
const DepartmentSettingsTab: React.FC = () => {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [stagedMappedIds, setStagedMappedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const { data: departments, isLoading: isDeptsLoading } = useListMasterDepartmentsQuery();
  const sortedDepartments = useMemo(
    () => [...(departments ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [departments]
  );

  useEffect(() => {
    if (sortedDepartments.length > 0 && selectedDepartmentId === null) {
      setSelectedDepartmentId(sortedDepartments[0].department_id);
    }
  }, [sortedDepartments, selectedDepartmentId]);

  const { data: allJobTitles, isLoading: isJobTitlesLoading } = useListPlatformJobTitlesQuery();
  const filteredJobTitles = useMemo(() => {
    const list = allJobTitles ?? [];
    if (!searchText.trim()) return list;
    const q = searchText.trim().toLowerCase();
    return list.filter(
      (jt) => jt.name.toLowerCase().includes(q) || jt.code.toLowerCase().includes(q)
    );
  }, [allJobTitles, searchText]);

  const {
    data: mappedJobTitles,
    isLoading: isMappedLoading,
    isFetching: isMappedFetching,
  } = useListMasterDepartmentJobTitlesQuery(selectedDepartmentId ?? '', {
    skip: !selectedDepartmentId,
  });
  const mappedIds = useMemo(
    () => new Set((mappedJobTitles ?? []).map((jt) => jt.job_title_id)),
    [mappedJobTitles]
  );

  useEffect(() => {
    setStagedMappedIds(new Set(mappedIds));
  }, [mappedJobTitles, selectedDepartmentId]);

  const [assignJobTitle] = useAssignJobTitleToDepartmentMutation();
  const [removeJobTitle] = useRemoveJobTitleFromDepartmentMutation();

  const activeDepartmentName =
    sortedDepartments.find((d) => d.department_id === selectedDepartmentId)?.name || 'Department';

  const toggle = (jobTitleId: string, checked: boolean) => {
    setStagedMappedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(jobTitleId);
      else next.delete(jobTitleId);
      return next;
    });
  };

  const isDirty =
    stagedMappedIds.size !== mappedIds.size ||
    [...stagedMappedIds].some((id) => !mappedIds.has(id));

  const handleReset = () => setStagedMappedIds(new Set(mappedIds));

  const handleSave = async () => {
    if (!selectedDepartmentId) return;
    const toAdd = [...stagedMappedIds].filter((id) => !mappedIds.has(id));
    const toRemove = [...mappedIds].filter((id) => !stagedMappedIds.has(id));

    setIsSaving(true);
    try {
      for (const jobTitleId of toAdd) {
        await assignJobTitle({ departmentId: selectedDepartmentId, jobTitleId }).unwrap();
      }
      for (const jobTitleId of toRemove) {
        await removeJobTitle({ departmentId: selectedDepartmentId, jobTitleId }).unwrap();
      }
      showToast({ message: 'Department job titles configured.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to save one or more changes.'),
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isDeptsLoading || isJobTitlesLoading;
  const isBusy = isMappedFetching || isSaving;

  if (isLoading) return <Loader />;

  const columns: TableProps<JobTitleAssignRow>['columns'] = [
    {
      title: '',
      key: 'assigned',
      width: 56,
      render: (_: unknown, row: JobTitleAssignRow) => (
        <input
          type="checkbox"
          checked={row.isMapped}
          disabled={isBusy}
          onChange={(e) => toggle(row.job_title_id, e.target.checked)}
          className="w-4 h-4 cursor-pointer accent-primary-600"
        />
      ),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 160,
      sorter: (a: JobTitleAssignRow, b: JobTitleAssignRow) => a.code.localeCompare(b.code),
      render: (_: unknown, row: JobTitleAssignRow) => (
        <Badge status="neutral" dot={false} className="font-mono tracking-wide">
          {row.code}
        </Badge>
      ),
    },
    {
      title: 'Job Title',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: JobTitleAssignRow, b: JobTitleAssignRow) => a.name.localeCompare(b.name),
      render: (_: unknown, row: JobTitleAssignRow) => (
        <span className={row.isMapped ? 'font-semibold text-primary-700' : 'text-gray-700'}>
          {row.name}
        </span>
      ),
    },
  ];

  const dataSource: JobTitleAssignRow[] = filteredJobTitles.map((jt) => ({
    ...jt,
    key: jt.job_title_id,
    isMapped: stagedMappedIds.has(jt.job_title_id),
  }));

  return (
    <div>
      <Typography variant="body2" className="mb-6 block">
        Assign active job titles to available departments. A job title can belong to one or more
        departments.
      </Typography>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <AntSelect
          showSearch
          placeholder="Select department"
          value={selectedDepartmentId ?? undefined}
          onChange={(value) => setSelectedDepartmentId(value)}
          options={sortedDepartments.map((d) => ({ label: d.name, value: d.department_id }))}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          className="w-[280px]"
        />
        <Input
          prefix={<MdSearch className="text-gray-400" />}
          placeholder="Search job titles..."
          className="w-[320px]"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      {!selectedDepartmentId ? (
        <div className="p-6 text-center text-gray-400 text-sm border rounded-xl">
          No departments yet — add one on the Departments tab first.
        </div>
      ) : (
        <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm relative">
          {isMappedLoading && (
            <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
              <Loader />
            </div>
          )}
          <div className="px-4 py-3 flex justify-between items-center border-b border-neutral-200 bg-gray-50">
            <Typography variant="body1">{activeDepartmentName} — job titles</Typography>
            <Badge status={stagedMappedIds.size > 0 ? 'info' : 'neutral'} dot={false}>
              {stagedMappedIds.size} of {(allJobTitles ?? []).length} selected
            </Badge>
          </div>

          <CustomTable<JobTitleAssignRow>
            columns={columns}
            dataSource={dataSource}
            rowClassName={(row) => (row.isMapped ? '!bg-primary-50/40' : '')}
            emptyText="No job titles found."
            pagination={paginationConfig('job titles')}
          />

          <div className="border-t px-4 py-4 flex justify-center gap-4">
            <Button
              className="min-w-[140px] border border-gray-300 rounded-full py-2"
              onClick={handleReset}
              disabled={!isDirty || isBusy}
            >
              Reset
            </Button>
            <Button
              className="min-w-[140px] bg-button text-white rounded-full py-2"
              onClick={handleSave}
              disabled={!isDirty || isBusy}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentSettingsTab;
