import React, { useState } from 'react';
import {
  useSearchPlatformInterviewRoundTypesQuery,
  useUpdatePlatformInterviewRoundTypeMutation,
  PlatformInterviewRoundType,
} from '../../../api/job-service/Platform/masterInterviewRounds';
import PlatformCatalogTab, { type CatalogServerQuery } from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';
import { isHiddenRoundType } from '../../../shared/utils/roundInfoContent';

// Only name, description and variant labels are editable.
type RoundTypeFormValues = {
  round_name: string;
  round_description: string;
  variantLabelSoundwave: string;
  variantLabelAvatar: string;
};

const roundTypeFields: CatalogField<RoundTypeFormValues>[] = [
  { name: 'round_name', label: 'Name', type: 'text', required: true },
  { name: 'round_description', label: 'Description', type: 'textarea' },
  {
    name: 'variantLabelSoundwave',
    label: 'Display text for "soundwave" (if this round type uses it)',
    type: 'text',
  },
  {
    name: 'variantLabelAvatar',
    label: 'Display text for "avatar" (if this round type uses it)',
    type: 'text',
  },
];
const emptyForm: RoundTypeFormValues = {
  round_name: '',
  round_description: '',
  variantLabelSoundwave: '',
  variantLabelAvatar: '',
};

/** Platform-wide interview-round-type catalogue a job's sequence is built from. */
const InterviewRoundTypesTab: React.FC = () => {
  const [query, setQuery] = useState<CatalogServerQuery>({
    page: 1,
    pageSize: 10,
    search: '',
    sortBy: 'name',
    sortDir: 'asc',
  });
  const { data, isLoading } = useSearchPlatformInterviewRoundTypesQuery({
    page: query.page,
    pageSize: query.pageSize,
    search: query.search || undefined,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
  });
  const [updateRoundType] = useUpdatePlatformInterviewRoundTypeMutation();
  const visibleItems = data?.items.filter((item) => !isHiddenRoundType(item.special_kind));
  const hiddenCount = (data?.items.length ?? 0) - (visibleItems?.length ?? 0);

  return (
    <PlatformCatalogTab<PlatformInterviewRoundType, RoundTypeFormValues>
      title="Platform-wide interview-round-type catalog."
      itemNounSingular="Round type"
      itemNounPlural="Round types"
      items={visibleItems}
      total={data ? data.total - hiddenCount : undefined}
      serverQuery={query}
      onServerQueryChange={setQuery}
      isLoading={isLoading}
      idOf={(item) => item.round_type_id}
      labelOf={(item) => item.round_name}
      columns={[
        { title: 'Name', dataIndex: 'round_name', key: 'round_name' },
        {
          title: 'Description',
          dataIndex: 'round_description',
          key: 'round_description',
          render: (_, item) => item.round_description || '-',
        },
      ]}
      fields={roundTypeFields}
      emptyForm={emptyForm}
      toFormValues={(item) => ({
        round_name: item.round_name,
        round_description: item.round_description ?? '',
        variantLabelSoundwave: item.variant_labels?.soundwave ?? '',
        variantLabelAvatar: item.variant_labels?.avatar ?? '',
      })}
      onCreate={() => Promise.resolve()}
      onUpdate={(id, values) => {
        const variant_labels: Record<string, string> = {};
        if (values.variantLabelSoundwave.trim())
          variant_labels.soundwave = values.variantLabelSoundwave.trim();
        if (values.variantLabelAvatar.trim())
          variant_labels.avatar = values.variantLabelAvatar.trim();
        return updateRoundType({
          roundTypeId: id,
          round_name: values.round_name.trim(),
          round_description: values.round_description.trim() || null,
          variant_labels: Object.keys(variant_labels).length ? variant_labels : null,
        }).unwrap();
      }}
      allowCreate={false}
      allowEdit
    />
  );
};

export default InterviewRoundTypesTab;
