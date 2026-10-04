import React, { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Badge } from '../../shared';
import {
  useListActiveSkillsQuery,
  useCreateOrganizationSkillMutation,
  useUpdateOrganizationSkillMutation,
  useDeleteOrganizationSkillMutation,
  useActivateOrganizationSkillMutation,
  useDeactivateOrganizationSkillMutation,
} from '../../../api/job-service/JobOpening/catalogs';
import type { SkillCatalogEntry } from '../../../api/job-service/types';
import PlatformCatalogTab from '../../CompanySettings/JobCatalogs/PlatformCatalogTab';
import type { CatalogField } from '../../CompanySettings/JobCatalogs/CatalogFormFields';
import useHasAccess from '../../../hooks/useHasAccess';
import { Authorities } from '../../../constants/authorities.constant';

type FormValues = { name: string; description: string };
const emptyForm: FormValues = { name: '', description: '' };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description (optional)', type: 'textarea' },
];

/** This organization's own skill catalogue. Platform-wide skills show too,
 * but only the org's own are editable/removable - `is_organization_specific` gates both. */
const TenantSkillsTab: React.FC = () => {
  const { data: skillsData = [], isFetching } = useListActiveSkillsQuery({
    includeInactive: true,
  });
  const [orgOnly, setOrgOnly] = useState(false);
  // Org-added skills first; `orgOnly` narrows to just those.
  const skills = useMemo(() => {
    const sorted = [...skillsData].sort(
      (a, b) => Number(b.is_organization_specific) - Number(a.is_organization_specific)
    );
    return orgOnly ? sorted.filter((s) => s.is_organization_specific) : sorted;
  }, [skillsData, orgOnly]);
  const [create] = useCreateOrganizationSkillMutation();
  const [update] = useUpdateOrganizationSkillMutation();
  const [remove] = useDeleteOrganizationSkillMutation();
  const [activate] = useActivateOrganizationSkillMutation();
  const [deactivate] = useDeactivateOrganizationSkillMutation();
  // Two separate `useHasAccess` calls, not `a || b` inline — see
  // TenantClosureReasonsTab's identical fix for why the short-circuit
  // version is a real rules-of-hooks violation, not just a lint nag.
  const canManageSettings = useHasAccess(Authorities.COMPANY_SETTINGS_EDIT);
  const canManageCatalog = useHasAccess(Authorities.SKILL_WRITE);
  const canManage = canManageSettings || canManageCatalog;
  // Holding SKILL_DELETE (Company Admin/cfp_admin) means "delete and edit
  // any" - SKILL_WRITE alone (e.g. Hiring Manager) only lets a caller add
  // new skills, never edit existing ones.
  const canManageAny = useHasAccess(Authorities.SKILL_DELETE) || canManageSettings;

  const filterToggle = (
    <div className="inline-flex h-11 shrink-0 items-center rounded-full border border-neutral-200 bg-neutral-50 p-1">
      <button
        type="button"
        onClick={() => setOrgOnly(false)}
        className={clsx(
          'whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-colors cursor-pointer focus:outline-none',
          !orgOnly ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-500'
        )}
      >
        All
      </button>
      <button
        type="button"
        onClick={() => setOrgOnly(true)}
        className={clsx(
          'whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-colors cursor-pointer focus:outline-none',
          orgOnly ? 'bg-white text-primary-600 shadow-sm' : 'text-neutral-500'
        )}
      >
        Ours
      </button>
    </div>
  );

  return (
    <PlatformCatalogTab<SkillCatalogEntry, FormValues>
      headerExtra={filterToggle}
      title="Your company's skill catalogue - platform-wide skills plus your own additions."
      itemNounSingular="Skill"
      itemNounPlural="Skills"
      items={skills}
      isLoading={isFetching}
      idOf={(item) => item.skill_id}
      labelOf={(item) => item.skill_label}
      searchPredicate={(item, query) =>
        item.skill_label.toLowerCase().includes(query.toLowerCase())
      }
      allowCreate={canManage}
      allowEdit={canManageAny}
      canEditRow={(item) => Boolean(item.is_organization_specific) && canManageAny}
      canDeleteRow={(item) => Boolean(item.is_organization_specific) && canManageAny}
      canToggleRow={(item) => Boolean(item.is_organization_specific) && canManageAny}
      columns={[
        {
          title: 'Name',
          key: 'skill_label',
          render: (_, item) => (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{item.skill_label}</span>
              {item.is_organization_specific && (
                <Badge status="info" dot={false}>
                  Org-added
                </Badge>
              )}
            </div>
          ),
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
        name: item.skill_label,
        description: item.skill_description || '',
      })}
      onCreate={(values) =>
        create({
          skill: values.name.trim(),
          skill_description: values.description.trim() || null,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          skillId: id,
          skill: values.name.trim(),
          skill_description: values.description.trim() || null,
        }).unwrap()
      }
      onDelete={canManageAny ? (item) => remove({ skillId: item.skill_id }).unwrap() : undefined}
      onToggleActive={
        canManageAny
          ? (item, next) =>
              next
                ? activate({ skillId: item.skill_id }).unwrap()
                : deactivate({ skillId: item.skill_id }).unwrap()
          : undefined
      }
      deleteConfirmTitle={(item) =>
        `Remove "${item.skill_label}"? Blocked while a job still selects it.`
      }
    />
  );
};

export default TenantSkillsTab;
