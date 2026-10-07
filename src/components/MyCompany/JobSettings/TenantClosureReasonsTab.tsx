import React, { useState } from 'react';
import {
  useSearchOrganizationJobClosureReasonsQuery,
  useCreateClosureReasonMutation,
  useUpdateClosureReasonMutation,
  useDeleteClosureReasonMutation,
  useActivateClosureReasonMutation,
  useDeactivateClosureReasonMutation,
} from '../../../api/job-service/JobOpening/catalogs';
import type { OrganizationClosureReason } from '../../../api/job-service/types';
import PlatformCatalogTab, {
  type CatalogServerQuery,
} from '../../CompanySettings/JobCatalogs/PlatformCatalogTab';
import type { CatalogField } from '../../CompanySettings/JobCatalogs/CatalogFormFields';
import useHasAccess from '../../../hooks/useHasAccess';
import { Authorities } from '../../../constants/authorities.constant';

type FormValues = { reason: string; description: string | null };
const emptyForm: FormValues = { reason: '', description: null };
const fields: CatalogField<FormValues>[] = [
  { name: 'reason', label: 'Reason', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea' },
];

/** Manages this organization's own configured closure reasons, offered by
 * CloseJobModal. Unlike the Super Admin catalogue, these have no
 * `requires_input` flag — that's a platform-wide setting, not per-org. */
const TenantClosureReasonsTab: React.FC = () => {
  const [query, setQuery] = useState<CatalogServerQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    sortBy: 'name',
    sortDir: 'asc',
  });
  const { data, isLoading } = useSearchOrganizationJobClosureReasonsQuery({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
    includeInactive: true,
  });
  const [create] = useCreateClosureReasonMutation();
  const [update] = useUpdateClosureReasonMutation();
  const [remove] = useDeleteClosureReasonMutation();
  const [activate] = useActivateClosureReasonMutation();
  const [deactivate] = useDeactivateClosureReasonMutation();
  // Two separate `useHasAccess` calls, not `a || b` inline — the `||` would
  // short-circuit and skip the second hook call entirely whenever the first
  // is truthy, changing how many hooks render between renders (a real rules-
  // of-hooks violation, not just a lint nag: it can throw "Rendered fewer
  // hooks than expected" the moment permissions change between renders).
  const canManageSettings = useHasAccess(Authorities.COMPANY_SETTINGS_EDIT);
  const canManageCatalog = useHasAccess(Authorities.JOB_CATALOG_EDIT);
  const canManage = canManageSettings || canManageCatalog;
  // JOB_CATALOG_DELETE = admin: edit/delete/reactivate any row. Without it,
  // a caller may only add new rows, never edit or deactivate existing ones.
  const canManageAny = useHasAccess(Authorities.JOB_CATALOG_DELETE) || canManageSettings;

  return (
    <PlatformCatalogTab<OrganizationClosureReason, FormValues>
      title="Your company's configured closure reasons."
      itemNounSingular="Closure reason"
      itemNounPlural="Closure reasons"
      items={data?.items}
      total={data?.total}
      serverQuery={query}
      onServerQueryChange={setQuery}
      isLoading={isLoading}
      idOf={(item) => item.id}
      labelOf={(item) => item.reason}
      columns={[
        { title: 'Reason', dataIndex: 'reason', key: 'reason' },
        { title: 'Description', dataIndex: 'description', key: 'description' },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({ reason: item.reason, description: item.description ?? null })}
      allowCreate={canManage}
      allowEdit={canManageAny}
      onCreate={(values) =>
        create({ reason: values.reason.trim(), description: values.description }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          closureReasonId: id,
          reason: values.reason.trim(),
          description: values.description,
        }).unwrap()
      }
      onDelete={canManageAny ? (item) => remove(item.id).unwrap() : undefined}
      onToggleActive={
        canManageAny
          ? (item, next) => (next ? activate(item.id).unwrap() : deactivate(item.id).unwrap())
          : undefined
      }
      deleteConfirmTitle={(item) =>
        `Remove "${item.reason}"? Blocked if a job's closure still references it.`
      }
    />
  );
};

export default TenantClosureReasonsTab;
