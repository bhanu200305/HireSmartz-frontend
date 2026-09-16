import React from 'react';
import {
  useListJobTypesQuery,
  useCreateJobTypeMutation,
  useUpdateJobTypeMutation,
  useDeleteJobTypeMutation,
} from '../../../api/job-service/JobOpening/catalogs';
import type { OrganizationJobType } from '../../../api/job-service/types';
import PlatformCatalogTab from '../../CompanySettings/JobCatalogs/PlatformCatalogTab';
import type { CatalogField } from '../../CompanySettings/JobCatalogs/CatalogFormFields';

type FormValues = { name: string; description: string };
const emptyForm: FormValues = { name: '', description: '' };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description (optional)', type: 'textarea' },
];

/** This organization's own configured job types. */
const TenantJobTypesTab: React.FC = () => {
  const { data, isLoading } = useListJobTypesQuery({ isMaster: false });
  const [create] = useCreateJobTypeMutation();
  const [update] = useUpdateJobTypeMutation();
  const [remove] = useDeleteJobTypeMutation();

  return (
    <PlatformCatalogTab<OrganizationJobType, FormValues>
      title="Your company's configured job types."
      itemNounSingular="Job type"
      itemNounPlural="Job types"
      items={data}
      isLoading={isLoading}
      idOf={(item) => item.id}
      labelOf={(item) => item.job_type_name}
      columns={[
        { title: 'Name', dataIndex: 'job_type_name', key: 'job_type_name' },
        {
          title: 'Description',
          key: 'job_type_description',
          render: (_, item) => item.job_type_description || '-',
        },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({
        name: item.job_type_name,
        description: item.job_type_description || '',
      })}
      onCreate={(values) =>
        create({
          job_type_name: values.name.trim(),
          job_type_description: values.description.trim() || undefined,
          isMaster: false,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          jobTypeId: id,
          job_type_name: values.name.trim(),
          job_type_description: values.description.trim() || undefined,
          isMaster: false,
        }).unwrap()
      }
      onDelete={(item) => remove({ jobTypeId: item.id, isMaster: false }).unwrap()}
    />
  );
};

export default TenantJobTypesTab;
