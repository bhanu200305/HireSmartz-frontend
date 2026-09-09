import React from 'react';
import {
  useListPlatformShiftTypesQuery,
  useCreatePlatformShiftTypeMutation,
  useUpdatePlatformShiftTypeMutation,
  useDeletePlatformShiftTypeMutation,
  PlatformShiftType,
} from '../../../api/job-service/Platform/masterShiftTypes';
import PlatformCatalogTab from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

type FormValues = {
  name: string;
  description: string;
  start_time: string;
  end_time: string;
};
const emptyForm: FormValues = {
  name: '',
  description: '',
  start_time: '',
  end_time: '',
};
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description (optional)', type: 'textarea' },
  // Optional — some entries have no fixed time-of-day.
  { name: 'start_time', label: 'Start time (optional)', type: 'time' },
  { name: 'end_time', label: 'End time (optional)', type: 'time' },
];

/** Minutes between two "HH:mm" times, wrapping past midnight. Null if
 * either side is unfilled. */
const computeDurationMinutes = (startTime: string, endTime: string): number | null => {
  if (!startTime || !endTime) return null;
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) return null;

  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  const diff = endTotal - startTotal;
  return diff > 0 ? diff : diff + 24 * 60;
};

/** Platform-wide shift-type catalogue offered to a tenant configuring their own shifts. */
const ShiftTypesTab: React.FC = () => {
  const { data, isLoading } = useListPlatformShiftTypesQuery();
  const [create] = useCreatePlatformShiftTypeMutation();
  const [update] = useUpdatePlatformShiftTypeMutation();
  const [remove] = useDeletePlatformShiftTypeMutation();

  return (
    <PlatformCatalogTab<PlatformShiftType, FormValues>
      title="Platform-wide shift-type catalogue."
      itemNounSingular="Shift type"
      itemNounPlural="Shift types"
      items={data}
      isLoading={isLoading}
      idOf={(item) => item.shift_type_id}
      labelOf={(item) => item.shift_name}
      columns={[
        { title: 'Name', dataIndex: 'shift_name', key: 'shift_name' },
        {
          title: 'Description',
          key: 'shift_description',
          render: (_, item) => item.shift_description || '-',
        },
        {
          title: 'Time',
          key: 'time',
          render: (_, item) =>
            item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : '-',
        },
        {
          title: 'Duration',
          key: 'duration_minutes',
          render: (_, item) => (item.duration_minutes ? `${item.duration_minutes} min` : '-'),
        },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({
        name: item.shift_name,
        description: item.shift_description || '',
        start_time: item.start_time || '',
        end_time: item.end_time || '',
      })}
      onCreate={(values) =>
        create({
          shift_name: values.name.trim(),
          shift_description: values.description.trim() || undefined,
          start_time: values.start_time.trim() || null,
          end_time: values.end_time.trim() || null,
          duration_minutes: computeDurationMinutes(values.start_time, values.end_time),
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          shiftTypeId: id,
          shift_name: values.name.trim(),
          shift_description: values.description.trim() || undefined,
          start_time: values.start_time.trim() || null,
          end_time: values.end_time.trim() || null,
          duration_minutes: computeDurationMinutes(values.start_time, values.end_time),
        }).unwrap()
      }
      onDelete={(item) => remove(item.shift_type_id).unwrap()}
    />
  );
};

export default ShiftTypesTab;
