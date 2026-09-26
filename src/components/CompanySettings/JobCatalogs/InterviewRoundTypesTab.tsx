import React, { useState } from 'react';
import {
  useSearchPlatformInterviewRoundTypesQuery,
  useUpdatePlatformInterviewRoundTypeMutation,
  PlatformInterviewRoundType,
} from '../../../api/job-service/Platform/masterInterviewRounds';
import PlatformCatalogTab, { type CatalogServerQuery } from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

// Only description is editable — every other field is migration-managed.
type RoundTypeFormValues = { round_description: string };

const roundTypeFields: CatalogField<RoundTypeFormValues>[] = [
  { name: 'round_description', label: 'Description', type: 'textarea' },
];
const emptyForm: RoundTypeFormValues = { round_description: '' };

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

  return (
    <PlatformCatalogTab<PlatformInterviewRoundType, RoundTypeFormValues>
      title="Platform-wide interview-round-type catalog."
      itemNounSingular="Round type"
      itemNounPlural="Round types"
      items={data?.items}
      total={data?.total}
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
      toFormValues={(item) => ({ round_description: item.round_description ?? '' })}
      onCreate={() => Promise.resolve()}
      onUpdate={(id, values) =>
        updateRoundType({
          roundTypeId: id,
          round_description: values.round_description.trim() || null,
        }).unwrap()
      }
      allowCreate={false}
      allowEdit
    />
  );
};

export default InterviewRoundTypesTab;
