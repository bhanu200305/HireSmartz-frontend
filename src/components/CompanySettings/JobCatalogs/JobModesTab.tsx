import React, { useState } from 'react';
import {
  useSearchPlatformJobModesQuery,
  useCreatePlatformJobModeMutation,
  useUpdatePlatformJobModeMutation,
  useDeletePlatformJobModeMutation,
  PlatformJobMode,
} from '../../../api/job-service/Platform/masterJobModes';
import PlatformCatalogTab, { type CatalogServerQuery } from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

type FormValues = { name: string; description: string };
const emptyForm: FormValues = { name: '', description: '' };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description (optional)', type: 'textarea' },
];

/** Platform-wide job-mode catalogue (e.g. Remote, Hybrid, On-site). */
const JobModesTab: React.FC = () => {
  const [query, setQuery] = useState<CatalogServerQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    sortBy: 'name',
    sortDir: 'asc',
  });
  const { data, isLoading } = useSearchPlatformJobModesQuery({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
  });
  const [create] = useCreatePlatformJobModeMutation();
  const [update] = useUpdatePlatformJobModeMutation();
  const [remove] = useDeletePlatformJobModeMutation();

  return (
    <PlatformCatalogTab<PlatformJobMode, FormValues>
      title="Platform-wide job-mode catalog."
      itemNounSingular="Job mode"
      itemNounPlural="Job modes"
      items={data?.items}
      total={data?.total}
      serverQuery={query}
      onServerQueryChange={setQuery}
      isLoading={isLoading}
      idOf={(item) => item.job_mode_id}
      labelOf={(item) => item.job_mode_name}
      columns={[
        { title: 'Name', dataIndex: 'job_mode_name', key: 'job_mode_name' },
        {
          title: 'Description',
          key: 'job_mode_description',
          render: (_, item) => item.job_mode_description || '-',
        },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({
        name: item.job_mode_name,
        description: item.job_mode_description || '',
      })}
      onCreate={(values) =>
        create({
          job_mode_name: values.name.trim(),
          job_mode_description: values.description.trim() || undefined,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          jobModeId: id,
          job_mode_name: values.name.trim(),
          job_mode_description: values.description.trim() || undefined,
        }).unwrap()
      }
      onDelete={(item) => remove(item.job_mode_id).unwrap()}
    />
  );
};

export default JobModesTab;
