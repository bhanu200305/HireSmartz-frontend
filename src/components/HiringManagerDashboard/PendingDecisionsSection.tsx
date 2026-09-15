import React, { useState } from 'react';
import { MdOutlinePendingActions } from 'react-icons/md';
import { Typography } from '../shared';
import { useGetPendingDecisionsListQuery } from '../../api/candidate-service/Stats/stats';
import { useJobOpeningNameMap } from './useJobOpeningNameMap';
import CandidatePoolTable from './CandidatePoolTable';

const DEFAULT_PAGE_SIZE = 10;

/**
 * "Pending decisions" — the table counterpart to the "Pending Decision"
 * stat card: candidates who appeared for a Panel round and are awaiting
 * selection/rejection, with the candidate name hyperlinked to their
 * profile so a hiring manager can act on the decision directly from here.
 */
const PendingDecisionsSection: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const { data, isFetching } = useGetPendingDecisionsListQuery({
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const { jobNameMap } = useJobOpeningNameMap();

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <MdOutlinePendingActions />
        </div>
        <div>
          <Typography variant="subtitle2" className="font-semibold text-neutral-900">
            Pending decisions
          </Typography>
          <Typography variant="caption" className="text-neutral-400">
            Interviewed, awaiting selection or rejection — click a name to decide
          </Typography>
        </div>
      </div>

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
        linkToCandidate
        emptyText="No pending decisions."
      />
    </div>
  );
};

export default PendingDecisionsSection;
