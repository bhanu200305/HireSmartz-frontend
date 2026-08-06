import React, { useState, useEffect } from 'react';
import { Switch } from 'antd';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import { Button } from '../shared/ui/button';
import { Input } from '../shared/ui/input';
import MultiSelectDropdown from '../shared/ui/MultiSelectDropdown';
import { useGetDepartmentsQuery } from '../../api/tenant-service/MyCompany/departments';

type AddEditJobRoleModalProps = {
  open: boolean;
  onClose: () => void;
  onSave?: (data: {
    id?: number;
    name: string;
    isActive: boolean;
    departmentIds: number[];
  }) => void;
  initialData?: { id?: number; name: string; isActive: boolean; departmentIds: number[] } | null;
};

const AddEditJobRoleModal: React.FC<AddEditJobRoleModalProps> = ({
  open,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedDeptIds, setSelectedDeptIds] = useState<Set<number>>(new Set());

  const { data: departmentsData } = useGetDepartmentsQuery({
    page: 0,
    size: 1000,
    status: 'active',
  });

  const departments = departmentsData?.content || [];

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name);
        setIsActive(initialData.isActive);
        setSelectedDeptIds(new Set(initialData.departmentIds));
      } else {
        setName('');
        setIsActive(true);
        setSelectedDeptIds(new Set());
      }
    }
  }, [open, initialData]);

  const handleSave = () => {
    if (onSave) {
      onSave({ id: initialData?.id, name, isActive, departmentIds: Array.from(selectedDeptIds) });
    }
  };

  return (
    <AntdCommonModal
      title={initialData ? 'Edit Job Title' : 'Add Job Title'}
      subtitle="Assign your job to departments. These selections can be edited in Department Settings."
      open={open}
      onClose={onClose}
      modalProps={{
        width: 650,
        className: 'add-edit-job-role-modal',
      }}
    >
      <div className="px-10 py-2">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Title <span className="required-asterisk">*</span>
          </label>
          <Input
            placeholder="eg. Prompt Engineer"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm h-11 rounded-3xl border-gray-300"
          />
        </div>

        <MultiSelectDropdown
          label="Departments"
          options={departments}
          selectedIds={selectedDeptIds}
          onChange={setSelectedDeptIds}
          searchPlaceholder="Search departments..."
          showSelectedChips
          className="mb-6"
        />

        <div className="mb-8 flex items-center">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            checkedChildren={
              <span className="text-xs font-semibold px-2 relative bottom-[1px] inline-block">
                ACTIVE
              </span>
            }
            unCheckedChildren={
              <span className="text-xs font-semibold px-2 relative bottom-[1px] inline-block">
                INACTIVE
              </span>
            }
            className={`min-w-[80px] ${isActive ? 'bg-brand-600' : 'bg-gray-400'}`}
          />
        </div>

        <div className="flex justify-center gap-4 mt-8 pt-4">
          <Button
            onClick={onClose}
            className="px-12 py-[10px] h-11 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-full font-medium"
          >
            CANCEL
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-12 py-[10px] h-11 bg-brand-600 text-white hover:bg-brand-700 rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            SAVE
          </Button>
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default AddEditJobRoleModal;
