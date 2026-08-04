import React, { useState, useEffect } from 'react';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import { Button } from '../shared/ui/button';
import { CustomCheckbox } from '../shared/ui/checkbox';
import { Loader } from '../shared/ui/loader';
import { useGetDepartmentImportListQuery } from '../../api/tenant-service/MyCompany/departments';

type ImportFromMasterModalProps = {
  open: boolean;
  onClose: () => void;
  onSave?: (selectedIds: number[]) => void;
};

const ImportFromMasterModal: React.FC<ImportFromMasterModalProps> = ({ open, onClose, onSave }) => {
  const { data, isFetching } = useGetDepartmentImportListQuery(undefined, {
    skip: !open, // Only fetch when modal is opened
  });

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (!open) {
      setSelectedIds([]); // Reset selection on close
    }
  }, [open]);

  const handleCheckboxChange = (id: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    );
  };

  const handleSave = () => {
    if (onSave) {
      onSave(selectedIds);
    }
    onClose();
  };

  const availableToImport = data?.availableToImport || [];
  const alreadyImported = data?.alreadyImported || [];

  return (
    <AntdCommonModal
      title="Import from Template"
      subtitle="Select departments from the platform master list to add to your company. Already active departments are greyed out."
      open={open}
      onClose={onClose}
      modalProps={{
        width: 800,
        className: 'import-master-modal',
      }}
    >
      <div className="min-h-[300px] max-h-[500px] overflow-y-auto px-4 relative">
        {isFetching && <Loader />}

        {!isFetching && (availableToImport.length > 0 || alreadyImported.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
            {/* Render already imported first, disabled */}
            {alreadyImported.map((dept) => (
              <div key={`imported-${dept.id}`} className="flex items-center">
                <CustomCheckbox
                  label={dept.name}
                  checked={true}
                  disabled={true}
                  onChange={() => {}}
                  className="text-gray-400"
                />
              </div>
            ))}

            {/* Render available to import next */}
            {availableToImport.map((dept) => (
              <div key={`available-${dept.id}`} className="flex items-center">
                <CustomCheckbox
                  label={dept.name}
                  checked={selectedIds.includes(dept.id)}
                  disabled={false}
                  onChange={(e) => handleCheckboxChange(dept.id, e.target.checked)}
                  className="text-gray-700"
                />
              </div>
            ))}
          </div>
        )}

        {!isFetching && availableToImport.length === 0 && alreadyImported.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            No departments available to import.
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4 mt-8">
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

export default ImportFromMasterModal;
