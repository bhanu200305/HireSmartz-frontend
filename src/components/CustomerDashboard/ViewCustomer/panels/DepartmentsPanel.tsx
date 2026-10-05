import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { Tooltip } from 'antd';
import { MdDelete, MdOutlineAdd, MdSearch } from 'react-icons/md';
import { Badge, Button, CustomTable, Input, Select, Typography, showToast } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import ConfirmationModal from '../../../shared/ui/ConfirmationModal';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import MasterPagination from '../../../shared/ui/MasterPagination';
import { RowsPerPageSelect } from '../../../shared/ui/RowsPerPageSelect';
import { usePersistedPageSize } from '../../../../hooks/usePersistedPageSize';
import { PAGE_SIZE_OPTIONS } from '../../../../constants/app.constants';
import {
  useListPlatformTenantDepartmentsQuery,
  useAddPlatformTenantDepartmentMutation,
  useDeletePlatformTenantDepartmentMutation,
} from '../../../../api/organization-service/Platform/departments';
import { useListPlatformTenantOfficesQuery } from '../../../../api/organization-service/Platform/offices';
import type { TenantDepartment } from '../../../../api/organization-service/Tenants/departments';
import { getOrgErrorMessage } from '../../../../shared/utils/auth/orgError.helpers';

type DepartmentRow = TenantDepartment & { key: string };
type SortKey = 'name' | 'office';

/**
 * Super Admin's mirror of MyCompany/DepartmentsTab.tsx — same add/delete
 * surface (no update endpoint exists tenant-side either), platform-mounted
 * routes instead of the tenant's own ambient-context ones.
 *
 * Table + search/sort/filter/pagination matches CompanySettings' master-data
 * tabs instead of the plain divided list this used to be.
 */
const DepartmentsPanel: React.FC<{ tenantId: string; readOnly?: boolean }> = ({
  tenantId,
  readOnly = false,
}) => {
  const { data: departments, isLoading } = useListPlatformTenantDepartmentsQuery(tenantId);
  const { data: offices } = useListPlatformTenantOfficesQuery(tenantId);
  const [addDepartment, { isLoading: isAdding }] = useAddPlatformTenantDepartmentMutation();
  const [deleteDepartment] = useDeletePlatformTenantDepartmentMutation();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [officeId, setOfficeId] = useState<string | undefined>(undefined);
  const [departmentToDelete, setDepartmentToDelete] = useState<TenantDepartment | null>(null);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('customer_dashboard_departments', 10);

  // City alone isn't unique — two offices in the same city (matches the
  // convention this file's own location Select already uses below) would
  // otherwise show identically in this table's "Office" column.
  const officeName = (id: string | null) => {
    const office = offices?.find((o) => o.office_id === id);
    return office ? `${office.city}, ${office.address_line_1}` : '-';
  };

  const filteredDepartments = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return departments ?? [];
    return (departments ?? []).filter(
      (department) =>
        department.name.toLowerCase().includes(q) ||
        officeName(department.office_id).toLowerCase().includes(q)
    );
  }, [departments, searchText, offices]);

  const sortComparators: Record<SortKey, (a: TenantDepartment, b: TenantDepartment) => number> = {
    name: (a, b) => a.name.localeCompare(b.name),
    office: (a, b) => officeName(a.office_id).localeCompare(officeName(b.office_id)),
  };

  const sortedDepartments = useMemo(() => {
    const sorted = [...filteredDepartments].sort(sortComparators[sortBy]);
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [filteredDepartments, sortBy, sortOrder, offices]);

  const sortOrderFor = (key: SortKey): 'ascend' | 'descend' | undefined =>
    sortBy === key ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined;

  const handleTableChange: TableProps<DepartmentRow>['onChange'] = (
    _pagination,
    _filters,
    sorter
  ) => {
    const active = Array.isArray(sorter) ? sorter[0] : sorter;
    setPage(0);
    if (!active?.order || !active.columnKey) {
      setSortBy('name');
      setSortOrder('asc');
      return;
    }
    setSortBy(active.columnKey as SortKey);
    setSortOrder(active.order === 'ascend' ? 'asc' : 'desc');
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      showToast({ message: 'Department Name is required.', type: 'error' });
      return;
    }
    try {
      await addDepartment({ tenantId, department_name: name.trim(), office_id: officeId }).unwrap();
      showToast({ message: 'Department added.', type: 'success' });
      setIsAddOpen(false);
      setName('');
      setOfficeId(undefined);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to add department.'), type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!departmentToDelete) return;
    try {
      await deleteDepartment({
        tenantId,
        departmentId: departmentToDelete.org_department_id,
      }).unwrap();
      showToast({ message: 'Department deleted.', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to delete department.'),
        type: 'error',
      });
    } finally {
      setDepartmentToDelete(null);
    }
  };

  if (isLoading) return <Loader />;

  const columns: TableProps<DepartmentRow>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      sortOrder: sortOrderFor('name'),
      render: (_: unknown, department: DepartmentRow) => (
        <span className="font-semibold text-gray-900">{department.name}</span>
      ),
    },
    {
      title: 'Office',
      key: 'office',
      sorter: true,
      sortOrder: sortOrderFor('office'),
      render: (_: unknown, department: DepartmentRow) =>
        department.office_id ? (
          <Badge status="neutral" dot={false}>
            {officeName(department.office_id)}
          </Badge>
        ) : (
          <span className="text-gray-300 text-sm">Unassigned</span>
        ),
    },
    ...(readOnly
      ? []
      : [
          {
            title: 'Actions',
            key: 'actions',
            width: 80,
            render: (_: unknown, department: DepartmentRow) => (
              <Tooltip title="Delete Department">
                <button
                  type="button"
                  aria-label="Delete department"
                  className="group p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
                  onClick={() => setDepartmentToDelete(department)}
                >
                  <MdDelete className="text-gray-600 transition-colors group-hover:text-red-600" />
                </button>
              </Tooltip>
            ),
          },
        ]),
  ];

  const dataSource: DepartmentRow[] = sortedDepartments
    .slice(page * pageSize, page * pageSize + pageSize)
    .map((department) => ({
      ...department,
      key: department.org_department_id,
    }));

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <Typography variant="body2">This company&apos;s functional departments.</Typography>
          <span className="text-xs font-medium text-gray-400">
            {filteredDepartments.length}{' '}
            {filteredDepartments.length === 1 ? 'department' : 'departments'}
            {searchText.trim() && ` of ${departments?.length ?? 0}`}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-52">
            <Input
              prefix={<MdSearch className="text-gray-400" />}
              placeholder="Search Departments..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(0);
              }}
            />
          </div>
          {!readOnly && (
            <Button
              className="rounded-full bg-button text-white px-4 py-2 flex items-center justify-center gap-1 shadow-sm hover:shadow-md transition-shadow shrink-0 min-w-[180px]"
              onClick={() => setIsAddOpen(true)}
            >
              <MdOutlineAdd /> Add Department
            </Button>
          )}
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
        <CustomTable<DepartmentRow>
          columns={columns}
          dataSource={dataSource}
          emptyText={
            searchText.trim() ? 'No departments match your search.' : 'No departments yet.'
          }
          pagination={false}
          onChange={handleTableChange}
        />
      </div>

      <MasterPagination
        current={page + 1}
        pageSize={pageSize}
        total={sortedDepartments.length}
        itemLabel="departments"
        onPageChange={(nextPage) => setPage(nextPage - 1)}
      />

      <AntdCommonModal open={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Department">
        <div className="flex flex-col gap-4">
          <Input
            placeholder="Department Name *"
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            appname="cfp"
            placeholder="Office (optional)"
            value={officeId}
            onChange={(value) => setOfficeId(value)}
            options={(offices || []).map((o) => ({
              label: `${o.city}, ${o.address_line_1}`,
              value: o.office_id,
            }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="w-full border border-gray-300 rounded-full py-2"
              onClick={() => setIsAddOpen(false)}
              disabled={isAdding}
            >
              Cancel
            </Button>
            <Button
              className="w-full bg-button text-white rounded-full py-2"
              onClick={handleAdd}
              disabled={isAdding || !name.trim()}
            >
              {isAdding ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </AntdCommonModal>

      {departmentToDelete && (
        <ConfirmationModal
          title={`Delete "${departmentToDelete.name}"? This isn't checked against active job postings or candidates yet, so make sure nothing depends on it.`}
          confirmText="Delete"
          onConfirm={handleDelete}
          onClose={() => setDepartmentToDelete(null)}
        />
      )}
    </div>
  );
};

export default DepartmentsPanel;
