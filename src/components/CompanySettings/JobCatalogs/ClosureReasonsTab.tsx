import React, { useState } from 'react';
import { Badge } from '../../shared';
import {
  useSearchPlatformClosureReasonsQuery,
  useCreatePlatformClosureReasonMutation,
  useUpdatePlatformClosureReasonMutation,
  useDeletePlatformClosureReasonMutation,
  useActivatePlatformClosureReasonMutation,
  useDeactivatePlatformClosureReasonMutation,
  PlatformClosureReason,
} from '../../../api/job-service/Platform/masterClosureReasons';
import PlatformCatalogTab, { type CatalogServerQuery } from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

type FormValues = { reason: string; requires_input: boolean; description: string };
const emptyForm: FormValues = { reason: '', requires_input: false, description: '' };
const fields: CatalogField<FormValues>[] = [
  { name: 'reason', label: 'Reason', type: 'text', required: true },
  {
    name: 'requires_input',
    label: 'Recruiter must enter detail when closing a job with this reason',
    type: 'boolean',
  },
  { name: 'description', label: 'Description (optional)', type: 'textarea' },
];

/** GET/POST/PUT/DELETE /platform/master-closure-reasons — the fixed
 * job-closure reason catalogue a recruiter picks from on CloseJobModal. */
const ClosureReasonsTab: React.FC = () => {
  const [query, setQuery] = useState<CatalogServerQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    sortBy: 'name',
    sortDir: 'asc',
  });
  const { data, isLoading } = useSearchPlatformClosureReasonsQuery({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
  });
  const [create] = useCreatePlatformClosureReasonMutation();
  const [update] = useUpdatePlatformClosureReasonMutation();
  const [remove] = useDeletePlatformClosureReasonMutation();
  const [activate] = useActivatePlatformClosureReasonMutation();
  const [deactivate] = useDeactivatePlatformClosureReasonMutation();

  return (
    <PlatformCatalogTab<PlatformClosureReason, FormValues>
      title="Platform-wide job-closure reason catalog."
      itemNounSingular="Closure reason"
      itemNounPlural="Closure reasons"
      items={data?.items}
      total={data?.total}
      serverQuery={query}
      onServerQueryChange={setQuery}
      isLoading={isLoading}
      idOf={(item) => item.reason_id}
      labelOf={(item) => item.reason}
      searchPredicate={(item, q) => item.reason.toLowerCase().includes(q)}
      columns={[
        { title: 'Reason', dataIndex: 'reason', key: 'reason' },
        {
          title: 'Requires Detail',
          key: 'requires_input',
          render: (_, item) => (
            <Badge status={item.requires_input ? 'warning' : 'neutral'}>
              {item.requires_input ? 'Yes' : 'No'}
            </Badge>
          ),
        },
        {
          title: 'Description',
          key: 'description',
          render: (_, item) => item.description || '-',
        },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({
        reason: item.reason,
        requires_input: item.requires_input,
        description: item.description || '',
      })}
      onCreate={(values) =>
        create({
          reason: values.reason.trim(),
          requires_input: values.requires_input,
          description: values.description.trim() || undefined,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          reasonId: id,
          reason: values.reason.trim(),
          requires_input: values.requires_input,
          description: values.description.trim() || undefined,
        }).unwrap()
      }
      onDelete={(item) => remove(item.reason_id).unwrap()}
      deleteConfirmTitle={(item) =>
        `Remove "${item.reason}"? Blocked if a job's closure still references it.`
      }
      onToggleActive={(item, next) =>
        next ? activate(item.reason_id).unwrap() : deactivate(item.reason_id).unwrap()
      }
    />
  );
};

export default ClosureReasonsTab;
