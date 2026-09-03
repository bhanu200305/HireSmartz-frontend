import MainLayout from '../../../layouts/MainLayout';
import './addJob.css';
import { InfoCircleOutlined } from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';
import { Checkbox, DatePicker, Form, Select, Switch, Tooltip } from 'antd';
import { Button, CollapsibleSection, Input, showToast } from '../../shared';
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
  const { loginToken } = useSelector((state: any) => state.LoginSlice);
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
  const [isHiringManagerDropdownOpen, setIsHiringManagerDropdownOpen] = useState(false);
  const [isRecruiterDropdownOpen, setIsRecruiterDropdownOpen] = useState(false);
  const [isMandatorySkillsDropdownOpen, setIsMandatorySkillsDropdownOpen] = useState(false);
  const [isOptionalSkillsDropdownOpen, setIsOptionalSkillsDropdownOpen] = useState(false);
  const [suggestedSkillsDismissed, setSuggestedSkillsDismissed] = useState(false);
  // Backs the "Selected Skills" chips for a suggested skill the recruiter
  // accepted via the AI-suggestions banner before the live catalogue search
  // dropdown (`mandatorySkills`/`optionalSkills` below) had cached a label
  // for it — that dropdown only knows skills someone has actually searched
  // for, so a freshly-accepted suggestion needs its own label source. Same
  // pattern as EditJobDetail.tsx's own AI-suggestions banner. Seeded from
  // Redux's persisted `aiSuggestedSkillLabels` (not just started empty) so
  // a skill JobDescriptionPanel added while THIS component wasn't even
  // mounted — the recruiter had already moved to the AI Job Description
  // step before generation finished — still resolves a name here on a
  // fresh visit, instead of showing as a nameless chip forever.
  const [extraSuggestedSkillOptions, setExtraSuggestedSkillOptions] = useState<
    JobOpeningDropdownOption[]
  >(() =>
    Object.entries(jobDetails.aiSuggestedSkillLabels ?? {}).map(([id, name]) => ({ id, name }))
  );

  const [updateJobOpening, { isLoading: isUpdating }] = useUpdateJobOpeningMutation();
  const jobIdFromUrl = asJobId(searchParams.get('jobOpeningId'));
  const resolvedJobId = asJobId(jobOpeningId) || jobIdFromUrl;
  const jobIdRef = useRef(resolvedJobId);
  // Whether this job's Job Details form has actually been saved with real
  // content (job title + department, both required there) — false for a
  // bare draft shell (`useStartManualJobOpening` calls `POST
  // /job-openings/draft` up front, before anything's filled in). Drives the
  // Save-vs-Next footer button below (once saved, this step's job is done
  // and the wizard moves on to the AI Job Description step, JobDescriptionStep.tsx);
  // deliberately NOT `aiJobDescriptionId` (Redux) or "is there a job id in
  // the URL" — both are true for that empty draft too (its own URL gets the
  // id attached immediately), so neither can tell a freshly-started,
  // still-empty job apart from a fully-saved one, which is exactly the
  // distinction this needs.
  const { data: jdDetailsForGate, refetch: refetchJdDetailsForGate } =
    useGetJobDescriptionByIdQuery({ jobOpeningId: resolvedJobId }, { skip: !resolvedJobId });
  const hasSavedDetails = jdDetailsForGate?.hasSavedDetails ?? false;
  // Whatever AI writes (via the floating "Fill with AI" widget, or the
  // Refine/Generate box on the AI Job Description step) lands on the job
  // asynchronously — this step's form only ever reads its initial values
  // once, at mount, from Redux (`jobDetails` below). A light, page-lifetime
  // poll of jd/status (cheap — one status field) catches the actual
  // GENERATING/PROCESSING → READY transition (not just "status happens to
  // be READY", which is also every untouched job's default/idle state) and
  // then applies whatever's new — see the effect near the ATS one below.
  const { data: jdStatusForHydration } = useGetJdStatusQuery(resolvedJobId, {
    skip: !resolvedJobId,
    pollingInterval: 3000,
  });
  const prevJdStatusForHydrationRef = useRef<string | undefined>(undefined);
  // Guards the race-condition fallback below (see the AI-fill effect) —
  // tracks which job id we've already applied the "status was already
  // READY on first observation" fallback for, so it fires at most once per
  // job rather than on every subsequent poll once status settles at READY.
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
    // Hiring Manager/Recruiter are NOT location-scoped on this backend —
    // useJobOpeningDropdown('HIRING_MANAGER'/'RECRUITER', ...) always pulls
    // the tenant's whole user list, no locationId involved (that's what
    // selectedLocationIdForUsers above was for, but nothing ever reads its
    // value). Clearing these here just silently threw away a selection the
    // user had already made every time they touched Location — see the
    // "hiring manager/recruiter keeps getting deselected" report.
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

  const persistJobId = useCallback(
    (jobId: string) => {
      if (!jobId) return;
      jobIdRef.current = jobId;
      if (asJobId(jobOpeningId) !== jobId) {
        dispatch(setJobOpeningId(jobId));
      }
      // Restore `aiJobDescriptionId` (Redux doesn't survive a reload) once
      // this job's details are confirmed actually saved — see
      // `hasSavedDetails` above for why that's the right signal here, not
      // just "does a job id exist".
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
      (offices ?? []).map((office) => ({
        id: office.office_id,
        name: officeDisplayName(office),
      })),
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
    return merged.filter(
      (title, index, self) => index === self.findIndex((t) => idsMatch(t.id, title.id))
    );
  }, [
    debouncedJobTitleSearch,
    mappedCatalogueJobTitles,
    mappedDepartmentJobTitles,
    selectedDepartmentId,
  ]);

  // AI-suggested skills for the currently selected job title —
  // get_suggested_skills.py on the backend, previously wired to no UI at
  // all. Needs the title's real org_job_title_id (not the composite form
  // id DropdownWithAddOption uses) and its display text; skipped until
  // both are known, same gate the backend itself requires (job_title_id
  // and job_title_text are both required query params).
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
  const { data: suggestedSkillsData } = useGetSuggestedSkillsQuery(
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

  // Persists skill labels into Redux (merged, never replaced wholesale) so
  // they survive this component unmounting or the page reloading —
  // `extraSuggestedSkillOptions` alone is local state, gone the moment
  // this component isn't the one mounted. See `aiSuggestedSkillLabels` on
  // JobDetailsState for the full reasoning.
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

  // Matches EditJobDetail.tsx's own "Add All" banner exactly, for the same
  // AI-suggested-skills capability on the create-flow side.
  const handleAddAllSuggestedSkills = () => {
    if (unaddedSuggestedSkills.length === 0) return;
    const newMandatoryIds = unaddedSuggestedSkills
      .filter((skill) => skill.suggested_skill_type === 'mandatory')
      .map((skill) => skill.skill_id);
    const newOptionalIds = unaddedSuggestedSkills
      .filter((skill) => skill.suggested_skill_type === 'optional')
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

  const departments = (orgDepartments ?? []).map((department) => ({
    id: department.org_department_id,
    name: department.name,
    isDeleted: false,
  }));
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

  // Guards the non-ATS branch below — hydrating country/state/officeLocation
  // from Redux is meant to happen once, when this step first mounts with
  // data already sitting in Redux (a revisit). It must NOT re-run on every
  // later Redux update: `jobDetails` (the whole `state.JobSlice.details`
  // object) changes reference on any dispatch that touches it, including
  // ones with nothing to do with location at all — e.g. `persistSkillLabels`
  // below, fired every time an AI-suggested skill gets accepted or the
  // AI-fill hydration effect merges in new skills. Without this guard,
  // accepting a skill (or salary/other fields arriving via that same AI-fill
  // effect) re-ran this block, and its `setValue('officeLocation',
  // jobDetails.officeLocation || [])` clobbered whatever the recruiter had
  // just picked in the live form with Redux's still-stale copy (form edits
  // only reach Redux on submit) — the reported "location gets deselected"
  // bug. Locked the first time this effect lands in the non-ATS branch at
  // all, even if `jobDetails` was still empty then (a brand-new draft) —
  // otherwise the guard would never engage until `jobDetails` first became
  // non-empty for some unrelated reason, which is exactly the case that
  // needs guarding against. The ATS branch is untouched by this: it keys off
  // `atsJobData`/`isFromAts` (router state, from a deliberate navigation),
  // never off Redux churn, so it doesn't have this problem and should still
  // re-run if a real ATS (re)sync hands this page fresh `atsJobData`.
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

  // AI-fill counterpart to the ATS hydration above — applies whatever
  // responsibilities/other requirements/experience/salary AI wrote onto
  // this still-open form once a generation run actually finishes. Keyed
  // off an observed GENERATING/PROCESSING -> READY transition, not just
  // "status is currently READY" — that's also every untouched job's
  // resting state (Manual jobs default to READY before anything's ever
  // been generated), so treating it as a completion signal would apply
  // (all-null) fields once on mount and never look again. Explicitly
  // refetches rather than trusting `jdDetailsForGate` in this same render —
  // that value is still the pre-completion snapshot until the refetch
  // below resolves. Only ever fills a field the recruiter hasn't already
  // typed something into; can fire more than once per job (e.g. the
  // recruiter fills with AI here, then Refines again from the AI Job
  // Description step, then comes back).
  useEffect(() => {
    const previousStatus = prevJdStatusForHydrationRef.current;
    const currentStatus = jdStatusForHydration?.status;
    prevJdStatusForHydrationRef.current = currentStatus;

    const justFinishedGenerating =
      (previousStatus === 'GENERATING' || previousStatus === 'PROCESSING') &&
      currentStatus === 'READY';

    // Race-condition fallback: on the Upload JD / AI Prompt entry paths,
    // ai-service can finish parsing/generating before this page ever polls
    // status even once — the job is created with jd_status PROCESSING/
    // GENERATING (see UploadJdUseCase/create_from_prompt on the backend),
    // but if that flips to READY before our first poll lands, the first
    // status we ever observe here IS READY, with no PROCESSING/GENERATING
    // seen in between — `justFinishedGenerating` above never fires and the
    // AI-extracted fields are silently never applied. Catch that by also
    // firing once per job the first time status is seen as READY, but only
    // for entry paths that write JD content asynchronously — Manual/ATS
    // jobs have no such race (their JD, if any, is present from creation,
    // or written only in response to a click made after this page already
    // mounted, so the transition above is always observable for those).
    const entryPath = jdDetailsForGate?.entryPath;
    const isAsyncJdEntryPath = entryPath === 'UPLOAD_JD' || entryPath === 'AI_PROMPT';
    const racedStraightToReady =
      currentStatus === 'READY' &&
      isAsyncJdEntryPath &&
      appliedAiFillJobIdRef.current !== resolvedJobId;

    if (!justFinishedGenerating && !racedStraightToReady) return;
    appliedAiFillJobIdRef.current = resolvedJobId;

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
      // Skills AI suggested via job.jd.enhance are auto-committed straight
      // onto the job (job.add_skill — unlike generate/parse's
      // suggestions-only cache), so they exist in `fresh.skills` the
      // moment this refetch lands. Merge in only the ones not already
      // selected, split by the catalogue's own type name.
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
          if (skill.skill_type.toLowerCase() === 'mandatory') {
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
          // The "Selected Skills" chip boxes resolve a display name by
          // looking up each id in the catalogue dropdown's own option
          // list — a skill that only ever arrived through this AI-fill
          // path (never opened in either dropdown before) isn't in there,
          // so it renders as a nameless chip without this. Same fix
          // `handleAddAllSuggestedSkills` already applies for the "ADD
          // ALL" banner's own skills.
          setExtraSuggestedSkillOptions((prev) => [...prev, ...newOptions]);
          persistSkillLabels(newOptions);
          refetchMandatorySkills?.();
          refetchOptionalSkills?.();
        }
      }
      if (appliedAnything) {
        showToast({
          message:
            'AI filled in some job details from your prompt — review and edit before saving.',
          type: 'success',
        });
      }
    });
  }, [
    jdStatusForHydration?.status,
    jdDetailsForGate?.entryPath,
    resolvedJobId,
    refetchJdDetailsForGate,
    getValues,
    setValue,
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

        setValue('jobTitle', [tenantJobTitleFormId(createdJobTitle)], { shouldValidate: true });
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
        const created = await createEducationPreference({ name: formattedValue }).unwrap();
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
        const createdSkill = await createOrganizationSkill({ name: formattedValue }).unwrap();
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
        // Super Admin's own catalogue (/platform/master-job-types) vs a
        // tenant's own (/job-types) — same isMaster branch catalogs.ts's
        // read side already uses for this dropdown.
        const createdJobType = await createJobType({
          name: formattedValue,
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

    // Job types, education preferences and skill-catalog entries are all
    // soft-deleted on the current backend, but none of them expose a
    // restore/reactivate endpoint (only create/list/update/delete) — the
    // old generic /job-opening/{type}/reuse/{id} this used to call doesn't
    // exist on this backend at all. Same honest "not from this screen"
    // treatment as department/jobTitle above, rather than pretending it works.
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
          name: capitalizeWordsAdvanced(newName),
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
          name: capitalizeWordsAdvanced(newName),
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

    // No update endpoint exists for a tenant's own skill-catalog entries —
    // /skills only supports POST (create) and /skills/search (read). The old
    // generic /job-opening/{type}/update this used to call for
    // mandatorySkills/optionalSkills has no equivalent on this backend.
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

    // No delete endpoint exists for a tenant's own skill-catalog entries —
    // same gap as handleEditOption above.
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
        enhanceJd(savedId)
          .unwrap()
          .catch((enhanceError) => {
            showToast({
              message: getJobErrorMessage(
                enhanceError,
                'Job saved. AI description could not be started — try Refine on the next step.'
              ),
              type: 'warning',
            });
          });
      }

      setShowRegenerateConfirmModal(false);
      setPendingSubmitData(null);
      setIsSubmittingWithModal(false);

      // Stay on this step after saving — don't auto-advance to the AI Job
      // Description step. `aiJobDescriptionId` is now set (dispatched
      // above), so the form re-renders with the "NEXT: AI JOB DESCRIPTION →"
      // button (handleContinueToDescription) in place of this Save button;
      // moving on is the user's own next click.
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

  // Advances to the AI Job Description step (JobDescriptionStep.tsx) — only
  // reachable once this step's Job Details have been saved (button below
  // only renders once `hasSavedDetails` is true).
  const handleContinueToDescription = async () => {
    // The Save button (executeSubmit) only ever runs once, before
    // aiJobDescriptionId exists — after that this button takes its place
    // (see the comment above executeSubmit), so this is the ONLY remaining
    // chance to persist any Job Details field the recruiter changes
    // afterwards. This used to just navigate away with no save at all,
    // silently discarding anything edited at this point — Hiring Manager
    // and Recruiter included, which is exactly why they kept coming back
    // deselected: they were never actually being sent to the backend.
    const data = watch();
    const { errors } = validateDraft<JobDetailsState>(data, jobDetailsDraftSchema);
    if (errors) {
      Object.entries(errors).forEach(([name, error]) => {
        setError(name as keyof JobDetailsState, { type: 'manual', message: error.message });
      });
      showToast({
        message: 'Please fix the highlighted fields before continuing.',
        type: 'error',
      });
      return;
    }

    const savedId = resolveSavedJobId();
    if (savedId) {
      // Snapshot what the AI description currently reflects BEFORE saving
      // the new values — used below to decide whether this save actually
      // changed anything the description is generated from. Best-effort:
      // if this fails, `jdBeforeSave` stays undefined and the regenerate
      // check below simply skips (same as "no description yet").
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
        // Unlike onSubmit (the first save), this path never synced Redux's
        // `jobDetails` with what was just saved — `isFormDirty` compares
        // the live form against that Redux snapshot, so without this the
        // form still read as dirty the instant after a successful save,
        // and clicking straight through to Next hit the "unsaved changes"
        // navigation-blocker dialog even though nothing was actually
        // unsaved.
        dispatch(updateJobDetails(data));
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Failed to save job details'),
          type: 'error',
        });
        return;
      }

      // Regenerate only if a description-source field changed.
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
          await enhanceJd({ jobOpeningId: savedId, regenerate: true }).unwrap();
          showToast({
            message: 'Job details changed — regenerating the AI description to match…',
            type: 'success',
          });
        } catch (enhanceError) {
          showToast({
            message: getJobErrorMessage(
              enhanceError,
              'Job details saved, but the AI description could not be refreshed automatically — use Regenerate on the next step.'
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
          <Form layout="vertical" autoComplete="off" onFinish={handleSubmit(onSubmit)}>
            <CollapsibleSection title="Job Info" defaultOpen>
              <div className="grid grid-cols-3 gap-x-4 mt-2">
                <Form.Item
                  label={
                    <span>
                      Job ID <span className="required-asterisk">*</span>
                    </span>
                  }
                >
                  <Input
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
                  <DropdownWithAddOption
                    className="w-full custom-select-jobs placeholder-style"
                    autoFocus
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
                </Form.Item>

                <Form.Item
                  label={
                    <span>
                      Job Title <span className="required-asterisk">*</span>
                    </span>
                  }
                >
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
                </Form.Item>
                <Form.Item
                  label={
                    <span>
                      Job Type <span className="required-asterisk">*</span>
                    </span>
                  }
                >
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
                </Form.Item>
                <Form.Item
                  label={
                    <span>
                      Job Mode <span className="required-asterisk">*</span>
                    </span>
                  }
                >
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
                      <Select
                        mode="multiple"
                        allowClear
                        placeholder="Select languages"
                        className="w-full custom-select-jobs"
                        loading={languagesLoading}
                        value={(value ?? []).map(String)}
                        onChange={(next) => onChange(next)}
                        options={languageOptions.map((item) => ({
                          label: item.name,
                          value: item.id,
                        }))}
                      />
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
                        backgroundColor: useCultureIntroValue ? 'var(--color-primary)' : undefined,
                      }}
                    />
                    <span className="text-sm text-gray-700 leading-5">
                      Play Company Culture Introduction at the start of AI Audio Screening
                    </span>
                  </div>
                </Form.Item>
              </div>
            </CollapsibleSection>
            <CollapsibleSection title="Location">
              <div className="grid grid-cols-3 gap-x-4 mt-2">
                <Form.Item
                  label={
                    <span>
                      Location Name <span className="required-asterisk">*</span>
                    </span>
                  }
                >
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
            </CollapsibleSection>
            <CollapsibleSection title="Hiring Panel">
              <div className="grid grid-cols-3 gap-x-4 mt-2">
                {' '}
                <Form.Item label={<span>Hiring Manager</span>}>
                  <div className="space-y-3">
                    <DropdownWithAddOption
                      className="w-full custom-select-jobs placeholder-style hide-rest-item-while-open"
                      value={watch('hiringManagers') || []}
                      onChange={(value) => {
                        setValue('hiringManagers', value || [], {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      onOpenChange={(open) => {
                        setIsHiringManagerDropdownOpen(open);
                      }}
                      options={hiringManagers}
                      loading={hiringManagerLoading}
                      placeholder="Select Hiring Manager"
                      type="hiringManagers"
                      mode="multiple"
                      maxTagCount={0}
                      maxTagPlaceholder={
                        !isHiringManagerDropdownOpen
                          ? (omittedValues: { value: number | string }[]) => (
                              <span>
                                {omittedValues.length} of {hiringManagers.length} hiring managers
                                selected
                              </span>
                            )
                          : null
                      }
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
                      onOpenChange={(open) => {
                        setIsRecruiterDropdownOpen(open);
                      }}
                      options={recruiters}
                      loading={recruitersLoading}
                      placeholder="Select Recruiter"
                      type="recruiters"
                      mode="multiple"
                      maxTagCount={0}
                      maxTagPlaceholder={
                        !isRecruiterDropdownOpen
                          ? (omittedValues: { value: number | string }[]) => (
                              <span>
                                {omittedValues.length} of {recruiters.length} recruiters selected
                              </span>
                            )
                          : null
                      }
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
            </CollapsibleSection>
            <CollapsibleSection title="Salary Status">
              <div className="grid grid-cols-3 gap-x-4 mt-2">
                <Form.Item
                  label={
                    <span>
                      Exemption Status <span className="required-asterisk">*</span>
                    </span>
                  }
                >
                  <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl ">
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
                    // Always a plain annual figure — no "/hr" suffix.
                    // Exemption Status (`false`/Non-Exempt is the
                    // backend's own default for every job — see
                    // `Job.is_exempted`, job.py — for any job the
                    // recruiter hasn't touched that dropdown on yet, AI-
                    // filled ones very much included) isn't a reliable
                    // signal for what unit a salary figure is in, and a
                    // JD's stated salary is virtually always annual.
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
                    // Always a plain annual figure — no "/hr" suffix.
                    // Exemption Status (`false`/Non-Exempt is the
                    // backend's own default for every job — see
                    // `Job.is_exempted`, job.py — for any job the
                    // recruiter hasn't touched that dropdown on yet, AI-
                    // filled ones very much included) isn't a reliable
                    // signal for what unit a salary figure is in, and a
                    // JD's stated salary is virtually always annual.
                    placeholder="Maximum Salary"
                    className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)] placeholder:capitalize"
                    intlConfig={{ locale: 'en-US', currency: 'USD' }}
                  />
                  {errors.maxSalary && (
                    <p className="text-red-500 text-sm mt-1">{errors.maxSalary.message}</p>
                  )}
                </Form.Item>
              </div>
            </CollapsibleSection>
            <CollapsibleSection title="Job Skills">
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
                    {unaddedSuggestedSkills.length === 1 ? '' : 's'} for this role, based on the job
                    description.
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
                <Form.Item label={<span>Required Skills</span>}>
                  <div className="space-y-3">
                    <DropdownWithAddOption
                      className="w-full custom-select-jobs placeholder-style hide-rest-item-while-open"
                      value={watch('mandatorySkills') || []}
                      onChange={(value) =>
                        setValue('mandatorySkills', value || [], {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      onOpenChange={(open) => {
                        setIsMandatorySkillsDropdownOpen(open);
                      }}
                      options={mandatorySkills.filter(
                        (option) => !selectedOptionalSkillIds.includes(String(option.id))
                      )}
                      loading={mandatorySkillsLoading || isAddingToDropdown === 'mandatorySkills'}
                      mode="multiple"
                      placeholder="Select Required Skills"
                      label="Required Skills"
                      onAddOption={(value) => handleAddOption(value, 'mandatorySkills')}
                      onSearchChange={searchMandatorySkills}
                      type="mandatorySkills"
                      error={errors.mandatorySkills?.message}
                      enableEditDelete
                      onEditOption={handleEditOption}
                      onDeleteOption={handleDeleteOption}
                      onReuseOption={handleReuseOption}
                      maxTagCount={0}
                      maxTagPlaceholder={
                        !isMandatorySkillsDropdownOpen
                          ? (omittedValues: { value: number | string }[]) => (
                              <span>
                                {omittedValues.length} of {mandatorySkills?.length || 20} skills
                                selected
                              </span>
                            )
                          : null
                      }
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
                      onOpenChange={(open) => {
                        setIsOptionalSkillsDropdownOpen(open);
                      }}
                      options={optionalSkills.filter(
                        (option) => !selectedMandatorySkillIds.includes(String(option.id))
                      )}
                      loading={optionalSkillsLoading || isAddingToDropdown === 'optionalSkills'}
                      mode="multiple"
                      placeholder="Select Optional Skills"
                      label="Optional Skills"
                      onAddOption={(value) => handleAddOption(value, 'optionalSkills')}
                      onSearchChange={searchOptionalSkills}
                      type="optionalSkills"
                      error={errors.optionalSkills?.message}
                      enableEditDelete
                      onEditOption={handleEditOption}
                      onDeleteOption={handleDeleteOption}
                      onReuseOption={handleReuseOption}
                      maxTagCount={0}
                      maxTagPlaceholder={
                        !isOptionalSkillsDropdownOpen
                          ? (omittedValues: { value: number | string }[]) => (
                              <span>
                                {omittedValues.length} of {optionalSkills?.length || 20} skills
                                selected
                              </span>
                            )
                          : null
                      }
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
                <Form.Item label={<span>Education Preference</span>}>
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
                </Form.Item>

                <Form.Item label={<span>Responsibilities</span>}>
                  <Controller
                    name="responsibilities"
                    control={control}
                    render={({ field }) => (
                      <TextArea
                        {...field}
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
                    <p className="text-red-500 text-sm mt-1">{errors.otherRequirements.message}</p>
                  )}
                </Form.Item>
              </div>
            </CollapsibleSection>

            {false && aiJobDescriptionId && (
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
                  onClick={handleSubmit(onSubmit, () => {
                    showToast({
                      message: 'Please fill all required fields before saving.',
                      type: 'error',
                    });
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
