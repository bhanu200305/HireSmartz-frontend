import React, { useState } from 'react';
import { MdDelete, MdEdit, MdOutlineAdd } from 'react-icons/md';
import { Button, Typography, showToast } from '../shared';
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

/**
 * §C — GET/POST/PATCH/DELETE /v1/tenants/{tenant_id}/offices. Delete needs no
 * confirmation warning per docs/frontend_guide.txt ("a department is linked
 * to it, it just gets unlinked automatically") — a light confirm is kept
 * anyway since it's still a destructive action, just not a data-loss one.
 */
const CompanyLocationsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data: offices, isLoading } = useListTenantOfficesQuery(tenantId);
  const [addOffice, { isLoading: isAdding }] = useAddTenantOfficeMutation();
  const [updateOffice, { isLoading: isUpdating }] = useUpdateTenantOfficeMutation();
  const [deleteOffice] = useDeleteTenantOfficeMutation();

  const [modalState, setModalState] = useState<{
    mode: 'add' | 'edit';
    office?: TenantOffice;
  } | null>(null);
  const [officeToDelete, setOfficeToDelete] = useState<TenantOffice | null>(null);

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

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Typography variant="h5">Locations</Typography>
        <Button
          className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1"
          onClick={() => setModalState({ mode: 'add' })}
        >
          <MdOutlineAdd /> Add office
        </Button>
      </div>

      {!offices?.length ? (
        <div className="p-6 text-gray-500 text-center border border-dashed rounded-xl">
          No office locations yet.
        </div>
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden">
          {offices.map((office) => (
            <div key={office.office_id} className="flex items-center justify-between p-4">
              <div>
                <Typography variant="body1">
                  {[office.address_line_1, office.address_line_2].filter(Boolean).join(', ')}
                </Typography>
                <Typography variant="caption">
                  {[office.city, office.state, office.country, office.zip_code]
                    .filter(Boolean)
                    .join(', ')}
                </Typography>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Edit office"
                  className="p-2 hover:bg-gray-100 rounded-full"
                  onClick={() => setModalState({ mode: 'edit', office })}
                >
                  <MdEdit className="text-gray-600" />
                </button>
                <button
                  type="button"
                  aria-label="Delete office"
                  className="p-2 hover:bg-gray-100 rounded-full"
                  onClick={() => setOfficeToDelete(office)}
                >
                  <MdDelete className="text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
