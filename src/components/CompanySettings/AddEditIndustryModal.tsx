import React, { useState, useEffect } from 'react';
import { Switch, Modal } from 'antd';
import { Button } from '../shared/ui/button';
import { Input } from '../shared/ui/input';

type AddEditIndustryModalProps = {
  open: boolean;
  onClose: () => void;
  onSave?: (data: { id?: number; name: string; isActive: boolean }) => void;
  initialData?: { id?: number; name: string; isActive: boolean } | null;
  isLoading?: boolean;
};

const AddEditIndustryModal: React.FC<AddEditIndustryModalProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  isLoading = false,
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
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={550}
      centered
      className="add-edit-industry-modal"
      closeIcon={null} // Figma does not seem to have close icon but it might. I will leave default antd close icon if needed, but Modal lets me omit it or I can just leave it as default.
    >
      <div className="pt-8 pb-4 px-6 text-center">
        <h2 className="text-[22px] font-semibold text-gray-800 mb-2">
          {initialData ? 'Edit Industry' : 'Add Industry'}
        </h2>
        <p className="text-xs text-gray-500 mb-8 mx-auto max-w-sm">
          Industry is assigned to a company at creation and cannot be changed later.
        </p>

        <div className="mb-6 text-left w-full mx-auto max-w-[420px]">
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Industry <span className="required-asterisk">*</span>
          </label>
          <Input
            placeholder="eg. Information Technology"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm h-11 rounded-3xl"
          />
        </div>

        <div className="mb-8 flex items-center justify-start w-full mx-auto max-w-[420px]">
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
            className={`min-w-[80px] h-6 ${isActive ? 'bg-brand-600' : 'bg-gray-400'}`}
          />
        </div>

        <div className="flex justify-center gap-4 mt-10">
          <Button
            onClick={onClose}
            className="w-1/2 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-full font-semibold max-w-[200px]"
          >
            CANCEL
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isLoading}
            className="w-1/2 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-full font-semibold max-w-[200px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'SAVING...' : 'SAVE'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddEditIndustryModal;
