import React, { useState } from 'react';
import { Badge } from '../../shared';
import {
  useSearchPlatformSkillsQuery,
  useCreatePlatformSkillMutation,
  useUpdatePlatformSkillMutation,
  useDeletePlatformSkillMutation,
  useActivatePlatformSkillMutation,
  useDeactivatePlatformSkillMutation,
  PlatformSkill,
} from '../../../api/job-service/Platform/masterSkills';
import { useListPlatformSkillCategoriesQuery } from '../../../api/job-service/Platform/masterSkillCategories';
import PlatformCatalogTab, { type CatalogServerQuery } from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

type FormValues = { name: string; description: string; skill_category_id: string | null };
const emptyForm: FormValues = { name: '', description: '', skill_category_id: null };

/** Platform-wide skill catalogue. Org-added skills show read-only, flagged via
 * is_organization_specific. Blocked from deletion while still referenced. */
const SkillsTab: React.FC = () => {
  const [query, setQuery] = useState<CatalogServerQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    sortBy: 'name',
    sortDir: 'asc',
  });
  const { data, isLoading } = useSearchPlatformSkillsQuery({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
    includeInactive: true,
  });
  const { data: categories = [] } = useListPlatformSkillCategoriesQuery();
  const [create] = useCreatePlatformSkillMutation();
  const [update] = useUpdatePlatformSkillMutation();
  const [remove] = useDeletePlatformSkillMutation();
  const [activate] = useActivatePlatformSkillMutation();
  const [deactivate] = useDeactivatePlatformSkillMutation();

  const categoryName = (id: string | null) =>
    categories.find((c) => c.category_id === id)?.skill_category || '-';

  const fields: CatalogField<FormValues>[] = [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'description', label: 'Description (optional)', type: 'textarea' },
    {
      name: 'skill_category_id',
      label: 'Category (optional)',
      type: 'select',
      options: categories.map((c) => ({ label: c.skill_category, value: c.category_id })),
    },
  ];

  return (
    <PlatformCatalogTab<PlatformSkill, FormValues>
      title="Platform-wide skill catalog."
      itemNounSingular="Skill"
      itemNounPlural="Skills"
      items={data?.items}
      total={data?.total}
      serverQuery={query}
      onServerQueryChange={setQuery}
      isLoading={isLoading}
      idOf={(item) => item.skill_id}
      labelOf={(item) => item.skill}
      columns={[
        {
          title: 'Name',
          key: 'skill',
          render: (_, item) => (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{item.skill}</span>
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
        {
          title: 'Description',
          key: 'skill_description',
          render: (_, item) => item.skill_description || '-',
        },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({
        name: item.skill,
        description: item.skill_description || '',
        skill_category_id: item.skill_category_id,
      })}
      onCreate={(values) =>
        create({
          skill: values.name.trim(),
          skill_description: values.description.trim() || undefined,
          skill_category_id: values.skill_category_id,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          skillId: id,
          skill: values.name.trim(),
          skill_description: values.description.trim() || undefined,
          skill_category_id: values.skill_category_id,
        }).unwrap()
      }
      onDelete={(item) => remove(item.skill_id).unwrap()}
      deleteConfirmTitle={(item) =>
        `Remove "${item.skill}"? Blocked while a job or the title-suggestion cache still references it.`
      }
      onToggleActive={(item, next) =>
        next ? activate(item.skill_id).unwrap() : deactivate(item.skill_id).unwrap()
      }
    />
  );
};

export default SkillsTab;
