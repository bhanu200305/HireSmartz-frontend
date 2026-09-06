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

/** GET/POST/PUT/DELETE /platform/master-job-types — reuses catalogs.ts's
 * isMaster-branched hooks (the same client the Job Details wizard's Job
 * Type dropdown reads/writes through for a platform caller) rather than a
 * separate client, since it's the identical list either screen shows. */
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
          isMaster: true,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          jobTypeId: id,
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          isMaster: true,
        }).unwrap()
      }
      onDelete={(item) => remove({ jobTypeId: item.id, isMaster: true }).unwrap()}
    />
  );
};

export default PlatformJobTypesTab;
