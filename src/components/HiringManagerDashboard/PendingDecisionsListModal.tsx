import React, { useState } from 'react';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import { useGetPendingDecisionsListQuery } from '../../api/candidate-service/Stats/stats';
import { useJobOpeningNameMap } from './useJobOpeningNameMap';
import CandidatePoolTable from './CandidatePoolTable';

const DEFAULT_PAGE_SIZE = 10;

/**
 * The "Pending Decision" KPI card's popup — same paginated list
 * `PendingDecisionsSection` already renders inline further down this same
 * dashboard, just reachable instantly from the card without scrolling.
 * Reuses `CandidatePoolTable` rather than a second copy of its columns.
 */
const PendingDecisionsListModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [jobOpeningId, setJobOpeningId] = useState<string | undefined>(undefined);

  const { data, isFetching } = useGetPendingDecisionsListQuery({
    jobOpeningId,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const { jobNameMap } = useJobOpeningNameMap();

  return (
    <AntdCommonModal
      open
      onClose={onClose}
      title="Pending Decision"
      modalProps={{ width: 900, maskClosable: true }}
      fillHeight
    >
      <CandidatePoolTable
        items={data?.items ?? []}
        jobNameMap={jobNameMap}
        loading={isFetching}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        jobOpeningId={jobOpeningId}
        onJobOpeningIdChange={(value) => {
          setJobOpeningId(value);
          setPage(1);
        }}
        linkToCandidate
        emptyText="No pending decisions."
        fillHeight
      />
    </AntdCommonModal>
  );
};

export default PendingDecisionsListModal;
