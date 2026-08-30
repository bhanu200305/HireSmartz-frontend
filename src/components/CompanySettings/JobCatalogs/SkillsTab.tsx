import React from 'react';
import { Badge } from '../../shared';
import {
  useListPlatformSkillsQuery,
  useCreatePlatformSkillMutation,
  useUpdatePlatformSkillMutation,
  useDeletePlatformSkillMutation,
  PlatformSkill,
} from '../../../api/job-service/Platform/masterSkills';
import { useListPlatformSkillCategoriesQuery } from '../../../api/job-service/Platform/masterSkillCategories';
import PlatformCatalogTab from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

type FormValues = { name: string; description: string; skill_category_id: string | null };
const emptyForm: FormValues = { name: '', description: '', skill_category_id: null };

/** GET/POST/PUT/DELETE /platform/master-skills — the platform-wide skill
 * catalogue. Rows a company added themselves (POST /skills) show up here
 * read-only, flagged via is_organization_specific — Super Admin edits the
 * shared catalogue, not a tenant's own additions. Blocked from deletion
 * while a job or the title-suggestion cache still references it. */
const SkillsTab: React.FC = () => {
  const { data, isLoading } = useListPlatformSkillsQuery();
  const { data: categories = [] } = useListPlatformSkillCategoriesQuery();
  const [create] = useCreatePlatformSkillMutation();
  const [update] = useUpdatePlatformSkillMutation();
  const [remove] = useDeletePlatformSkillMutation();

  const categoryName = (id: string | null) =>
    categories.find((c) => c.category_id === id)?.name || '—';

  const fields: CatalogField<FormValues>[] = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'description', label: 'Description (optional)', type: 'textarea' },
    {
      name: 'skill_category_id',
      label: 'Category (optional)',
      type: 'select',
      options: categories.map((c) => ({ label: c.name, value: c.category_id })),
    },
  ];

  return (
    <PlatformCatalogTab<PlatformSkill, FormValues>
      title="Platform-wide skill catalogue."
      itemNounSingular="Skill"
      itemNounPlural="Skills"
      items={data}
      isLoading={isLoading}
      idOf={(item) => item.skill_id}
      labelOf={(item) => item.name}
      columns={[
        {
          title: 'Name',
          key: 'name',
          render: (_, item) => (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{item.name}</span>
              {item.is_organization_specific && (
                <Badge status="info" dot={false}>
                  Org-added
                </Badge>
              )}
            </div>
          ),
        },
        {
          title: 'Category',
          key: 'category',
          render: (_, item) => categoryName(item.skill_category_id),
        },
        { title: 'Description', key: 'description', render: (_, item) => item.description || '—' },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({
        name: item.name,
        description: item.description || '',
        skill_category_id: item.skill_category_id,
      })}
      onCreate={(values) =>
        create({
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          skill_category_id: values.skill_category_id,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          skillId: id,
          name: values.name.trim(),
          description: values.description.trim() || undefined,
          skill_category_id: values.skill_category_id,
        }).unwrap()
      }
      onDelete={(item) => remove(item.skill_id).unwrap()}
      deleteConfirmTitle={(item) =>
        `Remove "${item.name}"? Blocked while a job or the title-suggestion cache still references it.`
      }
    />
  );
};

export default SkillsTab;
