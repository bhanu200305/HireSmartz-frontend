import React, { useState } from 'react';
import {
  useSearchOrganizationJobModesQuery,
  useCreateJobModeMutation,
  useUpdateJobModeMutation,
  useDeleteJobModeMutation,
} from '../../../api/job-service/JobOpening/catalogs';
import type { OrganizationJobMode } from '../../../api/job-service/types';
import PlatformCatalogTab, {
  type CatalogServerQuery,
} from '../../CompanySettings/JobCatalogs/PlatformCatalogTab';
import type { CatalogField } from '../../CompanySettings/JobCatalogs/CatalogFormFields';

type FormValues = { name: string; description: string | null };
const emptyForm: FormValues = { name: '', description: null };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
];

/** This organization's own configured job modes. */
const TenantJobModesTab: React.FC = () => {
  const [query, setQuery] = useState<CatalogServerQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    sortBy: 'name',
    sortDir: 'asc',
  });
  const { data, isLoading } = useSearchOrganizationJobModesQuery({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
  });
  const [create] = useCreateJobModeMutation();
  const [update] = useUpdateJobModeMutation();
  const [remove] = useDeleteJobModeMutation();

  return (
    <PlatformCatalogTab<OrganizationJobMode, FormValues>
      title="Your company's configured job modes."
      itemNounSingular="Job mode"
      itemNounPlural="Job modes"
      items={data?.items}
      total={data?.total}
      serverQuery={query}
      onServerQueryChange={setQuery}
      isLoading={isLoading}
      idOf={(item) => item.id}
      labelOf={(item) => item.job_mode_name}
      columns={[
        { title: 'Name', dataIndex: 'job_mode_name', key: 'job_mode_name' },
        { title: 'Description', dataIndex: 'job_mode_description', key: 'job_mode_description' },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({
        name: item.job_mode_name,
        description: item.job_mode_description ?? null,
      })}
      onCreate={(values) =>
        create({
          job_mode_name: values.name.trim(),
          job_mode_description: values.description,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          jobModeId: id,
          job_mode_name: values.name.trim(),
          job_mode_description: values.description,
        }).unwrap()
      }
      onDelete={(item) => remove(item.id).unwrap()}
    />
  );
};

export default TenantJobModesTab;
