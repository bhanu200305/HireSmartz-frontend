import React from 'react';
import {
  useListEducationPreferencesQuery,
  useCreateEducationPreferenceMutation,
  useUpdateEducationPreferenceMutation,
  useDeleteEducationPreferenceMutation,
  OrganizationEducationPreference,
} from '../../../api/job-service/JobOpening/educationPreferences';
import PlatformCatalogTab from '../../CompanySettings/JobCatalogs/PlatformCatalogTab';
import type { CatalogField } from '../../CompanySettings/JobCatalogs/CatalogFormFields';

type FormValues = { name: string };
const emptyForm: FormValues = { name: '' };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
];

/** GET/POST/PUT/DELETE /education-preferences — this organization's own
 * configured education-preference catalogue. What a job's Education
 * Preference field on Job Details picks from. */
const TenantEducationPreferencesTab: React.FC = () => {
  const { data, isLoading } = useListEducationPreferencesQuery();
  const [create] = useCreateEducationPreferenceMutation();
  const [update] = useUpdateEducationPreferenceMutation();
  const [remove] = useDeleteEducationPreferenceMutation();

  return (
    <PlatformCatalogTab<OrganizationEducationPreference, FormValues>
      title="Your company's configured education preferences."
      itemNounSingular="Education preference"
      itemNounPlural="Education preferences"
      items={data}
      isLoading={isLoading}
      idOf={(item) => item.id}
      labelOf={(item) => item.name}
      columns={[{ title: 'Name', dataIndex: 'name', key: 'name' }]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({ name: item.name })}
      onCreate={(values) => create({ name: values.name.trim() }).unwrap()}
      onUpdate={(id, values) => update({ preferenceId: id, name: values.name.trim() }).unwrap()}
      onDelete={(item) => remove(item.id).unwrap()}
    />
  );
};

export default TenantEducationPreferencesTab;
