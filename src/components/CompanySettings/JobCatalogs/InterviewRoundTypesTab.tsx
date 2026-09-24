import React from 'react';
import {
  useListPlatformInterviewRoundTypesQuery,
  PlatformInterviewRoundType,
} from '../../../api/job-service/Platform/masterInterviewRounds';
import PlatformCatalogTab from './PlatformCatalogTab';
import type { CatalogField } from './CatalogFormFields';

// Read-only for now — these fields are migration-managed, editing them here
// caused a real data-integrity incident. Description editing comes later
// once the backend exposes it.
const noFields: CatalogField<Record<string, never>>[] = [];
const emptyForm: Record<string, never> = {};

/** Platform-wide interview-round-type catalogue a job's sequence is built from. */
const InterviewRoundTypesTab: React.FC = () => {
  const { data, isLoading } = useListPlatformInterviewRoundTypesQuery();

  return (
    <PlatformCatalogTab<PlatformInterviewRoundType, Record<string, never>>
      title="Platform-wide interview-round-type catalog."
      itemNounSingular="Round type"
      itemNounPlural="Round types"
      items={data}
      isLoading={isLoading}
      idOf={(item) => item.round_type_id}
      labelOf={(item) => item.round_name}
      columns={[{ title: 'Name', dataIndex: 'round_name', key: 'round_name' }]}
      fields={noFields}
      emptyForm={emptyForm}
      toFormValues={() => emptyForm}
      onCreate={() => Promise.resolve()}
      onUpdate={() => Promise.resolve()}
      allowCreate={false}
      allowEdit={false}
    />
  );
};

export default InterviewRoundTypesTab;
