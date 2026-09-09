import React from 'react';
import { Badge } from '../../shared';
import {
  useListPlatformInterviewRoundTypesQuery,
  useCreatePlatformInterviewRoundTypeMutation,
  useUpdatePlatformInterviewRoundTypeMutation,
  useDeletePlatformInterviewRoundTypeMutation,
  PlatformInterviewRoundType,
} from '../../../api/job-service/Platform/masterInterviewRounds';
import PlatformCatalogTab from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

type SpecialKind = '' | 'intake_call' | 'resume' | 'verification';
type FormValues = {
  name: string;
  special_kind: SpecialKind;
  is_mandatory: boolean;
  max_occurrences: number | null;
  requires_duration: boolean;
  available_variants: string[];
};
const emptyForm: FormValues = {
  name: '',
  special_kind: '',
  is_mandatory: false,
  max_occurrences: null,
  requires_duration: true,
  available_variants: [],
};
const fields: CatalogField<FormValues>[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  {
    name: 'special_kind',
    label: 'Special kind (optional — at most one round may hold each)',
    type: 'select',
    options: [
      { label: 'Intake Call', value: 'intake_call' },
      { label: 'Resume', value: 'resume' },
      { label: 'Verification', value: 'verification' },
    ],
  },
  {
    name: 'is_mandatory',
    label: 'Auto-seeds on job creation and locks against removal',
    type: 'boolean',
  },
  {
    name: 'max_occurrences',
    label: 'Max occurrences per job (optional, blank = unlimited)',
    type: 'number',
  },
  { name: 'requires_duration', label: 'Recruiter must set a duration', type: 'boolean' },
  {
    name: 'available_variants',
    label: 'Available variants, comma-separated (optional)',
    type: 'tags',
    helperText: 'e.g. soundwave, avatar — leave blank for round types with no variant.',
  },
];

/** Platform-wide interview-round-type catalogue a job's sequence is built from. */
const InterviewRoundTypesTab: React.FC = () => {
  const { data, isLoading } = useListPlatformInterviewRoundTypesQuery();
  const [create] = useCreatePlatformInterviewRoundTypeMutation();
  const [update] = useUpdatePlatformInterviewRoundTypeMutation();
  const [remove] = useDeletePlatformInterviewRoundTypeMutation();

  return (
    <PlatformCatalogTab<PlatformInterviewRoundType, FormValues>
      title="Platform-wide interview-round-type catalogue."
      itemNounSingular="Round type"
      itemNounPlural="Round types"
      items={data}
      isLoading={isLoading}
      idOf={(item) => item.round_type_id}
      labelOf={(item) => item.round_name}
      columns={[
        { title: 'Name', dataIndex: 'round_name', key: 'round_name' },
        {
          title: 'Special kind',
          key: 'special_kind',
          render: (_, item) =>
            item.special_kind ? (
              <Badge status="info" dot={false}>
                {item.special_kind}
              </Badge>
            ) : (
              '-'
            ),
        },
        {
          title: 'Mandatory',
          key: 'is_mandatory',
          render: (_, item) => (
            <Badge status={item.is_mandatory ? 'success' : 'neutral'}>
              {item.is_mandatory ? 'Yes' : 'No'}
            </Badge>
          ),
        },
        {
          title: 'Max / job',
          key: 'max_occurrences',
          render: (_, item) => item.max_occurrences ?? 'Unlimited',
        },
      ]}
      fields={fields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({
        name: item.round_name,
        special_kind: item.special_kind ?? '',
        is_mandatory: item.is_mandatory,
        max_occurrences: item.max_occurrences,
        requires_duration: item.requires_duration,
        available_variants: item.available_variants ?? [],
      })}
      onCreate={(values) =>
        create({
          round_name: values.name.trim(),
          special_kind: values.special_kind || null,
          is_mandatory: values.is_mandatory,
          max_occurrences: values.max_occurrences,
          requires_duration: values.requires_duration,
          available_variants: values.available_variants.length ? values.available_variants : null,
        }).unwrap()
      }
      onUpdate={(id, values) =>
        update({
          roundTypeId: id,
          round_name: values.name.trim(),
          special_kind: values.special_kind || null,
          is_mandatory: values.is_mandatory,
          max_occurrences: values.max_occurrences,
          requires_duration: values.requires_duration,
          available_variants: values.available_variants.length ? values.available_variants : null,
        }).unwrap()
      }
      onDelete={(item) => remove(item.round_type_id).unwrap()}
      deleteConfirmTitle={(item) =>
        `Remove "${item.round_name}"? Blocked while a job's sequence still references it.`
      }
    />
  );
};

export default InterviewRoundTypesTab;
