import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { Tooltip } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { useLocation } from 'react-router-dom';
import {
  MdOutlinePersonAdd,
  MdDelete,
  MdOutlineAdd,
  MdOutlineUploadFile,
  MdSearch,
} from 'react-icons/md';
import { HiOutlineUserGroup, HiOutlineOfficeBuilding } from 'react-icons/hi';
import { Button, Input, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import { Badge, BadgeStatus } from '../shared/ui/badge';
import CustomTable from '../shared/ui/table';
import MasterPagination from '../shared/ui/MasterPagination';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import { RowsPerPageSelect } from '../shared/ui/RowsPerPageSelect';
import { usePersistedPageSize } from '../../hooks/usePersistedPageSize';
import { PAGE_SIZE_OPTIONS } from '../../constants/app.constants';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';
import {
  useListPlatformStaffWithInvitationsQuery,
  useListPlatformDepartmentsQuery,
  useCreatePlatformDepartmentMutation,
  useOffboardPlatformStaffMutation,
  PlatformStaffMember,
} from '../../api/organization-service/Platform/staff';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import InvitePlatformMemberModal from './InvitePlatformMemberModal';
import StaffBulkImport from './StaffBulkImport';
import { buildStaffRows, filterStaffRows, platformRoleLabel, type StaffListRow } from './staffRows';

const STATUS_BADGE: Record<string, BadgeStatus> = {
  active: 'success',
  pending: 'warning',
  invited: 'info',
  offboarded: 'neutral',
};

type StaffRow = StaffListRow;
type SortKey = 'name' | 'email' | 'role' | 'department' | 'status';

// Fully client-side, same as DepartmentsTab: the endpoint returns every
// internal staff row (and every waiting invitation) at once.
const SORT_COMPARATORS: Record<SortKey, (a: StaffRow, b: StaffRow) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  email: (a, b) => a.email.localeCompare(b.email),
  role: (a, b) => platformRoleLabel(a.role).localeCompare(platformRoleLabel(b.role)),
  department: (a, b) => a.department.localeCompare(b.department),
  status: (a, b) => a.status.localeCompare(b.status),
};

/**
 * §B — HireSmartz's own internal team: Super Admins + Sales/Support/
 * Finance/Ops staff, and the departments they belong to. Distinct from a
 * customer's own Users section (OrganisationDashboard) — this is
 * `/v1/platform/staff` + `/v1/platform/departments`, rows with `tenant_id
 * IS NULL`.
 *
 * A section rendered inside the Users page (pages/OrganisationUserPage), not
 * its own routed page — it has no MainLayout/page chrome of its own, the
 * composing page owns that.
 */
const CfpUsers: React.FC = () => {
  const { data: staffList, isLoading } = useListPlatformStaffWithInvitationsQuery();
  // Superadmin only (platform:write / platform:update): Admin gets the list and
  // can add a Support User, but not import staff or offboard anyone.
  const canBulkImport = useHasAccess(Authorities.PLATFORM_INVITE);
  const canOffboard = useHasAccess(Authorities.PLATFORM_MANAGE_DEPARTMENTS);
  const { data: departments, isLoading: isDepartmentsLoading } = useListPlatformDepartmentsQuery();
  const [createDepartment, { isLoading: isCreatingDepartment }] =
    useCreatePlatformDepartmentMutation();
  const [offboardStaff] = useOffboardPlatformStaffMutation();

  // Global search's CFP-staff/pending-invite results land here (see
  // UserResultItem in GlobalSearch/index.tsx) — there's no per-person page
  // for them to go to instead. Pre-filling this list's own filter with the
  // term they searched, rather than dropping them on the full unfiltered
  // list, is what actually gets them to the person they were after.
  const location = useLocation();
  const globalSearchQuery =
    (location.state as { searchQuery?: string; fromGlobalSearch?: boolean } | null)
      ?.fromGlobalSearch && (location.state as { searchQuery?: string }).searchQuery;

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [departmentName, setDepartmentName] = useState('');
  const [staffToOffboard, setStaffToOffboard] = useState<PlatformStaffMember | null>(null);
  const [searchText, setSearchText] = useState(globalSearchQuery || '');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('cfp_users', 10);

  const handleAddDepartment = async () => {
    if (!departmentName.trim()) return;
    try {
      await createDepartment(departmentName.trim()).unwrap();
      showToast({ message: 'Department added.', type: 'success' });
      setDepartmentName('');
      setIsDeptModalOpen(false);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to add department.'), type: 'error' });
    }
  };

  const handleOffboard = async () => {
    if (!staffToOffboard) return;
    try {
      await offboardStaff(staffToOffboard.membership_id).unwrap();
      showToast({ message: 'Staff member offboarded.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to offboard.'), type: 'error' });
    } finally {
      setStaffToOffboard(null);
    }
  };

  const allStaffRows = useMemo(
    () => buildStaffRows(staffList?.staff ?? [], staffList?.pendingInvitations ?? []),
    [staffList]
  );

  // Members only: a waiting invitation is not yet part of a department.
  const departmentMemberCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (staffList?.staff ?? []).forEach((member) => {
      if (!member.department_id) return;
      counts[member.department_id] = (counts[member.department_id] ?? 0) + 1;
    });
    return counts;
  }, [staffList]);

  const staffRows = useMemo(
    () => filterStaffRows(allStaffRows, searchText),
    [allStaffRows, searchText]
  );

  const sortedStaffRows = useMemo(() => {
    const sorted = [...staffRows].sort(SORT_COMPARATORS[sortBy]);
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [staffRows, sortBy, sortOrder]);

  const sortOrderFor = (key: SortKey): 'ascend' | 'descend' | undefined =>
    sortBy === key ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined;

  const handleTableChange: TableProps<StaffRow>['onChange'] = (_pagination, _filters, sorter) => {
    const active = Array.isArray(sorter) ? sorter[0] : (sorter as SorterResult<StaffRow>);
    setPage(0);
    if (!active?.order || !active.columnKey) {
      setSortBy('name');
      setSortOrder('asc');
      return;
    }
    setSortBy(active.columnKey as SortKey);
    setSortOrder(active.order === 'ascend' ? 'asc' : 'desc');
  };

  const pagedStaffRows = sortedStaffRows.slice(page * pageSize, page * pageSize + pageSize);

  const staffColumns: TableProps<StaffRow>['columns'] = [
    {
      title: 'Name',
      key: 'name',
      sorter: true,
      sortOrder: sortOrderFor('name'),
      render: (_: unknown, row) => (
        <span className="text-sm font-medium text-gray-900">{row.name || '-'}</span>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      sorter: true,
      sortOrder: sortOrderFor('email'),
      key: 'email',
      render: (_: unknown, row) => (
        <span className="text-sm text-gray-800 truncate" title={row.email}>
          {row.email}
        </span>
      ),
    },
    {
      title: 'Phone',
      key: 'phone',
      render: (_: unknown, row) => (
        <span className="text-sm text-gray-600">{row.phone || '-'}</span>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      sorter: true,
      sortOrder: sortOrderFor('role'),
      render: (_: unknown, row) => (
        <span className="text-sm text-gray-600">{platformRoleLabel(row.role)}</span>
      ),
    },
    {
      title: 'Department',
      key: 'department',
      sorter: true,
      sortOrder: sortOrderFor('department'),
      render: (_: unknown, row) => (
        <span className="text-sm text-gray-600">{row.department || '-'}</span>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      sorter: true,
      sortOrder: sortOrderFor('status'),
      render: (_: unknown, row) => (
        <Badge status={STATUS_BADGE[row.status.toLowerCase()] || 'neutral'}>{row.status}</Badge>
      ),
    },
    // Offboarding is Superadmin-only, so the column is absent for anyone else.
    ...(canOffboard
      ? [
          {
            title: 'Actions',
            key: 'actions',
            align: 'right' as const,
            render: (_: unknown, row: StaffRow) =>
              row.kind === 'member' && row.status.toLowerCase() === 'active' ? (
                <Tooltip title="Offboard">
                  <button
                    type="button"
                    aria-label="Offboard"
                    className="group p-2 hover:bg-danger-bg rounded-full transition-colors cursor-pointer"
                    onClick={() => row.member && setStaffToOffboard(row.member)}
                  >
                    <MdDelete className="text-gray-600 transition-colors group-hover:text-red-600" />
                  </button>
                </Tooltip>
              ) : (
                <span className="text-gray-300">-</span>
              ),
          },
        ]
      : []),
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
            <HiOutlineUserGroup size={18} />
          </span>
          <h2 className="font-display text-xl font-bold text-gray-900">CFP Users</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-52">
            <Input
              prefix={<MdSearch className="text-gray-400" />}
              placeholder="Search by name, email or phone..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(0);
              }}
            />
          </div>
          {canBulkImport && (
            <Button
              className="w-52 rounded-full border border-gray-300 px-4 py-2 flex items-center justify-center gap-1 text-sm font-semibold text-gray-700 hover:border-primary-300 hover:text-primary-600 transition-colors"
              onClick={() => setIsBulkImportOpen(true)}
            >
              <MdOutlineUploadFile /> Import Staff
            </Button>
          )}
          <Button
            className="w-52 rounded-full bg-primary-600 text-white px-4 py-2 flex items-center justify-center gap-1 text-sm font-semibold cfp-hover-lift"
            onClick={() => setIsInviteOpen(true)}
          >
            <MdOutlinePersonAdd /> Add CFP User
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Loader />
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

          <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
            <CustomTable
              columns={staffColumns}
              dataSource={pagedStaffRows}
              onChange={handleTableChange}
              rowClassName={(row) =>
                globalSearchQuery &&
                row.email.toLowerCase().includes(globalSearchQuery.toLowerCase())
                  ? 'bg-primary-50'
                  : ''
              }
              emptyText={
                <div className="py-10 text-center text-gray-400 text-sm">
                  {searchText.trim() ? 'No staff match your search.' : 'No staff yet.'}
                </div>
              }
            />
          </div>

          <MasterPagination
            current={page + 1}
            pageSize={pageSize}
            total={sortedStaffRows.length}
            itemLabel="staff"
            onPageChange={(nextPage) => setPage(nextPage - 1)}
          />
        </>
      )}

      <div className="flex items-center justify-between mt-8 mb-3">
        <div className="flex items-center gap-2">
          <Typography variant="subtitle1">Departments</Typography>
          {!!departments?.length && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
              {departments.length}
            </span>
          )}
        </div>
        <Button
          className="rounded-full border border-gray-300 px-3 py-1 flex items-center gap-1 text-xs font-semibold text-gray-700 hover:border-primary-300 hover:text-primary-600 transition-colors"
          onClick={() => setIsDeptModalOpen(true)}
        >
          <MdOutlineAdd /> Add Department
        </Button>
      </div>
      {isDepartmentsLoading ? (
        <Loader />
      ) : departments?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {departments.map((dept) => (
            <div
              key={dept.department_id}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 hover:border-primary-300 hover:shadow-sm transition-all"
            >
              <span className="bg-gradient-to-br from-primary-50 to-accent-50 text-primary-600 p-2 rounded-full flex items-center justify-center shrink-0">
                <HiOutlineOfficeBuilding size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate" title={dept.name}>
                  {dept.name}
                </p>
                <p className="text-xs text-gray-400">
                  {departmentMemberCounts[dept.department_id] ?? 0} member
                  {departmentMemberCounts[dept.department_id] === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-10 flex flex-col items-center justify-center text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
          <span className="bg-gray-100 text-gray-400 p-3 rounded-full flex items-center justify-center mb-2">
            <HiOutlineOfficeBuilding size={20} />
          </span>
          <p className="text-sm text-gray-500">No internal departments yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Add one to start organizing your internal staff.
          </p>
        </div>
      )}

      <InvitePlatformMemberModal
        open={isInviteOpen}
        departments={departments || []}
        onClose={() => setIsInviteOpen(false)}
        onInvited={() => setIsInviteOpen(false)}
      />

      {canBulkImport && (
        <StaffBulkImport open={isBulkImportOpen} onClose={() => setIsBulkImportOpen(false)} />
      )}

      <AntdCommonModal
        open={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title="Add Internal Department"
      >
        <div className="flex flex-col gap-4">
          <Input
            placeholder="Department Name *"
            value={departmentName}
            onChange={(e) => setDepartmentName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="w-full border border-gray-300 rounded-full py-2"
              onClick={() => setIsDeptModalOpen(false)}
              disabled={isCreatingDepartment}
            >
              Cancel
            </Button>
            <Button
              className="w-full bg-button text-white rounded-full py-2"
              onClick={handleAddDepartment}
              disabled={isCreatingDepartment || !departmentName.trim()}
            >
              {isCreatingDepartment ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </AntdCommonModal>

      {staffToOffboard && (
        <ConfirmationModal
          title={`Offboard ${staffToOffboard.email}? This revokes their sessions immediately.`}
          confirmText="Offboard"
          onConfirm={handleOffboard}
          onClose={() => setStaffToOffboard(null)}
        />
      )}
    </div>
  );
};

export default CfpUsers;
