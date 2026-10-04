import React, { useState } from 'react';
import {
  useSearchOrganizationJobModesQuery,
  useCreateJobModeMutation,
  useUpdateJobModeMutation,
  useDeleteJobModeMutation,
  useActivateJobModeMutation,
  useDeactivateJobModeMutation,
} from '../../../api/job-service/JobOpening/catalogs';
import type { OrganizationJobMode } from '../../../api/job-service/types';
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

/** This organization's own configured job locations. */
const TenantJobModesTab: React.FC = () => {
  const [query, setQuery] = useState<CatalogServerQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    sortBy: 'name',
    sortDir: 'asc',
  });
  const { data, isLoading } = useSearchOrganizationJobModesQuery({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
  });
  const [create] = useCreateJobModeMutation();
  const [update] = useUpdateJobModeMutation();
  const [remove] = useDeleteJobModeMutation();
  const [activate] = useActivateJobModeMutation();
  const [deactivate] = useDeactivateJobModeMutation();
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
    <PlatformCatalogTab<OrganizationJobMode, FormValues>
      title="Your company's configured job locations."
      itemNounSingular="Job location"
      itemNounPlural="Job locations"
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
      labelOf={(item) => item.job_mode_name}
      columns={[
        { title: 'Name', dataIndex: 'job_mode_name', key: 'job_mode_name' },
        { title: 'Description', dataIndex: 'job_mode_description', key: 'job_mode_description' },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({
        name: item.job_mode_name,
        description: item.job_mode_description ?? null,
      })}
      onCreate={(values) =>
        create({
          job_mode_name: values.name.trim(),
          job_mode_description: values.description,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          jobModeId: id,
          job_mode_name: values.name.trim(),
          job_mode_description: values.description,
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

export default TenantJobModesTab;
