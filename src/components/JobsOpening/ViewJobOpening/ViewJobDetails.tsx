import { InfoCircleOutlined } from '@ant-design/icons';
import { Form, Switch, Tooltip } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Input } from '../../shared';
import DropdownWithAddOption from '../../shared/ui/DropdownWithAddOption';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { useGetCompanyDetailsQuery } from '../../../api/tenant-service/Company/viewCompany';
import {
  useGetDepartmentsQuery,
  useGetDepartmentJobTitlesQuery,
} from '../../../api/tenant-service/MyCompany/departments';
import useJobOpeningDropdown from '../../../hooks/useJobOpeningDropdown';
import { useParams } from 'react-router-dom';
import { lazy, useEffect, useMemo } from 'react';
import { Loader } from '../../shared/ui/loader';
import dayjs from 'dayjs';
import { JobOpeningByIdResponse } from '../../../types';

const CurrencyInput = lazy(() => import('react-currency-input-field'));

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
  const jobId = Number(id);
  const {
    data: jobData,
    isLoading,
    refetch,
  } = useGetJobOpeningByIdQuery({ jobOpeningId: Number(jobId) });
  useEffect(() => {
    refetch();
  }, [refetch]);

  const viewData = jobData?.data as ViewJobData | undefined;
  const companyId = viewData?.location?.companyId;

  const { data: departmentsResponse } = useGetDepartmentsQuery({ page: 0, size: 1000 });

  const jobDepartmentId = jobData?.data.department?.[0]?.id;
  const { data: jobTitlesData } = useGetDepartmentJobTitlesQuery(
    { departmentId: Number(jobDepartmentId) },
    { skip: !jobDepartmentId }
  );
  const { data: companyDetails } = useGetCompanyDetailsQuery(
    { companyId: Number(companyId) },
    { skip: !companyId }
  );
  const locationData = viewData?.location;
  const fallbackOfficeLocation = jobData?.data?.officeLocation?.[0];
  const isLocationDeactivated = locationData?.status === false;

  const locationName = locationData?.name || '';
  const locationDisplayName = isLocationDeactivated
    ? `${locationName} (Deactivated)`
    : locationName;

  const departmentItems =
    jobData?.data.department?.map((item) => {
      const apiDepartment = departmentsResponse?.content?.find((d) => d.id === item.id);
      const isDeactivated = apiDepartment ? apiDepartment.status !== 'ACTIVE' : false;
      return { name: item.departmentName, isDeactivated };
    }) || [];

  const jobTitleItems =
    jobData?.data.jobTitle?.map((item) => {
      const apiJobTitle = jobTitlesData?.find((jt) => jt.id === item.id);
      const isDeactivated = apiJobTitle ? apiJobTitle.status !== 'ACTIVE' : false;
      return { name: item.jobTypeName, isDeactivated };
    }) || [];
  const locationCode = locationData?.code || '';
  const locationAddressLine1 = locationData?.addressLine1 || '';
  const locationAddressLine2 = locationData?.addressLine2 || '';
  const locationCity = locationData?.city || fallbackOfficeLocation?.city?.name || '';
  const locationState = locationData?.state || fallbackOfficeLocation?.state?.name || '';
  const locationCountry = locationData?.country || fallbackOfficeLocation?.country?.name || '';
  const locationZipCode = locationData?.zipCode || locationData?.zip || '';
  const cultureInfoText = String(companyDetails?.cultureIntroText || '').trim();
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

  const normalizeIdArray = (values: unknown[]): number[] =>
    values
      .map((value) => {
        if (typeof value === 'object' && value !== null) {
          const idFromObject = Number((value as { id?: unknown }).id);
          return Number.isFinite(idFromObject) ? idFromObject : null;
        }
        const idFromValue = Number(value);
        return Number.isFinite(idFromValue) ? idFromValue : null;
      })
      .filter((value): value is number => value !== null);

  const selectedHiringManagerIds = useMemo(
    () =>
      Array.isArray(jobData?.data?.hiringManagers)
        ? normalizeIdArray(jobData.data.hiringManagers)
        : jobData?.data?.hiringManager?.id
          ? [Number(jobData.data.hiringManager.id)]
          : [],
    [jobData]
  );

  const selectedRecruiterIds = useMemo(
    () =>
      Array.isArray(jobData?.data?.recruiters)
        ? normalizeIdArray(jobData.data.recruiters)
        : jobData?.data?.recruiter?.id
          ? [Number(jobData.data.recruiter.id)]
          : [],
    [jobData]
  );

  const selectedHiringManagers = useMemo(
    () =>
      hiringManagerOptions.filter((option) => selectedHiringManagerIds.includes(Number(option.id))),
    [hiringManagerOptions, selectedHiringManagerIds]
  );

  const selectedRecruiters = useMemo(
    () => recruiterOptions.filter((option) => selectedRecruiterIds.includes(Number(option.id))),
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
        <div className="mt-2">
          <div className="w-full">
            <span className="text-lg font-semibold">Job Info</span>
          </div>
          <div className="grid grid-cols-3 gap-x-4 mt-2">
            <Form.Item
              label={
                <span>
                  Job ID <span className="required-asterisk">*</span>
                </span>
              }
            >
              <Input
                type="text"
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
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
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={jobData?.data.jobType?.map((item) => item.jobTypeName).join(', ') || ''}
                disabled
              />
            </Form.Item>
            <Form.Item label={<span>Shift</span>}>
              <Input
                type="text"
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={jobData?.data.shift || ''}
                disabled
              />
            </Form.Item>
            <Form.Item label={<span>Communication Language</span>}>
              <div className="flex items-center min-h-[44px]">
                <Switch
                  checked={jobData?.data?.isMultilingual || false}
                  disabled
                  style={{
                    backgroundColor: jobData?.data?.isMultilingual
                      ? 'var(--color-primary)'
                      : undefined,
                  }}
                />
                <label className="ml-2 text-sm cursor-pointer">Bilingual</label>
              </div>
            </Form.Item>
          </div>

          <div className="mt-2 max-w-[33%]">
            <div className="flex items-center gap-2">
              <label className="text-sm capitalize">Company Culture</label>
              <Tooltip
                trigger={['hover', 'click']}
                title={hasCultureInfo ? cultureInfoText : 'No company culture information provided'}
              >
                <button
                  type="button"
                  aria-label="View company culture information"
                  className="inline-flex items-center justify-center text-gray-500 hover:text-[var(--color-primary)]"
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
                Play Company Culture Introduction at the start of AI Audio Screening
              </span>
            </div>
          </div>
        </div>
        <div className="mt-2">
          <div className="w-full">
            <span className="text-lg font-semibold">Location</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Switch
              checked={isRemoteJob}
              disabled
              style={{ backgroundColor: isRemoteJob ? 'var(--color-primary)' : undefined }}
            />
            <span className="text-sm text-gray-700">Remote Job</span>
          </div>
          <div className="grid grid-cols-3 gap-x-4 mt-2">
            <Form.Item
              label={
                <span>
                  Location Name <span className="required-asterisk">*</span>
                </span>
              }
            >
              <Input
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={locationDisplayName}
                disabled
              />
            </Form.Item>

            <Form.Item label={<span>Location Code</span>}>
              <Input
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={locationCode}
                disabled
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-x-4 mt-2">
            <Form.Item label={<span>Address Line 1</span>}>
              <Input
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={locationAddressLine1}
                disabled
              />
            </Form.Item>
            <Form.Item label={<span>Address Line 2</span>}>
              <Input
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={locationAddressLine2}
                disabled
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-x-4 mt-2">
            <Form.Item label={<span>City</span>}>
              <Input
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={locationCity}
                disabled
              />
            </Form.Item>
            <Form.Item label={<span>State</span>}>
              <Input
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={locationState}
                disabled
              />
            </Form.Item>
            <Form.Item label={<span>Zip Code</span>}>
              <Input
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={locationZipCode}
                disabled
              />
            </Form.Item>
            <Form.Item label={<span>Country</span>}>
              <Input
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={locationCountry}
                disabled
              />
            </Form.Item>
          </div>
        </div>
        <div className="mt-2">
          <div className="w-full">
            <span className="text-lg font-semibold">Hiring Panel</span>
          </div>
          <div className="grid grid-cols-3 gap-x-4 mt-2">
            <Form.Item
              label={
                <span>
                  Hiring Manager <span className="required-asterisk">*</span>
                </span>
              }
            >
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
                              : 'bg-blue-100 text-blue-800 border-blue-200'
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
                              : 'bg-blue-100 text-blue-800 border-blue-200'
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
          <div className="grid grid-cols-3 gap-x-4 mt-2">
            <Form.Item
              label={
                <span>
                  Open Date <span className="required-asterisk">*</span>
                </span>
              }
            >
              <Input
                type="text"
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={
                  jobData?.data.openDate
                    ? dayjs(jobData.data.openDate, 'DD-MM-YYYY').format('MMM DD, YYYY')
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
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={jobData?.data.openings || ''}
                disabled
              />
            </Form.Item>
          </div>
        </div>
        <div className="mt-2">
          <div className="w-full">
            <span className="text-lg font-semibold">Salary Status</span>
          </div>
          <div className="grid grid-cols-3 gap-x-4 mt-2">
            <Form.Item
              label={
                <span>
                  Exemption Status <span className="required-asterisk">*</span>
                </span>
              }
            >
              <Input
                type="text"
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={jobData?.data.exemptionStatus?.statusName || ''}
                disabled
              />
            </Form.Item>
            <Form.Item
              label={
                <span>
                  Minimum Salary (in USD) <span className="required-asterisk">*</span>
                </span>
              }
            >
              <CurrencyInput
                value={jobData?.data.minSalary || ''}
                disableGroupSeparators
                decimalsLimit={2}
                decimalScale={2}
                disabled
                prefix="$"
                suffix={jobData?.data.exemptionStatus?.statusName === 'Exempt' ? '' : '/hr'}
                placeholder="Minimum Salary"
                className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)] text-gray-500"
                intlConfig={{ locale: 'en-US', currency: 'USD' }}
              />
              {/* <Input
                type="text"
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={jobData?.data.minSalary || ''}
                disabled
              /> */}
            </Form.Item>
            <Form.Item
              label={
                <span>
                  Maximum Salary (in USD) <span className="required-asterisk">*</span>
                </span>
              }
            >
              <CurrencyInput
                value={jobData?.data.maxSalary || ''}
                disableGroupSeparators
                decimalsLimit={2}
                decimalScale={2}
                disabled
                prefix="$"
                suffix={jobData?.data.exemptionStatus?.statusName === 'Exempt' ? '' : '/hr'}
                placeholder="Maximum Salary"
                className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)] text-gray-500"
                intlConfig={{ locale: 'en-US', currency: 'USD' }}
              />
              {/* <Input
                type="text"
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={jobData?.data.maxSalary || ''}
                disabled
              /> */}
            </Form.Item>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-x-4 mt-2">
          <Form.Item label={<span>Referral Bonus(in USD)</span>}>
            <CurrencyInput
              value={jobData?.data.referralBonus || ''}
              disableGroupSeparators
              decimalsLimit={2}
              decimalScale={2}
              disabled
              prefix="$"
              suffix={jobData?.data.exemptionStatus?.statusName === 'Exempt' ? '' : '/hr'}
              // placeholder="Referral Bonus"
              className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)] text-gray-500"
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
              className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
              value={jobData?.data.minExperience ?? ''}
              disabled
            />
          </Form.Item>
          <Form.Item label={<span>Maximum Experience (In years)</span>}>
            <Input
              type="text"
              className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
              value={jobData?.data.maxExperience ?? ''}
              disabled
            />
          </Form.Item>
        </div>
        <div className="mt-2">
          <div className="w-full">
            <span className="text-lg font-semibold">Job Skills</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 mt-2">
            <Form.Item
              label={
                <span>
                  Required Skills <span className="required-asterisk">*</span>
                </span>
              }
            >
              <Input
                type="text"
                className="w-full p-2 mt-1 mb-4 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
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
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-xs font-medium"
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
                className="w-full p-2 mt-1 mb-4 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
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
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-xs font-medium"
                      >
                        {skill.skillName}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-x-4 mt-2">
            <Form.Item
              label={
                <span>
                  Education Preference <span className="required-asterisk">*</span>
                </span>
              }
            >
              <Input
                type="text"
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={
                  jobData?.data.educationPreference
                    ?.map((item) => item.educationLevel)
                    .join(', ') || ''
                }
                disabled
              />
            </Form.Item>

            <Form.Item label={<span>Responsibilities</span>}>
              <TextArea
                rows={4}
                className="w-full px-4 py-2 border text-gray-500 rounded-lg border-[var(--border)]"
                style={{ backgroundColor: '#ffffff', color: '#6b7280' }}
                value={jobData?.data.responsibilities || ''}
                disabled
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols gap-4">
            <Form.Item label={<span>Other Requirements</span>}>
              <TextArea
                rows={4}
                className="w-full px-4 py-2 border text-gray-500 rounded-lg border-[var(--border)]"
                style={{ backgroundColor: '#ffffff', color: '#6b7280' }}
                value={jobData?.data.otherRequirements || ''}
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
