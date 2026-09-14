import React, { useMemo, useState } from 'react';
import type { TableProps } from 'antd';
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
import ConfirmationModal from '../shared/ui/ConfirmationModal';
import OfficeFormModal, { OfficeFormValues } from './OfficeFormModal';
import {
  useListTenantOfficesQuery,
  useAddTenantOfficeMutation,
  useUpdateTenantOfficeMutation,
  useDeleteTenantOfficeMutation,
  TenantOffice,
} from '../../api/organization-service/Tenants/offices';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';

type OfficeRow = TenantOffice & { key: string };

/**
 * §C — GET/POST/PATCH/DELETE /v1/tenants/{tenant_id}/offices. Delete needs no
 * confirmation warning per docs/frontend_guide.txt ("a department is linked
 * to it, it just gets unlinked automatically") — a light confirm is kept
 * anyway since it's still a destructive action, just not a data-loss one.
 *
 * Table + search/sort/pagination matches the Super Admin's mirror of this
 * screen (CustomerDashboard/ViewCustomer/panels/LocationsPanel.tsx) and
 * CompanySettings' master-data tabs — a company with more than a handful of
 * offices had no way to find one besides scrolling a plain divided list.
 */
const CompanyLocationsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data: offices, isLoading } = useListTenantOfficesQuery({ tenantId });
  const [addOffice, { isLoading: isAdding }] = useAddTenantOfficeMutation();
  const [updateOffice, { isLoading: isUpdating }] = useUpdateTenantOfficeMutation();
  const [deleteOffice] = useDeleteTenantOfficeMutation();
  const canAdd = useHasAccess(Authorities.LOCATION_ADD);
  const canEdit = useHasAccess(Authorities.LOCATION_EDIT);
  const canDelete = useHasAccess(Authorities.LOCATION_DELETE);

  const [modalState, setModalState] = useState<{
    mode: 'add' | 'edit';
    office?: TenantOffice;
  } | null>(null);
  const [officeToDelete, setOfficeToDelete] = useState<TenantOffice | null>(null);
  const [searchText, setSearchText] = useState('');

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

  const handleSubmit = async (values: OfficeFormValues) => {
    try {
      if (modalState?.mode === 'edit' && modalState.office) {
        await updateOffice({
          tenantId,
          officeId: modalState.office.office_id,
          ...values,
          location_code: values.location_code || undefined,
        }).unwrap();
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
          location_code: values.location_code || undefined,
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
      sorter: (a: OfficeRow, b: OfficeRow) => a.address_line_1.localeCompare(b.address_line_1),
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
      sorter: (a: OfficeRow, b: OfficeRow) => a.city.localeCompare(b.city),
      render: (_: unknown, office: OfficeRow) => (
        <span className="text-gray-600 text-sm">{office.city || '-'}</span>
      ),
    },
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
      sorter: (a: OfficeRow, b: OfficeRow) => (a.state ?? '').localeCompare(b.state ?? ''),
      render: (_: unknown, office: OfficeRow) => (
        <span className="text-gray-600 text-sm">{office.state || '-'}</span>
      ),
    },
    {
      title: 'Country',
      dataIndex: 'country',
      key: 'country',
      sorter: (a: OfficeRow, b: OfficeRow) => a.country.localeCompare(b.country),
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
    (canEdit || canDelete) && {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: unknown, office: OfficeRow) => (
        <div className="flex items-center gap-1">
          {canEdit && (
            <button
              type="button"
              aria-label="Edit office"
              className="p-2 hover:bg-gray-100 rounded-full cursor-pointer transition-colors"
              onClick={() => setModalState({ mode: 'edit', office })}
            >
              <MdEdit className="text-gray-600" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              aria-label="Delete office"
              className="p-2 hover:bg-red-50 rounded-full cursor-pointer transition-colors"
              onClick={() => setOfficeToDelete(office)}
            >
              <MdDelete className="text-red-500" />
            </button>
          )}
        </div>
      ),
    },
  ].filter(Boolean) as TableProps<OfficeRow>['columns'];

  const dataSource: OfficeRow[] = filteredOffices.map((office) => ({
    ...office,
    key: office.office_id,
  }));

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div>
          <Typography variant="body2">Every office your company operates out of.</Typography>
          <span className="text-xs font-medium text-gray-400">
            {dataSource.length} {dataSource.length === 1 ? 'office' : 'offices'}
            {searchText.trim() && ` of ${offices?.length ?? 0}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-52">
            <Input
              prefix={<MdSearch className="text-gray-400" />}
              placeholder="Search locations..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          {canAdd && (
            <Button
              className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1 shadow-sm hover:shadow-md transition-shadow shrink-0"
              onClick={() => setModalState({ mode: 'add' })}
            >
              <MdOutlineAdd /> Add office
            </Button>
          )}
        </div>
      </div>

      <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <CustomTable<OfficeRow>
          columns={columns}
          dataSource={dataSource}
          emptyText={
            searchText.trim() ? 'No offices match your search.' : 'No office locations yet.'
          }
          pagination={paginationConfig('offices')}
        />
      </div>

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
          confirmText="REMOVE"
          onConfirm={handleDelete}
          onClose={() => setOfficeToDelete(null)}
        />
      )}
    </div>
  );
};

export default CompanyLocationsTab;
