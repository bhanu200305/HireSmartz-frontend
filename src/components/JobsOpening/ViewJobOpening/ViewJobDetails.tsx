import { InfoCircleOutlined } from '@ant-design/icons';
import { Form, Switch, Tooltip } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { TbBriefcase2 } from 'react-icons/tb';
import {
  MdOutlineLocationOn,
  MdOutlineGroups,
  MdOutlineAttachMoney,
  MdOutlineStars,
} from 'react-icons/md';
import { Input } from '../../shared';
import DropdownWithAddOption from '../../shared/ui/DropdownWithAddOption';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { useListJobTypesQuery } from '../../../api/job-service/JobOpening/catalogs';
import { useGetTenantCultureIntroQuery } from '../../../api/organization-service/Tenants/cultureIntro';
import { useListTenantDepartmentsQuery } from '../../../api/organization-service/Tenants/departments';
import {
  officeDisplayName,
  useListTenantOfficesQuery,
} from '../../../api/organization-service/Tenants/offices';
import {
  idsMatch,
  tenantJobTitleFormId,
  useListTenantDepartmentJobTitlesQuery,
  useListTenantJobTitleCatalogueQuery,
} from '../../../api/organization-service/Tenants/jobTitles';
import useJobOpeningDropdown from '../../../hooks/useJobOpeningDropdown';
import { useSessionTenantId } from '../../../hooks/useSessionTenantId';
import { useParams } from 'react-router-dom';
import { lazy, useEffect, useMemo } from 'react';
import { Loader } from '../../shared/ui/loader';
import dayjs from 'dayjs';
import { JobOpeningByIdResponse } from '../../../types';
import { asJobId } from '../../../api/job-service/jobId';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/provider/store';

const CurrencyInput = lazy(() => import('react-currency-input-field'));

// Read-only display, so a plain formatted span (not an input box) keeps
// the /hr or /year suffix hugging the number regardless of its length.
const formatSalary = (value: number | string | null | undefined): string =>
  value == null || value === ''
    ? ''
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value));

type ViewJobData = JobOpeningByIdResponse['data'] & {
  location?: {
    id: number;
    companyId?: number;
    name: string;
    code?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
    zipCode?: string;
    timezone?: string | null;
    isPrimary?: boolean | null;
    status?: boolean;
  };
  responsibilities?: string;
};

const ViewJobDetails = () => {
  const { id } = useParams();
  const jobId = asJobId(id);
  const tenantId = useSessionTenantId();
  const callerKind = useSelector((state: RootState) => state.LoginSlice.callerKind);
  const {
    data: jobData,
    isLoading,
    refetch,
  } = useGetJobOpeningByIdQuery({ jobOpeningId: jobId }, { skip: !jobId });
  useEffect(() => {
    refetch();
  }, [refetch]);

  const viewData = jobData?.data as ViewJobData | undefined;

  const { data: orgDepartments = [] } = useListTenantDepartmentsQuery(tenantId ?? '', {
    skip: !tenantId,
  });
  const { data: offices = [], isSuccess: officesLoaded } = useListTenantOfficesQuery(
    { tenantId: tenantId ?? '' },
    { skip: !tenantId }
  );

  const jobDepartmentId = jobData?.data.department?.[0]?.id;
  const { data: jobTitleCatalogue = [] } = useListTenantJobTitleCatalogueQuery(tenantId ?? '', {
    skip: !tenantId,
  });
  const { data: masterJobTypes = [] } = useListJobTypesQuery({
    isMaster: callerKind === 'platform',
  });
  const { jobOpeningDropdown: shiftOptions } = useJobOpeningDropdown('SHIFT', 'view');
  const { data: departmentJobTitles = [] } = useListTenantDepartmentJobTitlesQuery(
    { tenantId: tenantId ?? '', departmentId: String(jobDepartmentId) },
    { skip: !tenantId || !jobDepartmentId }
  );
  // organization-service's real culture-intro backend.
  const { data: tenantCultureIntro } = useGetTenantCultureIntroQuery(tenantId ?? '', {
    skip: !tenantId,
  });
  const locationData = viewData?.location;
  const fallbackOfficeLocation = jobData?.data?.officeLocation?.[0];
  const selectedOffice = offices.find((office) => idsMatch(office.office_id, locationData?.id));
  const isLocationDeactivated = Boolean(locationData?.id) && officesLoaded && !selectedOffice;

  const locationName = selectedOffice
    ? officeDisplayName(selectedOffice)
    : locationData?.name || '';
  const locationDisplayName = isLocationDeactivated
    ? `${locationName} (Deactivated)`
    : locationName;

  const departmentItems =
    jobData?.data.department?.map((item) => {
      const orgDepartment = orgDepartments.find((d) => idsMatch(d.org_department_id, item.id));
      return {
        name: orgDepartment?.name || item.departmentName,
        isDeactivated: Boolean(item.id) && !orgDepartment,
      };
    }) || [];

  const jobTitleItems =
    jobData?.data.jobTitle?.map((item) => {
      const catalogueTitle = jobTitleCatalogue.find((jt) => idsMatch(jt.job_title_id, item.id));
      const departmentTitle = departmentJobTitles.find(
        (jt) =>
          idsMatch(tenantJobTitleFormId(jt), item.id) || idsMatch(jt.org_job_title_id, item.id)
      );
      return {
        name: catalogueTitle?.name || departmentTitle?.name || item.jobTypeName,
        isDeactivated: false,
      };
    }) || [];
  const jobTypeName =
    jobData?.data.jobType
      ?.map((item) => {
        const catalogueType = masterJobTypes.find((jobType) => idsMatch(jobType.id, item.id));
        return catalogueType?.job_type_name || item.jobTypeName;
      })
      .filter(Boolean)
      .join(', ') || '';
  const shiftName = jobData?.data.shiftId
    ? shiftOptions.find((option) => idsMatch(option.id, jobData.data.shiftId))?.name || ''
    : '';
  const locationCode = selectedOffice?.location_code || locationData?.code || '';
  const locationAddressLine1 = selectedOffice?.address_line_1 || locationData?.addressLine1 || '';
  const locationAddressLine2 = selectedOffice?.address_line_2 || locationData?.addressLine2 || '';
  const locationCity =
    selectedOffice?.city || locationData?.city || fallbackOfficeLocation?.city?.name || '';
  const locationState =
    selectedOffice?.state || locationData?.state || fallbackOfficeLocation?.state?.name || '';
  const locationCountry =
    selectedOffice?.country || locationData?.country || fallbackOfficeLocation?.country?.name || '';
  const locationZipCode =
    selectedOffice?.zip_code || locationData?.zipCode || locationData?.zip || '';
  const cultureInfoText = String(tenantCultureIntro?.intro_text || '').trim();
  const hasCultureInfo = Boolean(cultureInfoText);
  const selectedLocationIdForUsers = locationData?.id;
  const isRemoteJob = jobData?.data?.isRemote ?? false;

  const { jobOpeningDropdown: hiringManagerOptions } = useJobOpeningDropdown(
    'HIRING_MANAGER',
    'edit',
    jobId,
    !selectedLocationIdForUsers && !isRemoteJob,
    isRemoteJob ? undefined : selectedLocationIdForUsers,
    isRemoteJob
  );
  const { jobOpeningDropdown: recruiterOptions } = useJobOpeningDropdown(
    'RECRUITER',
    'edit',
    jobId,
    !selectedLocationIdForUsers && !isRemoteJob,
    isRemoteJob ? undefined : selectedLocationIdForUsers,
    isRemoteJob
  );
  const { jobOpeningDropdown: languageOptions } = useJobOpeningDropdown('LANGUAGE', 'edit', jobId);
  const { jobOpeningDropdown: educationPreferenceOptions } = useJobOpeningDropdown(
    'EDUCATION_PREFERENCE',
    'edit',
    jobId
  );
  const selectedLanguageNames = (jobData?.data?.languages ?? [])
    .map((id) => languageOptions.find((option) => idsMatch(option.id, id))?.name)
    .filter((name): name is string => Boolean(name));

  // Hiring-manager/recruiter ids are UUIDs, not numbers — normalize to strings
  // and compare with `idsMatch` like the other dropdowns in this file.
  const normalizeIdArray = (values: unknown[]): string[] =>
    values
      .map((value) => {
        if (typeof value === 'object' && value !== null) {
          const idFromObject = (value as { id?: unknown }).id;
          return idFromObject != null ? String(idFromObject) : null;
        }
        return value != null ? String(value) : null;
      })
      .filter((value): value is string => value !== null);

  const selectedHiringManagerIds = useMemo(
    () =>
      Array.isArray(jobData?.data?.hiringManagers)
        ? normalizeIdArray(jobData.data.hiringManagers)
        : jobData?.data?.hiringManager?.id
          ? [String(jobData.data.hiringManager.id)]
          : [],
    [jobData]
  );

  const selectedRecruiterIds = useMemo(
    () =>
      Array.isArray(jobData?.data?.recruiters)
        ? normalizeIdArray(jobData.data.recruiters)
        : jobData?.data?.recruiter?.id
          ? [String(jobData.data.recruiter.id)]
          : [],
    [jobData]
  );

  const selectedHiringManagers = useMemo(
    () =>
      hiringManagerOptions.filter((option) =>
        selectedHiringManagerIds.some((id) => idsMatch(option.id, id))
      ),
    [hiringManagerOptions, selectedHiringManagerIds]
  );

  const selectedRecruiters = useMemo(
    () =>
      recruiterOptions.filter((option) =>
        selectedRecruiterIds.some((id) => idsMatch(option.id, id))
      ),
    [recruiterOptions, selectedRecruiterIds]
  );

  const hiringManagerMaxTagPlaceholder = (omittedValues: { value: number | string }[]) => (
    <span>
      {omittedValues.length} of {hiringManagerOptions.length} hiring managers selected
    </span>
  );

  const recruiterMaxTagPlaceholder = (omittedValues: { value: number | string }[]) => (
    <span>
      {omittedValues.length} of {recruiterOptions.length} recruiters selected
    </span>
  );

  return (
    <>
      {isLoading && <Loader />}
      <Form layout="vertical" autoComplete="off">
        <div className="mt-2 pb-4 border-b border-neutral-100">
          <div className="w-full flex items-center gap-2">
            <span className="bg-primary-50 text-primary-600 p-1.5 rounded-lg flex items-center justify-center">
              <TbBriefcase2 size={16} />
            </span>
            <span className="text-base font-bold text-neutral-900 font-display">Job Info</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-2">
            <Form.Item
              label={
                <span>
                  Job ID <span className="required-asterisk">*</span>
                </span>
              }
            >
              <Input
                type="text"
                className="w-full mt-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={jobData?.data.jobProfileCode || ''}
                disabled
              />
            </Form.Item>
            <Form.Item
              label={
                <span>
                  Department <span className="required-asterisk">*</span>
                </span>
              }
            >
              <div className="w-full p-2 mt-1 bg-white border rounded-3xl border-[var(--border)] text-gray-400 flex flex-wrap items-center gap-x-1 min-h-[38px]">
                {departmentItems.length > 0
                  ? departmentItems.map((dept, index) => (
                      <span key={index}>
                        {index > 0 && <span className="mr-1">,</span>}
                        <span>{dept.name}</span>
                        {dept.isDeactivated && (
                          <span className="ml-1 text-xs italic text-gray-400">(Deactivated)</span>
                        )}
                      </span>
                    ))
                  : null}
              </div>
            </Form.Item>
            <Form.Item
              label={
                <span>
                  Job Title <span className="required-asterisk">*</span>
                </span>
              }
            >
              <div className="w-full p-2 mt-1 bg-white border rounded-3xl border-[var(--border)] text-gray-400 flex flex-wrap items-center gap-x-1 min-h-[38px]">
                {jobTitleItems.length > 0
                  ? jobTitleItems.map((jt, index) => (
                      <span key={index}>
                        {index > 0 && <span className="mr-1">,</span>}
                        <span>{jt.name}</span>
                        {jt.isDeactivated && (
                          <span className="ml-1 text-xs italic text-gray-400">(Deactivated)</span>
                        )}
                      </span>
                    ))
                  : null}
              </div>
            </Form.Item>

            <Form.Item
              label={
                <span>
                  Job Type <span className="required-asterisk">*</span>
                </span>
              }
            >
              <Input
                type="text"
                className="w-full mt-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={jobTypeName}
                disabled
              />
            </Form.Item>
            <Form.Item label={<span>Shift</span>}>
              <Input
                type="text"
                className="w-full mt-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={shiftName}
                disabled
              />
            </Form.Item>
            <Form.Item label={<span>Communication Language</span>}>
              <Input
                type="text"
                className="w-full mt-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={selectedLanguageNames.length ? selectedLanguageNames.join(', ') : '-'}
                disabled
              />
            </Form.Item>
          </div>

          <div className="mt-2 max-w-[33%]">
            <div className="flex items-center gap-2">
              <span className="text-sm capitalize">Company Culture</span>
              <Tooltip
                trigger={['hover', 'click']}
                title={hasCultureInfo ? cultureInfoText : 'No company culture information provided'}
              >
                <button
                  type="button"
                  aria-label="View company culture information"
                  className="inline-flex items-center justify-center text-gray-500 hover:text-[var(--color-primary)] cursor-pointer"
                >
                  <InfoCircleOutlined />
                </button>
              </Tooltip>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Switch
                checked={Boolean(jobData?.data?.useCultureIntro)}
                disabled
                style={{
                  backgroundColor: jobData?.data?.useCultureIntro
                    ? 'var(--color-primary)'
                    : undefined,
                }}
              />
              <span className="text-sm text-gray-500">
                Play Company Culture Introduction at the start of AI Audio Screening and AI Video
                Interview
              </span>
            </div>
          </div>
        </div>
        <div className="mt-2 pb-4 border-b border-neutral-100">
          <div className="w-full flex items-center gap-2">
            <span className="bg-primary-50 text-primary-600 p-1.5 rounded-lg flex items-center justify-center">
              <MdOutlineLocationOn size={16} />
            </span>
            <span className="text-base font-bold text-neutral-900 font-display">Location</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-2">
            <Form.Item
              label={
                <span>
                  Location Name <span className="required-asterisk">*</span>
                </span>
              }
            >
              <Input
                className="w-full mt-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={locationDisplayName}
                disabled
              />
            </Form.Item>

            <Form.Item label={<span>Location Code</span>}>
              <Input
                className="w-full mt-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={locationCode}
                disabled
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-2">
            <Form.Item label={<span>Address Line 1</span>}>
              <Input
                className="w-full mt-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={locationAddressLine1}
                disabled
              />
            </Form.Item>
            <Form.Item label={<span>Address Line 2</span>}>
              <Input
                className="w-full mt-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={locationAddressLine2}
                disabled
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-2">
            <Form.Item label={<span>City</span>}>
              <Input
                className="w-full mt-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={locationCity}
                disabled
              />
            </Form.Item>
            <Form.Item label={<span>State</span>}>
              <Input
                className="w-full mt-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={locationState}
                disabled
              />
            </Form.Item>
            <Form.Item label={<span>Zip Code</span>}>
              <Input
                className="w-full mt-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={locationZipCode}
                disabled
              />
            </Form.Item>
            <Form.Item label={<span>Country</span>}>
              <Input
                className="w-full mt-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={locationCountry}
                disabled
              />
            </Form.Item>
          </div>
        </div>
        <div className="mt-2 pb-4 border-b border-neutral-100">
          <div className="w-full flex items-center gap-2">
            <span className="bg-primary-50 text-primary-600 p-1.5 rounded-lg flex items-center justify-center">
              <MdOutlineGroups size={16} />
            </span>
            <span className="text-base font-bold text-neutral-900 font-display">Hiring Panel</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-2">
            <Form.Item label={<span>Hiring Manager</span>}>
              <div className="space-y-3">
                <DropdownWithAddOption
                  className="w-full custom-select-jobs placeholder-style"
                  value={selectedHiringManagerIds}
                  onChange={() => {}}
                  options={hiringManagerOptions}
                  placeholder="No hiring managers assigned"
                  type="hiringManagers"
                  mode="multiple"
                  maxTagCount={0}
                  maxTagPlaceholder={hiringManagerMaxTagPlaceholder}
                  disabled
                  enableEditDelete={false}
                />

                {selectedHiringManagers.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-40 overflow-auto pr-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Selected Hiring Managers
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedHiringManagers.map((manager) => (
                        <span
                          key={manager.id}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                            manager.isDeleted
                              ? 'bg-gray-100 text-gray-600 border-gray-300'
                              : 'bg-brand-100 text-brand-800 border-brand-200'
                          }`}
                        >
                          {manager.name}
                          {manager.isDeleted && (
                            <span className="ml-2 text-xs italic">(Deactivated)</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Form.Item>
            <Form.Item label={<span>Recruiter</span>}>
              <div className="space-y-3">
                <DropdownWithAddOption
                  className="w-full custom-select-jobs placeholder-style"
                  value={selectedRecruiterIds}
                  onChange={() => {}}
                  options={recruiterOptions}
                  placeholder="No recruiters assigned"
                  type="recruiters"
                  mode="multiple"
                  maxTagCount={0}
                  maxTagPlaceholder={recruiterMaxTagPlaceholder}
                  disabled
                  enableEditDelete={false}
                />

                {selectedRecruiters.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-40 overflow-auto pr-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Selected Recruiters</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedRecruiters.map((recruiter) => (
                        <span
                          key={recruiter.id}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                            recruiter.isDeleted
                              ? 'bg-gray-100 text-gray-600 border-gray-300'
                              : 'bg-brand-100 text-brand-800 border-brand-200'
                          }`}
                        >
                          {recruiter.name}
                          {recruiter.isDeleted && (
                            <span className="ml-2 text-xs italic">(Deactivated)</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Form.Item>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-2">
            <Form.Item
              label={
                <span>
                  Open Date <span className="required-asterisk">*</span>
                </span>
              }
            >
              <Input
                type="text"
                className="w-full mt-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={
                  // openDate is an ISO 8601 string; let dayjs parse it natively.
                  jobData?.data.openDate && dayjs(jobData.data.openDate).isValid()
                    ? dayjs(jobData.data.openDate).format('MMMM D, YYYY')
                    : ''
                }
                disabled
              />
            </Form.Item>
            <Form.Item
              label={
                <span>
                  Opening(s) <span className="required-asterisk">*</span>
                </span>
              }
            >
              <Input
                type="text"
                className="w-full mt-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={jobData?.data.openings || ''}
                disabled
              />
            </Form.Item>
          </div>
        </div>
        <div className="mt-2 pb-4 border-b border-neutral-100">
          <div className="w-full flex items-center gap-2">
            <span className="bg-primary-50 text-primary-600 p-1.5 rounded-lg flex items-center justify-center">
              <MdOutlineAttachMoney size={16} />
            </span>
            <span className="text-base font-bold text-neutral-900 font-display">Salary</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 mt-2">
            {(jobData?.data.exemptMinSalary != null || jobData?.data.exemptMaxSalary != null) && (
              <div>
                <span className="text-sm font-semibold text-neutral-700">Exempt - Annual</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-1">
                  <Form.Item label={<span>Minimum Salary (in USD)</span>}>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: '#111827', fontWeight: 600, fontSize: '13px' }}>
                        {formatSalary(jobData?.data.exemptMinSalary)}
                      </span>
                      {jobData?.data.exemptMinSalary != null && (
                        <span className="shrink-0 text-xs font-semibold text-neutral-500">
                          /year
                        </span>
                      )}
                    </div>
                  </Form.Item>
                  <Form.Item label={<span>Maximum Salary (in USD)</span>}>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: '#111827', fontWeight: 600, fontSize: '13px' }}>
                        {formatSalary(jobData?.data.exemptMaxSalary)}
                      </span>
                      {jobData?.data.exemptMaxSalary != null && (
                        <span className="shrink-0 text-xs font-semibold text-neutral-500">
                          /year
                        </span>
                      )}
                    </div>
                  </Form.Item>
                </div>
              </div>
            )}
            {(jobData?.data.nonExemptMinSalary != null ||
              jobData?.data.nonExemptMaxSalary != null) && (
              <div>
                <span className="text-sm font-semibold text-neutral-700">Non-Exempt - Hourly</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-1">
                  <Form.Item label={<span>Minimum Salary (in USD)</span>}>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: '#111827', fontWeight: 600, fontSize: '13px' }}>
                        {formatSalary(jobData?.data.nonExemptMinSalary)}
                      </span>
                      {jobData?.data.nonExemptMinSalary != null && (
                        <span className="shrink-0 text-xs font-semibold text-neutral-500">/hr</span>
                      )}
                    </div>
                  </Form.Item>
                  <Form.Item label={<span>Maximum Salary (in USD)</span>}>
                    <div className="flex items-center gap-1.5">
                      <span style={{ color: '#111827', fontWeight: 600, fontSize: '13px' }}>
                        {formatSalary(jobData?.data.nonExemptMaxSalary)}
                      </span>
                      {jobData?.data.nonExemptMaxSalary != null && (
                        <span className="shrink-0 text-xs font-semibold text-neutral-500">/hr</span>
                      )}
                    </div>
                  </Form.Item>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="form-grid-equal-labels grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-2">
          <Form.Item label={<span>Referral Bonus (in USD)</span>}>
            <CurrencyInput
              value={jobData?.data.referralBonus || ''}
              disableGroupSeparators
              decimalsLimit={2}
              decimalScale={2}
              disabled
              prefix="$"
              // A referral bonus is always a flat one-time payment, never an hourly rate.
              // placeholder="Referral Bonus"
              className="w-full !lowercase"
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                boxShadow: 'none',
                color: '#111827',
                fontWeight: 600,
                fontSize: '14px',
              }}
              intlConfig={{ locale: 'en-US', currency: 'USD' }}
            />
          </Form.Item>
          <Form.Item
            label={
              <span>
                Minimum Experience (In years) <span className="required-asterisk">*</span>
              </span>
            }
          >
            <Input
              type="text"
              className="w-full mt-1"
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                boxShadow: 'none',
                color: '#111827',
                fontWeight: 600,
                fontSize: '14px',
              }}
              value={jobData?.data.minExperience ?? ''}
              disabled
            />
          </Form.Item>
          <Form.Item label={<span>Maximum Experience (In years)</span>}>
            <Input
              type="text"
              className="w-full mt-1"
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                boxShadow: 'none',
                color: '#111827',
                fontWeight: 600,
                fontSize: '14px',
              }}
              value={jobData?.data.maxExperience ?? ''}
              disabled
            />
          </Form.Item>
        </div>
        <div className="mt-2 pb-4 border-b border-neutral-100">
          <div className="w-full flex items-center gap-2">
            <span className="bg-primary-50 text-primary-600 p-1.5 rounded-lg flex items-center justify-center">
              <MdOutlineStars size={16} />
            </span>
            <span className="text-base font-bold text-neutral-900 font-display">Job Skills</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-2">
            <Form.Item label={<span>Required Skills</span>}>
              <Input
                type="text"
                className="w-full mt-1 mb-2"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={
                  jobData?.data.mandatorySkills?.length
                    ? `${jobData.data.mandatorySkills.length} skills selected`
                    : ''
                }
                disabled
              />
              {jobData?.data.mandatorySkills?.length ? (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-40 overflow-auto pr-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Selected Required Skills
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {jobData.data.mandatorySkills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-brand-100 text-brand-800 border border-brand-200 rounded-full text-xs font-medium"
                      >
                        {skill.skillName}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </Form.Item>

            <Form.Item label={<span>Optional Skills</span>}>
              <Input
                type="text"
                className="w-full mt-1 mb-2"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={
                  jobData?.data.optionalSkills?.length
                    ? `${jobData.data.optionalSkills.length} skills selected`
                    : ''
                }
                disabled
              />
              {jobData?.data.optionalSkills?.length ? (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-40 overflow-auto pr-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Selected Optional Skills
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {jobData.data.optionalSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-brand-100 text-brand-800 border border-brand-200 rounded-full text-xs font-medium"
                      >
                        {skill.skillName}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-2">
            <Form.Item label={<span>Education Preference</span>}>
              <Input
                type="text"
                className="w-full mt-1"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  boxShadow: 'none',
                  color: '#111827',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
                value={
                  jobData?.data.educationPreference
                    ?.map(
                      (item) =>
                        educationPreferenceOptions.find((option) => idsMatch(option.id, item.id))
                          ?.name || ''
                    )
                    .filter(Boolean)
                    .join(', ') || ''
                }
                disabled
              />
            </Form.Item>

            <Form.Item label={<span>Responsibilities</span>}>
              <TextArea
                rows={4}
                className="w-full"
                style={{
                  background: 'var(--color-neutral-25)',
                  border: '1px solid var(--color-neutral-100)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: '#374151',
                  resize: 'none',
                }}
                value={jobData?.data.responsibilities || ''}
                disabled
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols gap-4">
            <Form.Item label={<span>Other Requirements</span>}>
              <TextArea
                rows={4}
                className="w-full"
                style={{
                  background: 'var(--color-neutral-25)',
                  border: '1px solid var(--color-neutral-100)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: '#374151',
                  resize: 'none',
                }}
                value={jobData?.data.otherRequirements || ''}
                disabled
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols gap-4">
            <Form.Item label={<span>Benefits</span>}>
              <TextArea
                rows={4}
                className="w-full"
                style={{
                  background: 'var(--color-neutral-25)',
                  border: '1px solid var(--color-neutral-100)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  color: '#374151',
                  resize: 'none',
                }}
                value={jobData?.data.benefits || ''}
                disabled
              />
            </Form.Item>
          </div>
        </div>
      </Form>
    </>
  );
};

export default ViewJobDetails;
