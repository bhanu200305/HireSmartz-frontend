import React from 'react';
import {
  useListPlatformSkillCategoriesQuery,
  useCreatePlatformSkillCategoryMutation,
  useUpdatePlatformSkillCategoryMutation,
  useDeletePlatformSkillCategoryMutation,
  PlatformSkillCategory,
} from '../../../api/job-service/Platform/masterSkillCategories';
import PlatformCatalogTab from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

type FormValues = { name: string; description: string };
const emptyForm: FormValues = { name: '', description: '' };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description (optional)', type: 'textarea' },
];

/** GET/POST/PUT/DELETE /platform/master-skill-categories — what a skill's
 * `skill_category_id` references. Blocked from deletion while a skill
 * still references it. */
const SkillCategoriesTab: React.FC = () => {
  const { data, isLoading } = useListPlatformSkillCategoriesQuery();
  const [create] = useCreatePlatformSkillCategoryMutation();
  const [update] = useUpdatePlatformSkillCategoryMutation();
  const [remove] = useDeletePlatformSkillCategoryMutation();

  return (
    <PlatformCatalogTab<PlatformSkillCategory, FormValues>
      title="Platform-wide skill-category catalogue."
      itemNounSingular="Skill category"
      itemNounPlural="Skill categories"
      items={data}
      isLoading={isLoading}
      idOf={(item) => item.category_id}
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
          categoryId: id,
          name: values.name.trim(),
          description: values.description.trim() || undefined,
        }).unwrap()
      }
      onDelete={(item) => remove(item.category_id).unwrap()}
      deleteConfirmTitle={(item) =>
        `Remove "${item.name}"? Blocked while a skill still references it.`
      }
    />
  );
};

export default SkillCategoriesTab;
