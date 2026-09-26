import React, { useState } from 'react';
import {
  useSearchOrganizationShiftsQuery,
  useCreateOrganizationShiftMutation,
  useUpdateOrganizationShiftMutation,
  useDeleteOrganizationShiftMutation,
  type OrganizationShift,
} from '../../../api/job-service/Shifts/shifts';
import PlatformCatalogTab, {
  type CatalogServerQuery,
} from '../../CompanySettings/JobCatalogs/PlatformCatalogTab';
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

/** Minutes between two "HH:mm" times, wrapping past midnight. Null if either
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

/** This organization's own configured shifts.
 *
 * `duration_minutes` is derived from start/end time rather than entered
 * directly, to keep it from disagreeing with the times actually saved. */
const TenantShiftsTab: React.FC = () => {
  const [query, setQuery] = useState<CatalogServerQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    sortBy: 'name',
    sortDir: 'asc',
  });
  const { data, isLoading } = useSearchOrganizationShiftsQuery({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
  });
  const [create] = useCreateOrganizationShiftMutation();
  const [update] = useUpdateOrganizationShiftMutation();
  const [remove] = useDeleteOrganizationShiftMutation();

  return (
    <PlatformCatalogTab<OrganizationShift, FormValues>
      title="Your company's configured shifts."
      itemNounSingular="Shift"
      itemNounPlural="Shifts"
      items={data?.items}
      total={data?.total}
      serverQuery={query}
      onServerQueryChange={setQuery}
      isLoading={isLoading}
      idOf={(item) => item.id}
      labelOf={(item) => item.shift_name}
      columns={[
        { title: 'Name', dataIndex: 'shift_name', key: 'shift_name' },
        { title: 'Description', dataIndex: 'shift_description', key: 'shift_description' },
        {
          title: 'Time',
          key: 'time',
          render: (_, item) => `${item.start_time} to ${item.end_time}`,
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
        description: item.shift_description ?? null,
        start_time: item.start_time,
        end_time: item.end_time,
      })}
      onCreate={(values) =>
        create({
          shift_name: values.name.trim(),
          shift_description: values.description,
          start_time: values.start_time.trim(),
          end_time: values.end_time.trim(),
          duration_minutes: computeDurationMinutes(values.start_time, values.end_time) ?? undefined,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          shiftId: id,
          shift_name: values.name.trim(),
          shift_description: values.description,
          start_time: values.start_time.trim(),
          end_time: values.end_time.trim(),
          duration_minutes: computeDurationMinutes(values.start_time, values.end_time) ?? undefined,
        }).unwrap()
      }
      onDelete={(item) => remove(item.id).unwrap()}
    />
  );
};

export default TenantShiftsTab;
