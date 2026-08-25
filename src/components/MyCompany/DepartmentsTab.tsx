import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { MdDelete, MdOutlineAdd, MdSearch } from 'react-icons/md';
import {
  Badge,
  Button,
  CustomTable,
  Input,
  Select,
  Typography,
  paginationConfig,
  showToast,
} from '../shared';
import { Loader } from '../shared/ui/loader';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import {
  useListTenantDepartmentsQuery,
  useAddTenantDepartmentMutation,
  useDeleteTenantDepartmentMutation,
  TenantDepartment,
} from '../../api/organization-service/Tenants/departments';
import { useListTenantOfficesQuery } from '../../api/organization-service/Tenants/offices';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

type DepartmentRow = TenantDepartment & { key: string };

/**
 * §C — GET/POST/DELETE /v1/tenants/{tenant_id}/departments. Delete needs a
 * STRONGER "are you sure" than office deletion, per docs/frontend_guide.txt:
 * the backend doesn't yet check for active job postings/candidates before
 * deleting (a known, flagged gap — organization-service docs/PROGRESS.md).
 *
 * Table + search/sort/pagination matches the Super Admin's mirror of this
 * screen (CustomerDashboard/ViewCustomer/panels/DepartmentsPanel.tsx) and
 * CompanySettings' master-data tabs, instead of the plain divided list this
 * used to be.
 */
const DepartmentsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data: departments, isLoading } = useListTenantDepartmentsQuery(tenantId);
  const { data: offices } = useListTenantOfficesQuery({ tenantId });
  const [addDepartment, { isLoading: isAdding }] = useAddTenantDepartmentMutation();
  const [deleteDepartment] = useDeleteTenantDepartmentMutation();
  const canAdd = useHasAccess(Authorities.DEPARTMENT_ADD);
  const canDelete = useHasAccess(Authorities.DEPARTMENT_DELETE);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [officeId, setOfficeId] = useState<string | undefined>(undefined);
  const [departmentToDelete, setDepartmentToDelete] = useState<TenantDepartment | null>(null);
  const [searchText, setSearchText] = useState('');

  const officeName = (id: string | null) => offices?.find((o) => o.office_id === id)?.city || '-';

  const filteredDepartments = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return departments ?? [];
    return (departments ?? []).filter(
      (department) =>
        department.name.toLowerCase().includes(q) ||
        officeName(department.office_id).toLowerCase().includes(q)
    );
  }, [departments, searchText, offices]);

  const handleAdd = async () => {
    if (!name.trim()) {
      showToast({ message: 'Department name is required.', type: 'error' });
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
      sorter: (a: DepartmentRow, b: DepartmentRow) => a.name.localeCompare(b.name),
      render: (_: unknown, department: DepartmentRow) => (
        <span className="font-semibold text-gray-900">{department.name}</span>
      ),
    },
    {
      title: 'Office',
      key: 'office',
      sorter: (a: DepartmentRow, b: DepartmentRow) =>
        officeName(a.office_id).localeCompare(officeName(b.office_id)),
      render: (_: unknown, department: DepartmentRow) =>
        department.office_id ? (
          <Badge status="neutral" dot={false}>
            {officeName(department.office_id)}
          </Badge>
        ) : (
          <span className="text-gray-300 text-sm">Unassigned</span>
        ),
    },
    canDelete && {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_: unknown, department: DepartmentRow) => (
        <button
          type="button"
          aria-label="Delete department"
          className="p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
          onClick={() => setDepartmentToDelete(department)}
        >
          <MdDelete className="text-red-500" />
        </button>
      ),
    },
  ].filter(Boolean) as TableProps<DepartmentRow>['columns'];

  const dataSource: DepartmentRow[] = filteredDepartments.map((department) => ({
    ...department,
    key: department.org_department_id,
  }));

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <Typography variant="body2">Your company&apos;s functional departments.</Typography>
          <span className="text-xs font-medium text-gray-400">
            {dataSource.length} {dataSource.length === 1 ? 'department' : 'departments'}
            {searchText.trim() && ` of ${departments?.length ?? 0}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-52">
            <Input
              prefix={<MdSearch className="text-gray-400" />}
              placeholder="Search departments..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          {canAdd && (
            <Button
              className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1 shadow-sm hover:shadow-md transition-shadow shrink-0"
              onClick={() => setIsAddOpen(true)}
            >
              <MdOutlineAdd /> Add department
            </Button>
          )}
        </div>
      </div>

      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <CustomTable<DepartmentRow>
          columns={columns}
          dataSource={dataSource}
          emptyText={
            searchText.trim() ? 'No departments match your search.' : 'No departments yet.'
          }
          pagination={paginationConfig('departments')}
        />
      </div>

      <AntdCommonModal open={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add department">
        <div className="flex flex-col gap-4">
          <Input
            placeholder="Department name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            appname="cfp"
            placeholder="Office (optional)"
            value={officeId}
            onChange={(value) => setOfficeId(value)}
            options={(offices || []).map((o) => ({
              label: `${o.city} — ${o.address_line_1}`,
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
              disabled={isAdding}
            >
              {isAdding ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </AntdCommonModal>

      {departmentToDelete && (
        <ConfirmationModal
          title={`Delete "${departmentToDelete.name}"? This isn't checked against active job postings or candidates yet — make sure nothing depends on it.`}
          confirmText="DELETE"
          onConfirm={handleDelete}
          onClose={() => setDepartmentToDelete(null)}
        />
      )}
    </div>
  );
};

export default DepartmentsTab;
