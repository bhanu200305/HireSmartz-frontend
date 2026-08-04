import React, { useState, useEffect } from 'react';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import { Button } from '../shared/ui/button';
import { CustomCheckbox } from '../shared/ui/checkbox';
import { Select } from '../shared/ui/select';
import { Loader } from '../shared/ui/loader';
import { useGetJobRoleImportListQuery } from '../../api/tenant-service/MyCompany/jobRoles';
import { useGetDepartmentsQuery } from '../../api/tenant-service/MyCompany/departments';

type ImportRolesFromMasterModalProps = {
  open: boolean;
  onClose: () => void;
  onSave?: (selectedIds: number[], departmentId: number) => void;
};

const ImportRolesFromMasterModal: React.FC<ImportRolesFromMasterModalProps> = ({
  open,
  onClose,
  onSave,
}) => {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | undefined>();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: deptData, isFetching: isDeptFetching } = useGetDepartmentsQuery(
    { size: 1000, status: 'active' },
    { skip: !open }
  );

  const departmentOptions =
    deptData?.content?.map((dept) => ({
      label: dept.name,
      value: String(dept.id),
    })) || [];

  const selectedDeptNode = deptData?.content?.find((d) => d.id === selectedDepartmentId);
  const masterDeptId = selectedDeptNode?.masterDepartmentId;

  const { data: roleData, isFetching: isRoleFetching } = useGetJobRoleImportListQuery(
    { departmentId: masterDeptId! },
    { skip: !open || !masterDeptId }
  );

  useEffect(() => {
    if (!open) {
      setSelectedIds([]);
      setSelectedDepartmentId(undefined);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIds([]);
  }, [selectedDepartmentId]);

  const handleCheckboxChange = (id: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    );
  };

  const handleSave = () => {
    if (onSave && selectedDepartmentId) {
      onSave(selectedIds, selectedDepartmentId);
    }
    onClose();
  };

  const availableToImport = roleData?.availableToImport || [];
  const alreadyImported = roleData?.alreadyImported || [];

  return (
    <AntdCommonModal
      title="Import from Template"
      subtitle="Select job titles to import into your company. They'll be added to your job titles list and ready to map to departments."
      open={open}
      onClose={onClose}
      modalProps={{
        width: 700,
        className: 'import-roles-modal',
      }}
    >
      <div className="px-8 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Department <span className="required-asterisk">*</span>
        </label>
        <Select
          appname="cfp"
          options={departmentOptions}
          value={selectedDepartmentId ? String(selectedDepartmentId) : undefined}
          onChange={(val) => setSelectedDepartmentId(Number(val))}
          placeholder="Select Department"
          className="w-full h-11"
        />
      </div>

      <div className="min-h-[250px] max-h-[400px] overflow-y-auto px-8 relative">
        {(isDeptFetching || isRoleFetching) && <Loader />}

        {!isDeptFetching &&
          !isRoleFetching &&
          selectedDepartmentId &&
          (availableToImport.length > 0 || alreadyImported.length > 0) && (
            <div className="flex flex-col gap-y-4">
              {alreadyImported.map((role) => (
                <div key={`imported-${role.id}`} className="flex items-center">
                  <CustomCheckbox
                    label={`${role.name} - Already active`}
                    checked={true}
                    disabled={true}
                    onChange={() => {}}
                    className="text-gray-400"
                  />
                </div>
              ))}

              {availableToImport.map((role) => (
                <div key={`available-${role.id}`} className="flex items-center">
                  <CustomCheckbox
                    label={role.name}
                    checked={selectedIds.includes(role.id)}
                    disabled={false}
                    onChange={(e) => handleCheckboxChange(role.id, e.target.checked)}
                    className="text-gray-700"
                  />
                </div>
              ))}
            </div>
          )}

        {!isDeptFetching &&
          !isRoleFetching &&
          selectedDepartmentId &&
          availableToImport.length === 0 &&
          alreadyImported.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-500 pt-10">
              No roles available to import for this department.
            </div>
          )}

        {!selectedDepartmentId && (
          <div className="flex items-center justify-center h-full text-gray-500 pt-10">
            Please drag to select a department above to populate available roles.
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4 mt-8 pb-4">
        <Button
          onClick={onClose}
          className="px-10 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-3xl font-medium"
        >
          CANCEL
        </Button>
        <Button
          onClick={handleSave}
          disabled={selectedIds.length === 0}
          className="px-12 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-3xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          SAVE
        </Button>
      </div>
    </AntdCommonModal>
  );
};

export default ImportRolesFromMasterModal;
