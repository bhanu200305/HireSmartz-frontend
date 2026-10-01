import React from 'react';
import { useGetMasterSkillCategoriesQuery } from '../../../api/job-service/Master/master';
import PlatformCatalogTab from '../../CompanySettings/JobCatalogs/PlatformCatalogTab';
import type { CatalogField } from '../../CompanySettings/JobCatalogs/CatalogFormFields';

type FormValues = { name: string; description: string };

/** Platform-wide skill-category catalogue, view-only here - one shared
 * table across every tenant, so editing stays Super Admin-only. */
const TenantSkillCategoriesTab: React.FC = () => {
  const { data, isLoading } = useGetMasterSkillCategoriesQuery();

  return (
    <PlatformCatalogTab<
      { category_id: string; skill_category: string; category_description: string | null },
      FormValues
    >
      title="Platform-wide skill-category catalog."
      itemNounSingular="Skill category"
      itemNounPlural="Skill categories"
      items={data?.categories}
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
      fields={[] as CatalogField<FormValues>[]}
      emptyForm={{ name: '', description: '' }}
      toFormValues={() => ({ name: '', description: '' })}
      onCreate={() => Promise.resolve()}
      onUpdate={() => Promise.resolve()}
      allowCreate={false}
      allowEdit={false}
    />
  );
};

export default TenantSkillCategoriesTab;
