import { useMemo, useState } from 'react';
import { Select } from 'antd';
import dayjs from 'dayjs';
import { useSelector } from 'react-redux';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Button, showToast } from '../../../shared';
import { useGetJobOpeningsListLegacyQuery } from '../../../../api/job-service/JobOpenings/jobOpenings';
import { useGetJobOpeningByIdQuery } from '../../../../api/job-service/JobOpening/GetJobOpeningById';
import { useListJobTypesQuery } from '../../../../api/job-service/JobOpening/catalogs';
import { useListTenantDepartmentsQuery } from '../../../../api/organization-service/Tenants/departments';
import { useAssignCandidateToJobMutation } from '../../../../api/candidate-service/Candidates/assignJob';
import { useSessionTenantId } from '../../../../hooks/useSessionTenantId';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';
import type { RootState } from '../../../../redux/provider/store';

type AssignJobModalProps = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  /** The job this candidate is on now: never offered as a target. */
  currentJobId: string;
  /** Titles of every job the candidate is already considered for. */
  assignedJobTitles: string[];
};

const formatSalary = (value: number | null | undefined) =>
  value == null
    ? ''
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);

const salaryRange = (min: number | null | undefined, max: number | null | undefined) =>
  min != null && max != null
    ? `${formatSalary(min)}-${formatSalary(max)}`
    : min != null
      ? `From ${formatSalary(min)}`
      : max != null
        ? `Up to ${formatSalary(max)}`
        : '';

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <p className="text-sm text-gray-500">
    {label}: <span className="font-semibold text-gray-900">{value || 'N/A'}</span>
  </p>
);

// "Assign Candidate to Another Job Opening": pick a published job, see its
// details, assign. The job list/detail reads are real job-service calls; the
// assign itself needs the new candidate-service endpoint described in
// api/candidate-service/Candidates/assignJob.ts.
const AssignJobModal = ({
  open,
  onClose,
  candidateId,
  candidateName,
  currentJobId,
  assignedJobTitles,
}: AssignJobModalProps) => {
  const tenantId = useSessionTenantId();
  const callerKind = useSelector((state: RootState) => state.LoginSlice.callerKind);
  const [search, setSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
  const [assignCandidateToJob, { isLoading: isAssigning }] = useAssignCandidateToJobMutation();

  const { data: jobList, isFetching: isJobsLoading } = useGetJobOpeningsListLegacyQuery(
    { status: 'published', text: search.trim() || undefined, page_size: 50 },
    { skip: !open }
  );
  const jobs = useMemo(
    () =>
      (jobList?.items ?? []).filter(
        (job) => job.org_job_opening_id !== currentJobId && !job.is_closed
      ),
    [jobList, currentJobId]
  );
  const selectedSummary = jobs.find((job) => job.org_job_opening_id === selectedJobId);

  const { data: jobDetail } = useGetJobOpeningByIdQuery(
    { jobOpeningId: selectedJobId ?? '' },
    { skip: !selectedJobId }
  );
  const { data: orgDepartments = [] } = useListTenantDepartmentsQuery(tenantId ?? '', {
    skip: !tenantId || !selectedJobId,
  });
  const { data: jobTypes = [] } = useListJobTypesQuery(
    { isMaster: callerKind === 'platform' },
    { skip: !selectedJobId }
  );

  const detail = jobDetail?.data;
  const departmentName = orgDepartments.find(
    (d) => String(d.org_department_id) === String(detail?.department?.[0]?.id ?? '')
  )?.name;
  const jobTypeName = jobTypes.find(
    (t) => String(t.id) === String(detail?.jobType?.[0]?.id ?? '')
  )?.job_type_name;
  const location = detail?.officeLocation?.[0];
  const salary = [
    salaryRange(detail?.exemptMinSalary, detail?.exemptMaxSalary),
    salaryRange(detail?.nonExemptMinSalary, detail?.nonExemptMaxSalary),
  ]
    .filter(Boolean)
    .join(' · ');

  const handleClose = () => {
    setSearch('');
    setSelectedJobId(undefined);
    onClose();
  };

  const handleAssign = async () => {
    if (!selectedJobId) return;
    try {
      await assignCandidateToJob({ candidateId, jobOpeningId: selectedJobId }).unwrap();
      showToast({ message: 'Candidate assigned to the job opening.', type: 'success' });
      handleClose();
    } catch (e) {
      showToast({
        message: getCandidateErrorMessage(e, 'Could not assign candidate to this job'),
        type: 'error',
      });
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={handleClose}
      title="Assign Candidate to Another Job Opening"
      subtitle="Select a job opening where this candidate should be considered."
      modalProps={{ width: 640 }}
    >
      <div className="flex flex-col gap-5">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h3 className="text-lg font-semibold text-gray-900">{candidateName}</h3>
          <p className="mt-3 text-xs font-medium text-gray-500">Assigned Jobs:</p>
          <p className="text-xs font-semibold text-gray-900">
            {assignedJobTitles.length > 0 ? assignedJobTitles.join(', ') : 'None'}
          </p>
        </div>

        <div>
          <label htmlFor="assign-job-select" className="mb-1 block text-sm text-gray-800">
            Job Opening <span className="required-asterisk">*</span>
          </label>
          <Select
            id="assign-job-select"
            showSearch
            allowClear
            filterOption={false}
            value={selectedJobId}
            onChange={(value) => setSelectedJobId(value)}
            onSearch={setSearch}
            loading={isJobsLoading}
            placeholder="Search for Job Title or Job Id"
            notFoundContent={isJobsLoading ? 'Loading…' : 'No matching job openings'}
            className="w-full [&_.ant-select-selector]:!h-11 [&_.ant-select-selector]:!rounded-lg"
            options={jobs.map((job) => ({
              value: job.org_job_opening_id,
              label: `${job.title ?? 'Untitled job'} (${job.job_profile_code})`,
            }))}
          />
        </div>

        {selectedJobId && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">Job Details:</h4>
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              <DetailRow label="Department" value={departmentName} />
              <DetailRow
                label="Open Date"
                value={
                  selectedSummary?.job_open_date
                    ? dayjs(selectedSummary.job_open_date).format('MMM D, YYYY')
                    : null
                }
              />
              <DetailRow label="Job Title" value={selectedSummary?.title} />
              <DetailRow label="Number of Openings" value={selectedSummary?.vacancies} />
              <DetailRow label="Job Type" value={jobTypeName} />
              <DetailRow label="Salary" value={salary} />
              <DetailRow
                label="Location"
                value={[location?.city?.name, location?.country?.name].filter(Boolean).join(', ')}
              />
              <DetailRow label="Hiring Manager" value={detail?.hiringManager?.name} />
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-gray-300 bg-white px-8 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            CANCEL
          </Button>
          <Button
            type="button"
            onClick={() => void handleAssign()}
            disabled={!selectedJobId || isAssigning}
            className="rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isAssigning ? 'ASSIGNING…' : 'ASSIGN CANDIDATE'}
          </Button>
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default AssignJobModal;
