import React from 'react';
import {
  useListJobModesQuery,
  useCreateJobModeMutation,
  useUpdateJobModeMutation,
  useDeleteJobModeMutation,
} from '../../../api/job-service/JobOpening/catalogs';
import type { OrganizationJobMode } from '../../../api/job-service/types';
import PlatformCatalogTab from '../../CompanySettings/JobCatalogs/PlatformCatalogTab';
import type { CatalogField } from '../../CompanySettings/JobCatalogs/CatalogFormFields';

type FormValues = { name: string; description: string | null };
const emptyForm: FormValues = { name: '', description: null };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
];

/** This organization's own configured job modes. */
const TenantJobModesTab: React.FC = () => {
  const { data, isLoading } = useListJobModesQuery();
  const [create] = useCreateJobModeMutation();
  const [update] = useUpdateJobModeMutation();
  const [remove] = useDeleteJobModeMutation();

  return (
    <PlatformCatalogTab<OrganizationJobMode, FormValues>
      title="Your company's configured job modes."
      itemNounSingular="Job mode"
      itemNounPlural="Job modes"
      items={data?.map((item) => ({
        id: item.job_mode_id,
        job_mode_name: item.job_mode_name,
        job_mode_description: item.job_mode_description,
      }))}
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
