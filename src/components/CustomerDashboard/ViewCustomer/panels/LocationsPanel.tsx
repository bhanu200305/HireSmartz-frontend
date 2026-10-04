import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
import { Tooltip } from 'antd';
import { MdDelete, MdEdit, MdOutlineAdd, MdSearch } from 'react-icons/md';
import { Badge, Button, CustomTable, Input, Typography, showToast } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import ConfirmationModal from '../../../shared/ui/ConfirmationModal';
import OfficeFormModal, { OfficeFormValues } from '../../../MyCompany/OfficeFormModal';
import MasterPagination from '../../../shared/ui/MasterPagination';
import { RowsPerPageSelect } from '../../../shared/ui/RowsPerPageSelect';
import { usePersistedPageSize } from '../../../../hooks/usePersistedPageSize';
import { PAGE_SIZE_OPTIONS } from '../../../../constants/app.constants';
import {
  useListPlatformTenantOfficesQuery,
  useAddPlatformTenantOfficeMutation,
  useUpdatePlatformTenantOfficeMutation,
  useDeletePlatformTenantOfficeMutation,
} from '../../../../api/organization-service/Platform/offices';
import type { TenantOffice } from '../../../../api/organization-service/Tenants/offices';
import { getOrgErrorMessage } from '../../../../shared/utils/auth/orgError.helpers';

type OfficeRow = TenantOffice & { key: string };
type SortKey = 'address' | 'city' | 'state' | 'country';

/**
 * Super Admin's mirror of MyCompany/CompanyLocationsTab.tsx — same office
 * CRUD, same `OfficeFormModal` (already presentational, no hooks of its own),
 * platform-mounted endpoints instead of the tenant's own ambient-context ones.
 *
 * Table + search/sort/filter/pagination matches CompanySettings' master-data
 * tabs (e.g. DepartmentsTab.tsx) instead of the plain divided list this used
 * to be — a company with more than a handful of offices had no way to find
 * one besides scrolling.
 */
const LocationsPanel: React.FC<{ tenantId: string; readOnly?: boolean }> = ({
  tenantId,
  readOnly = false,
}) => {
  const { data: offices, isLoading } = useListPlatformTenantOfficesQuery(tenantId);
  const [addOffice, { isLoading: isAdding }] = useAddPlatformTenantOfficeMutation();
  const [updateOffice, { isLoading: isUpdating }] = useUpdatePlatformTenantOfficeMutation();
  const [deleteOffice] = useDeletePlatformTenantOfficeMutation();

  const [modalState, setModalState] = useState<{
    mode: 'add' | 'edit';
    office?: TenantOffice;
  } | null>(null);
  const [officeToDelete, setOfficeToDelete] = useState<TenantOffice | null>(null);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('address');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = usePersistedPageSize('customer_dashboard_locations', 10);

  const filteredOffices = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return offices ?? [];
    return (offices ?? []).filter((office) =>
      [
        office.address_line_1,
        office.address_line_2,
        office.city,
        office.state,
        office.country,
        office.zip_code,
      ]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(q))
    );
  }, [offices, searchText]);

  const sortComparators: Record<SortKey, (a: TenantOffice, b: TenantOffice) => number> = {
    address: (a, b) => a.address_line_1.localeCompare(b.address_line_1),
    city: (a, b) => a.city.localeCompare(b.city),
    state: (a, b) => (a.state ?? '').localeCompare(b.state ?? ''),
    country: (a, b) => a.country.localeCompare(b.country),
  };

  const sortedOffices = useMemo(() => {
    const sorted = [...filteredOffices].sort(sortComparators[sortBy]);
    return sortOrder === 'desc' ? sorted.reverse() : sorted;
  }, [filteredOffices, sortBy, sortOrder]);

  const sortOrderFor = (key: SortKey): 'ascend' | 'descend' | undefined =>
    sortBy === key ? (sortOrder === 'asc' ? 'ascend' : 'descend') : undefined;

  const handleTableChange: TableProps<OfficeRow>['onChange'] = (_pagination, _filters, sorter) => {
    const active = Array.isArray(sorter) ? sorter[0] : sorter;
    setPage(0);
    if (!active?.order || !active.columnKey) {
      setSortBy('address');
      setSortOrder('asc');
      return;
    }
    setSortBy(active.columnKey as SortKey);
    setSortOrder(active.order === 'ascend' ? 'asc' : 'desc');
  };

  const handleSubmit = async (values: OfficeFormValues) => {
    try {
      if (modalState?.mode === 'edit' && modalState.office) {
        await updateOffice({ tenantId, officeId: modalState.office.office_id, ...values }).unwrap();
        showToast({ message: 'Office updated.', type: 'success' });
      } else {
        await addOffice({
          tenantId,
          address: values.address_line_1,
          city: values.city,
          country: values.country,
          address_line_2: values.address_line_2 || undefined,
          state: values.state || undefined,
          zip_code: values.zip_code || undefined,
        }).unwrap();
        showToast({ message: 'Office added.', type: 'success' });
      }
      setModalState(null);
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to save office.'), type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!officeToDelete) return;
    try {
      await deleteOffice({ tenantId, officeId: officeToDelete.office_id }).unwrap();
      showToast({ message: 'Office removed.', type: 'success' });
    } catch (err) {
      showToast({ message: getOrgErrorMessage(err, 'Failed to remove office.'), type: 'error' });
    } finally {
      setOfficeToDelete(null);
    }
  };

  if (isLoading) return <Loader />;

  const columns: TableProps<OfficeRow>['columns'] = [
    {
      title: 'Address',
      dataIndex: 'address_line_1',
      key: 'address',
      sorter: true,
      sortOrder: sortOrderFor('address'),
      render: (_: unknown, office: OfficeRow) => (
        <span className="font-semibold text-gray-900">
          {[office.address_line_1, office.address_line_2].filter(Boolean).join(', ')}
        </span>
      ),
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      sorter: true,
      sortOrder: sortOrderFor('city'),
      render: (_: unknown, office: OfficeRow) => (
        <span className="text-gray-600 text-sm">{office.city || '-'}</span>
      ),
    },
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
      sorter: true,
      sortOrder: sortOrderFor('state'),
      render: (_: unknown, office: OfficeRow) => (
        <span className="text-gray-600 text-sm">{office.state || '-'}</span>
      ),
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      sorter: true,
      sortOrder: sortOrderFor('country'),
      render: (_: unknown, office: OfficeRow) => (
        <Badge status="neutral" dot={false}>
          {office.country}
        </Badge>
      ),
    },
    {
      title: 'Zip',
      dataIndex: 'zip_code',
      key: 'zip_code',
      render: (_: unknown, office: OfficeRow) => (
        <span className="text-gray-500 text-sm font-mono">{office.zip_code || '-'}</span>
      ),
    },
    ...(readOnly
      ? []
      : [
          {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_: unknown, office: OfficeRow) => (
              <div className="flex items-center gap-1">
                <Tooltip title="Edit Office">
                  <button
                    type="button"
                    aria-label="Edit office"
                    className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
                    onClick={() => setModalState({ mode: 'edit', office })}
                  >
                    <MdEdit className="text-gray-600" />
                  </button>
                </Tooltip>
                <Tooltip title="Delete Office">
                  <button
                    type="button"
                    aria-label="Delete office"
                    className="group p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
                    onClick={() => setOfficeToDelete(office)}
                  >
                    <MdDelete className="text-gray-600 transition-colors group-hover:text-red-600" />
                  </button>
                </Tooltip>
              </div>
            ),
          },
        ]),
  ];

  const dataSource: OfficeRow[] = sortedOffices
    .slice(page * pageSize, page * pageSize + pageSize)
    .map((office) => ({
      ...office,
      key: office.office_id,
    }));

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <Typography variant="body2">Every office this company operates out of.</Typography>
          <span className="text-xs font-medium text-gray-400">
            {filteredOffices.length} {filteredOffices.length === 1 ? 'office' : 'offices'}
            {searchText.trim() && ` of ${offices?.length ?? 0}`}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-52">
            <Input
              prefix={<MdSearch className="text-gray-400" />}
              placeholder="Search locations..."
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
              onClick={() => setModalState({ mode: 'add' })}
            >
              <MdOutlineAdd /> Add Office
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
        <CustomTable<OfficeRow>
          columns={columns}
          dataSource={dataSource}
          emptyText={
            searchText.trim() ? 'No offices match your search.' : 'No office locations yet.'
          }
          pagination={false}
          onChange={handleTableChange}
        />
      </div>

      <MasterPagination
        current={page + 1}
        pageSize={pageSize}
        total={sortedOffices.length}
        itemLabel="offices"
        onPageChange={(nextPage) => setPage(nextPage - 1)}
      />

      <OfficeFormModal
        open={modalState !== null}
        mode={modalState?.mode || 'add'}
        initial={modalState?.office}
        isSaving={isAdding || isUpdating}
        onClose={() => setModalState(null)}
        onSubmit={handleSubmit}
      />

      {officeToDelete && (
        <ConfirmationModal
          title={`Remove ${officeToDelete.city}? Any linked department will be unlinked automatically.`}
          confirmText="Remove"
          onConfirm={handleDelete}
          onClose={() => setOfficeToDelete(null)}
        />
      )}
    </div>
  );
};

export default LocationsPanel;
