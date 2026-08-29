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

type FormValues = { name: string; description: string; duration_minutes: number | null };
const emptyForm: FormValues = { name: '', description: '', duration_minutes: null };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description (optional)', type: 'textarea' },
  { name: 'duration_minutes', label: 'Duration (minutes, optional)', type: 'number' },
];

/** GET/POST/PUT/DELETE /platform/master-shift-types — what /master/shift-types
 * offers a tenant when they add their own configured shift. */
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
      labelOf={(item) => item.name}
      columns={[
        { title: 'Name', dataIndex: 'name', key: 'name' },
        {
          title: 'Description',
          key: 'description',
          render: (_, item) => item.description || '—',
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
        description: item.description || '',
        duration_minutes: item.duration_minutes,
      })}
      onCreate={(values) =>
        create({
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          duration_minutes: values.duration_minutes,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          shiftTypeId: id,
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          duration_minutes: values.duration_minutes,
        }).unwrap()
      }
      onDelete={(item) => remove(item.shift_type_id).unwrap()}
    />
  );
};

export default ShiftTypesTab;
