import React from 'react';
import {
  useListPlatformEducationPreferencesQuery,
  useCreatePlatformEducationPreferenceMutation,
  useUpdatePlatformEducationPreferenceMutation,
  useDeletePlatformEducationPreferenceMutation,
  PlatformEducationPreference,
} from '../../../api/job-service/Platform/masterEducationPreferences';
import PlatformCatalogTab from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

type FormValues = { name: string; description: string };
const emptyForm: FormValues = { name: '', description: '' };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description (optional)', type: 'textarea' },
];

/** Platform-wide education-preference catalogue (e.g. Bachelor's Degree, Master's Degree). */
const EducationPreferencesTab: React.FC = () => {
  const { data, isLoading } = useListPlatformEducationPreferencesQuery();
  const [create] = useCreatePlatformEducationPreferenceMutation();
  const [update] = useUpdatePlatformEducationPreferenceMutation();
  const [remove] = useDeletePlatformEducationPreferenceMutation();

  return (
    <PlatformCatalogTab<PlatformEducationPreference, FormValues>
      title="Platform-wide education-preference catalogue."
      itemNounSingular="Education preference"
      itemNounPlural="Education preferences"
      items={data}
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
    />
  );
};

export default EducationPreferencesTab;
