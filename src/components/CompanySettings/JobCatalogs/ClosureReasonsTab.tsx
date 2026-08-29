import React from 'react';
import { Badge } from '../../shared';
import {
  useListPlatformClosureReasonsQuery,
  useCreatePlatformClosureReasonMutation,
  useUpdatePlatformClosureReasonMutation,
  useDeletePlatformClosureReasonMutation,
  PlatformClosureReason,
} from '../../../api/job-service/Platform/masterClosureReasons';
import PlatformCatalogTab from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

type FormValues = { reason: string; requires_input: boolean };
const emptyForm: FormValues = { reason: '', requires_input: false };
const fields: CatalogField<FormValues>[] = [
  { name: 'reason', label: 'Reason', type: 'text', required: true },
  {
    name: 'requires_input',
    label: 'Recruiter must enter detail when closing a job with this reason',
    type: 'boolean',
  },
];

/** GET/POST/PUT/DELETE /platform/master-closure-reasons — the fixed
 * job-closure reason catalogue a recruiter picks from on CloseJobModal. */
const ClosureReasonsTab: React.FC = () => {
  const { data, isLoading } = useListPlatformClosureReasonsQuery();
  const [create] = useCreatePlatformClosureReasonMutation();
  const [update] = useUpdatePlatformClosureReasonMutation();
  const [remove] = useDeletePlatformClosureReasonMutation();

  return (
    <PlatformCatalogTab<PlatformClosureReason, FormValues>
      title="Platform-wide job-closure reason catalogue."
      itemNounSingular="Closure reason"
      itemNounPlural="Closure reasons"
      items={data}
      isLoading={isLoading}
      idOf={(item) => item.reason_id}
      labelOf={(item) => item.reason}
      searchPredicate={(item, q) => item.reason.toLowerCase().includes(q)}
      columns={[
        { title: 'Reason', dataIndex: 'reason', key: 'reason' },
        {
          title: 'Requires detail',
          key: 'requires_input',
          render: (_, item) => (
            <Badge status={item.requires_input ? 'warning' : 'neutral'}>
              {item.requires_input ? 'Yes' : 'No'}
            </Badge>
          ),
        },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({ reason: item.reason, requires_input: item.requires_input })}
      onCreate={(values) =>
        create({ reason: values.reason.trim(), requires_input: values.requires_input }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          reasonId: id,
          reason: values.reason.trim(),
          requires_input: values.requires_input,
        }).unwrap()
      }
      onDelete={(item) => remove(item.reason_id).unwrap()}
      deleteConfirmTitle={(item) =>
        `Remove "${item.reason}"? Blocked if a job's closure still references it.`
      }
    />
  );
};

export default ClosureReasonsTab;
