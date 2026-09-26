import React, { useState } from 'react';
import {
  useSearchPlatformSkillTypesQuery,
  useCreatePlatformSkillTypeMutation,
  useUpdatePlatformSkillTypeMutation,
  useDeletePlatformSkillTypeMutation,
  PlatformSkillType,
} from '../../../api/job-service/Platform/masterSkillTypes';
import PlatformCatalogTab, { type CatalogServerQuery } from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

type FormValues = { name: string };
const emptyForm: FormValues = { name: '' };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
];

/** Platform-wide skill-type catalogue (e.g. "Technical", "Soft Skill"). Blocked from deletion while still referenced. */
const SkillTypesTab: React.FC = () => {
  const [query, setQuery] = useState<CatalogServerQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    sortBy: 'name',
    sortDir: 'asc',
  });
  const { data, isLoading } = useSearchPlatformSkillTypesQuery({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
  });
  const [create] = useCreatePlatformSkillTypeMutation();
  const [update] = useUpdatePlatformSkillTypeMutation();
  const [remove] = useDeletePlatformSkillTypeMutation();

  return (
    <PlatformCatalogTab<PlatformSkillType, FormValues>
      title="Platform-wide skill-type catalog."
      itemNounSingular="Skill type"
      itemNounPlural="Skill types"
      items={data?.items}
      total={data?.total}
      serverQuery={query}
      onServerQueryChange={setQuery}
      isLoading={isLoading}
      idOf={(item) => item.skill_type_id}
      labelOf={(item) => item.skill_type}
      columns={[{ title: 'Name', dataIndex: 'skill_type', key: 'skill_type' }]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({ name: item.skill_type })}
      onCreate={(values) => create({ skill_type: values.name.trim() }).unwrap()}
      onUpdate={(id, values) =>
        update({ skillTypeId: id, skill_type: values.name.trim() }).unwrap()
      }
      onDelete={(item) => remove(item.skill_type_id).unwrap()}
      deleteConfirmTitle={(item) =>
        `Remove "${item.skill_type}"? Blocked while a job's skill selection or the title-suggestion cache still references it.`
      }
    />
  );
};

export default SkillTypesTab;
