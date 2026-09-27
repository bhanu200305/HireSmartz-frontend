import React, { useState } from 'react';
import {
  useSearchJobTypesQuery,
  useCreateJobTypeMutation,
  useUpdateJobTypeMutation,
  useDeleteJobTypeMutation,
} from '../../../api/job-service/JobOpening/catalogs';
import type { OrganizationJobType } from '../../../api/job-service/types';
import PlatformCatalogTab, {
  type CatalogServerQuery,
} from '../../CompanySettings/JobCatalogs/PlatformCatalogTab';
import type { CatalogField } from '../../CompanySettings/JobCatalogs/CatalogFormFields';
import useHasAccess from '../../../hooks/useHasAccess';
import { Authorities } from '../../../constants/authorities.constant';

type FormValues = { name: string; description: string };
const emptyForm: FormValues = { name: '', description: '' };
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'description', label: 'Description (optional)', type: 'textarea' },
];

/** This organization's own configured job types. */
const TenantJobTypesTab: React.FC = () => {
  const [query, setQuery] = useState<CatalogServerQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    sortBy: 'name',
    sortDir: 'asc',
  });
  const { data, isLoading } = useSearchJobTypesQuery({
    isMaster: false,
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
  });
  const [create] = useCreateJobTypeMutation();
  const [update] = useUpdateJobTypeMutation();
  const [remove] = useDeleteJobTypeMutation();
  // Both hooks must run unconditionally on every render — `||` short-circuits
  // the second call once the first is true, which varies the hook count
  // between renders and violates React's rules of hooks.
  const canManageCompanySettings = useHasAccess(Authorities.COMPANY_SETTINGS_EDIT);
  const canManageJobCatalog = useHasAccess(Authorities.JOB_CATALOG_EDIT);
  const canManage = canManageCompanySettings || canManageJobCatalog;

  return (
    <PlatformCatalogTab<OrganizationJobType, FormValues>
      title="Your company's configured job types."
      itemNounSingular="Job type"
      itemNounPlural="Job types"
      items={data?.items}
      total={data?.total}
      serverQuery={query}
      onServerQueryChange={setQuery}
      allowCreate={canManage}
      allowEdit={canManage}
      isLoading={isLoading}
      idOf={(item) => item.id}
      labelOf={(item) => item.job_type_name}
      columns={[
        { title: 'Name', dataIndex: 'job_type_name', key: 'job_type_name' },
        {
          title: 'Description',
          key: 'job_type_description',
          render: (_, item) => item.job_type_description || '-',
        },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({
        name: item.job_type_name,
        description: item.job_type_description || '',
      })}
      onCreate={(values) =>
        create({
          job_type_name: values.name.trim(),
          job_type_description: values.description.trim() || undefined,
          isMaster: false,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          jobTypeId: id,
          job_type_name: values.name.trim(),
          job_type_description: values.description.trim() || undefined,
          isMaster: false,
        }).unwrap()
      }
      onDelete={
        canManage ? (item) => remove({ jobTypeId: item.id, isMaster: false }).unwrap() : undefined
      }
    />
  );
};

export default TenantJobTypesTab;
