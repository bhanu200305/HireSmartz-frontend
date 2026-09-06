import React from 'react';
import {
  useListShiftsQuery,
  useCreateShiftMutation,
  useUpdateShiftMutation,
  useDeleteShiftMutation,
} from '../../../api/job-service/JobOpening/catalogs';
import type { OrganizationShift } from '../../../api/job-service/types';
import PlatformCatalogTab from '../../CompanySettings/JobCatalogs/PlatformCatalogTab';
import type { CatalogField } from '../../CompanySettings/JobCatalogs/CatalogFormFields';

type FormValues = {
  name: string;
  description: string | null;
  start_time: string;
  end_time: string;
};
const emptyForm: FormValues = { name: '', description: null, start_time: '', end_time: '' };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'start_time', label: 'Start time', type: 'time', required: true },
  { name: 'end_time', label: 'End time', type: 'time', required: true },
];

/** Minutes between two "HH:mm" times, wrapping past midnight when end is
 * earlier than start (e.g. 22:00-06:00 is 480, not negative). Null if either
 * side is unfilled. */
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

/** GET/POST/PUT/DELETE /shifts — this organization's own configured
 * shifts. What a job's Shift dropdown on Job Details offers.
 *
 * `duration_minutes` is derived from start/end time rather than entered
 * directly, to keep it from disagreeing with the times actually saved. */
const TenantShiftsTab: React.FC = () => {
  const { data, isLoading } = useListShiftsQuery();
  const [create] = useCreateShiftMutation();
  const [update] = useUpdateShiftMutation();
  const [remove] = useDeleteShiftMutation();

  return (
    <PlatformCatalogTab<OrganizationShift, FormValues>
      title="Your company's configured shifts."
      itemNounSingular="Shift"
      itemNounPlural="Shifts"
      items={data}
      isLoading={isLoading}
      idOf={(item) => item.id}
      labelOf={(item) => item.name}
      columns={[
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Description', dataIndex: 'description', key: 'description' },
        {
          title: 'Time',
          key: 'time',
          render: (_, item) => `${item.start_time} – ${item.end_time}`,
        },
        {
          title: 'Duration',
          key: 'duration_minutes',
          render: (_, item) => (item.duration_minutes ? `${item.duration_minutes} min` : '—'),
        },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({
        name: item.name,
        description: item.description ?? null,
        start_time: item.start_time,
        end_time: item.end_time,
      })}
      onCreate={(values) =>
        create({
          name: values.name.trim(),
          description: values.description,
          start_time: values.start_time.trim(),
          end_time: values.end_time.trim(),
          duration_minutes: computeDurationMinutes(values.start_time, values.end_time),
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          shiftId: id,
          name: values.name.trim(),
          description: values.description,
          start_time: values.start_time.trim(),
          end_time: values.end_time.trim(),
          duration_minutes: computeDurationMinutes(values.start_time, values.end_time),
        }).unwrap()
      }
      onDelete={(item) => remove(item.id).unwrap()}
    />
  );
};

export default TenantShiftsTab;
