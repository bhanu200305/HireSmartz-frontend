import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Select, Spin } from 'antd';
import { get } from 'lodash-es';
import { useGetJobOpeningsQuery } from '../../../../api/job-service/JobOpening/GetJobOpening';
import { useAssignCandidateToJobMutation } from '../../../../api/candidate-service/Candidates/AssignJobOpening';
import type { CandidateJobAssignment } from '../../../../api/candidate-service/Candidates/AssignJobOpening';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Button, showToast } from '../../../shared';
import { Jobs } from '../../../../types';
import { formattedDate } from '../../../../shared/utils/methods';
import { PAGINATION_DEBOUNCE_DELAY } from '../../../../constants/app.constants';
import { useDebouncedEffect } from '../../../../hooks/useDebouncedEffect';

const ASSIGN_JOB_SEARCH_PAGE_SIZE = 25;

type AssignJobModalProps = {
  open: boolean;
  onClose: () => void;
  candidateId: number;
  candidateName: string;
  assignedJobs?: CandidateJobAssignment[];
  onAssignSuccess?: () => void;
};

const AssignJobModal: React.FC<AssignJobModalProps> = ({
  open,
  onClose,
  candidateId,
  candidateName,
  assignedJobs = [],
  onAssignSuccess,
}) => {
  // Separate current job from other assigned jobs
  const currentJob = useMemo(() => assignedJobs.find((job) => job.isCurrentJob), [assignedJobs]);
  const originalJob = currentJob && currentJob.jobTitle ? currentJob.jobTitle : null;
  console.log('Current Job:', currentJob);
  const otherAssignedJobs = useMemo(
    () => assignedJobs.filter((job) => !job.isCurrentJob),
    [assignedJobs]
  );
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [accumulatedJobs, setAccumulatedJobs] = useState<Jobs[]>([]);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const prevSearchRef = useRef('');

  useDebouncedEffect(
    () => {
      setDebouncedSearch(searchText);
      // Reset pagination when search text changes
      if (prevSearchRef.current !== searchText) {
        setCurrentPage(0);
        setAccumulatedJobs([]);
        setHasMoreData(true);
        prevSearchRef.current = searchText;
      }
    },
    [searchText],
    PAGINATION_DEBOUNCE_DELAY
  );

  const { data: jobListData, isFetching: isJobListLoading } = useGetJobOpeningsQuery(
    {
      page: currentPage,
      size: ASSIGN_JOB_SEARCH_PAGE_SIZE,
      ...(debouncedSearch ? { text: debouncedSearch } : {}),
    },
    {
      skip: !open,
      refetchOnMountOrArgChange: true,
    }
  );

  const [assignCandidate, { isLoading: isAssigning }] = useAssignCandidateToJobMutation();

  // Handle accumulated results as new pages load
  useEffect(() => {
    if (!open || !jobListData?.data) return;

    const newJobs = (jobListData.data as Jobs[]) ?? [];

    if (currentPage === 0) {
      // First page - replace results
      setAccumulatedJobs(newJobs);
    } else {
      // Subsequent pages - append results
      setAccumulatedJobs((prev) => [...prev, ...newJobs]);
    }

    // Check if there are more pages: if we got fewer than page size, this is the last page
    const hasMore = newJobs.length === ASSIGN_JOB_SEARCH_PAGE_SIZE;
    setHasMoreData(hasMore);
    setIsLoadingMore(false);
  }, [open, jobListData, currentPage]);

  const jobList: Jobs[] = useMemo(() => {
    return accumulatedJobs;
  }, [accumulatedJobs]);

  const selectedJob = useMemo<Jobs | null>(() => {
    if (!selectedJobId) return null;
    return jobList.find((job) => job.jobOpeningId === selectedJobId) ?? null;
  }, [selectedJobId, jobList]);

  const handleClose = () => {
    setSelectedJobId(null);
    setSearchText('');
    setDebouncedSearch('');
    setCurrentPage(0);
    setAccumulatedJobs([]);
    setHasMoreData(true);
    setIsLoadingMore(false);
    prevSearchRef.current = '';
    onClose();
  };

  // Handle infinite scroll in dropdown
  const handlePopupScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const scrollTop = target.scrollTop;
      const scrollHeight = target.scrollHeight;
      const clientHeight = target.clientHeight;

      // Trigger load when user scrolls near the bottom (within 50px)
      const nearBottom = scrollHeight - scrollTop - clientHeight < 50;

      if (
        nearBottom &&
        hasMoreData &&
        !isJobListLoading &&
        !isLoadingMore &&
        accumulatedJobs.length > 0
      ) {
        setIsLoadingMore(true);
        setCurrentPage((prev) => prev + 1);
      }
    },
    [hasMoreData, isJobListLoading, isLoadingMore, accumulatedJobs.length]
  );

  const handleAssign = async () => {
    if (!selectedJobId) return;

    try {
      const result = await assignCandidate({
        candidateId,
        payload: {
          targetJobOpeningId: selectedJobId,
        },
      }).unwrap();
      console.log('Assign result:', result);

      if (result) {
        showToast({
          message: get(
            result.message,
            'message',
            result.message || 'Candidate assigned successfully.'
          ),
          type: 'success',
        });
        onAssignSuccess?.();
        handleClose();
      } else {
        showToast({
          message: get(result, 'message', 'Failed to assign candidate to job opening.'),
          type: 'error',
        });
      }
    } catch (err: unknown) {
      const errMessage = get(err, 'data.message', '');
      const errorCode = get(err, 'data.code', '');

      // Detect duplicate assignment
      const isDuplicate =
        (typeof errMessage === 'string' &&
          (errMessage.toLowerCase().includes('already') ||
            errMessage.toLowerCase().includes('duplicate') ||
            errMessage.toLowerCase().includes('assigned'))) ||
        (typeof errorCode === 'string' && errorCode.includes('DUPLICATE'));

      const userMessage = isDuplicate
        ? 'Candidate is already assigned to this job opening.'
        : typeof errMessage === 'string' && errMessage.trim()
          ? errMessage
          : 'Failed to assign candidate. Please try again.';

      showToast({
        message: userMessage,
        type: 'error',
      });
    }
  };

  const selectOptions = useMemo(
    () =>
      jobList.map((job) => ({
        label: `${job.jobTitleName}${job.jobProfileCode ? ` (${job.jobProfileCode})` : ''}`,
        value: job.jobOpeningId,
      })),
    [jobList]
  );

  const formatSalary = (min: number | null, max: number | null): string => {
    if (!min && !max) return 'N/A';
    if (min && max) return `$${min.toLocaleString()}-$${max.toLocaleString()}`;
    if (min) return `$${min.toLocaleString()}+`;
    return `Up to $${max?.toLocaleString()}`;
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={handleClose}
      title="Assign Candidate to Another Job Opening"
      subtitle="Select a job opening where this candidate should be considered."
      modalProps={{ width: 520, destroyOnClose: true }}
    >
      {/* Candidate Info – shown only before a job is selected */}
      {/* {!selectedJob && ( */}
      <div className="mb-5 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
        <p className="font-semibold text-lg text-gray-800">{candidateName}</p>
        {otherAssignedJobs.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-medium text-gray-700 mb-1">Assigned Jobs:</p>
            <p className="text-xs text-gray-900">
              <span className="font-bold">
                {originalJob}, {otherAssignedJobs.map((job) => job.jobTitle).join(', ')}
              </span>
            </p>
          </div>
        )}
      </div>
      {/* )} */}

      {/* Job Opening Selector – always visible */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Job Opening <span className="text-red-500">*</span>
        </label>
        <Select
          className="w-full"
          showSearch
          placeholder="Search for Job title or Job Id"
          optionFilterProp="label"
          value={selectedJobId ?? undefined}
          onChange={(value: number) => setSelectedJobId(value)}
          onSearch={setSearchText}
          onPopupScroll={handlePopupScroll}
          filterOption={false}
          notFoundContent={
            isJobListLoading && accumulatedJobs.length === 0 ? (
              <div className="flex justify-center py-4">
                <Spin size="small" />
              </div>
            ) : accumulatedJobs.length === 0 ? (
              <p className="text-center text-gray-400 py-3 text-sm">No job openings found</p>
            ) : isLoadingMore ? (
              <div className="flex justify-center py-3">
                <Spin size="small" tip="Loading more..." />
              </div>
            ) : !hasMoreData ? (
              <p className="text-center text-gray-400 py-3 text-xs">No more job openings</p>
            ) : null
          }
          options={selectOptions}
          loading={isJobListLoading && accumulatedJobs.length === 0}
          size="large"
          allowClear
          onClear={() => setSelectedJobId(null)}
        />
      </div>

      {/* Job Details – shown only after a job is selected */}
      {selectedJob && (
        <div className="mb-5 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <p className="text-sm font-semibold text-gray-700 mb-3">Job Details:</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-gray-500">Department:</span>{' '}
              <span className="font-medium text-gray-800">
                {selectedJob.departmentName || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Open Date:</span>{' '}
              <span className="font-medium text-gray-800">
                {selectedJob.openDate ? formattedDate(selectedJob.openDate) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Job Title:</span>{' '}
              <span className="font-medium text-gray-800">{selectedJob.jobTitleName || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500">Number of Openings:</span>{' '}
              <span className="font-medium text-gray-800">{selectedJob.openings ?? 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500">Job Type:</span>{' '}
              <span className="font-medium text-gray-800">{selectedJob.jobTypeName || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-500">Salary:</span>{' '}
              <span className="font-medium text-gray-800">
                {formatSalary(selectedJob.minSalary, selectedJob.maxSalary)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Location:</span>{' '}
              <span className="font-medium text-gray-800">
                {selectedJob.officeLocationName || selectedJob.location?.name || 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Hiring Manager:</span>{' '}
              <span className="font-medium text-gray-800">
                {selectedJob.hiringManager || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-center gap-3 mt-2">
        <Button
          className="px-8 py-2.5 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={handleClose}
          disabled={isAssigning}
        >
          CANCEL
        </Button>
        <Button
          className="px-8 py-2.5 rounded-full text-sm font-medium text-white bg-primary hover:opacity-90 transition-opacity disabled:opacity-50"
          onClick={handleAssign}
          disabled={!selectedJobId || isAssigning}
        >
          {isAssigning ? (
            <span className="flex items-center gap-2">
              <Spin size="small" />
              Assigning...
            </span>
          ) : selectedJob ? (
            'ASSIGN CANDIDATE'
          ) : (
            'CONFIRM'
          )}
        </Button>
      </div>
    </AntdCommonModal>
  );
};

export default AssignJobModal;
