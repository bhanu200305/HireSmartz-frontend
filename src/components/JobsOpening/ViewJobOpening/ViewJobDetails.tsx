import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
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
import { useListUsersQuery } from '../../../api/organization-service/Users/users';
import { useSessionTenantId } from '../../../hooks/useSessionTenantId';
import { useParams } from 'react-router-dom';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Loader } from '../../shared/ui/loader';
import dayjs from 'dayjs';
import { JobOpeningByIdResponse } from '../../../types';
import { asJobId } from '../../../api/job-service/jobId';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/provider/store';

const formatSalary = (value: number | string | null | undefined): string =>
  value == null || value === ''
    ? ''
    : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value));

const formatSalaryRange = (
  min: number | string | null | undefined,
  max: number | string | null | undefined,
  unit: string
): string => {
  if (min != null && max != null) return `${formatSalary(min)} - ${formatSalary(max)} ${unit}`;
  if (min != null) return `From ${formatSalary(min)} ${unit}`;
  if (max != null) return `Up to ${formatSalary(max)} ${unit}`;
  return '';
};

const formatExperience = (
  min: number | string | null | undefined,
  max: number | string | null | undefined
): string => {
  if (min != null && min !== '' && max != null && max !== '') return `${min} - ${max} years`;
  if (min != null && min !== '') return `${min}+ years`;
  if (max != null && max !== '') return `Up to ${max} years`;
  return '';
};

type ChipItem = { key: string; label: string; deactivated?: boolean; muted?: boolean };

const toSkillChip = (skill: { skillName: string }, index: number): ChipItem => ({
  key: `${skill.skillName}-${index}`,
  label: skill.skillName,
});

const EMPTY_VALUE = <span className="font-normal text-gray-400">-</span>;

const Section = ({
  title,
  last = false,
  children,
}: {
  title: string;
  last?: boolean;
  children: ReactNode;
}) => (
  <section className={`py-5 ${last ? '' : 'border-b border-neutral-100'}`}>
    <h3 className="m-0 font-display text-base font-bold text-neutral-900">{title}</h3>
    <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  </section>
);

const Field = ({
  label,
  value,
  info,
  className = '',
  children,
}: {
  label: string;
  value?: ReactNode;
  info?: ReactNode;
  className?: string;
  children?: ReactNode;
}) => {
  const content = children ?? value;
  const isEmpty = content == null || content === '' || content === false;
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
        {label}
        {info}
      </div>
      <div className="break-words text-sm font-semibold text-gray-900">
        {isEmpty ? EMPTY_VALUE : content}
      </div>
    </div>
  );
};

const ChipList = ({ items, tone = 'brand' }: { items: ChipItem[]; tone?: 'brand' | 'neutral' }) => {
  if (items.length === 0) return EMPTY_VALUE;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.key}
          className={`inline-flex cursor-default items-center rounded-md px-2.5 py-1 text-xs font-medium ${
            item.deactivated || item.muted || tone === 'neutral'
              ? 'bg-gray-100 text-gray-600'
              : 'bg-brand-50 text-brand-800'
          }`}
        >
          {item.label}
          {item.deactivated && <span className="ml-1.5 italic">(Deactivated)</span>}
        </span>
      ))}
    </div>
  );
};

const SkillBox = ({ items }: { items: ChipItem[] }) => {
  if (items.length === 0) return EMPTY_VALUE;
  return (
    <div className="max-h-40 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3 pr-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.key}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
              item.deactivated
                ? 'border-gray-300 bg-gray-100 text-gray-600'
                : 'border-brand-200 bg-brand-100 text-brand-800'
            }`}
          >
            {item.label}
            {item.deactivated && <span className="ml-2 text-xs italic">(Deactivated)</span>}
          </span>
        ))}
      </div>
    </div>
  );
};

const TextTabs = ({ tabs }: { tabs: { label: string; text?: string | null }[] }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = tabs[activeIndex];
  return (
    <div className="col-span-full">
      <div role="tablist" className="mb-3 flex flex-wrap gap-6 border-b border-neutral-200">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            onClick={() => setActiveIndex(index)}
            className={`-mb-px cursor-pointer rounded-sm border-b-2 px-1 pb-2 font-display text-base font-bold outline-none focus-visible:ring-2 focus-visible:ring-primary-200 transition-colors ${
              index === activeIndex
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {active.text?.trim() ? (
        <p className="m-0 max-h-72 overflow-y-auto whitespace-pre-line rounded-xl bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-700">
          {active.text}
        </p>
      ) : (
        <div className="rounded-xl bg-gray-50 px-4 py-3">{EMPTY_VALUE}</div>
      )}
    </div>
  );
};

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
    ? shiftOptions.find((option) => idsMatch(option.id, jobData.data.shiftId))?.name ||
      'Unavailable shift'
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
  const selectedLanguageNames = (jobData?.data?.languages ?? []).map(
    (id) =>
      languageOptions.find((option) => idsMatch(option.id, id))?.name || 'Unavailable language'
  );
  // Unfiltered users, only to name people who no longer qualify for the pickers.
  const { data: allUsers } = useListUsersQuery({ limit: 200 }, { skip: !tenantId });

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

  // Show every saved assignment, even if no longer in the pickers.
  const toPeopleChips = (
    ids: string[],
    options: { id: string | number; name: string; isDeleted?: boolean }[]
  ): ChipItem[] =>
    ids.map((id) => {
      const option = options.find((o) => idsMatch(o.id, id));
      if (option) return { key: id, label: option.name, deactivated: Boolean(option.isDeleted) };
      const user = allUsers?.items?.find((u) => idsMatch(u.user_id, id));
      if (user) return { key: id, label: user.full_name || user.email, muted: true };
      return { key: id, label: 'Unavailable User', muted: true };
    });
  const hiringManagerChips = toPeopleChips(selectedHiringManagerIds, hiringManagerOptions);
  const recruiterChips = toPeopleChips(selectedRecruiterIds, recruiterOptions);

  const educationNames = (jobData?.data.educationPreference ?? [])
    .map(
      (item) =>
        educationPreferenceOptions.find((option) => idsMatch(option.id, item.id))?.name ||
        item.educationLevel
    )
    .filter(Boolean)
    .join(', ');

  const data = jobData?.data;

  return (
    <>
      {isLoading && <Loader />}
      <div className="flex flex-col">
        <Section title="Job Info">
          <Field label="Job ID" value={data?.jobProfileCode} />
          <Field label="Department">
            {departmentItems.length > 0
              ? departmentItems.map((dept, index) => (
                  <span key={index}>
                    {index > 0 && ', '}
                    {dept.name}
                    {dept.isDeactivated && (
                      <span className="ml-1 text-xs font-normal italic text-gray-400">
                        (Deactivated)
                      </span>
                    )}
                  </span>
                ))
              : null}
          </Field>
          <Field label="Job Title">
            {jobTitleItems.length > 0 ? jobTitleItems.map((jt) => jt.name).join(', ') : null}
          </Field>
          <Field label="Job Type" value={jobTypeName} />
          <Field label="Shift" value={shiftName} />
          <Field label="Communication Language" value={selectedLanguageNames.join(', ')} />
          <Field
            className="col-span-full"
            label="Company Culture Intro"
            info={
              <Tooltip
                trigger={['hover', 'click']}
                title={hasCultureInfo ? cultureInfoText : 'No company culture information provided'}
              >
                <button
                  type="button"
                  aria-label="View company culture information"
                  className="inline-flex cursor-pointer items-center text-gray-400 hover:text-[var(--color-primary)]"
                >
                  <InfoCircleOutlined />
                </button>
              </Tooltip>
            }
          >
            {data?.useCultureIntro
              ? 'On - plays at the start of AI Audio Screening and AI Video Interview'
              : 'Off'}
          </Field>
        </Section>

        <Section title="Location">
          <Field label="Location Name" value={locationDisplayName} />
          <Field label="Location Code" value={locationCode} />
          <Field label="Address Line 1" value={locationAddressLine1} />
          <Field label="Address Line 2" value={locationAddressLine2} />
          <Field label="City" value={locationCity} />
          <Field label="State" value={locationState} />
          <Field label="Zip Code" value={locationZipCode} />
          <Field label="Country" value={locationCountry} />
        </Section>

        <Section title="Hiring Panel">
          <Field label="Hiring Managers">
            <ChipList items={hiringManagerChips} />
          </Field>
          <Field label="Recruiters">
            <ChipList items={recruiterChips} />
          </Field>
        </Section>

        <Section title="Opening & Pay">
          <Field
            label="Open Date"
            value={
              // openDate is an ISO 8601 string; let dayjs parse it natively.
              data?.openDate && dayjs(data.openDate).isValid()
                ? dayjs(data.openDate).format('MMM D, YYYY')
                : ''
            }
          />
          <Field label="Openings" value={data?.openings} />
          <Field
            label="Experience"
            value={formatExperience(data?.minExperience, data?.maxExperience)}
          />
          {(data?.exemptMinSalary != null || data?.exemptMaxSalary != null) && (
            <Field
              label="Exempt (Annual)"
              value={formatSalaryRange(data?.exemptMinSalary, data?.exemptMaxSalary, '/ year')}
            />
          )}
          {(data?.nonExemptMinSalary != null || data?.nonExemptMaxSalary != null) && (
            <Field
              label="Non-Exempt (Hourly)"
              value={formatSalaryRange(data?.nonExemptMinSalary, data?.nonExemptMaxSalary, '/ hr')}
            />
          )}
          <Field label="Referral Bonus" value={formatSalary(data?.referralBonus)} />
        </Section>

        <Section title="Skills & Requirements" last>
          <div className="col-span-full grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <Field label="Required Skills">
              <SkillBox items={(data?.mandatorySkills ?? []).map(toSkillChip)} />
            </Field>
            <Field label="Optional Skills">
              <SkillBox items={(data?.optionalSkills ?? []).map(toSkillChip)} />
            </Field>
          </div>
          <Field className="col-span-full" label="Education Preference" value={educationNames} />
          <TextTabs
            tabs={[
              { label: 'Responsibilities', text: data?.responsibilities },
              { label: 'Other Requirements', text: data?.otherRequirements },
              { label: 'Benefits', text: data?.benefits },
            ]}
          />
        </Section>
      </div>
    </>
  );
};

export default ViewJobDetails;
