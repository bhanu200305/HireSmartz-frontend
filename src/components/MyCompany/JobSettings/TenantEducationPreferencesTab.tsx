import React, { useState } from 'react';
import {
  useSearchEducationPreferencesQuery,
  useCreateEducationPreferenceMutation,
  useUpdateEducationPreferenceMutation,
  useDeleteEducationPreferenceMutation,
  useActivateEducationPreferenceMutation,
  useDeactivateEducationPreferenceMutation,
  OrganizationEducationPreference,
} from '../../../api/job-service/JobOpening/educationPreferences';
import PlatformCatalogTab, {
  type CatalogServerQuery,
} from '../../CompanySettings/JobCatalogs/PlatformCatalogTab';
import type { CatalogField } from '../../CompanySettings/JobCatalogs/CatalogFormFields';
import useHasAccess from '../../../hooks/useHasAccess';
import { Authorities } from '../../../constants/authorities.constant';

type FormValues = { name: string; description: string | null };
const emptyForm: FormValues = { name: '', description: null };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
];

/** This organization's own configured education-preference catalogue. */
const TenantEducationPreferencesTab: React.FC = () => {
  const [query, setQuery] = useState<CatalogServerQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    sortBy: 'name',
    sortDir: 'asc',
  });
  const { data, isLoading } = useSearchEducationPreferencesQuery({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
  });
  const [create] = useCreateEducationPreferenceMutation();
  const [update] = useUpdateEducationPreferenceMutation();
  const [remove] = useDeleteEducationPreferenceMutation();
  const [activate] = useActivateEducationPreferenceMutation();
  const [deactivate] = useDeactivateEducationPreferenceMutation();
  // Both hooks must run unconditionally on every render — `||` short-circuits
  // the second call once the first is true, which varies the hook count
  // between renders and violates React's rules of hooks.
  const canManageCompanySettings = useHasAccess(Authorities.COMPANY_SETTINGS_EDIT);
  const canManageJobCatalog = useHasAccess(Authorities.JOB_CATALOG_EDIT);
  const canManage = canManageCompanySettings || canManageJobCatalog;
  // JOB_CATALOG_DELETE = admin: edit or delete any row. Without it, a
  // caller may only add new rows, never edit or delete existing ones.
  const canManageAny = useHasAccess(Authorities.JOB_CATALOG_DELETE) || canManageCompanySettings;

  return (
    <PlatformCatalogTab<OrganizationEducationPreference, FormValues>
      title="Your company's configured education preferences."
      itemNounSingular="Education preference"
      itemNounPlural="Education preferences"
      items={data?.items}
      total={data?.total}
      serverQuery={query}
      onServerQueryChange={setQuery}
      allowCreate={canManage}
      allowEdit={canManageAny}
      canEditRow={() => canManageAny}
      canDeleteRow={() => canManageAny}
      isLoading={isLoading}
      idOf={(item) => item.id}
      labelOf={(item) => item.education_preference_name}
      columns={[
        { title: 'Name', dataIndex: 'education_preference_name', key: 'education_preference_name' },
        {
          title: 'Description',
          dataIndex: 'education_preference_description',
          key: 'education_preference_description',
        },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({
        name: item.education_preference_name,
        description: item.education_preference_description ?? null,
      })}
      onCreate={(values) =>
        create({
          education_preference_name: values.name.trim(),
          education_preference_description: values.description,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          preferenceId: id,
          education_preference_name: values.name.trim(),
          education_preference_description: values.description,
        }).unwrap()
      }
      onDelete={canManageAny ? (item) => remove(item.id).unwrap() : undefined}
      onToggleActive={
        canManageAny
          ? (item, next) => (next ? activate(item.id).unwrap() : deactivate(item.id).unwrap())
          : undefined
      }
    />
  );
};

export default TenantEducationPreferencesTab;
