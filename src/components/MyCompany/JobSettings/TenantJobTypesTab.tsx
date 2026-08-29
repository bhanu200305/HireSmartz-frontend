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

/** GET/POST/PUT/DELETE /job-types — this organization's own configured job
 * types (what the Job Details wizard's Job Type dropdown offers a tenant
 * caller — see catalogs.ts's isMaster branch). Reuses the same
 * PlatformCatalogTab shell as Company Settings → Job Catalogs, just against
 * the tenant-scoped endpoint (isMaster: false) instead of the platform one. */
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
      labelOf={(item) => item.name}
      columns={[
        { title: 'Name', dataIndex: 'name', key: 'name' },
        { title: 'Description', key: 'description', render: (_, item) => item.description || '—' },
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
          jobTypeId: id,
          name: values.name.trim(),
          description: values.description.trim() || undefined,
        }).unwrap()
      }
      onDelete={(item) => remove({ jobTypeId: item.id }).unwrap()}
    />
  );
};

export default TenantJobTypesTab;
