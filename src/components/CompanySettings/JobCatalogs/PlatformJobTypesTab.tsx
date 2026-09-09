import React from 'react';
import {
  useListJobTypesQuery,
  useCreateJobTypeMutation,
  useUpdateJobTypeMutation,
  useDeleteJobTypeMutation,
} from '../../../api/job-service/JobOpening/catalogs';
import type { OrganizationJobType } from '../../../api/job-service/types';
import PlatformCatalogTab from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

type FormValues = { name: string; description: string };
const emptyForm: FormValues = { name: '', description: '' };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description (optional)', type: 'textarea' },
];

/** Platform-wide job-type catalogue, using the same isMaster-branched hooks as the Job Details wizard's Job Type dropdown. */
const PlatformJobTypesTab: React.FC = () => {
  const { data, isLoading } = useListJobTypesQuery({ isMaster: true });
  const [create] = useCreateJobTypeMutation();
  const [update] = useUpdateJobTypeMutation();
  const [remove] = useDeleteJobTypeMutation();

  return (
    <PlatformCatalogTab<OrganizationJobType, FormValues>
      title="Platform-wide job-type catalogue."
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
          isMaster: true,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          jobTypeId: id,
          job_type_name: values.name.trim(),
          job_type_description: values.description.trim() || undefined,
          isMaster: true,
        }).unwrap()
      }
      onDelete={(item) => remove({ jobTypeId: item.id, isMaster: true }).unwrap()}
    />
  );
};

export default PlatformJobTypesTab;
