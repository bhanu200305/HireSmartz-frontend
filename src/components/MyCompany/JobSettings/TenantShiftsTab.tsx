import React, { useState } from 'react';
import {
  useSearchOrganizationShiftsQuery,
  useCreateOrganizationShiftMutation,
  useUpdateOrganizationShiftMutation,
  useDeleteOrganizationShiftMutation,
  useActivateOrganizationShiftMutation,
  useDeactivateOrganizationShiftMutation,
  type OrganizationShift,
} from '../../../api/job-service/Shifts/shifts';
import PlatformCatalogTab, {
  type CatalogServerQuery,
} from '../../CompanySettings/JobCatalogs/PlatformCatalogTab';
import type { CatalogField } from '../../CompanySettings/JobCatalogs/CatalogFormFields';
import useHasAccess from '../../../hooks/useHasAccess';
import { Authorities } from '../../../constants/authorities.constant';
import { formatTime12h, formatDurationMinutes } from '../../../utils/formatTime';

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
  { name: 'start_time', label: 'Start Time', type: 'time', required: true },
  { name: 'end_time', label: 'End Time', type: 'time', required: true },
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
    // Oldest first, so a newly added row lands at the bottom (clicking Name sorts by name).
    sortBy: 'created_at',
    sortDir: 'asc',
  });
  const { data, isLoading } = useSearchOrganizationShiftsQuery({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
    // A deleted row must not come back: the server returns soft-deleted rows only when
    // `include_inactive` is sent, and deactivated (switched-off) rows are listed anyway.
  });
  const [create] = useCreateOrganizationShiftMutation();
  const [update] = useUpdateOrganizationShiftMutation();
  const [remove] = useDeleteOrganizationShiftMutation();
  const [activate] = useActivateOrganizationShiftMutation();
  const [deactivate] = useDeactivateOrganizationShiftMutation();
  // Both hooks must run unconditionally on every render — `||` short-circuits
  // the second call once the first is true, which varies the hook count
  // between renders and violates React's rules of hooks.
  const canManageCompanySettings = useHasAccess(Authorities.COMPANY_SETTINGS_EDIT);
  const canManageJobCatalog = useHasAccess(Authorities.JOB_CATALOG_EDIT);
  const canManage = canManageCompanySettings || canManageJobCatalog;
  // SKILL/JOB_CATALOG_DELETE = admin: edit or delete any row. Without it,
  // a caller may only add new rows, never edit or delete existing ones.
  const canManageAny = useHasAccess(Authorities.JOB_CATALOG_DELETE) || canManageCompanySettings;

  return (
    <PlatformCatalogTab<OrganizationShift, FormValues>
      title="Your company's configured shifts."
      itemNounSingular="Shift"
      itemNounPlural="Shifts"
      items={data?.items}
      total={data?.total}
      serverQuery={query}
      onServerQueryChange={setQuery}
      allowCreate={canManage}
      allowEdit={canManageAny}
      canEditRow={() => canManageAny}
      canDeleteRow={() => canManageAny}
      isLoading={isLoading}
      idOf={(item) => item.id}
      labelOf={(item) => item.shift_name}
      columns={[
        { title: 'Name', dataIndex: 'shift_name', key: 'shift_name' },
        { title: 'Description', dataIndex: 'shift_description', key: 'shift_description' },
        {
          title: 'Time',
          key: 'time',
          render: (_, item) =>
            `${formatTime12h(item.start_time)} to ${formatTime12h(item.end_time)}`,
        },
        {
          title: 'Duration',
          key: 'duration_minutes',
          render: (_, item) =>
            item.duration_minutes ? formatDurationMinutes(item.duration_minutes) : '-',
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
      onDelete={canManageAny ? (item) => remove(item.id).unwrap() : undefined}
      onToggleActive={
        canManageAny
          ? (item, next) => (next ? activate(item.id).unwrap() : deactivate(item.id).unwrap())
          : undefined
      }
    />
  );
};

export default TenantShiftsTab;
