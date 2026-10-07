import { useMemo, useState } from 'react';
import { Select } from 'antd';
import { useSelector } from 'react-redux';
import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Button, showToast } from '../../../shared';
import { useGetJobOpeningsListLegacyQuery } from '../../../../api/job-service/JobOpenings/jobOpenings';
import { useGetJobOpeningByIdQuery } from '../../../../api/job-service/JobOpening/GetJobOpeningById';
import { useListJobTypesQuery } from '../../../../api/job-service/JobOpening/catalogs';
import { useListTenantDepartmentsQuery } from '../../../../api/organization-service/Tenants/departments';
import { useAssignCandidateToJobMutation } from '../../../../api/candidate-service/Candidates/assignJob';
import { useSessionTenantId } from '../../../../hooks/useSessionTenantId';
import { useJobTitleNameMap } from '../../../../hooks/useJobTitleNameMap';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';
import type { RootState } from '../../../../redux/provider/store';
import { formatMoney } from '../../../../shared/utils/money';
import { parseCalendarDate } from '../../../../shared/utils/calendarDate';

type AssignJobModalProps = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  /** The job this candidate is on now: never offered as a target. */
  currentJobId: string;
};

const formatSalary = (value: number | null | undefined) =>
  value == null ? '' : formatMoney(value);

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

// "Assign <name> to New Job": pick a published job, see its
// details, assign. The job list/detail reads are real job-service calls; the
// assign itself needs the new candidate-service endpoint described in
// api/candidate-service/Candidates/assignJob.ts.
const AssignJobModal = ({
  open,
  onClose,
  candidateId,
  candidateName,
  currentJobId,
}: AssignJobModalProps) => {
  const tenantId = useSessionTenantId();
  const callerKind = useSelector((state: RootState) => state.LoginSlice.callerKind);
  const [search, setSearch] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
  const [assignCandidateToJob, { isLoading: isAssigning }] = useAssignCandidateToJobMutation();

  // The list only carries `job_title_id` (its `title` is null), so the name is
  // resolved through the tenant's job-title catalogue, like the Job Openings
  // page does. The same reason the search runs here: the server can't match a
  // title it doesn't have.
  const { titleMap } = useJobTitleNameMap();
  const titleOf = (job: { title: string | null; job_title_id: string | null }) =>
    job.title || (job.job_title_id ? titleMap[job.job_title_id] : '') || 'Untitled job';

  const { data: jobList, isFetching: isJobsLoading } = useGetJobOpeningsListLegacyQuery(
    { status: 'published', page_size: 100 },
    { skip: !open }
  );
  const jobs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (jobList?.items ?? [])
      .filter((job) => job.org_job_opening_id !== currentJobId && !job.is_closed)
      .filter(
        (job) =>
          !term ||
          titleOf(job).toLowerCase().includes(term) ||
          job.job_profile_code.toLowerCase().includes(term)
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobList, currentJobId, search, titleMap]);
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
      showToast({ message: `${candidateName} assigned to the job opening.`, type: 'success' });
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
      title={`Assign ${candidateName} to New Job`}
      subtitle={`Select a job opening where ${candidateName} should be considered.`}
      modalProps={{ width: 640 }}
    >
      <div className="flex flex-col gap-5">
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
              label: `${titleOf(job)} (${job.job_profile_code})`,
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
                  parseCalendarDate(selectedSummary?.job_open_date)?.format('MMM D, YYYY') ?? null
                }
              />
              <DetailRow
                label="Job Title"
                value={selectedSummary ? titleOf(selectedSummary) : null}
              />
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
            {isAssigning ? 'ASSIGNING…' : 'ASSIGN'}
          </Button>
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default AssignJobModal;
