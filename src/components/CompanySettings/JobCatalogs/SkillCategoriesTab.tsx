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

/** Platform-wide skill-category catalogue. Blocked from deletion while a skill still references it. */
const SkillCategoriesTab: React.FC = () => {
  const { data, isLoading } = useListPlatformSkillCategoriesQuery();
  const [create] = useCreatePlatformSkillCategoryMutation();
  const [update] = useUpdatePlatformSkillCategoryMutation();
  const [remove] = useDeletePlatformSkillCategoryMutation();

  return (
    <PlatformCatalogTab<PlatformSkillCategory, FormValues>
      title="Platform-wide skill-category catalog."
      itemNounSingular="Skill category"
      itemNounPlural="Skill categories"
      items={data}
      isLoading={isLoading}
      idOf={(item) => item.category_id}
      labelOf={(item) => item.skill_category}
      columns={[
        { title: 'Name', dataIndex: 'skill_category', key: 'skill_category' },
        {
          title: 'Description',
          key: 'category_description',
          render: (_, item) => item.category_description || '-',
        },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({
        name: item.skill_category,
        description: item.category_description || '',
      })}
      onCreate={(values) =>
        create({
          skill_category: values.name.trim(),
          category_description: values.description.trim() || undefined,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          categoryId: id,
          skill_category: values.name.trim(),
          category_description: values.description.trim() || undefined,
        }).unwrap()
      }
      onDelete={(item) => remove(item.category_id).unwrap()}
      deleteConfirmTitle={(item) =>
        `Remove "${item.skill_category}"? Blocked while a skill still references it.`
      }
    />
  );
};

export default SkillCategoriesTab;
