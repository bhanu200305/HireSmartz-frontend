import React, { useState } from 'react';
import { MdOutlineFactCheck } from 'react-icons/md';
import { Typography } from '../shared';
import { useGetQualifiedCandidatePoolQuery } from '../../api/candidate-service/Stats/stats';
import { useJobOpeningNameMap } from './useJobOpeningNameMap';
import CandidatePoolTable from './CandidatePoolTable';

const DEFAULT_PAGE_SIZE = 10;

/**
 * "Qualified candidate pool" — candidates who have passed resume screening,
 * within this hiring manager's assigned-job scope (server-side, same as
 * every other candidate-service KPI route here).
 */
const QualifiedCandidatePoolSection: React.FC = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [jobOpeningId, setJobOpeningId] = useState<string | undefined>(undefined);

  const { data, isFetching } = useGetQualifiedCandidatePoolQuery({
    jobOpeningId,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const { jobNameMap } = useJobOpeningNameMap();

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <MdOutlineFactCheck />
        </div>
        <div>
          <Typography variant="subtitle2" className="font-semibold text-neutral-900">
            Qualified Candidate Pool
          </Typography>
          <Typography variant="caption" className="mt-0.5 block text-neutral-400">
            Candidates who have passed resume screening
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
        jobOpeningId={jobOpeningId}
        onJobOpeningIdChange={(value) => {
          setJobOpeningId(value);
          setPage(1);
        }}
        linkToCandidate
        emptyText="No qualified candidates yet."
      />
    </div>
  );
};

export default QualifiedCandidatePoolSection;
