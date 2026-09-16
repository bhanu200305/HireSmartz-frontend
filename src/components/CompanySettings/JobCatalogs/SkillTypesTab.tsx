import React from 'react';
import {
  useListPlatformSkillTypesQuery,
  useCreatePlatformSkillTypeMutation,
  useUpdatePlatformSkillTypeMutation,
  useDeletePlatformSkillTypeMutation,
  PlatformSkillType,
} from '../../../api/job-service/Platform/masterSkillTypes';
import PlatformCatalogTab from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

type FormValues = { name: string };
const emptyForm: FormValues = { name: '' };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
];

/** Platform-wide skill-type catalogue (e.g. "Technical", "Soft Skill"). Blocked from deletion while still referenced. */
const SkillTypesTab: React.FC = () => {
  const { data, isLoading } = useListPlatformSkillTypesQuery();
  const [create] = useCreatePlatformSkillTypeMutation();
  const [update] = useUpdatePlatformSkillTypeMutation();
  const [remove] = useDeletePlatformSkillTypeMutation();

  return (
    <PlatformCatalogTab<PlatformSkillType, FormValues>
      title="Platform-wide skill-type catalog."
      itemNounSingular="Skill type"
      itemNounPlural="Skill types"
      items={data}
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
