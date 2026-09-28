import React, { useEffect, useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { Select as AntSelect } from 'antd';
import { MdSearch } from 'react-icons/md';
import { Badge, CustomTable, Input, Typography, Button, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import MasterPagination from '../../shared/ui/MasterPagination';
import { RowsPerPageSelect } from '../../shared/ui/RowsPerPageSelect';
import { FilterSelectIcon } from '../../shared/ui/FilterSelectIcon';
import { usePersistedPageSize } from '../../../hooks/usePersistedPageSize';
import { PAGE_SIZE_OPTIONS } from '../../../constants/app.constants';
import { useListTenantDepartmentsQuery } from '../../../api/organization-service/Tenants/departments';
import {
  useListTenantJobTitlesQuery,
  useListTenantDepartmentJobTitlesQuery,
  useAssignTenantJobTitleToDepartmentMutation,
  useRemoveTenantJobTitleFromDepartmentMutation,
  tenantJobTitleFormId,
  TenantJobTitle,
} from '../../../api/organization-service/Tenants/jobTitles';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import useHasAccess from '../../../hooks/useHasAccess';
import { Authorities } from '../../../constants/authorities.constant';

type JobTitleAssignRow = TenantJobTitle & { key: string; isMapped: boolean };
type SortKey = 'name';

const SORT_COMPARATORS: Record<SortKey, (a: TenantJobTitle, b: TenantJobTitle) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
};

/**
 * Assign this tenant's own job titles to its own departments - mirrors
 * Super Admin's DepartmentSettingsTab.tsx, but over organization_job_title/
 * a tenant's own departments instead of the platform catalogue. No bulk
 * "set the whole mapping" endpoint exists, so Save diffs against what's
 * currently mapped and fires one assign/remove call per changed row.
 */
const TenantDepartmentSettingsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [showAssignedOnly, setShowAssignedOnly] = useState(false);
  const [stagedMappedIds, setStagedMappedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('mycompany_department_job_titles', 10);

  const canEdit = useHasAccess(Authorities.DEPARTMENT_EDIT);

  const { data: departments, isLoading: isDeptsLoading } = useListTenantDepartmentsQuery(tenantId, {
    skip: !tenantId,
  });
  const sortedDepartments = useMemo(
    () => [...(departments ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [departments]
  );

  useEffect(() => {
    if (sortedDepartments.length > 0 && selectedDepartmentId === null) {
      setSelectedDepartmentId(sortedDepartments[0].org_department_id);
    }
  }, [sortedDepartments, selectedDepartmentId]);

  const { data: allJobTitles, isLoading: isJobTitlesLoading } = useListTenantJobTitlesQuery(
    tenantId,
    { skip: !tenantId }
  );

  const {
    data: mappedJobTitles,
    isLoading: isMappedLoading,
    isFetching: isMappedFetching,
  } = useListTenantDepartmentJobTitlesQuery(
    { tenantId, departmentId: selectedDepartmentId ?? '' },
    { skip: !selectedDepartmentId }
  );
  const mappedIds = useMemo(
    () => new Set((mappedJobTitles ?? []).map((jt) => tenantJobTitleFormId(jt))),
    [mappedJobTitles]
  );

  const filteredJobTitles = useMemo(() => {
    let list = allJobTitles ?? [];
    if (showAssignedOnly) {
      list = list.filter((jt) => mappedIds.has(tenantJobTitleFormId(jt)));
    }
    if (!searchText.trim()) return list;
    const q = searchText.trim().toLowerCase();
    return list.filter((jt) => jt.name.toLowerCase().includes(q));
  }, [allJobTitles, searchText, showAssignedOnly, mappedIds]);

  // Sorted+paginated client-side, same "Rows per page" + MasterPagination UI
  // every list-drilldown modal already uses, rather than antd Table's own
  // default pager, which this tab used to render instead.
  const sortedJobTitles = useMemo(() => {
    const sorted = [...filteredJobTitles].sort(SORT_COMPARATORS[sortBy]);
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [filteredJobTitles, sortBy, sortOrder]);

  const sortOrderFor = (key: SortKey): 'ascend' | 'descend' | undefined =>
    sortBy === key ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined;

  const handleTableChange: TableProps<JobTitleAssignRow>['onChange'] = (
    _pagination,
    _filters,
    sorter
  ) => {
    const active = Array.isArray(sorter) ? sorter[0] : (sorter as SorterResult<JobTitleAssignRow>);
    setPage(0);
    if (!active?.order || !active.columnKey) {
      setSortBy('name');
      setSortOrder('asc');
      return;
    }
    setSortBy(active.columnKey as SortKey);
    setSortOrder(active.order === 'ascend' ? 'asc' : 'desc');
  };

  useEffect(() => {
    setStagedMappedIds(new Set(mappedIds));
  }, [mappedJobTitles, selectedDepartmentId]);

  const [assignJobTitle] = useAssignTenantJobTitleToDepartmentMutation();
  const [removeJobTitle] = useRemoveTenantJobTitleFromDepartmentMutation();

  const activeDepartmentName =
    sortedDepartments.find((d) => d.org_department_id === selectedDepartmentId)?.name ||
    'Department';

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
        await assignJobTitle({
          tenantId,
          departmentId: selectedDepartmentId,
          job_title_id: jobTitleId,
        }).unwrap();
      }
      for (const jobTitleId of toRemove) {
        await removeJobTitle({
          tenantId,
          departmentId: selectedDepartmentId,
          jobTitleId,
        }).unwrap();
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
  const isBusy = isMappedFetching || isSaving || !canEdit;

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
          onChange={(e) => toggle(tenantJobTitleFormId(row), e.target.checked)}
          className="w-4 h-4 cursor-pointer accent-primary-600"
        />
      ),
    },
    {
      title: 'Job Title',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      sortOrder: sortOrderFor('name'),
      render: (_: unknown, row: JobTitleAssignRow) => (
        <div className="flex items-center gap-2">
          <span className={row.isMapped ? 'font-semibold text-primary-700' : 'text-gray-700'}>
            {row.name}
          </span>
          {row.isMapped && (
            <Badge status="success" dot={false}>
              Assigned
            </Badge>
          )}
        </div>
      ),
    },
  ];

  const dataSource: JobTitleAssignRow[] = sortedJobTitles
    .slice(page * pageSize, page * pageSize + pageSize)
    .map((jt) => ({
      ...jt,
      key: tenantJobTitleFormId(jt),
      isMapped: stagedMappedIds.has(tenantJobTitleFormId(jt)),
    }));

  return (
    <div>
      <Typography variant="body2" className="mb-6 block">
        Assign your company&apos;s job titles to its departments. A job title can belong to one or
        more departments.
      </Typography>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <AntSelect
          showSearch
          placeholder="Select department"
          value={selectedDepartmentId ?? undefined}
          onChange={(value) => {
            setSelectedDepartmentId(value);
            setPage(0);
          }}
          options={sortedDepartments.map((d) => ({ label: d.name, value: d.org_department_id }))}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          className="w-56"
        />
        <div className="w-56">
          <Input
            prefix={<MdSearch className="text-gray-400" />}
            placeholder="Search job titles..."
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className="cfp-dropdown-trigger w-56">
          <FilterSelectIcon />
          <AntSelect
            className="w-full custom-select"
            variant="borderless"
            value={showAssignedOnly ? 'assigned' : 'all'}
            onChange={(value) => {
              setShowAssignedOnly(value === 'assigned');
              setPage(0);
            }}
            options={[
              { label: 'All job titles', value: 'all' },
              { label: 'Assigned only', value: 'assigned' },
            ]}
          />
        </div>
      </div>

      {!selectedDepartmentId ? (
        <div className="p-6 text-center text-gray-400 text-sm border rounded-xl">
          No departments yet. Add one on the Departments tab first.
        </div>
      ) : (
        <>
          <RowsPerPageSelect
            pageSize={pageSize}
            options={PAGE_SIZE_OPTIONS}
            onChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
          />

          <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm relative">
            {isMappedLoading && (
              <div className="absolute inset-0 bg-white/60 z-10 flex items-center justify-center">
                <Loader />
              </div>
            )}
            <div className="px-4 py-3 flex justify-between items-center border-b border-neutral-200 bg-gray-50">
              <Typography variant="body1">Select job titles for {activeDepartmentName}</Typography>
              <span className="text-xs font-medium text-gray-400">
                {stagedMappedIds.size} of {(allJobTitles ?? []).length} assigned
              </span>
            </div>

            <CustomTable<JobTitleAssignRow>
              columns={columns}
              dataSource={dataSource}
              rowClassName={(row) => (row.isMapped ? '!bg-primary-50/40' : '')}
              emptyText="No job titles found."
              pagination={false}
              onChange={handleTableChange}
            />

            {canEdit && (
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
            )}
          </div>

          <MasterPagination
            current={page + 1}
            pageSize={pageSize}
            total={sortedJobTitles.length}
            itemLabel="job titles"
            onPageChange={(nextPage) => setPage(nextPage - 1)}
          />
        </>
      )}
    </div>
  );
};

export default TenantDepartmentSettingsTab;
