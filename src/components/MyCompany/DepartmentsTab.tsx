import React, { useState } from 'react';
import { MdDelete, MdOutlineAdd, MdOutlineApartment } from 'react-icons/md';
import { Button, Input, Select, Typography, showToast } from '../shared';
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

/**
 * §C — GET/POST/DELETE /v1/tenants/{tenant_id}/departments. Delete needs a
 * STRONGER "are you sure" than office deletion, per docs/frontend_guide.txt:
 * the backend doesn't yet check for active job postings/candidates before
 * deleting (a known, flagged gap — organization-service docs/PROGRESS.md).
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

  const officeName = (id: string | null) => offices?.find((o) => o.office_id === id)?.city || '-';

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

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Typography variant="h5">Departments</Typography>
        {canAdd && (
          <Button
            className="rounded-full bg-button text-white px-4 py-1.5 flex items-center gap-1"
            onClick={() => setIsAddOpen(true)}
          >
            <MdOutlineAdd /> Add department
          </Button>
        )}
      </div>

      {!departments?.length ? (
        <div className="p-8 text-gray-500 text-center border border-dashed border-gray-200 rounded-xl">
          No departments yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {departments.map((dept) => (
            <div
              key={dept.org_department_id}
              className="flex items-center justify-between gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                  <MdOutlineApartment size={18} />
                </span>
                <div className="min-w-0">
                  <Typography variant="body1" className="font-medium text-gray-900 truncate">
                    {dept.name}
                  </Typography>
                  <Typography variant="caption" className="text-gray-400">
                    Office: {officeName(dept.office_id)}
                  </Typography>
                </div>
              </div>
              {canDelete && (
                <button
                  type="button"
                  aria-label="Delete department"
                  className="p-2 rounded-full text-red-500 bg-red-50 hover:bg-red-100 transition-colors shrink-0"
                  onClick={() => setDepartmentToDelete(dept)}
                >
                  <MdDelete size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

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
