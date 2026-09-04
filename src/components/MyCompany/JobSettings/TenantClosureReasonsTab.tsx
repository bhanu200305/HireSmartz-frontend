import React from 'react';
import {
  useListClosureReasonsQuery,
  useCreateClosureReasonMutation,
  useUpdateClosureReasonMutation,
  useDeleteClosureReasonMutation,
} from '../../../api/job-service/JobOpening/catalogs';
import type { OrganizationClosureReason } from '../../../api/job-service/types';
import PlatformCatalogTab from '../../CompanySettings/JobCatalogs/PlatformCatalogTab';
import type { CatalogField } from '../../CompanySettings/JobCatalogs/CatalogFormFields';

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
  const { data, isLoading } = useListClosureReasonsQuery();
  const [create] = useCreateClosureReasonMutation();
  const [update] = useUpdateClosureReasonMutation();
  const [remove] = useDeleteClosureReasonMutation();

  return (
    <PlatformCatalogTab<OrganizationClosureReason, FormValues>
      title="Your company's configured closure reasons."
      itemNounSingular="Closure reason"
      itemNounPlural="Closure reasons"
      items={data?.map((item) => ({
        id: item.reason_id,
        reason: item.reason,
        description: item.description,
      }))}
      isLoading={isLoading}
      idOf={(item) => item.id}
      labelOf={(item) => item.reason}
      searchPredicate={(item, q) => item.reason.toLowerCase().includes(q)}
      columns={[
        { title: 'Reason', dataIndex: 'reason', key: 'reason' },
        { title: 'Description', dataIndex: 'description', key: 'description' },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({ reason: item.reason, description: item.description ?? null })}
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
      onDelete={(item) => remove(item.id).unwrap()}
      deleteConfirmTitle={(item) =>
        `Remove "${item.reason}"? Blocked if a job's closure still references it.`
      }
    />
  );
};

export default TenantClosureReasonsTab;
