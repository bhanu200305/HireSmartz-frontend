import MainLayout from '../../../layouts/MainLayout';
import { scrollToFirstFormError } from '../../../shared/utils/scrollToFirstFormError';
import './addJob.css';
import { InfoCircleOutlined } from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';
import { Checkbox, DatePicker, Form, Select, Switch, Tooltip } from 'antd';
import { Button, Input, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import JobDetailsLayout from '../../../layouts/JobDetailsLayout';
import useJobOpeningDropdown, {
  type JobOpeningDropdownOption,
} from '../../../hooks/useJobOpeningDropdown';
import dayjs from 'dayjs';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { RootState } from '../../../redux/provider/store';
import { useDispatch, useSelector } from 'react-redux';
import { JobDetailsState } from '../../../types';
import { zodResolver } from '@hookform/resolvers/zod';
import { jobDetailsDraftSchema, jobDetailsSchema } from './AddJobSchema';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  setAiJobDescriptionId,
  setIsFormCompleted,
  setJobOpeningId,
  updateJobDescription,
  updateJobDetails,
} from '../../../redux/slices/jobOpeningSlice';
import { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { get } from 'lodash-es';
import DropdownWithAddOption from '../../shared/ui/DropdownWithAddOption';
import FillWithAiWidget from './FillWithAiWidget';
import { useUpdateJobOpeningMutation } from '../../../api/job-service/JobOpening/UpdateJobOpening';
import {
  useCreateEducationPreferenceMutation,
  useDeleteEducationPreferenceMutation,
  useUpdateEducationPreferenceMutation,
} from '../../../api/job-service/JobOpening/educationPreferences';
import {
  useGetJobDescriptionByIdQuery,
  useLazyGetJobDescriptionByIdQuery,
} from '../../../api/job-service/JobOpening/ViewJobDescriptionById';
import { useGetCompanyDetailsQuery } from '../../../api/tenant-service/Company/viewCompany';
import { buildSaveJobDetailsPayload } from '../../../api/job-service/buildSaveJobDetailsPayload';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import { asJobId } from '../../../api/job-service/jobId';
import {
  officeDisplayName,
  useListTenantOfficesQuery,
} from '../../../api/organization-service/Tenants/offices';
import { useListPlatformTenantsQuery } from '../../../api/organization-service/Platform/tenants';
import {
  useAddTenantDepartmentMutation,
  useDeleteTenantDepartmentMutation,
  useListTenantDepartmentsQuery,
  useUpdateTenantDepartmentMutation,
} from '../../../api/organization-service/Tenants/departments';
import {
  idsMatch,
  tenantJobTitleFormId,
  useAssignTenantJobTitleToDepartmentMutation,
  useCreateTenantJobTitleMutation,
  useDeleteTenantJobTitleMutation,
  useImportMasterJobTitleMutation,
  useListTenantDepartmentJobTitlesQuery,
  useListTenantJobTitleCatalogueQuery,
  useListTenantJobTitlesQuery,
  useUpdateTenantJobTitleMutation,
  type TenantJobTitle,
} from '../../../api/organization-service/Tenants/jobTitles';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import {
  useEnhanceJdMutation,
  useGetJdStatusQuery,
} from '../../../api/job-service/JobOpening/JdUpload';
import { useGetSuggestedSkillsQuery } from '../../../api/job-service/JobOpenings/jobOpenings';
import {
  useCreateOrganizationSkillMutation,
  useCreateJobTypeMutation,
  useDeleteJobTypeMutation,
  useUpdateJobTypeMutation,
} from '../../../api/job-service/JobOpening/catalogs';
import {
  capitalizeWordsAdvanced,
  changeNullValuesToEmptyArray,
  getFullURL,
  safeDecodeToken,
  validateDraft,
} from '../../../shared/utils/methods';

import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { useNavigationBlocker } from '../../../hooks/useNavigationBlocker';
import { useSessionTenantId } from '../../../hooks/useSessionTenantId';
import {
  haveDescriptionInputsChanged,
  diffAiOwnedFields,
  mergeNewAiSkills,
} from '../../../shared/utils/jdSync';

const CurrencyInput = lazy(() => import('react-currency-input-field'));

const { Option } = Select;

// Human-readable labels for the failed-fields summary near the footer.
const JOB_DETAILS_FIELD_LABELS: Partial<Record<keyof JobDetailsState, string>> = {
  jobProfileCode: 'Job ID',
  department: 'Department',
  jobTitle: 'Job Title',
  jobType: 'Job Type',
  jobMode: 'Job Mode',
  shift: 'Shift',
  officeLocation: 'Location Name',
  state: 'State',
  country: 'Country',
  hiringManagers: 'Hiring Manager',
  recruiters: 'Recruiter',
  openDate: 'Open Date',
  closeDate: 'Close Date',
  openings: 'Opening(s)',
  exemptionStatus: 'Exemption Status',
  minSalary: 'Minimum Salary',
  maxSalary: 'Maximum Salary',
  referralBonus: 'Referral Bonus',
  minExperience: 'Minimum Experience',
  maxExperience: 'Maximum Experience',
  educationPreference: 'Education Preference',
  mandatorySkills: 'Required Skills',
  optionalSkills: 'Optional Skills',
  responsibilities: 'Responsibilities',
  otherRequirements: 'Other Requirements',
};

// Field order for scroll-to-first-error on failed submit.
const JOB_DETAILS_FIELD_ORDER = [
  'jobProfileCode',
  'department',
  'jobTitle',
  'jobType',
  'jobMode',
  'officeLocation',
  'hiringManagers',
  'openDate',
  'openings',
  'exemptionStatus',
  'minSalary',
  'maxSalary',
  'minExperience',
  'maxExperience',
  'mandatorySkills',
  'educationPreference',
  'responsibilities',
];

const JD_STATUS_POLL_TIMEOUT_MS = 90_000;

const JobDetails = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [openModalFor, setOpenModalFor] = useState<
    | null
    | 'jobTitle'
    | 'department'
    | 'jobType'
    | 'educationPreference'
    | 'mandatorySkills'
    | 'optionalSkills'
  >(null);

  const atsJobData = location.state?.jobData;
  const isFromAts = location.state?.refresh;
  const atsJobOpeningId = location.state?.atsJobOpeningId;
  const { jobDetails, aiJobDescriptionId, jobOpeningId } = useSelector((state: RootState) => ({
    jobDetails: state.JobSlice.details,
    aiJobDescriptionId: state.JobSlice.aiJobDescriptionId,
    jobOpeningId: state.JobSlice.jobOpeningId,
  }));
  const { loginToken, role } = useSelector((state: any) => state.LoginSlice);
  // POST /skills requires organization:update, which only company_admin
  // (and platform roles) hold — hide the add-option affordance for roles
  // that would just get a 403.
  const canAddSkill = role?.name !== 'hiring_manager' && role?.name !== 'recruiter';
  const sessionTenantId = useSessionTenantId();
  const { data: platformTenants } = useListPlatformTenantsQuery(
    { limit: 50 },
    { skip: Boolean(sessionTenantId) }
  );
  const tenantId = sessionTenantId ?? platformTenants?.tenants?.[0]?.tenant_id;
  const isMaster = Boolean(!sessionTenantId && tenantId);

  const decodedToken = safeDecodeToken<{ companyName: string; companyId?: number | string }>(
    loginToken
  );
  const parsedCompanyId = Number(decodedToken?.companyId || 0);
  const [, setSelectedLocationIdForUsers] = useState<string | undefined>(undefined);

  const [allowNavigation, setAllowNavigation] = useState(false);
  const [isAddingToDropdown, setIsAddingToDropdown] = useState<string | null>(null);
  const [suggestedSkillsDismissed, setSuggestedSkillsDismissed] = useState(false);
  // Local labels for AI-suggested skills the catalogue dropdown hasn't
  // cached yet. Seeded from Redux's persisted aiSuggestedSkillLabels.
  const [extraSuggestedSkillOptions, setExtraSuggestedSkillOptions] = useState<
    JobOpeningDropdownOption[]
  >(() =>
    Object.entries(jobDetails.aiSuggestedSkillLabels ?? {}).map(([id, name]) => ({ id, name }))
  );

  // Local fallback label for a job title just created, until the list
  // query refetches and picks it up.
  const [extraJobTitleOptions, setExtraJobTitleOptions] = useState<JobOpeningDropdownOption[]>([]);

  const [updateJobOpening, { isLoading: isUpdating }] = useUpdateJobOpeningMutation();
  const jobIdFromUrl = asJobId(searchParams.get('jobOpeningId'));
  const resolvedJobId = asJobId(jobOpeningId) || jobIdFromUrl;
  const jobIdRef = useRef(resolvedJobId);
  // Whether Job Details has actually been saved with real content, not just
  // a bare draft shell. Drives the Save-vs-Next footer button below.
  const { data: jdDetailsForGate, refetch: refetchJdDetailsForGate } =
    useGetJobDescriptionByIdQuery({ jobOpeningId: resolvedJobId }, { skip: !resolvedJobId });
  const hasSavedDetails = jdDetailsForGate?.hasSavedDetails ?? false;
  // Polls jd/status to catch a GENERATING/PROCESSING -> READY transition
  // and apply AI-written fields once ready — see the effect below.
  // Stops polling once a terminal status is seen for this job id.
  const [jdStatusForHydrationIsTerminal, setJdStatusForHydrationIsTerminal] = useState(false);
  const { data: jdStatusForHydration } = useGetJdStatusQuery(resolvedJobId, {
    skip: !resolvedJobId,
    pollingInterval: jdStatusForHydrationIsTerminal ? 0 : 1000,
  });
  useEffect(() => {
    setJdStatusForHydrationIsTerminal(false);
  }, [resolvedJobId]);
  useEffect(() => {
    if (jdStatusForHydration?.status === 'READY' || jdStatusForHydration?.status === 'FAILED') {
      setJdStatusForHydrationIsTerminal(true);
    }
  }, [jdStatusForHydration?.status]);
  // Safety net if a terminal status never arrives.
  useEffect(() => {
    if (jdStatusForHydrationIsTerminal) return;
    const timeoutId = setTimeout(() => {
      setJdStatusForHydrationIsTerminal(true);
      showToast({
        message: "Still generating - refresh in a moment if it doesn't appear shortly.",
        type: 'warning',
      });
    }, JD_STATUS_POLL_TIMEOUT_MS);
    return () => clearTimeout(timeoutId);
  }, [jdStatusForHydrationIsTerminal, resolvedJobId]);
  const prevJdStatusForHydrationRef = useRef<string | undefined>(undefined);
  // Tracks which job id the "already READY on first observation" fallback
  // has run for, so it fires at most once per job.
  const appliedAiFillJobIdRef = useRef<string | null>(null);
  const [enhanceJd] = useEnhanceJdMutation();
  const [createOrganizationSkill] = useCreateOrganizationSkillMutation();
  const [createJobType] = useCreateJobTypeMutation();
  const [createEducationPreference] = useCreateEducationPreferenceMutation();
  const [updateEducationPreference] = useUpdateEducationPreferenceMutation();
  const [deleteEducationPreference] = useDeleteEducationPreferenceMutation();
  const [updateJobType] = useUpdateJobTypeMutation();
  const [deleteJobType] = useDeleteJobTypeMutation();
  const [isSyncingWithATS, setIsSyncingWithATS] = useState(false);
  const showAtsSyncCheckbox = false;
  const [showRegenerateConfirmModal, setShowRegenerateConfirmModal] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
  const [isSubmittingWithModal, setIsSubmittingWithModal] = useState(false);
  const [triggerGetJobDescriptionById] = useLazyGetJobDescriptionByIdQuery();
  const { data: offices = [], isFetching: loadingJobLocations } = useListTenantOfficesQuery(
    { tenantId: tenantId ?? '', isMaster },
    { skip: !tenantId }
  );
  const { data: orgDepartments = [], isFetching: departmentsLoading } =
    useListTenantDepartmentsQuery({ tenantId: tenantId ?? '', isMaster }, { skip: !tenantId });
  const [addTenantDepartment] = useAddTenantDepartmentMutation();
  const [updateTenantDepartment] = useUpdateTenantDepartmentMutation();
  const [deleteTenantDepartment] = useDeleteTenantDepartmentMutation();
  const [createTenantJobTitle] = useCreateTenantJobTitleMutation();
  const [updateTenantJobTitle] = useUpdateTenantJobTitleMutation();
  const [deleteTenantJobTitle] = useDeleteTenantJobTitleMutation();
  const [importMasterJobTitle] = useImportMasterJobTitleMutation();
  const [assignTenantJobTitleToDepartment] = useAssignTenantJobTitleToDepartmentMutation();
  const { data: jobTitleCatalogue = [], isFetching: loadingCatalogue } =
    useListTenantJobTitleCatalogueQuery(
      { tenantId: tenantId ?? '', isMaster },
      { skip: !tenantId }
    );
  const { data: tenantJobTitles = [] } = useListTenantJobTitlesQuery(
    { tenantId: tenantId ?? '', isMaster },
    { skip: !tenantId }
  );
  const {
    jobOpeningDropdown: jobTypes,
    loading: jobTypesLoading,
    refetch: refetchJobTypes,
  } = useJobOpeningDropdown('JOB_TYPE', 'create');
  const { jobOpeningDropdown: jobModes, loading: jobModesLoading } = useJobOpeningDropdown(
    'JOB_MODE',
    'create'
  );
  const { jobOpeningDropdown: shiftOptions, loading: shiftsLoading } = useJobOpeningDropdown(
    'SHIFT',
    'create'
  );
  const { jobOpeningDropdown: exemptionStatus, loading: exemptionLoading } = useJobOpeningDropdown(
    'EXEMPTION_STATUS',
    'create'
  );
  const {
    jobOpeningDropdown: educationPreference,
    loading: educationPreferenceLoading,
    refetch: refetchEducationPreference,
  } = useJobOpeningDropdown('EDUCATION_PREFERENCE', 'create');
  const { jobOpeningDropdown: languageOptions, loading: languagesLoading } = useJobOpeningDropdown(
    'LANGUAGE',
    'create'
  );
  const {
    jobOpeningDropdown: mandatorySkills,
    loading: mandatorySkillsLoading,
    refetch: refetchMandatorySkills,
    searchSkills: searchMandatorySkills,
  } = useJobOpeningDropdown('MANDATORY_SKILLS', 'create');
  const {
    jobOpeningDropdown: optionalSkills,
    loading: optionalSkillsLoading,
    refetch: refetchOptionalSkills,
    searchSkills: searchOptionalSkills,
  } = useJobOpeningDropdown('OPTIONAL_SKILLS', 'create');

  const { jobOpeningDropdown: hiringManagers, loading: hiringManagerLoading } =
    useJobOpeningDropdown('HIRING_MANAGER', 'create');
  const { jobOpeningDropdown: recruiters, loading: recruitersLoading } = useJobOpeningDropdown(
    'RECRUITER',
    'create'
  );

  const { data: companyDetails } = useGetCompanyDetailsQuery(
    { companyId: parsedCompanyId },
    { skip: !parsedCompanyId }
  );

  const generateJobProfileCode = () => {
    const companyName = decodedToken?.companyName || '';

    let initials = 'CFP';
    if (companyName.length >= 3) {
      initials = companyName.slice(0, 3).toUpperCase();
    } else if (companyName.length === 2) {
      initials = companyName.slice(0, 2).toUpperCase();
    } else if (companyName.length === 1) {
      initials = companyName.slice(0, 1).toUpperCase();
    }

    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${initials}-${randomPart}`;
  };

  const handleLocationChange = (locationId: string | number) => {
    const id = locationId != null && locationId !== '' ? String(locationId) : '';
    const selectedLocation = offices.find((office) => idsMatch(office.office_id, locationId));

    setSelectedLocationIdForUsers(id || undefined);
    setValue('officeLocation', id ? [id] : [], {
      shouldValidate: true,
    });
    setValue('country', selectedLocation?.country ?? '', { shouldValidate: true });
    setValue('state', selectedLocation?.state ?? '', { shouldValidate: true });
    // Hiring Manager/Recruiter are not location-scoped, so leave them as-is here.
  };

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    setError,
    trigger,
    formState: { errors },
  } = useForm<JobDetailsState>({
    resolver: zodResolver(jobDetailsSchema) as Resolver<JobDetailsState>,
    mode: 'onChange',
    defaultValues: {
      ...jobDetails,
      jobMode: jobDetails?.jobMode || [],
      shift: jobDetails?.shift || [],
      jobProfileCode: jobDetails?.jobProfileCode || generateJobProfileCode(),
      openDate: jobDetails?.openDate || dayjs().format('DD-MM-YYYY'),
      country: jobDetails?.country || '',
      state: jobDetails?.state || '',
      useCultureIntro: jobDetails?.useCultureIntro ?? false,
    },
  });

  // Shown only after a failed Save/Next/Draft attempt.
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const formContainerRef = useRef<HTMLDivElement>(null);
  const validationSummaryRef = useRef<HTMLDivElement>(null);

  const validationIssues = useMemo(
    () =>
      Object.entries(errors)
        .filter(([, err]) => Boolean((err as { message?: string } | undefined)?.message))
        .map(([name, err]) => ({
          name,
          label:
            JOB_DETAILS_FIELD_LABELS[name as keyof JobDetailsState] ??
            capitalizeWordsAdvanced(name),
          message: String((err as { message?: string }).message),
        })),
    [errors]
  );

  // Jumps to the field matching this error message, or the first error.
  const scrollToFieldError = useCallback((message: string) => {
    const container = formContainerRef.current;
    if (!container) return;
    const errorNodes = Array.from(container.querySelectorAll<HTMLElement>('.text-red-500'));
    const target =
      errorNodes.find((node) => node.textContent?.trim() === message.trim()) ?? errorNodes[0];
    if (!target) return;
    const fieldEl = target.closest('.ant-form-item') ?? target;
    fieldEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    fieldEl.classList.add('cfp-field-flash');
    window.setTimeout(() => fieldEl.classList.remove('cfp-field-flash'), 1600);
  }, []);

  useEffect(() => {
    if (showValidationSummary && validationIssues.length > 0) {
      validationSummaryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showValidationSummary, validationIssues.length]);

  const persistJobId = useCallback(
    (jobId: string) => {
      if (!jobId) return;
      jobIdRef.current = jobId;
      if (asJobId(jobOpeningId) !== jobId) {
        dispatch(setJobOpeningId(jobId));
      }
      // Restore aiJobDescriptionId (Redux doesn't survive a reload) once details are saved.
      if (hasSavedDetails && asJobId(aiJobDescriptionId) !== jobId) {
        dispatch(setAiJobDescriptionId(jobId));
      }
      if (jobIdFromUrl !== jobId) {
        const next = new URLSearchParams(searchParams);
        next.set('jobOpeningId', jobId);
        setSearchParams(next, { replace: true });
      }
    },
    [
      dispatch,
      aiJobDescriptionId,
      hasSavedDetails,
      jobIdFromUrl,
      jobOpeningId,
      searchParams,
      setSearchParams,
    ]
  );

  useEffect(() => {
    const id = asJobId(jobOpeningId) || jobIdFromUrl;
    if (id) persistJobId(id);
  }, [jobIdFromUrl, jobOpeningId, persistJobId]);

  useEffect(() => {
    if (jobDetails?.jobProfileCode) {
      setValue('jobProfileCode', jobDetails.jobProfileCode);
    }
  }, [jobDetails?.jobProfileCode, setValue]);

  const resolveExistingJobId = useCallback((): string => {
    const existing = jobIdRef.current || asJobId(jobOpeningId) || jobIdFromUrl;
    if (existing) {
      persistJobId(existing);
      return existing;
    }
    return '';
  }, [jobIdFromUrl, jobOpeningId, persistJobId]);
  const formValues = watch();
  const selectedDepartmentId = formValues.department?.[0];
  const selectedOfficeLocation = useWatch({
    control,
    name: 'officeLocation',
  });
  const selectedOfficeLocationId = selectedOfficeLocation?.[0];
  const selectedHiringManagerIds = (watch('hiringManagers') || []).map((id) => String(id));
  const selectedRecruiterIds = (watch('recruiters') || []).map((id) => String(id));
  const selectedMandatorySkillIds = (watch('mandatorySkills') || []).map((id) => String(id));
  const selectedOptionalSkillIds = (watch('optionalSkills') || []).map((id) => String(id));

  const selectedHiringManagers = hiringManagers.filter((option) =>
    selectedHiringManagerIds.includes(String(option.id))
  );
  const selectedRecruiters = recruiters.filter((option) =>
    selectedRecruiterIds.includes(String(option.id))
  );
  const selectedMandatorySkills = [...mandatorySkills, ...extraSuggestedSkillOptions]
    .filter((option, index, self) => index === self.findIndex((o) => idsMatch(o.id, option.id)))
    .filter((option) => selectedMandatorySkillIds.includes(String(option.id)));
  const selectedOptionalSkills = [...optionalSkills, ...extraSuggestedSkillOptions]
    .filter((option, index, self) => index === self.findIndex((o) => idsMatch(o.id, option.id)))
    .filter((option) => selectedOptionalSkillIds.includes(String(option.id)));
  const [jobTitleSearchText, setJobTitleSearchText] = useState('');
  const [debouncedJobTitleSearch, setDebouncedJobTitleSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedJobTitleSearch(jobTitleSearchText.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [jobTitleSearchText]);

  const jobLocationOptions = useMemo(
    () =>
      (offices ?? [])
        .map((office) => ({
          id: office.office_id,
          name: officeDisplayName(office),
        }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [offices]
  );

  const selectedLocationDetails = useMemo(
    () => offices.find((office) => idsMatch(office.office_id, selectedOfficeLocationId)),
    [offices, selectedOfficeLocationId]
  );

  const { data: departmentJobTitlesData = [], isFetching: loadingDepartmentJobTitles } =
    useListTenantDepartmentJobTitlesQuery(
      { tenantId: tenantId ?? '', departmentId: String(selectedDepartmentId), isMaster },
      { skip: !tenantId || !selectedDepartmentId }
    );

  const resolveOrgJobTitleId = (id: string | number): string | undefined => {
    const match = (title: TenantJobTitle) =>
      idsMatch(title.org_job_title_id, id) || idsMatch(title.source_job_title_id, id);
    return (
      departmentJobTitlesData.find(match)?.org_job_title_id ||
      tenantJobTitles.find(match)?.org_job_title_id
    );
  };

  const mappedDepartmentJobTitles = departmentJobTitlesData.map((jt) => ({
    id: tenantJobTitleFormId(jt),
    name: jt.name,
    isDeleted: false,
    source: 'department' as const,
  }));

  const mappedCatalogueJobTitles = (jobTitleCatalogue ?? []).map((jt) => ({
    id: jt.job_title_id,
    name: jt.name,
    isDeleted: false,
    source: 'catalogue' as const,
  }));

  const jobTitleOptions = useMemo(() => {
    const search = debouncedJobTitleSearch.toLowerCase();
    const merged = search
      ? [...mappedDepartmentJobTitles, ...mappedCatalogueJobTitles].filter((title) =>
          title.name.toLowerCase().includes(search)
        )
      : selectedDepartmentId
        ? mappedDepartmentJobTitles.length > 0
          ? mappedDepartmentJobTitles
          : mappedCatalogueJobTitles
        : [];
    // extraJobTitleOptions goes last so a real list entry wins over the temporary local one.
    return [...merged, ...extraJobTitleOptions]
      .filter((title, index, self) => index === self.findIndex((t) => idsMatch(t.id, title.id)))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [
    debouncedJobTitleSearch,
    extraJobTitleOptions,
    mappedCatalogueJobTitles,
    mappedDepartmentJobTitles,
    selectedDepartmentId,
  ]);

  // AI-suggested skills for the currently selected job title — needs the real org_job_title_id, not the form's composite id.
  const selectedJobTitleFormId = formValues.jobTitle?.[0];
  const selectedJobTitleOrgId = selectedJobTitleFormId
    ? resolveOrgJobTitleId(selectedJobTitleFormId)
    : undefined;
  const selectedJobTitleText =
    (selectedJobTitleFormId &&
      [...mappedDepartmentJobTitles, ...mappedCatalogueJobTitles].find((title) =>
        idsMatch(title.id, selectedJobTitleFormId)
      )?.name) ||
    undefined;
  const { data: suggestedSkillsData, refetch: refetchSuggestedSkills } = useGetSuggestedSkillsQuery(
    {
      jobId: resolvedJobId,
      job_title_id: selectedJobTitleOrgId ?? '',
      job_title_text: selectedJobTitleText ?? '',
    },
    { skip: !resolvedJobId || !selectedJobTitleOrgId || !selectedJobTitleText }
  );
  const suggestedSkills = suggestedSkillsData?.skills ?? [];
  const unaddedSuggestedSkills = suggestedSkills.filter(
    (skill) =>
      !selectedMandatorySkillIds.includes(String(skill.skill_id)) &&
      !selectedOptionalSkillIds.includes(String(skill.skill_id))
  );

  // Persists skill labels into Redux (merged) so they survive an unmount/reload.
  const persistSkillLabels = (entries: { id: string; name: string }[]) => {
    if (entries.length === 0) return;
    const additions: Record<string, string> = {};
    for (const entry of entries) additions[entry.id] = entry.name;
    dispatch(
      updateJobDetails({
        aiSuggestedSkillLabels: { ...(jobDetails.aiSuggestedSkillLabels || {}), ...additions },
      })
    );
  };

  // Matches EditJobDetail.tsx's "Add All" banner behavior.
  const handleAddAllSuggestedSkills = () => {
    if (unaddedSuggestedSkills.length === 0) return;
    const newMandatoryIds = unaddedSuggestedSkills
      .filter((skill) => skill.suggested_skill_type.toLowerCase() === 'required')
      .map((skill) => skill.skill_id);
    const newOptionalIds = unaddedSuggestedSkills
      .filter((skill) => skill.suggested_skill_type.toLowerCase() === 'optional')
      .map((skill) => skill.skill_id);

    if (newMandatoryIds.length > 0) {
      setValue('mandatorySkills', [...selectedMandatorySkillIds, ...newMandatoryIds], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (newOptionalIds.length > 0) {
      setValue('optionalSkills', [...selectedOptionalSkillIds, ...newOptionalIds], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    const acceptedOptions = unaddedSuggestedSkills.map((skill) => ({
      id: skill.skill_id,
      name: skill.skill_label,
    }));
    setExtraSuggestedSkillOptions((prev) => [...prev, ...acceptedOptions]);
    persistSkillLabels(acceptedOptions);
    setSuggestedSkillsDismissed(true);
    showToast({
      message: `Added ${unaddedSuggestedSkills.length} AI-suggested skill${unaddedSuggestedSkills.length === 1 ? '' : 's'}`,
      type: 'success',
    });
  };

  const departments = (orgDepartments ?? [])
    .map((department) => ({
      id: department.org_department_id,
      name: department.name,
      isDeleted: false,
    }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const cultureInfoText = String(companyDetails?.cultureIntroText || '').trim();
  const hasCultureInfo = Boolean(cultureInfoText);
  const isCultureIntroDefaultEnabled = Boolean(companyDetails?.cultureIntroDefaultEnabled);
  const hasPersistedCultureIntroSelection = Object.prototype.hasOwnProperty.call(
    jobDetails,
    'useCultureIntro'
  );
  const [hasUserChangedCultureIntro, setHasUserChangedCultureIntro] = useState(false);
  const useCultureIntroValue = Boolean(watch('useCultureIntro'));

  const excludeFieldsForDirtyCheck = (obj: Partial<JobDetailsState>) => {
    const { jobProfileCode: _jobProfileCode, openDate: _openDate, ...rest } = obj;
    return rest;
  };

  const isFormDirty = useMemo(() => {
    const currentValues = excludeFieldsForDirtyCheck(formValues);
    const initialValues = excludeFieldsForDirtyCheck(jobDetails);

    // Check if form values have changed (excluding jobProfileCode and openDate)
    return JSON.stringify(currentValues) !== JSON.stringify(initialValues);
  }, [formValues, jobDetails]);

  const { isBlocked, confirmNavigation, cancelNavigation } = useNavigationBlocker(
    true,
    isFormDirty && !allowNavigation
  );

  useEffect(() => {
    if (!asJobId(jobOpeningId) && aiJobDescriptionId) {
      dispatch(setAiJobDescriptionId(null));
    }
  }, [aiJobDescriptionId, dispatch, jobOpeningId]);

  // Ensures the non-ATS location hydration below runs only once on mount,
  // not on every later Redux update (which would clobber live edits).
  const hasCheckedInitialLocationHydrationRef = useRef(false);

  useEffect(() => {
    if (atsJobData && isFromAts) {
      const officeLocation = atsJobData?.officeLocation?.[0] || {};
      const countryName = officeLocation?.country?.name || '';
      const stateName = officeLocation?.state?.name || '';
      const transformedAtsData = {
        ...atsJobData,
        jobProfileCode: atsJobData.jobProfileCode || generateJobProfileCode(),
        openDate: atsJobData.openDate || dayjs().format('DD-MM-YYYY'),
        country: countryName,
        state: stateName,
        officeLocation:
          atsJobData.officeLocation?.map((item: any) => item.id ?? item.city?.id).filter(Boolean) ||
          [],
        jobTitle: atsJobData.jobTitle?.map((item: any) => item.id) || [],
        department: atsJobData.department?.map((item: any) => item.id) || [],
        jobType: atsJobData.jobType?.map((item: any) => item.id) || [],
        hiringManagers:
          atsJobData.hiringManagers ||
          (atsJobData.hiringManager?.id ? [atsJobData.hiringManager.id] : []),
        recruiters:
          atsJobData.recruiters || (atsJobData.recruiter?.id ? [atsJobData.recruiter.id] : []),
        exemptionStatus: atsJobData.exemptionStatus?.id || null,
        educationPreference: atsJobData.educationPreference?.map((item: any) => item.id) || [],
        mandatorySkills: atsJobData.mandatorySkills?.map((item: any) => item.id) || [],
        optionalSkills: atsJobData.optionalSkills?.map((item: any) => item.id) || [],
        responsibilities: atsJobData.responsibilities || '',
        otherRequirements: atsJobData.otherRequirements || '',
      };

      Object.entries(transformedAtsData).forEach(([key, value]) => {
        setValue(key as keyof JobDetailsState, value as any);
      });
      setSelectedLocationIdForUsers(
        transformedAtsData.officeLocation?.[0] != null
          ? String(transformedAtsData.officeLocation[0])
          : undefined
      );
      refetchEducationPreference?.();
      refetchMandatorySkills?.();
      refetchOptionalSkills?.();
    } else if (!hasCheckedInitialLocationHydrationRef.current) {
      hasCheckedInitialLocationHydrationRef.current = true;
      if (jobDetails && Object.keys(jobDetails).length > 0) {
        setValue('country', jobDetails.country || '');
        setValue('state', jobDetails.state || '');
        setValue('officeLocation', jobDetails.officeLocation || []);
        setSelectedLocationIdForUsers(
          jobDetails.officeLocation?.[0] != null ? String(jobDetails.officeLocation[0]) : undefined
        );
      }
    }
  }, [atsJobData, isFromAts, jobDetails, setValue]);

  // AI-fill counterpart to the ATS hydration above; only fills fields not already typed into.
  useEffect(() => {
    const previousStatus = prevJdStatusForHydrationRef.current;
    const currentStatus = jdStatusForHydration?.status;
    prevJdStatusForHydrationRef.current = currentStatus;

    const justFinishedGenerating =
      (previousStatus === 'GENERATING' || previousStatus === 'PROCESSING') &&
      currentStatus === 'READY';

    // Fallback: refresh once per job the first time status is seen READY,
    // in case the GENERATING -> READY transition was missed.
    const notYetSyncedThisJob =
      currentStatus === 'READY' && appliedAiFillJobIdRef.current !== resolvedJobId;

    if (!justFinishedGenerating && !notYetSyncedThisJob) return;
    appliedAiFillJobIdRef.current = resolvedJobId;

    // Refetch suggested skills now that JD parsing is done, if that query has started.
    if (resolvedJobId && selectedJobTitleOrgId && selectedJobTitleText) {
      void refetchSuggestedSkills();
    }

    void refetchJdDetailsForGate().then((result) => {
      const fresh = result.data;
      if (!fresh) return;

      const current = getValues();
      let appliedAnything = false;
      if (fresh.responsibilities && !current.responsibilities) {
        setValue('responsibilities', fresh.responsibilities, { shouldValidate: true });
        appliedAnything = true;
      }
      if (fresh.otherRequirements && !current.otherRequirements) {
        setValue('otherRequirements', fresh.otherRequirements, { shouldValidate: true });
        appliedAnything = true;
      }
      if (fresh.minExperience != null && current.minExperience == null) {
        setValue('minExperience', fresh.minExperience, { shouldValidate: true });
        appliedAnything = true;
      }
      if (fresh.maxExperience != null && current.maxExperience == null) {
        setValue('maxExperience', fresh.maxExperience, { shouldValidate: true });
        appliedAnything = true;
      }
      if (fresh.minSalary != null && !current.minSalary) {
        setValue('minSalary', String(fresh.minSalary), { shouldValidate: true });
        appliedAnything = true;
      }
      if (fresh.maxSalary != null && !current.maxSalary) {
        setValue('maxSalary', String(fresh.maxSalary), { shouldValidate: true });
        appliedAnything = true;
      }
      // Merge in AI-suggested skills not already selected, split by type.
      if (fresh.skills && fresh.skills.length > 0) {
        const currentMandatory = (current.mandatorySkills || []).map(String);
        const currentOptional = (current.optionalSkills || []).map(String);
        const newMandatory: string[] = [];
        const newOptional: string[] = [];
        const newOptions: JobOpeningDropdownOption[] = [];
        for (const skill of fresh.skills) {
          const id = String(skill.skill_id);
          if (currentMandatory.includes(id) || currentOptional.includes(id)) continue;
          if (newMandatory.includes(id) || newOptional.includes(id)) continue;
          if (skill.skill_type.toLowerCase() === 'required') {
            newMandatory.push(id);
          } else {
            newOptional.push(id);
          }
          newOptions.push({ id: skill.skill_id, name: skill.skill_label });
        }
        if (newMandatory.length > 0) {
          setValue('mandatorySkills', [...currentMandatory, ...newMandatory], {
            shouldValidate: true,
          });
          appliedAnything = true;
        }
        if (newOptional.length > 0) {
          setValue('optionalSkills', [...currentOptional, ...newOptional], {
            shouldValidate: true,
          });
          appliedAnything = true;
        }
        if (newOptions.length > 0) {
          // Local label source so these chips resolve a name before the catalogue dropdown catches up.
          setExtraSuggestedSkillOptions((prev) => [...prev, ...newOptions]);
          persistSkillLabels(newOptions);
          refetchMandatorySkills?.();
          refetchOptionalSkills?.();
        }
      }
      if (fresh.minExperience != null || fresh.maxExperience != null) {
        void trigger(['minExperience', 'maxExperience']);
      }
      if (appliedAnything) {
        showToast({
          message: 'Some fields were pre-filled from your job description - review before saving.',
          type: 'success',
        });
      }
    });
  }, [
    jdStatusForHydration?.status,
    resolvedJobId,
    refetchJdDetailsForGate,
    refetchSuggestedSkills,
    getValues,
    setValue,
    trigger,
  ]);

  // Overwrites fields with fresh backend values, unlike the effect above.
  useEffect(() => {
    if (!jdDetailsForGate) return;
    const current = getValues();
    // Form field is `openings`, backend calls it `vacancies`.
    const { vacancies: vacanciesUpdate, ...otherUpdates } = diffAiOwnedFields(jdDetailsForGate, {
      ...current,
      vacancies: current.openings,
    });
    Object.entries(otherUpdates).forEach(([field, value]) => {
      setValue(field as keyof typeof otherUpdates, value, { shouldValidate: true });
    });
    if (vacanciesUpdate != null) {
      setValue('openings', vacanciesUpdate, { shouldValidate: true });
    }

    const currentMandatory = (current.mandatorySkills || []).map(String);
    const currentOptional = (current.optionalSkills || []).map(String);
    const { newMandatoryIds, newOptionalIds, newOptions } = mergeNewAiSkills(
      jdDetailsForGate.skills,
      currentMandatory,
      currentOptional
    );
    if (newMandatoryIds.length > 0) {
      setValue('mandatorySkills', [...currentMandatory, ...newMandatoryIds], {
        shouldValidate: true,
      });
    }
    if (newOptionalIds.length > 0) {
      setValue('optionalSkills', [...currentOptional, ...newOptionalIds], {
        shouldValidate: true,
      });
    }
    if (newOptions.length > 0) {
      setExtraSuggestedSkillOptions((prev) => [...prev, ...newOptions]);
      persistSkillLabels(newOptions);
      refetchMandatorySkills?.();
      refetchOptionalSkills?.();
    }
  }, [jdDetailsForGate, getValues, setValue]);

  useEffect(() => {
    if (!selectedLocationDetails) return;

    setValue('country', selectedLocationDetails.country ?? '', { shouldValidate: true });
    setValue('state', selectedLocationDetails.state ?? '', { shouldValidate: true });
  }, [selectedLocationDetails, setValue]);

  useEffect(() => {
    if (!companyDetails) return;

    if (!hasCultureInfo) {
      if (useCultureIntroValue) {
        setValue('useCultureIntro', false, {
          shouldValidate: true,
          shouldDirty: false,
        });
      }
      return;
    }

    if (hasUserChangedCultureIntro || hasPersistedCultureIntroSelection) {
      return;
    }

    if (isCultureIntroDefaultEnabled && !useCultureIntroValue) {
      setValue('useCultureIntro', true, {
        shouldValidate: true,
        shouldDirty: false,
      });
    }
  }, [
    companyDetails,
    hasCultureInfo,
    hasPersistedCultureIntroSelection,
    hasUserChangedCultureIntro,
    isCultureIntroDefaultEnabled,
    setValue,
    useCultureIntroValue,
  ]);

  /**
   * Job titles require a department. Keep a stored title when it still exists
   * on the department mapping or in the platform catalogue.
   */
  useEffect(() => {
    if (loadingDepartmentJobTitles || loadingCatalogue) return;

    const currentJobTitleIds = formValues.jobTitle || [];

    if (!selectedDepartmentId) {
      if (currentJobTitleIds.length > 0) {
        setValue('jobTitle', [], { shouldValidate: true });
      }
      return;
    }

    const validJobTitleIds = currentJobTitleIds.filter(
      (titleId) =>
        jobTitleOptions.some((jt) => idsMatch(jt.id, titleId)) ||
        jobTitleCatalogue.some((jt) => idsMatch(jt.job_title_id, titleId)) ||
        tenantJobTitles.some(
          (jt) =>
            idsMatch(tenantJobTitleFormId(jt), titleId) || idsMatch(jt.org_job_title_id, titleId)
        )
    );

    if (validJobTitleIds.length !== currentJobTitleIds.length) {
      setValue('jobTitle', validJobTitleIds, { shouldValidate: true });
    }
  }, [
    selectedDepartmentId,
    jobTitleOptions,
    jobTitleCatalogue,
    tenantJobTitles,
    loadingDepartmentJobTitles,
    loadingCatalogue,
    formValues.jobTitle,
    setValue,
  ]);

  const handleAddOption = async (
    newValue: string,
    type?:
      | 'jobTitle'
      | 'department'
      | 'jobType'
      | 'educationPreference'
      | 'mandatorySkills'
      | 'optionalSkills'
  ) => {
    const addType = type || openModalFor;
    if (!addType) return;

    const typeMapping: Record<string, string> = {
      jobTitle: 'JOB_TITLE',
      department: 'DEPARTMENT',
      location: 'OFFICE_LOCATION',
      jobType: 'JOB_TYPE',
      educationPreference: 'EDUCATION_PREFERENCE',
      mandatorySkills: 'MANDATORY_SKILLS',
      optionalSkills: 'OPTIONAL_SKILLS',
    };

    const mappedType = typeMapping[addType];
    if (!mappedType) return;

    // Set loading state for the specific dropdown
    setIsAddingToDropdown(addType);

    // Clear the previous selection immediately
    switch (addType) {
      case 'jobTitle':
        setValue('jobTitle', [], { shouldValidate: false });
        break;
      case 'department':
        setValue('department', [], { shouldValidate: false });
        break;
      case 'jobType':
        setValue('jobType', [], { shouldValidate: false });
        break;
      case 'educationPreference':
        setValue('educationPreference', [], { shouldValidate: false });
        break;
    }

    try {
      const formattedValue = capitalizeWordsAdvanced(newValue);
      const normalizedValue = formattedValue.trim().toLowerCase();

      if (addType === 'department') {
        if (!tenantId) {
          showToast({
            message: 'Unable to add a department without a company context.',
            type: 'error',
          });
          return;
        }

        const existingDepartment = orgDepartments.find(
          (department) => department.name.trim().toLowerCase() === normalizedValue
        );
        if (existingDepartment) {
          setValue('department', [existingDepartment.org_department_id], { shouldValidate: true });
          return;
        }

        const createdDepartment = await addTenantDepartment({
          tenantId,
          department_name: formattedValue,
          isMaster,
        }).unwrap();

        showToast({
          message: 'Department added successfully',
          type: 'success',
        });

        setValue('department', [createdDepartment.org_department_id], { shouldValidate: true });
        setValue('jobTitle', [], { shouldValidate: true });
        return;
      }

      if (addType === 'jobTitle') {
        if (!selectedDepartmentId) {
          showToast({
            message: 'Please select a department first.',
            type: 'error',
          });
          return;
        }
        if (!tenantId) {
          showToast({
            message: 'Unable to add a job title without a company context.',
            type: 'error',
          });
          return;
        }

        const existingTitle = [...departmentJobTitlesData, ...tenantJobTitles].find(
          (jobTitle) => jobTitle.name.toLowerCase() === formattedValue.toLowerCase()
        );
        if (existingTitle) {
          setValue('jobTitle', [tenantJobTitleFormId(existingTitle)], { shouldValidate: true });
          setJobTitleSearchText('');
          setDebouncedJobTitleSearch('');
          return;
        }

        const createdJobTitle = await createTenantJobTitle({
          tenantId,
          name: formattedValue,
          department_id: String(selectedDepartmentId),
          isMaster,
        }).unwrap();

        showToast({
          message: 'Job title added successfully',
          type: 'success',
        });

        const createdJobTitleFormId = tenantJobTitleFormId(createdJobTitle);
        setExtraJobTitleOptions((prev) => [
          ...prev,
          { id: createdJobTitleFormId, name: formattedValue },
        ]);
        setValue('jobTitle', [createdJobTitleFormId], { shouldValidate: true });
        setJobTitleSearchText('');
        setDebouncedJobTitleSearch('');
        return;
      }

      if (addType === 'educationPreference') {
        const existingPreference = educationPreference.find(
          (item) => item.name.toLowerCase() === normalizedValue
        );
        if (existingPreference) {
          setValue('educationPreference', [existingPreference.id], { shouldValidate: true });
          return;
        }
        const created = await createEducationPreference({
          education_preference_name: formattedValue,
        }).unwrap();
        showToast({ message: 'Education preference added', type: 'success' });
        setValue('educationPreference', [created.id], { shouldValidate: true });
        refetchEducationPreference?.();
        return;
      }

      if (addType === 'mandatorySkills' || addType === 'optionalSkills') {
        const currentValues = (watch(addType) || []).map(String);
        const existingSkill = [...mandatorySkills, ...optionalSkills].find(
          (skill) => skill.name.toLowerCase() === normalizedValue
        );
        if (existingSkill) {
          setValue(addType, [...currentValues, existingSkill.id], { shouldValidate: true });
          return;
        }
        const createdSkill = await createOrganizationSkill({ skill: formattedValue }).unwrap();
        showToast({ message: 'Skill added successfully', type: 'success' });
        setValue(addType, [...currentValues, createdSkill.skill_id], { shouldValidate: true });
        return;
      }

      if (addType === 'jobType') {
        const existingJobType = jobTypes.find(
          (item) => item.name.toLowerCase() === normalizedValue
        );
        if (existingJobType) {
          setValue('jobType', [existingJobType.id], { shouldValidate: true });
          return;
        }
        // isMaster picks the Super Admin catalogue vs. the tenant's own.
        const createdJobType = await createJobType({
          job_type_name: formattedValue,
          isMaster,
        }).unwrap();
        showToast({ message: 'Job type added successfully', type: 'success' });
        setValue('jobType', [createdJobType.id], { shouldValidate: true });
        refetchJobTypes?.();
        return;
      }
    } catch (err) {
      showToast({
        message: get(err, 'data.message', 'Something went wrong while updating dropdown.'),
        type: 'error',
      });
    } finally {
      setIsAddingToDropdown(null);
      setOpenModalFor(null);
    }
  };

  const handleJobTitleChange = async (value: number | string | undefined) => {
    if (!value) {
      setValue('jobTitle', [], { shouldValidate: true });
      setJobTitleSearchText('');
      setDebouncedJobTitleSearch('');
      return;
    }

    const selectedJobTitleId = String(value);
    setValue('jobTitle', [selectedJobTitleId], { shouldValidate: true });
    setJobTitleSearchText('');
    setDebouncedJobTitleSearch('');

    if (!tenantId || !selectedDepartmentId) return;

    const alreadyMappedToDepartment = departmentJobTitlesData.some(
      (jobTitle) =>
        idsMatch(tenantJobTitleFormId(jobTitle), selectedJobTitleId) ||
        idsMatch(jobTitle.org_job_title_id, selectedJobTitleId)
    );
    if (alreadyMappedToDepartment) return;

    const existingOrgId = resolveOrgJobTitleId(selectedJobTitleId);
    try {
      if (existingOrgId) {
        await assignTenantJobTitleToDepartment({
          tenantId,
          departmentId: String(selectedDepartmentId),
          job_title_id: existingOrgId,
          isMaster,
        }).unwrap();
      } else {
        await importMasterJobTitle({
          tenantId,
          master_job_title_id: selectedJobTitleId,
          department_id: String(selectedDepartmentId),
          isMaster,
        }).unwrap();
      }
    } catch (error) {
      showToast({
        message: getOrgErrorMessage(error, 'Failed to map this job title to the department.'),
        type: 'error',
      });
    }
  };

  const handleReuseOption = async (_id: string | number, type: string) => {
    if (type === 'department') {
      showToast({
        message: 'Removed departments cannot be restored from this screen.',
        type: 'error',
      });
      return;
    }

    if (type === 'jobTitle') {
      showToast({
        message: 'Removed job titles cannot be restored from this screen.',
        type: 'error',
      });
      return;
    }

    // No restore endpoint exists for job types, education preferences, or skill-catalog entries.
    showToast({
      message: 'Removed options cannot be restored from this screen.',
      type: 'error',
    });
  };
  const handleEditOption = async (id: string | number, newName: string, type: string) => {
    if (type === 'department') {
      if (!tenantId) {
        showToast({
          message: 'Unable to update a department without a company context.',
          type: 'error',
        });
        return;
      }

      try {
        await updateTenantDepartment({
          tenantId,
          departmentId: String(id),
          department_name: capitalizeWordsAdvanced(newName),
          isMaster,
        }).unwrap();

        showToast({
          message: 'Department updated successfully',
          type: 'success',
        });
      } catch (err) {
        showToast({
          message: getOrgErrorMessage(err, 'Something went wrong while updating department.'),
          type: 'error',
        });
      }

      return;
    }

    if (type === 'jobTitle') {
      const orgJobTitleId = resolveOrgJobTitleId(id);
      if (!orgJobTitleId || !tenantId) {
        showToast({
          message: 'This title is from the platform catalogue and cannot be renamed here.',
          type: 'error',
        });
        return;
      }

      try {
        await updateTenantJobTitle({
          tenantId,
          jobTitleId: orgJobTitleId,
          name: capitalizeWordsAdvanced(newName),
          isMaster,
        }).unwrap();

        showToast({
          message: 'Job title updated successfully',
          type: 'success',
        });
      } catch (err) {
        showToast({
          message: getOrgErrorMessage(err, 'Something went wrong while updating job title.'),
          type: 'error',
        });
      }

      return;
    }

    if (type === 'jobType') {
      try {
        await updateJobType({
          jobTypeId: String(id),
          job_type_name: capitalizeWordsAdvanced(newName),
          isMaster,
        }).unwrap();

        showToast({ message: 'Job type updated successfully', type: 'success' });
        refetchJobTypes?.();
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Something went wrong while updating job type.'),
          type: 'error',
        });
      }

      return;
    }

    if (type === 'educationPreference') {
      try {
        await updateEducationPreference({
          preferenceId: String(id),
          education_preference_name: capitalizeWordsAdvanced(newName),
        }).unwrap();

        showToast({ message: 'Education preference updated successfully', type: 'success' });
        refetchEducationPreference?.();
      } catch (err) {
        showToast({
          message: getJobErrorMessage(
            err,
            'Something went wrong while updating education preference.'
          ),
          type: 'error',
        });
      }

      return;
    }

    // No update endpoint exists for a tenant's own skill-catalog entries.
    showToast({
      message: 'Skills cannot be renamed from this screen.',
      type: 'error',
    });
  };

  const handleDeleteOption = async (id: string | number, type: string) => {
    if (type === 'department') {
      if (!tenantId) {
        showToast({
          message: 'Unable to remove a department without a company context.',
          type: 'error',
        });
        return;
      }

      try {
        await deleteTenantDepartment({
          tenantId,
          departmentId: String(id),
          isMaster,
        }).unwrap();

        showToast({
          message: 'Department removed successfully',
          type: 'success',
        });

        const currentDepartment = watch('department');
        if (
          Array.isArray(currentDepartment) &&
          currentDepartment.some((item) => idsMatch(item, id))
        ) {
          setValue('department', [], { shouldValidate: true });
          setValue('jobTitle', [], { shouldValidate: true });
        }
      } catch (err) {
        showToast({
          message: getOrgErrorMessage(err, 'Something went wrong while removing department.'),
          type: 'error',
        });
      }

      return;
    }

    if (type === 'jobTitle') {
      const orgJobTitleId = resolveOrgJobTitleId(id);
      if (!orgJobTitleId || !tenantId) {
        showToast({
          message: 'This title is from the platform catalogue and cannot be removed here.',
          type: 'error',
        });
        return;
      }

      try {
        await deleteTenantJobTitle({
          tenantId,
          jobTitleId: orgJobTitleId,
          isMaster,
        }).unwrap();

        showToast({
          message: 'Job title removed successfully',
          type: 'success',
        });

        const currentJobTitle = watch('jobTitle');
        if (Array.isArray(currentJobTitle) && currentJobTitle.some((item) => idsMatch(item, id))) {
          setValue('jobTitle', [], { shouldValidate: true });
        }
      } catch (err) {
        showToast({
          message: getOrgErrorMessage(err, 'Something went wrong while removing job title.'),
          type: 'error',
        });
      }

      return;
    }

    const clearIfSelected = () => {
      const currentValue = watch(type as keyof JobDetailsState);
      if (Array.isArray(currentValue) && currentValue.some((item) => idsMatch(item, id))) {
        setValue(type as keyof JobDetailsState, [], { shouldValidate: true });
      } else if (idsMatch(currentValue, id)) {
        setValue(type as keyof JobDetailsState, null, { shouldValidate: true });
      }
    };

    if (type === 'jobType') {
      try {
        await deleteJobType({ jobTypeId: String(id), isMaster }).unwrap();
        showToast({ message: 'Job type removed successfully', type: 'success' });
        clearIfSelected();
        refetchJobTypes?.();
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Something went wrong while removing job type.'),
          type: 'error',
        });
      }

      return;
    }

    if (type === 'educationPreference') {
      try {
        await deleteEducationPreference(String(id)).unwrap();
        showToast({ message: 'Education preference removed successfully', type: 'success' });
        clearIfSelected();
        refetchEducationPreference?.();
      } catch (err) {
        showToast({
          message: getJobErrorMessage(
            err,
            'Something went wrong while removing education preference.'
          ),
          type: 'error',
        });
      }

      return;
    }

    // No delete endpoint exists for a tenant's own skill-catalog entries.
    showToast({
      message: 'Skills cannot be removed from this screen.',
      type: 'error',
    });
  };

  const resolveSavedJobId = (): string => resolveExistingJobId();

  const onSaveDraft = async (data: Partial<JobDetailsState>) => {
    setAllowNavigation(true);
    const { errors } = validateDraft<JobDetailsState>(data, jobDetailsDraftSchema);

    if (errors) {
      const fieldErrors = Object.entries(errors).reduce(
        (acc, [key, value]) => {
          acc[key] = { type: 'manual', message: value.message };
          return acc;
        },
        {} as Record<string, { type: string; message: string }>
      );
      Object.entries(fieldErrors).forEach(([name, error]) => {
        setError(name as keyof JobDetailsState, error);
      });
      setShowValidationSummary(true);

      return;
    }

    try {
      const details = buildSaveJobDetailsPayload({
        data: {
          ...data,
          jobTitle: (() => {
            const selected = data.jobTitle?.[0];
            const orgId = selected != null ? resolveOrgJobTitleId(selected) : undefined;
            return orgId ? [orgId] : data.jobTitle;
          })(),
        },
        offices,
      });
      const savedId = resolveSavedJobId();
      if (!savedId) {
        showToast({
          message: 'Job opening is not ready yet. Start from Create Job Opening Manually.',
          type: 'error',
        });
        return;
      }

      await updateJobOpening({ jobOpeningId: savedId, body: details }).unwrap();
      dispatch(setJobOpeningId(savedId));

      showToast({
        message: 'Job saved as draft successfully',
        type: 'success',
      });
      navigate('/jobs');
    } catch (error) {
      showToast({
        message: getJobErrorMessage(error, 'Failed to save draft'),
        type: 'error',
      });
    }
  };

  const onSubmit = async (data: JobDetailsState) => {
    setShowValidationSummary(false);
    setAllowNavigation(true);
    dispatch(updateJobDetails(data));
    dispatch(
      updateJobDescription({
        educationPreference: data.educationPreference,
        mandatorySkills: data.mandatorySkills,
        optionalSkills: data.optionalSkills || [],
        responsibilities: data.responsibilities || '',
        otherRequirements: data.otherRequirements || '',
      })
    );

    const payload = {
      ...data,
      locationId: data.officeLocation?.[0],
      generateAiJd: true,
      useCultureIntro: Boolean(data.useCultureIntro),
      maxExperience: data.maxExperience,
      minSalary: data.minSalary ? parseFloat(data.minSalary) : undefined,
      maxSalary: data.maxSalary ? parseFloat(data.maxSalary) : undefined,
      minExperience: data.minExperience ?? undefined,
      responsibilities: data.responsibilities || undefined,
      otherRequirements: data.otherRequirements || undefined,
    };

    const processedPayload = {
      ...changeNullValuesToEmptyArray<any>({
        ...payload,
        maxExperience: null,
      }),
      maxExperience: payload.maxExperience,
      referralBonus:
        payload.referralBonus === null ||
        payload.referralBonus === undefined ||
        payload.referralBonus === ''
          ? ''
          : payload.referralBonus,
      isDraft: false,
    };

    let isSourceUploaded = false;
    if (atsJobOpeningId) {
      isSourceUploaded = true;
    } else if (jobOpeningId && hasSavedDetails) {
      setIsSubmittingWithModal(true);
      try {
        const jdData = await triggerGetJobDescriptionById({
          jobOpeningId: asJobId(jobOpeningId),
        }).unwrap();
        if (jdData?.source === 'UPLOADED') {
          isSourceUploaded = true;
        }
      } catch (err) {
        console.error('Failed to check job description source:', err);
      } finally {
        setIsSubmittingWithModal(false);
      }
    }

    if (isSourceUploaded) {
      setPendingSubmitData(processedPayload);
      setShowRegenerateConfirmModal(true);
    } else {
      executeSubmit(processedPayload, true);
    }
  };

  const executeSubmit = async (processedPayload: any, generateAiJd: boolean) => {
    setAllowNavigation(true);
    setIsSubmittingWithModal(true);
    const selectedTitle = processedPayload.jobTitle?.[0];
    const orgTitleId = selectedTitle != null ? resolveOrgJobTitleId(selectedTitle) : undefined;
    const details = buildSaveJobDetailsPayload({
      data: {
        ...processedPayload,
        jobTitle: orgTitleId ? [orgTitleId] : processedPayload.jobTitle,
      },
      offices,
    });

    try {
      const savedId = resolveExistingJobId();
      if (!savedId) {
        showToast({
          message: 'Job opening is not ready yet. Start from Create Job Opening Manually.',
          type: 'error',
        });
        setIsSubmittingWithModal(false);
        return;
      }

      await updateJobOpening({ jobOpeningId: savedId, body: details }).unwrap();
      dispatch(setJobOpeningId(savedId));
      dispatch(setAiJobDescriptionId(savedId));
      dispatch(setIsFormCompleted(true));

      showToast({
        message: 'Job opening has been saved successfully',
        type: 'success',
      });

      if (savedId && generateAiJd) {
        // Re-arms JD status polling.
        setJdStatusForHydrationIsTerminal(false);
        enhanceJd(savedId)
          .unwrap()
          .catch((enhanceError) => {
            showToast({
              message: getJobErrorMessage(
                enhanceError,
                'Job saved. AI description could not be started - try Refine on the next step.'
              ),
              type: 'warning',
            });
          });
      }

      setShowRegenerateConfirmModal(false);
      setPendingSubmitData(null);
      setIsSubmittingWithModal(false);

      // Stay on this step after saving; the recruiter clicks Next themselves.
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Something went wrong while saving job opening.'),
        type: 'error',
      });
      setIsSubmittingWithModal(false);
    }
  };

  const handleConfirmRegenerate = () => {
    if (!pendingSubmitData) return;
    executeSubmit(pendingSubmitData, true);
  };

  const handleCancelRegenerate = (close?: boolean) => {
    if (close) {
      setShowRegenerateConfirmModal(false);
      setPendingSubmitData(null);
      return;
    }
    if (!pendingSubmitData) return;
    executeSubmit(pendingSubmitData, false);
  };

  // Advances to the AI Job Description step; reachable once Job Details have been saved.
  const handleContinueToDescription = async () => {
    // Persists any field changes made after the initial save.
    const data = watch();
    const { errors } = validateDraft<JobDetailsState>(data, jobDetailsDraftSchema);
    if (errors) {
      Object.entries(errors).forEach(([name, error]) => {
        setError(name as keyof JobDetailsState, { type: 'manual', message: error.message });
      });
      setShowValidationSummary(true);
      return;
    }
    setShowValidationSummary(false);

    const savedId = resolveSavedJobId();
    if (savedId) {
      // Snapshot for the regenerate check below; best-effort.
      let jdBeforeSave: Awaited<ReturnType<typeof triggerGetJobDescriptionById>>['data'];
      try {
        jdBeforeSave = await triggerGetJobDescriptionById({ jobOpeningId: savedId }).unwrap();
      } catch {
        jdBeforeSave = undefined;
      }

      try {
        const details = buildSaveJobDetailsPayload({
          data: {
            ...data,
            jobTitle: (() => {
              const selected = data.jobTitle?.[0];
              const orgId = selected != null ? resolveOrgJobTitleId(selected) : undefined;
              return orgId ? [orgId] : data.jobTitle;
            })(),
          },
          offices,
        });
        await updateJobOpening({ jobOpeningId: savedId, body: details }).unwrap();
        // Sync Redux so isFormDirty doesn't still read dirty right after saving.
        dispatch(updateJobDetails(data));
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Failed to save job details'),
          type: 'error',
        });
        return;
      }

      // Regenerate the description now if a field it was generated from just changed,
      // rather than leaving stale text in place.
      const descriptionInputs = {
        ...data,
        shiftId: data.shift?.[0] != null ? String(data.shift[0]) : undefined,
        jobTypeId: data.jobType?.[0] != null ? String(data.jobType[0]) : undefined,
        educationPreferenceId:
          data.educationPreference?.[0] != null ? String(data.educationPreference[0]) : undefined,
        locationCity: selectedLocationDetails?.city,
        locationState: selectedLocationDetails?.state,
        locationCountry: selectedLocationDetails?.country,
        skillIds: [...(data.mandatorySkills ?? []), ...(data.optionalSkills ?? [])].map(String),
      };
      if (
        jdBeforeSave?.jobDescription &&
        haveDescriptionInputsChanged(descriptionInputs, jdBeforeSave)
      ) {
        try {
          // Re-arms JD status polling.
          setJdStatusForHydrationIsTerminal(false);
          await enhanceJd({ jobOpeningId: savedId, regenerate: true }).unwrap();
          showToast({
            message: 'Job details changed - regenerating the AI description to match…',
            type: 'success',
          });
        } catch (enhanceError) {
          showToast({
            message: getJobErrorMessage(
              enhanceError,
              'Job details saved, but the AI description could not be refreshed automatically - use Regenerate on the next step.'
            ),
            type: 'warning',
          });
        }
      }
    }

    setAllowNavigation(true);
    const fullUrl = getFullURL('/job-description', true);
    const safeUrl =
      typeof fullUrl === 'string' && fullUrl.startsWith('/') ? fullUrl : '/job-description';
    navigate(safeUrl, { viewTransition: true });
  };

  return (
    <>
      {(isUpdating || isSubmittingWithModal) && <Loader />}
      <MainLayout>
        <JobDetailsLayout>
          <div ref={formContainerRef}>
            <Form layout="vertical" autoComplete="off" onFinish={handleSubmit(onSubmit)}>
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
                      id="field-jobProfileCode"
                      value={watch('jobProfileCode')}
                      readOnly
                      placeholder="Job ID"
                      className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                    />
                    {errors.jobProfileCode && (
                      <p className="text-red-500 text-sm mt-1">{errors.jobProfileCode.message}</p>
                    )}
                  </Form.Item>
                  <Form.Item
                    label={
                      <span>
                        Department <span className="required-asterisk">*</span>
                      </span>
                    }
                  >
                    <div id="field-department">
                      <DropdownWithAddOption
                        className="w-full custom-select-jobs placeholder-style"
                        value={watch('department')[0]}
                        onChange={(value) => {
                          setValue('department', value ? [value] : [], { shouldValidate: true });
                          setValue('jobTitle', []);
                          setJobTitleSearchText('');
                          setDebouncedJobTitleSearch('');
                        }}
                        options={departments}
                        loading={departmentsLoading || isAddingToDropdown === 'department'}
                        label="Department"
                        placeholder="Select Department"
                        onAddOption={(value) => handleAddOption(value, 'department')}
                        type="department"
                        error={errors.department?.message}
                        enableEditDelete
                        onEditOption={handleEditOption}
                        onDeleteOption={handleDeleteOption}
                        onReuseOption={handleReuseOption}
                      />
                    </div>
                  </Form.Item>

                  <Form.Item
                    label={
                      <span>
                        Job Title <span className="required-asterisk">*</span>
                      </span>
                    }
                  >
                    <div id="field-jobTitle">
                      <DropdownWithAddOption
                        value={watch('jobTitle')[0]}
                        onChange={handleJobTitleChange}
                        onSearchChange={setJobTitleSearchText}
                        options={jobTitleOptions}
                        loading={
                          loadingDepartmentJobTitles ||
                          loadingCatalogue ||
                          isAddingToDropdown === 'jobTitle'
                        }
                        placeholder={
                          !selectedDepartmentId && !debouncedJobTitleSearch
                            ? 'Please select a department first'
                            : 'Select Job Title'
                        }
                        label="Job Title"
                        onAddOption={(value) => handleAddOption(value, 'jobTitle')}
                        type="jobTitle"
                        error={errors.jobTitle?.message}
                        className="w-full custom-select-jobs placeholder-style"
                        enableEditDelete
                        onEditOption={handleEditOption}
                        onDeleteOption={handleDeleteOption}
                        onReuseOption={handleReuseOption}
                      />
                    </div>
                  </Form.Item>
                  <Form.Item
                    label={
                      <span>
                        Job Type <span className="required-asterisk">*</span>
                      </span>
                    }
                  >
                    <div id="field-jobType">
                      <DropdownWithAddOption
                        className="w-full custom-select-jobs placeholder-style"
                        value={watch('jobType')[0]}
                        onChange={(value) => setValue('jobType', [value], { shouldValidate: true })}
                        options={jobTypes}
                        loading={jobTypesLoading || isAddingToDropdown === 'jobType'}
                        label="Job Type"
                        placeholder="Select Job Type"
                        onAddOption={(value) => handleAddOption(value, 'jobType')}
                        type="jobType"
                        error={errors.jobType?.message}
                        enableEditDelete
                        onEditOption={handleEditOption}
                        onDeleteOption={handleDeleteOption}
                        onReuseOption={handleReuseOption}
                      />
                    </div>
                  </Form.Item>
                  <Form.Item
                    label={
                      <span>
                        Job Mode <span className="required-asterisk">*</span>
                      </span>
                    }
                  >
                    <div id="field-jobMode">
                      <DropdownWithAddOption
                        className="w-full custom-select-jobs placeholder-style"
                        value={(watch('jobMode') || [])[0]}
                        onChange={(value) => setValue('jobMode', [value], { shouldValidate: true })}
                        options={jobModes}
                        loading={jobModesLoading}
                        label="Job Mode"
                        placeholder="Select Job Mode"
                        type="jobMode"
                        enableEditDelete={false}
                      />
                    </div>
                  </Form.Item>
                  <Form.Item label={<span>Shift</span>}>
                    <DropdownWithAddOption
                      className="w-full custom-select-jobs placeholder-style"
                      value={(watch('shift') || [])[0]}
                      onChange={(value) => setValue('shift', [value], { shouldValidate: true })}
                      options={shiftOptions}
                      loading={shiftsLoading}
                      label="Shift"
                      placeholder="Select Shift"
                      type="shift"
                      enableEditDelete={false}
                    />
                    {errors.shift && (
                      <p className="text-red-500 text-sm mt-1">{errors.shift?.message as string}</p>
                    )}
                  </Form.Item>
                  <Form.Item label={<span>Communication Language</span>}>
                    <Controller
                      name="languages"
                      control={control}
                      render={({ field: { value, onChange } }) => (
                        <div className="border-wrapper dropdown-focus-ring border border-[var(--border)] p-1 w-full rounded-3xl relative">
                          <Select
                            mode="multiple"
                            allowClear
                            variant="borderless"
                            placeholder="Select languages"
                            className="w-full custom-select-jobs placeholder-style"
                            loading={languagesLoading}
                            value={languagesLoading ? [] : (value ?? []).map(String)}
                            onChange={(next) => onChange(next)}
                            options={languageOptions.map((item) => ({
                              label: item.name,
                              value: item.id,
                            }))}
                          />
                        </div>
                      )}
                    />
                  </Form.Item>
                  <Form.Item
                    label={
                      <span className="inline-flex items-center gap-2">
                        Company Culture
                        <Tooltip
                          trigger={['hover', 'click']}
                          title={
                            hasCultureInfo
                              ? cultureInfoText
                              : 'No company culture information provided'
                          }
                        >
                          <button
                            type="button"
                            aria-label="View company culture information"
                            className="inline-flex items-center justify-center text-gray-500 hover:text-[var(--color-primary)]"
                          >
                            <InfoCircleOutlined />
                          </button>
                        </Tooltip>
                      </span>
                    }
                  >
                    <div className="mt-3 flex items-center gap-3">
                      <Switch
                        checked={useCultureIntroValue}
                        onChange={(checked) => {
                          setHasUserChangedCultureIntro(true);
                          setValue('useCultureIntro', checked, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                        disabled={!hasCultureInfo}
                        style={{
                          backgroundColor: useCultureIntroValue
                            ? 'var(--color-primary)'
                            : undefined,
                        }}
                      />
                      <span className="text-sm text-gray-700 leading-5">
                        Play Company Culture Introduction at the start of AI Audio Screening
                      </span>
                    </div>
                  </Form.Item>
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full">
                  <span className="text-lg font-semibold">Location</span>
                </div>
                <div className="grid grid-cols-3 gap-x-4 mt-2">
                  <Form.Item
                    label={
                      <span>
                        Location Name <span className="required-asterisk">*</span>
                      </span>
                    }
                  >
                    <div id="field-officeLocation">
                      <DropdownWithAddOption
                        className="w-full custom-select-jobs placeholder-style"
                        value={watch('officeLocation')?.[0]}
                        onChange={handleLocationChange}
                        options={jobLocationOptions}
                        loading={loadingJobLocations}
                        label="Location"
                        placeholder="Select Location"
                        type="location"
                        error={errors.officeLocation?.message}
                        enableEditDelete={false}
                      />
                    </div>
                  </Form.Item>
                  {selectedOfficeLocationId && (
                    <>
                      <Form.Item label={<span>Location Code</span>}>
                        <Input
                          value={selectedLocationDetails?.location_code || 'Not set'}
                          readOnly
                          disabled
                          className="bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed w-full px-4 py-2 border rounded-3xl border-[var(--border)]"
                        />
                      </Form.Item>
                    </>
                  )}
                </div>
                {selectedOfficeLocationId && (
                  <>
                    <div className="grid grid-cols-3 gap-x-4 mt-2">
                      <Form.Item label={<span>Address Line 1</span>}>
                        <Input
                          value={selectedLocationDetails?.address_line_1 ?? ''}
                          readOnly
                          disabled
                          placeholder="Address Line 1"
                          className="bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed w-full px-4 py-2 border rounded-3xl border-[var(--border)]"
                        />
                        {errors.officeLocation && (
                          <p className="text-red-500">{errors.officeLocation.message}</p>
                        )}
                      </Form.Item>
                      <Form.Item label={<span>Address Line 2</span>}>
                        <Input
                          value={selectedLocationDetails?.address_line_2 ?? ''}
                          readOnly
                          disabled
                          placeholder="Address Line 2"
                          className="bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed w-full px-4 py-2 border rounded-3xl border-[var(--border)]"
                        />
                      </Form.Item>
                    </div>
                    <div className="grid grid-cols-3 gap-x-4 mt-2">
                      <Form.Item label={<span>City</span>}>
                        <Input
                          value={selectedLocationDetails?.city ?? ''}
                          readOnly
                          disabled
                          placeholder="City"
                          className="bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed w-full px-4 py-2 border rounded-3xl border-[var(--border)]"
                        />
                      </Form.Item>
                      <Form.Item label={<span>State</span>}>
                        <Input
                          value={selectedLocationDetails?.state ?? watch('state') ?? ''}
                          readOnly
                          disabled
                          placeholder="State"
                          className="bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed w-full px-4 py-2 border rounded-3xl border-[var(--border)]"
                        />
                        {errors.state && <p className="text-red-500">{errors.state.message}</p>}
                      </Form.Item>
                      <Form.Item label={<span>Zip Code</span>}>
                        <Input
                          value={selectedLocationDetails?.zip_code ?? ''}
                          readOnly
                          disabled
                          placeholder="Zip Code"
                          className="bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed w-full px-4 py-2 border rounded-3xl border-[var(--border)]"
                        />
                      </Form.Item>
                      <Form.Item label={<span>Country</span>}>
                        <Input
                          value={selectedLocationDetails?.country ?? watch('country') ?? ''}
                          readOnly
                          disabled
                          placeholder="Country"
                          className="bg-gray-50 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed w-full px-4 py-2 border rounded-3xl border-[var(--border)]"
                        />
                        {errors.country && <p className="text-red-500">{errors.country.message}</p>}
                      </Form.Item>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-2">
                <div className="w-full">
                  <span className="text-lg font-semibold">Hiring Panel</span>
                </div>
                <div className="grid grid-cols-3 gap-x-4 mt-2">
                  {' '}
                  <Form.Item
                    label={
                      <span>
                        Hiring Manager <span className="required-asterisk">*</span>
                      </span>
                    }
                  >
                    <div id="field-hiringManagers" className="space-y-3">
                      <DropdownWithAddOption
                        className="w-full custom-select-jobs placeholder-style hide-rest-item-while-open"
                        value={watch('hiringManagers') || []}
                        onChange={(value) => {
                          setValue('hiringManagers', value || [], {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                        options={hiringManagers}
                        loading={hiringManagerLoading}
                        placeholder="Select Hiring Manager"
                        type="hiringManagers"
                        mode="multiple"
                        maxTagCount={0}
                        maxTagPlaceholder={(omittedValues: { value: number | string }[]) => (
                          <span>
                            {omittedValues.length} of {hiringManagers.length} hiring managers
                            selected
                          </span>
                        )}
                        disabled={false}
                        enableEditDelete={false}
                        error={errors.hiringManagers?.message}
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = selectedHiringManagerIds.filter(
                                      (id) => String(id) !== String(manager.id)
                                    );
                                    setValue('hiringManagers', updated, {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    });
                                  }}
                                  className="ml-1 w-4 h-4 flex items-center justify-center text-brand-500 hover:text-brand-700 hover:bg-brand-200 rounded-full"
                                >
                                  ×
                                </button>
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
                        className="w-full custom-select-jobs placeholder-style hide-rest-item-while-open"
                        value={watch('recruiters') || []}
                        onChange={(value) => {
                          setValue('recruiters', value || [], {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                        options={recruiters}
                        loading={recruitersLoading}
                        placeholder="Select Recruiter"
                        type="recruiters"
                        mode="multiple"
                        maxTagCount={0}
                        maxTagPlaceholder={(omittedValues: { value: number | string }[]) => (
                          <span>
                            {omittedValues.length} of {recruiters.length} recruiters selected
                          </span>
                        )}
                        disabled={false}
                        enableEditDelete={false}
                        error={errors.recruiters?.message as string | undefined}
                      />

                      {selectedRecruiters.length > 0 && (
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-40 overflow-auto pr-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Selected Recruiters
                            </span>
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
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = selectedRecruiterIds.filter(
                                      (id) => String(id) !== String(recruiter.id)
                                    );
                                    setValue('recruiters', updated, {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    });
                                  }}
                                  className="ml-1 w-4 h-4 flex items-center justify-center text-brand-500 hover:text-brand-700 hover:bg-brand-200 rounded-full"
                                >
                                  ×
                                </button>
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
                    <div
                      id="field-openDate"
                      className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl"
                      onPaste={(e) => e.preventDefault()}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <DatePicker
                        value={watch('openDate') ? dayjs(watch('openDate'), 'DD-MM-YYYY') : null}
                        onChange={(date) => {
                          setValue('openDate', date ? date.format('DD-MM-YYYY') : '', {
                            shouldValidate: true,
                          });
                        }}
                        variant="borderless"
                        className="w-full custom-date-picker placeholder-style"
                        format="MMM DD, YYYY"
                        placeholder="Select Open Date"
                        disabledDate={(current) =>
                          current && current.isBefore(dayjs().startOf('day'))
                        }
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                            e.preventDefault();
                          }
                        }}
                      />
                    </div>
                    {errors.openDate && (
                      <p className="text-red-500 text-sm mt-1">{errors.openDate.message}</p>
                    )}
                  </Form.Item>

                  <Form.Item
                    label={
                      <span>
                        Opening(s) <span className="required-asterisk">*</span>
                      </span>
                    }
                  >
                    <Controller
                      name="openings"
                      control={control}
                      render={({ field }) => (
                        <Input
                          id="field-openings"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => {
                            let value = e.target.value;
                            // Only allow digits
                            value = value.replace(/[^0-9]/g, '');
                            // Remove leading zeros but keep single zero
                            value = value.replace(/^0+/, '0').replace(/^0+(\d)/, '$1');
                            const openings =
                              value === '' || value === null
                                ? null
                                : Math.max(1, Math.min(99, Number(value)));
                            setValue('openings', openings, { shouldValidate: true });
                          }}
                          inputMode="numeric"
                          placeholder="Opening(s)"
                          className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                        />
                      )}
                    />
                    {errors.openings && (
                      <p className="text-red-500 text-sm mt-1">{errors.openings.message}</p>
                    )}
                  </Form.Item>

                  <Form.Item label="Close Date">
                    <div
                      className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl"
                      onPaste={(e) => e.preventDefault()}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      <DatePicker
                        value={watch('closeDate') ? dayjs(watch('closeDate'), 'DD-MM-YYYY') : null}
                        onChange={(date) => {
                          setValue('closeDate', date ? date.format('DD-MM-YYYY') : '', {
                            shouldValidate: true,
                          });
                        }}
                        variant="borderless"
                        className="w-full custom-date-picker placeholder-style"
                        format="MMM DD, YYYY"
                        placeholder="Select Close Date"
                        disabledDate={(current) =>
                          current && current.isBefore(dayjs().startOf('day'))
                        }
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                            e.preventDefault();
                          }
                        }}
                      />
                    </div>
                    {errors.closeDate && (
                      <p className="text-red-500 text-sm mt-1">{errors.closeDate.message}</p>
                    )}
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
                    <div
                      id="field-exemptionStatus"
                      className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl "
                    >
                      <Select
                        value={watch('exemptionStatus')}
                        onChange={(value) => {
                          setValue('exemptionStatus', value, { shouldValidate: true });
                        }}
                        className="w-full custom-select-jobs placeholder-style"
                        placeholder="Select Exemption Status"
                        popupClassName="rounded-3xl"
                        loading={exemptionLoading}
                      >
                        {exemptionStatus.length > 0 ? (
                          exemptionStatus.map((status) => (
                            <Option key={status.id} value={status.id}>
                              {status.name}
                            </Option>
                          ))
                        ) : (
                          <Option value="No Status Found" disabled>
                            No Status Found
                          </Option>
                        )}
                      </Select>
                    </div>
                    {errors.exemptionStatus && (
                      <p className="text-red-500 text-sm mt-1">{errors.exemptionStatus.message}</p>
                    )}
                  </Form.Item>
                  <Form.Item
                    label={
                      <span>
                        Minimum Salary (in USD) <span className="required-asterisk">*</span>
                      </span>
                    }
                  >
                    <CurrencyInput
                      // Remount so the suffix updates on status change.
                      key={`minSalary-${watch('exemptionStatus')}`}
                      id="field-minSalary"
                      value={watch('minSalary') ?? ''}
                      onValueChange={(value) => {
                        setValue('minSalary', value ?? null, {
                          shouldValidate: true,
                        });
                        trigger(['maxSalary', 'minSalary']);
                      }}
                      decimalsLimit={2}
                      decimalScale={2}
                      prefix="$"
                      suffix={
                        watch('exemptionStatus') === 'false'
                          ? '/hr'
                          : watch('exemptionStatus') === 'true'
                            ? '/year'
                            : undefined
                      }
                      placeholder="Minimum Salary"
                      className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)] placeholder:capitalize"
                      intlConfig={{ locale: 'en-US', currency: 'USD' }}
                    />
                    {errors.minSalary && (
                      <p className="text-red-500 text-sm mt-1">{errors.minSalary.message}</p>
                    )}
                  </Form.Item>
                  <Form.Item
                    label={
                      <span>
                        Maximum Salary (in USD) <span className="required-asterisk">*</span>
                      </span>
                    }
                  >
                    <CurrencyInput
                      key={`maxSalary-${watch('exemptionStatus')}`}
                      id="field-maxSalary"
                      value={watch('maxSalary') ?? ''}
                      onValueChange={(value) => {
                        setValue('maxSalary', value ?? null, {
                          shouldValidate: true,
                        });
                        trigger(['maxSalary', 'minSalary']);
                      }}
                      decimalsLimit={2}
                      decimalScale={2}
                      prefix="$"
                      suffix={
                        watch('exemptionStatus') === 'false'
                          ? '/hr'
                          : watch('exemptionStatus') === 'true'
                            ? '/year'
                            : undefined
                      }
                      placeholder="Maximum Salary"
                      className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)] placeholder:capitalize"
                      intlConfig={{ locale: 'en-US', currency: 'USD' }}
                    />
                    {errors.maxSalary && (
                      <p className="text-red-500 text-sm mt-1">{errors.maxSalary.message}</p>
                    )}
                  </Form.Item>
                </div>
              </div>
              <div className="mt-2">
                <div className="w-full">
                  <span className="text-lg font-semibold">Job Skills</span>
                </div>
                <div className="form-grid-equal-labels grid grid-cols-3 gap-x-4 mt-4">
                  <Form.Item label={<span>Referral Bonus (in USD)</span>}>
                    <Controller
                      name="referralBonus"
                      control={control}
                      render={({ field }) => (
                        <CurrencyInput
                          value={field.value ?? ''}
                          onValueChange={(value) => {
                            field.onChange(value ? Number(value) : null);
                          }}
                          decimalsLimit={2}
                          decimalScale={2}
                          prefix="$"
                          placeholder="Referral Bonus"
                          className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)] placeholder:capitalize"
                          intlConfig={{ locale: 'en-US', currency: 'USD' }}
                        />
                      )}
                    />
                    {errors.referralBonus && (
                      <p className="text-red-500 text-sm mt-1">{errors.referralBonus.message}</p>
                    )}
                  </Form.Item>
                  <Form.Item
                    label={
                      <span>
                        Minimum Experience (In years) <span className="required-asterisk">*</span>
                      </span>
                    }
                  >
                    <Input
                      id="field-minExperience"
                      type="text"
                      inputMode="numeric"
                      value={watch('minExperience') ?? ''}
                      onChange={(e) => {
                        let value = e.target.value;
                        // Only allow digits
                        value = value.replace(/[^0-9]/g, '');
                        // Remove leading zeros but keep single zero
                        value = value.replace(/^0+/, '0').replace(/^0+(\d)/, '$1');
                        // Cap at 50
                        const numValue =
                          value === '' ? null : Math.max(0, Math.min(50, Number(value)));
                        setValue('minExperience', numValue, {
                          shouldValidate: true,
                        });
                        trigger(['minExperience', 'maxExperience']);
                      }}
                      placeholder="Minimum Experience"
                      className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                    />
                    {errors.minExperience && (
                      <p className="text-red-500 text-sm mt-1">{errors.minExperience.message}</p>
                    )}
                  </Form.Item>
                  <Form.Item label={<span>Maximum Experience (In years)</span>}>
                    <Input
                      id="field-maxExperience"
                      type="text"
                      inputMode="numeric"
                      value={watch('maxExperience') ?? ''}
                      onChange={(e) => {
                        let value = e.target.value;
                        // Only allow digits
                        value = value.replace(/[^0-9]/g, '');
                        // Remove leading zeros but keep single zero
                        value = value.replace(/^0+/, '0').replace(/^0+(\d)/, '$1');
                        // Cap at 50
                        const numValue =
                          value === '' ? null : Math.max(0, Math.min(50, Number(value)));
                        setValue('maxExperience', numValue, {
                          shouldValidate: true,
                        });
                        trigger(['minExperience', 'maxExperience']);
                      }}
                      placeholder="Maximum Experience"
                      className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                    />
                    {errors.maxExperience && (
                      <p className="text-red-500 text-sm mt-1">{errors.maxExperience.message}</p>
                    )}
                  </Form.Item>
                </div>

                {!suggestedSkillsDismissed && unaddedSuggestedSkills.length > 0 && (
                  <div className="mt-2 flex items-center justify-between gap-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
                    <span className="text-sm text-brand-800">
                      <span className="mr-1.5">✨</span>
                      AI suggested {unaddedSuggestedSkills.length} skill
                      {unaddedSuggestedSkills.length === 1 ? '' : 's'} for this role, based on the
                      job description.
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <Button
                        type="button"
                        className="text-white bg-button rounded-3xl px-4 py-1.5 text-xs font-semibold cursor-pointer"
                        onClick={handleAddAllSuggestedSkills}
                      >
                        ADD ALL
                      </Button>
                      <button
                        type="button"
                        onClick={() => setSuggestedSkillsDismissed(true)}
                        className="text-brand-500 hover:text-brand-700 cursor-pointer"
                        aria-label="Dismiss suggestion"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-4 mt-2">
                  <Form.Item
                    label={
                      <span>
                        Required Skills <span className="required-asterisk">*</span>
                      </span>
                    }
                  >
                    <div id="field-mandatorySkills" className="space-y-3">
                      <DropdownWithAddOption
                        className="w-full custom-select-jobs placeholder-style hide-rest-item-while-open"
                        value={watch('mandatorySkills') || []}
                        onChange={(value) =>
                          setValue('mandatorySkills', value || [], {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        options={mandatorySkills.filter(
                          (option) => !selectedOptionalSkillIds.includes(String(option.id))
                        )}
                        loading={mandatorySkillsLoading || isAddingToDropdown === 'mandatorySkills'}
                        mode="multiple"
                        placeholder="Select Required Skills"
                        label="Required Skills"
                        onAddOption={
                          canAddSkill
                            ? (value) => handleAddOption(value, 'mandatorySkills')
                            : undefined
                        }
                        onSearchChange={searchMandatorySkills}
                        type="mandatorySkills"
                        error={errors.mandatorySkills?.message}
                        enableEditDelete
                        onEditOption={handleEditOption}
                        onDeleteOption={handleDeleteOption}
                        onReuseOption={handleReuseOption}
                        maxTagCount={0}
                        maxTagPlaceholder={(omittedValues: { value: number | string }[]) => (
                          <span>
                            {omittedValues.length} of {mandatorySkills?.length || 20} skills
                            selected
                          </span>
                        )}
                      />

                      {selectedMandatorySkills.length > 0 && (
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-40 overflow-auto pr-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Selected Required Skills
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedMandatorySkills.map((skill) => (
                              <span
                                key={skill.id}
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                                  skill.isDeleted
                                    ? 'bg-gray-100 text-gray-600 border-gray-300'
                                    : 'bg-brand-100 text-brand-800 border-brand-200'
                                }`}
                              >
                                {skill.name}
                                {skill.isDeleted && (
                                  <span className="ml-2 text-xs italic">(Deactivated)</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = selectedMandatorySkillIds.filter(
                                      (id) => String(id) !== String(skill.id)
                                    );
                                    setValue('mandatorySkills', updated, {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    });
                                  }}
                                  className="ml-1 w-4 h-4 flex items-center justify-center text-brand-500 hover:text-brand-700 hover:bg-brand-200 rounded-full"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Form.Item>

                  <Form.Item label="Optional Skills">
                    <div className="space-y-3">
                      <DropdownWithAddOption
                        className="w-full custom-select-jobs placeholder-style hide-rest-item-while-open"
                        value={watch('optionalSkills') || []}
                        onChange={(value) =>
                          setValue('optionalSkills', value || [], {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        options={optionalSkills.filter(
                          (option) => !selectedMandatorySkillIds.includes(String(option.id))
                        )}
                        loading={optionalSkillsLoading || isAddingToDropdown === 'optionalSkills'}
                        mode="multiple"
                        placeholder="Select Optional Skills"
                        label="Optional Skills"
                        onAddOption={
                          canAddSkill
                            ? (value) => handleAddOption(value, 'optionalSkills')
                            : undefined
                        }
                        onSearchChange={searchOptionalSkills}
                        type="optionalSkills"
                        error={errors.optionalSkills?.message}
                        enableEditDelete
                        onEditOption={handleEditOption}
                        onDeleteOption={handleDeleteOption}
                        onReuseOption={handleReuseOption}
                        maxTagCount={0}
                        maxTagPlaceholder={(omittedValues: { value: number | string }[]) => (
                          <span>
                            {omittedValues.length} of {optionalSkills?.length || 20} skills selected
                          </span>
                        )}
                      />

                      {selectedOptionalSkills.length > 0 && (
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-40 overflow-auto pr-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Selected Optional Skills
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedOptionalSkills.map((skill) => (
                              <span
                                key={skill.id}
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                                  skill.isDeleted
                                    ? 'bg-gray-100 text-gray-600 border-gray-300'
                                    : 'bg-brand-100 text-brand-800 border-brand-200'
                                }`}
                              >
                                {skill.name}
                                {skill.isDeleted && (
                                  <span className="ml-2 text-xs italic">(Deactivated)</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = selectedOptionalSkillIds.filter(
                                      (id) => String(id) !== String(skill.id)
                                    );
                                    setValue('optionalSkills', updated, {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    });
                                  }}
                                  className="ml-1 w-4 h-4 flex items-center justify-center text-brand-500 hover:text-brand-700 hover:bg-brand-200 rounded-full"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
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
                    <div id="field-educationPreference">
                      <DropdownWithAddOption
                        className="w-full custom-select-jobs placeholder-style"
                        value={watch('educationPreference')?.[0]}
                        onChange={(value) =>
                          setValue('educationPreference', value ? [value] : [], {
                            shouldValidate: true,
                          })
                        }
                        options={educationPreference}
                        loading={
                          educationPreferenceLoading || isAddingToDropdown === 'educationPreference'
                        }
                        placeholder="Select Education Preference"
                        label="Education Preference"
                        onAddOption={(value) => handleAddOption(value, 'educationPreference')}
                        type="educationPreference"
                        error={errors.educationPreference?.message}
                        enableEditDelete
                        onEditOption={handleEditOption}
                        onDeleteOption={handleDeleteOption}
                        onReuseOption={handleReuseOption}
                      />
                    </div>
                  </Form.Item>

                  <Form.Item
                    label={
                      <span>
                        Responsibilities <span className="required-asterisk">*</span>
                      </span>
                    }
                  >
                    <Controller
                      name="responsibilities"
                      control={control}
                      render={({ field }) => (
                        <TextArea
                          {...field}
                          id="field-responsibilities"
                          placeholder="Enter responsibilities"
                          rows={4}
                          maxLength={1000}
                          showCount={{
                            formatter: ({ count, maxLength }) => `${count}/${maxLength} characters`,
                          }}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      )}
                    />
                    {errors.responsibilities && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.responsibilities.message as string}
                      </p>
                    )}
                  </Form.Item>
                </div>

                <div className="grid grid-cols-1 mt-2">
                  <Form.Item label={<span>Other Requirements</span>}>
                    <Controller
                      name="otherRequirements"
                      control={control}
                      render={({ field }) => (
                        <TextArea
                          {...field}
                          placeholder="Enter other requirements"
                          rows={4}
                          maxLength={1000}
                          showCount={{
                            formatter: ({ count, maxLength }) => `${count}/${maxLength} characters`,
                          }}
                          className="w-full px-4 py-2 border rounded-lg"
                        />
                      )}
                    />
                    {errors.otherRequirements && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.otherRequirements.message}
                      </p>
                    )}
                  </Form.Item>
                </div>
              </div>

              {showAtsSyncCheckbox && aiJobDescriptionId && (
                <div className="flex w-full justify-center py-2">
                  <Checkbox
                    checked={isSyncingWithATS}
                    onChange={(e) => setIsSyncingWithATS(e.target.checked)}
                    className="custom-checkbox roboto-font"
                  >
                    Sync Job Description With ATS
                  </Checkbox>
                </div>
              )}

              {showValidationSummary && validationIssues.length > 0 && (
                <div
                  ref={validationSummaryRef}
                  role="alert"
                  className="mx-auto mt-6 w-full max-w-2xl rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-red-700">
                    {validationIssues.length === 1
                      ? '1 field still needs your attention:'
                      : `${validationIssues.length} fields still need your attention:`}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {validationIssues.map((issue) => (
                      <li key={issue.name}>
                        <button
                          type="button"
                          onClick={() => scrollToFieldError(issue.message)}
                          className="text-sm text-red-600 underline underline-offset-2 hover:text-red-800 cursor-pointer"
                          title={issue.message}
                        >
                          {issue.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-center mt-6 gap-6">
                {!hasSavedDetails && (
                  <Button
                    type="button"
                    className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
                    onClick={() => onSaveDraft(watch())}
                  >
                    SAVE AS DRAFT
                  </Button>
                )}
                {!hasSavedDetails ? (
                  <Button
                    type="button"
                    className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
                    onClick={handleSubmit(onSubmit, (invalidFields) => {
                      showToast({
                        message: 'Please fill all required fields before saving.',
                        type: 'error',
                      });
                      scrollToFirstFormError(invalidFields, JOB_DETAILS_FIELD_ORDER);
                    })}
                  >
                    SAVE & GENERATE DESCRIPTION
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
                    onClick={handleContinueToDescription}
                    disabled={false}
                  >
                    NEXT: AI JOB DESCRIPTION →
                  </Button>
                )}
              </div>
            </Form>
          </div>
          {isBlocked && (
            <ConfirmationModal
              onClose={cancelNavigation}
              onConfirm={confirmNavigation}
              title="You have unsaved changes. Are you sure you want to leave?"
              confirmText="LEAVE PAGE"
            />
          )}
          {showRegenerateConfirmModal && (
            <ConfirmationModal
              onClose={handleCancelRegenerate}
              onConfirm={handleConfirmRegenerate}
              title="Would you like to regenerate the Job Description using AI, or use the current uploaded Job Description?"
              confirmText="REGENERATE"
              cancelText="USE UPLOADED JD"
              isLoading={isSubmittingWithModal}
            />
          )}
        </JobDetailsLayout>
      </MainLayout>
      {resolvedJobId && <FillWithAiWidget jobOpeningId={resolvedJobId} />}
    </>
  );
};
export default JobDetails;
