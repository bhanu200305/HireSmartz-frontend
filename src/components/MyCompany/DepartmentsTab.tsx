import React, { useEffect, useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { Select as AntSelect, Tooltip } from 'antd';
import { MdBlock, MdDelete, MdEdit, MdOutlineAdd, MdRestore, MdSearch } from 'react-icons/md';
import { Badge, Button, CustomTable, Input, Select, Typography, showToast } from '../shared';
import { Loader } from '../shared/ui/loader';
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import MasterPagination from '../shared/ui/MasterPagination';
import { RowsPerPageSelect } from '../shared/ui/RowsPerPageSelect';
import { usePersistedPageSize } from '../../hooks/usePersistedPageSize';
import { useEnterToSubmit } from '../../hooks/useEnterToSubmit';
import { PAGE_SIZE_OPTIONS } from '../../constants/app.constants';
import {
  useListTenantDepartmentsQuery,
  useAddTenantDepartmentMutation,
  useUpdateTenantDepartmentMutation,
  useDeleteTenantDepartmentMutation,
  useDeactivateTenantDepartmentMutation,
  useActivateTenantDepartmentMutation,
  useListTenantDepartmentOfficesQuery,
  useAddTenantDepartmentOfficeMutation,
  useRemoveTenantDepartmentOfficeMutation,
  TenantDepartment,
} from '../../api/organization-service/Tenants/departments';
import { useListTenantOfficesQuery } from '../../api/organization-service/Tenants/offices';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

type DepartmentRow = TenantDepartment & { key: string };
type SortKey = 'name' | 'office';

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
  const [updateDepartment, { isLoading: isUpdating }] = useUpdateTenantDepartmentMutation();
  const [deleteDepartment] = useDeleteTenantDepartmentMutation();
  const [addDepartmentOffice, { isLoading: isAddingOffice }] =
    useAddTenantDepartmentOfficeMutation();
  const [removeDepartmentOffice, { isLoading: isRemovingOffice }] =
    useRemoveTenantDepartmentOfficeMutation();
  const [deactivateDepartment, { isLoading: isDeactivating }] =
    useDeactivateTenantDepartmentMutation();
  const [activateDepartment] = useActivateTenantDepartmentMutation();
  const canAdd = useHasAccess(Authorities.DEPARTMENT_ADD);
  const canEdit = useHasAccess(Authorities.DEPARTMENT_EDIT);
  const canDelete = useHasAccess(Authorities.DEPARTMENT_DELETE);

  const [modalState, setModalState] = useState<{
    mode: 'add' | 'edit';
    department?: TenantDepartment;
  } | null>(null);
  const [name, setName] = useState('');
  const [departmentToDeactivate, setDepartmentToDeactivate] = useState<TenantDepartment | null>(
    null
  );
  const [pendingActivateId, setPendingActivateId] = useState<string | null>(null);
  const [officeId, setOfficeId] = useState<string | undefined>(undefined);
  // Every OTHER office this department also operates out of — separate from
  // (and additive to) `officeId` above, its single primary office. Staged
  // locally and diffed against the loaded set on Save, same pattern as
  // TenantDepartmentSettingsTab's job-title mapping (no bulk "set the whole
  // mapping" endpoint exists, so Save fires one add/remove call per changed
  // office).
  const [stagedAdditionalOfficeIds, setStagedAdditionalOfficeIds] = useState<Set<string>>(
    new Set()
  );
  const [departmentToDelete, setDepartmentToDelete] = useState<TenantDepartment | null>(null);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('mycompany_departments', 10);

  // City alone isn't unique — two offices in the same city would otherwise
  // show identically in this table's "Office" column.
  const officeName = (id: string | null) => {
    const office = offices?.find((o) => o.office_id === id);
    return office ? `${office.city}, ${office.address_line_1}` : '-';
  };

  const SORT_COMPARATORS: Record<SortKey, (a: TenantDepartment, b: TenantDepartment) => number> = {
    name: (a, b) => a.name.localeCompare(b.name),
    office: (a, b) => officeName(a.office_id).localeCompare(officeName(b.office_id)),
  };

  // Only meaningful once a department already exists — a new one has to be
  // created (with just its primary office) before any additional locations
  // can be attached to it.
  const editingDepartmentId =
    modalState?.mode === 'edit' ? modalState.department?.org_department_id : undefined;
  const { data: additionalOffices } = useListTenantDepartmentOfficesQuery(
    { tenantId, departmentId: editingDepartmentId ?? '' },
    { skip: !editingDepartmentId }
  );
  const additionalOfficeIds = useMemo(
    () => new Set((additionalOffices ?? []).map((o) => o.office_id)),
    [additionalOffices]
  );
  useEffect(() => {
    setStagedAdditionalOfficeIds(new Set(additionalOfficeIds));
    // Only re-sync when the modal (re)opens on a department or the loaded
    // set itself changes — not on every staged toggle, which would
    // immediately stomp the user's own in-progress selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingDepartmentId, additionalOffices]);

  const filteredDepartments = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return departments ?? [];
    return (departments ?? []).filter(
      (department) =>
        department.name.toLowerCase().includes(q) ||
        officeName(department.office_id).toLowerCase().includes(q)
    );
  }, [departments, searchText, offices]);

  // Sorted+paginated client-side, same "Rows per page" + MasterPagination UI
  // every list-drilldown modal already uses, rather than antd Table's own
  // default pager, which this tab used to render instead.
  const sortedDepartments = useMemo(() => {
    const sorted = [...filteredDepartments].sort(SORT_COMPARATORS[sortBy]);
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [filteredDepartments, sortBy, sortOrder]);

  const sortOrderFor = (key: SortKey): 'ascend' | 'descend' | undefined =>
    sortBy === key ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined;

  const handleTableChange: TableProps<DepartmentRow>['onChange'] = (
    _pagination,
    _filters,
    sorter
  ) => {
    const active = Array.isArray(sorter) ? sorter[0] : (sorter as SorterResult<DepartmentRow>);
    setPage(0);
    if (!active?.order || !active.columnKey) {
      setSortBy('name');
      setSortOrder('asc');
      return;
    }
    setSortBy(active.columnKey as SortKey);
    setSortOrder(active.order === 'ascend' ? 'asc' : 'desc');
  };

  const openAddModal = () => {
    setName('');
    setOfficeId(undefined);
    setStagedAdditionalOfficeIds(new Set());
    setModalState({ mode: 'add' });
  };

  const openEditModal = (department: TenantDepartment) => {
    setName(department.name);
    setOfficeId(department.office_id ?? undefined);
    setModalState({ mode: 'edit', department });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast({ message: 'Department name is required.', type: 'error' });
      return;
    }
    try {
      if (modalState?.mode === 'edit' && modalState.department) {
        await updateDepartment({
          tenantId,
          departmentId: modalState.department.org_department_id,
          department_name: name.trim(),
          office_id: officeId ?? null,
        }).unwrap();

        const departmentId = modalState.department.org_department_id;
        const toAdd = [...stagedAdditionalOfficeIds].filter((id) => !additionalOfficeIds.has(id));
        const toRemove = [...additionalOfficeIds].filter(
          (id) => !stagedAdditionalOfficeIds.has(id)
        );
        for (const officeIdToAdd of toAdd) {
          await addDepartmentOffice({ tenantId, departmentId, officeId: officeIdToAdd }).unwrap();
        }
        for (const officeIdToRemove of toRemove) {
          await removeDepartmentOffice({
            tenantId,
            departmentId,
            officeId: officeIdToRemove,
          }).unwrap();
        }

        showToast({ message: 'Department updated.', type: 'success' });
      } else {
        await addDepartment({
          tenantId,
          department_name: name.trim(),
          office_id: officeId,
        }).unwrap();
        showToast({ message: 'Department added.', type: 'success' });
      }
      setModalState(null);
      setName('');
      setOfficeId(undefined);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to save department.'), type: 'error' });
    }
  };

  const isSavingDepartment = isAdding || isUpdating || isAddingOffice || isRemovingOffice;

  const { onKeyDown: handleEnterToSubmit } = useEnterToSubmit(handleSubmit, {
    enabled: modalState !== null && !isSavingDepartment && !!name.trim(),
  });

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

  const handleDeactivate = async () => {
    if (!departmentToDeactivate) return;
    try {
      await deactivateDepartment({
        tenantId,
        departmentId: departmentToDeactivate.org_department_id,
      }).unwrap();
      showToast({
        message: `"${departmentToDeactivate.name}" was deactivated.`,
        type: 'success',
      });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to deactivate department.'),
        type: 'error',
      });
    } finally {
      setDepartmentToDeactivate(null);
    }
  };

  // No confirmation modal, unlike deactivate — restoring visibility is the
  // low-risk direction.
  const handleActivate = async (department: TenantDepartment) => {
    setPendingActivateId(department.org_department_id);
    try {
      await activateDepartment({ tenantId, departmentId: department.org_department_id }).unwrap();
      showToast({ message: `"${department.name}" was activated.`, type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to activate department.'),
        type: 'error',
      });
    } finally {
      setPendingActivateId(null);
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
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_: unknown, department: DepartmentRow) => (
        <Badge status={department.is_active ? 'success' : 'neutral'}>
          {department.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    (canEdit || canDelete) && {
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (_: unknown, department: DepartmentRow) => (
        <div className="flex items-center gap-1">
          {canEdit && (
            <Tooltip title="Edit department">
              <button
                type="button"
                aria-label="Edit department"
                className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
                onClick={() => openEditModal(department)}
              >
                <MdEdit className="text-gray-600" />
              </button>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Delete department">
              <button
                type="button"
                aria-label="Delete department"
                className="group p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
                onClick={() => setDepartmentToDelete(department)}
              >
                <MdDelete className="text-gray-600 transition-colors group-hover:text-red-600" />
              </button>
            </Tooltip>
          )}
          {canEdit &&
            (department.is_active ? (
              <Tooltip title="Deactivate department">
                <button
                  type="button"
                  aria-label="Deactivate department"
                  className="group p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
                  onClick={() => setDepartmentToDeactivate(department)}
                >
                  <MdBlock className="text-gray-600 transition-colors group-hover:text-red-600" />
                </button>
              </Tooltip>
            ) : (
              <Tooltip title="Activate department">
                <button
                  type="button"
                  aria-label="Activate department"
                  className="p-2 hover:bg-green-50 rounded-full disabled:cursor-not-allowed cursor-pointer transition-colors disabled:opacity-50"
                  disabled={pendingActivateId === department.org_department_id}
                  onClick={() => handleActivate(department)}
                >
                  <MdRestore className="text-green-600" />
                </button>
              </Tooltip>
            ))}
        </div>
      ),
    },
  ].filter(Boolean) as TableProps<DepartmentRow>['columns'];

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
          <Typography variant="body2">Your company&apos;s functional departments.</Typography>
          <span className="text-xs font-medium text-gray-400">
            {sortedDepartments.length}{' '}
            {sortedDepartments.length === 1 ? 'department' : 'departments'}
            {searchText.trim() && ` of ${departments?.length ?? 0}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-52">
            <Input
              prefix={<MdSearch className="text-gray-400" />}
              placeholder="Search departments..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(0);
              }}
            />
          </div>
          {canAdd && (
            <Button
              className="rounded-full bg-button text-white px-4 py-2 flex items-center gap-1 shadow-sm hover:shadow-md transition-shadow shrink-0"
              onClick={openAddModal}
            >
              <MdOutlineAdd /> Add department
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

      <AntdCommonModal
        open={modalState !== null}
        onClose={() => setModalState(null)}
        title={modalState?.mode === 'edit' ? 'Edit department' : 'Add department'}
      >
        <div className="flex flex-col gap-4" onKeyDown={handleEnterToSubmit}>
          <Input
            placeholder="Department name *"
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
          {modalState?.mode === 'edit' && (
            <div>
              <label htmlFor="additionalLocations" className="text-sm text-gray-600">
                Additional locations <span className="text-gray-400">(optional)</span>
              </label>
              <AntSelect
                id="additionalLocations"
                mode="multiple"
                showSearch
                optionFilterProp="label"
                allowClear
                placeholder="Every other office this department also operates out of"
                className="w-full mt-1"
                value={[...stagedAdditionalOfficeIds]}
                onChange={(value: string[]) => setStagedAdditionalOfficeIds(new Set(value))}
                // The primary office above is already implied — offering it
                // again here would just be a confusing duplicate entry.
                options={(offices || [])
                  .filter((o) => o.office_id !== officeId)
                  .map((o) => ({
                    label: `${o.city}, ${o.address_line_1}`,
                    value: o.office_id,
                  }))}
              />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              className="w-full border border-gray-300 rounded-full py-2"
              onClick={() => setModalState(null)}
              disabled={isSavingDepartment}
            >
              Cancel
            </Button>
            <Button
              className="w-full bg-button text-white rounded-full py-2"
              onClick={handleSubmit}
              disabled={isSavingDepartment || !name.trim()}
            >
              {isSavingDepartment ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </AntdCommonModal>

      {departmentToDelete && (
        <ConfirmationModal
          title={`Delete "${departmentToDelete.name}"? This isn't checked against active job postings or candidates yet, so make sure nothing depends on it.`}
          confirmText="DELETE"
          onConfirm={handleDelete}
          onClose={() => setDepartmentToDelete(null)}
        />
      )}

      {departmentToDeactivate && (
        <ConfirmationModal
          title={`Deactivate "${departmentToDeactivate.name}"?`}
          confirmText="DEACTIVATE"
          isLoading={isDeactivating}
          onConfirm={handleDeactivate}
          onClose={() => setDepartmentToDeactivate(null)}
        />
      )}
    </div>
  );
};

export default DepartmentsTab;
