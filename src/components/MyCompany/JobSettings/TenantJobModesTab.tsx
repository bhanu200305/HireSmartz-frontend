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

/** Manages this organization's own configured job modes, offered by the Job
 * Details wizard's Job Mode dropdown. */
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
        name: item.name,
        description: item.description,
      }))}
      isLoading={isLoading}
      idOf={(item) => item.id}
      labelOf={(item) => item.name}
      columns={[
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Description', dataIndex: 'description', key: 'description' },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({ name: item.name, description: item.description ?? null })}
      onCreate={(values) =>
        create({ name: values.name.trim(), description: values.description }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          jobModeId: id,
          name: values.name.trim(),
          description: values.description,
        }).unwrap()
      }
      onDelete={(item) => remove(item.id).unwrap()}
    />
  );
};

export default TenantJobModesTab;
