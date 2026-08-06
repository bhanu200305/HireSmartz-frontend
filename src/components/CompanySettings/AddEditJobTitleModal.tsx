import React, { useState, useEffect } from 'react';
import { Switch, Modal } from 'antd';
import { IoClose } from 'react-icons/io5';
import { Button } from '../shared/ui/button';
import { Input } from '../shared/ui/input';
import MultiSelectDropdown from '../shared/ui/MultiSelectDropdown';
import { useGetMasterDepartmentsQuery } from '../../api/tenant-service/CompanySettings/departments';

type AddEditJobTitleModalProps = {
  open: boolean;
  onClose: () => void;
  onSave?: (data: {
    id?: number;
    name: string;
    isActive: boolean;
    departmentIds: number[];
  }) => void;
  initialData?: { id?: number; name: string; isActive: boolean; departmentIds: number[] } | null;
  isLoading?: boolean;
};

const AddEditJobTitleModal: React.FC<AddEditJobTitleModalProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedDeptIds, setSelectedDeptIds] = useState<Set<number>>(new Set());

  const { data: deptData } = useGetMasterDepartmentsQuery(
    { size: 100, status: 'active', sortBy: 'name', sortDirection: 'ASC' },
    { skip: !open }
  );

  const departments = deptData?.content || [];

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name);
        setIsActive(initialData.isActive);
        setSelectedDeptIds(new Set(initialData.departmentIds || []));
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
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={650}
      centered
      className="add-edit-jobtitle-modal"
      closeIcon={<IoClose className="text-gray-400 hover:text-gray-600 text-xl" />}
    >
      <div className="px-2 pt-2 pb-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">
          {initialData ? 'Edit Job Title' : 'Add Job Title'}
        </h2>
        <p className="text-xs text-gray-500 mb-8 mx-auto text-center max-w-sm">
          Assign the Job Title to available Departments. These selections can be edited in
          Department Settings.
        </p>

        <div className="mb-6 mx-auto max-w-[500px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Title <span className="required-asterisk">*</span>
          </label>
          <Input
            placeholder="eg. Backend Developer"
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
          className="mb-6 mx-auto max-w-[500px]"
        />

        <div className="mb-8 mx-auto max-w-[500px] flex items-center">
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

        <div className="flex justify-center gap-4 mt-8 pt-4 mx-auto max-w-[500px]">
          <Button
            onClick={onClose}
            className="w-1/2 py-[10px] h-11 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-full font-semibold"
          >
            CANCEL
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || selectedDeptIds.size === 0 || isLoading}
            className="w-1/2 py-[10px] h-11 bg-brand-600 text-white hover:bg-brand-700 rounded-full font-semibold disabled:opacity-50 disabled:cursor-not-allowed border-none"
          >
            {isLoading ? 'SAVING...' : 'SAVE'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddEditJobTitleModal;
