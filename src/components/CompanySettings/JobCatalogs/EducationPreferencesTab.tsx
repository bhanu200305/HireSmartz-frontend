import React, { useState } from 'react';
import {
  useSearchPlatformEducationPreferencesQuery,
  useCreatePlatformEducationPreferenceMutation,
  useUpdatePlatformEducationPreferenceMutation,
  useDeletePlatformEducationPreferenceMutation,
  useActivatePlatformEducationPreferenceMutation,
  useDeactivatePlatformEducationPreferenceMutation,
  PlatformEducationPreference,
} from '../../../api/job-service/Platform/masterEducationPreferences';
import PlatformCatalogTab, { type CatalogServerQuery } from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

type FormValues = { name: string; description: string };
const emptyForm: FormValues = { name: '', description: '' };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description (optional)', type: 'textarea' },
];

/** Platform-wide education-preference catalogue (e.g. Bachelor's Degree, Master's Degree). */
const EducationPreferencesTab: React.FC = () => {
  const [query, setQuery] = useState<CatalogServerQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    sortBy: 'name',
    sortDir: 'asc',
  });
  const { data, isLoading } = useSearchPlatformEducationPreferencesQuery({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
    // A deleted row must not come back: the server returns soft-deleted rows only when
    // `include_inactive` is sent, and deactivated (switched-off) rows are listed anyway.
  });
  const [create] = useCreatePlatformEducationPreferenceMutation();
  const [update] = useUpdatePlatformEducationPreferenceMutation();
  const [remove] = useDeletePlatformEducationPreferenceMutation();
  const [activate] = useActivatePlatformEducationPreferenceMutation();
  const [deactivate] = useDeactivatePlatformEducationPreferenceMutation();

  return (
    <PlatformCatalogTab<PlatformEducationPreference, FormValues>
      title="Platform-wide education-preference catalog."
      itemNounSingular="Education preference"
      itemNounPlural="Education preferences"
      items={data?.items}
      total={data?.total}
      serverQuery={query}
      onServerQueryChange={setQuery}
      isLoading={isLoading}
      idOf={(item) => item.education_preference_id}
      labelOf={(item) => item.education_preference_name}
      columns={[
        {
          title: 'Name',
          dataIndex: 'education_preference_name',
          key: 'education_preference_name',
        },
        {
          title: 'Description',
          key: 'education_preference_description',
          render: (_, item) => item.education_preference_description || '-',
        },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({
        name: item.education_preference_name,
        description: item.education_preference_description || '',
      })}
      onCreate={(values) =>
        create({
          education_preference_name: values.name.trim(),
          education_preference_description: values.description.trim() || undefined,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          educationPreferenceId: id,
          education_preference_name: values.name.trim(),
          education_preference_description: values.description.trim() || undefined,
        }).unwrap()
      }
      onDelete={(item) => remove(item.education_preference_id).unwrap()}
      onToggleActive={(item, next) =>
        next
          ? activate(item.education_preference_id).unwrap()
          : deactivate(item.education_preference_id).unwrap()
      }
    />
  );
};

export default EducationPreferencesTab;
