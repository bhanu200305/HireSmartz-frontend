import React, { useState, useEffect } from 'react';
import { Switch } from 'antd';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import { Button } from '../shared/ui/button';
import { Input } from '../shared/ui/input';

type AddEditDepartmentModalProps = {
  open: boolean;
  onClose: () => void;
  onSave?: (data: { id?: number; name: string; isActive: boolean }) => void;
  initialData?: { id?: number; name: string; isActive: boolean } | null;
};

const AddEditDepartmentModal: React.FC<AddEditDepartmentModalProps> = ({
  open,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name);
        setIsActive(initialData.isActive);
      } else {
        setName('');
        setIsActive(true);
      }
    }
  }, [open, initialData]);

  const handleSave = () => {
    if (onSave) {
      onSave({ id: initialData?.id, name, isActive });
    }
  };

  return (
    <AntdCommonModal
      title={initialData ? 'Edit Department' : 'Add Department'}
      subtitle="This is a custom department specific to your company. It won't appear in the platform master. You'll be able to map roles to it after creation."
      open={open}
      onClose={onClose}
      modalProps={{
        width: 650,
        className: 'add-edit-department-modal',
      }}
    >
      <div className="px-10 py-2">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Department Name <span className="required-asterisk">*</span>
          </label>
          <Input
            placeholder="eg. Store Operations"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm h-11"
          />
        </div>

        <div className="mb-8 flex items-center">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            checkedChildren={
              <span className="text-[10px] font-bold px-1 relative bottom-[0.5px] inline-block">
                ACTIVE
              </span>
            }
            unCheckedChildren={
              <span className="text-[10px] font-bold px-1 relative bottom-[0.5px] inline-block">
                INACTIVE
              </span>
            }
            className={`min-w-[70px] ${isActive ? 'bg-blue-600' : 'bg-gray-400'}`}
          />
        </div>

        <div className="flex justify-center gap-4 mt-8">
          <Button
            onClick={onClose}
            className="px-12 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-3xl font-medium"
          >
            CANCEL
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-16 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-3xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            SAVE
          </Button>
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default AddEditDepartmentModal;
