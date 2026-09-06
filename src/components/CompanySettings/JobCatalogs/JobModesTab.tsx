import React from 'react';
import {
  useListPlatformJobModesQuery,
  useCreatePlatformJobModeMutation,
  useUpdatePlatformJobModeMutation,
  useDeletePlatformJobModeMutation,
  PlatformJobMode,
} from '../../../api/job-service/Platform/masterJobModes';
import PlatformCatalogTab from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

type FormValues = { name: string; description: string };
const emptyForm: FormValues = { name: '', description: '' };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description (optional)', type: 'textarea' },
];

/** GET/POST/PUT/DELETE /platform/master-job-modes — what a job's `mode_id`
 * on Job Details directly references (e.g. Remote, Hybrid, On-site). */
const JobModesTab: React.FC = () => {
  const { data, isLoading } = useListPlatformJobModesQuery();
  const [create] = useCreatePlatformJobModeMutation();
  const [update] = useUpdatePlatformJobModeMutation();
  const [remove] = useDeletePlatformJobModeMutation();

  return (
    <PlatformCatalogTab<PlatformJobMode, FormValues>
      title="Platform-wide job-mode catalogue."
      itemNounSingular="Job mode"
      itemNounPlural="Job modes"
      items={data}
      isLoading={isLoading}
      idOf={(item) => item.job_mode_id}
      labelOf={(item) => item.name}
      columns={[
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Description', key: 'description', render: (_, item) => item.description || '-' },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({ name: item.name, description: item.description || '' })}
      onCreate={(values) =>
        create({
          name: values.name.trim(),
          description: values.description.trim() || undefined,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          jobModeId: id,
          name: values.name.trim(),
          description: values.description.trim() || undefined,
        }).unwrap()
      }
      onDelete={(item) => remove(item.job_mode_id).unwrap()}
    />
  );
};

export default JobModesTab;
