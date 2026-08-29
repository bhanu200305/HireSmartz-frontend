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

type FormValues = { name: string; start_time: string; end_time: string; duration_minutes: number | null };
const emptyForm: FormValues = { name: '', start_time: '', end_time: '', duration_minutes: null };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'start_time', label: 'Start time (HH:MM, 24h)', type: 'text', required: true },
  { name: 'end_time', label: 'End time (HH:MM, 24h)', type: 'text', required: true },
  { name: 'duration_minutes', label: 'Duration (minutes, optional)', type: 'number' },
];

/** GET/POST/PUT/DELETE /shifts — this organization's own configured
 * shifts. What a job's Shift dropdown on Job Details offers. */
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
        start_time: item.start_time,
        end_time: item.end_time,
        duration_minutes: item.duration_minutes,
      })}
      onCreate={(values) =>
        create({
          name: values.name.trim(),
          start_time: values.start_time.trim(),
          end_time: values.end_time.trim(),
          duration_minutes: values.duration_minutes,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          shiftId: id,
          name: values.name.trim(),
          start_time: values.start_time.trim(),
          end_time: values.end_time.trim(),
          duration_minutes: values.duration_minutes,
        }).unwrap()
      }
      onDelete={(item) => remove(item.id).unwrap()}
    />
  );
};

export default TenantShiftsTab;
