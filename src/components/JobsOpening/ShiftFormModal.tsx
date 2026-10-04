import { useEffect, useState } from 'react';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import { Button } from '../shared';
import CatalogFormFields, {
  type CatalogField,
} from '../CompanySettings/JobCatalogs/CatalogFormFields';

export type ShiftFormValues = {
  name: string;
  start_time: string;
  end_time: string;
};

const EMPTY_FORM: ShiftFormValues = { name: '', start_time: '', end_time: '' };

const fields: CatalogField<ShiftFormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'start_time', label: 'Start time', type: 'time', required: true },
  { name: 'end_time', label: 'End time', type: 'time', required: true },
];

/** Minutes between two "HH:mm" times, wrapping past midnight. Null if
 * either side is unfilled. */
export const computeShiftDurationMinutes = (startTime: string, endTime: string): number | null => {
  if (!startTime || !endTime) return null;
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) return null;

  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  const diff = endTotal - startTotal;
  return diff > 0 ? diff : diff + 24 * 60;
};

export type ShiftFormModalProps = {
  open: boolean;
  mode: 'add' | 'edit';
  initialValues?: ShiftFormValues;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (values: ShiftFormValues) => void;
};

/** Add/edit a shift inline from the Job Details form — collects name plus
 * start/end time, unlike the other catalogue fields' name-only dialog. */
const ShiftFormModal: React.FC<ShiftFormModalProps> = ({
  open,
  mode,
  initialValues,
  isSaving = false,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<ShiftFormValues>(initialValues ?? EMPTY_FORM);

  useEffect(() => {
    if (open) setForm(initialValues ?? EMPTY_FORM);
  }, [open, initialValues]);

  const missingRequired = !form.name.trim() || !form.start_time || !form.end_time;

  if (!open) return null;

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Shift' : 'Add Shift'}
    >
      <div className="flex flex-col gap-4">
        <CatalogFormFields fields={fields} values={form} onChange={setForm} />
        <div className="grid grid-cols-2 gap-4">
          <Button
            className="w-full border border-gray-300 rounded-full py-2"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            className="w-full bg-button text-white rounded-full py-2"
            onClick={() => onSubmit(form)}
            disabled={isSaving || missingRequired}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default ShiftFormModal;
