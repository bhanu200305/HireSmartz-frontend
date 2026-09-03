import { InfoCircleOutlined } from '@ant-design/icons';
import { DatePicker, Form, Select, Switch, Tooltip } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Button, Input, showToast } from '../../shared';
import useJobOpeningDropdown, {
  type JobOpeningDropdownOption,
} from '../../../hooks/useJobOpeningDropdown';
import { useGetSuggestedSkillsQuery } from '../../../api/job-service/JobOpenings/jobOpenings';
import dayjs from 'dayjs';
import { useForm, Controller, useWatch, type Resolver } from 'react-hook-form';
import { RootState } from '../../../redux/provider/store';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { InterviewRoundState, JobDetailsState } from '../../../types';
import { zodResolver } from '@hookform/resolvers/zod';
import { editJobDetailsDraftSchema, editJobDetailsSchema } from './EditJobDetailsSchema';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import {
  useLazyGetJobDescriptionByIdQuery,
  useGetJobDescriptionByIdQuery,
} from '../../../api/job-service/JobOpening/ViewJobDescriptionById';
import { useRegenerateJobDescriptionMutation } from '../../../api/job-service/JobOpening/RegenerateJd';
import {
  useEnhanceJdMutation,
  useGetJdStatusQuery,
} from '../../../api/job-service/JobOpening/JdUpload';
import {
  haveDescriptionInputsChanged,
  diffAiOwnedFields,
  mergeNewAiSkills,
} from '../../../shared/utils/jdSync';
import { lazy, memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  setEditJobOpeningId,
  updateEditAiJobDescription,
  updateEditInterviewRounds,
  updateEditJobDescription,
  updateEditJobDetails,
  setAtsJobOpeningId,
  resetEditJobState,
  setIsDraft,
  setIsChanged,
} from '../../../redux/slices/editJobOpeningSlice';
import DropdownWithAddOption from '../../shared/ui/DropdownWithAddOption';
import { get } from 'lodash-es';
import {
  capitalizeWordsAdvanced,
  safeDecodeToken,
  validateDraft,
} from '../../../shared/utils/methods';
import { useUpdateJobOpeningMutation } from '../../../api/job-service/JobOpening/UpdateJobOpening';
import {
  useCreateOrganizationSkillMutation,
  useCreateJobTypeMutation,
  useUpdateJobTypeMutation,
  useDeleteJobTypeMutation,
} from '../../../api/job-service/JobOpening/catalogs';
import {
  useCreateEducationPreferenceMutation,
  useUpdateEducationPreferenceMutation,
  useDeleteEducationPreferenceMutation,
} from '../../../api/job-service/JobOpening/educationPreferences';
import { buildSaveJobDetailsPayload } from '../../../api/job-service/buildSaveJobDetailsPayload';
import { asJobId } from '../../../api/job-service/jobId';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import {
  officeDisplayName,
  useListTenantOfficesQuery,
} from '../../../api/organization-service/Tenants/offices';
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
import { Loader } from '../../shared/ui/loader';
import { useNavigationBlocker } from '../../../hooks/useNavigationBlocker';
import { useSessionTenantId } from '../../../hooks/useSessionTenantId';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { useGetCompanyDetailsQuery } from '../../../api/tenant-service/Company/viewCompany';

const CurrencyInput = lazy(() => import('react-currency-input-field'));

const { Option } = Select;

const EditJobDetail = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const parsedJobId = asJobId(id);
  const location = useLocation();
  // Prefer value from route state if present, else fallback to backend
  const routeInterviewedCandidateCount = location.state?.interviewedCandidateCount;

  const justSavedRef = useRef(false);
  const initialLoadRef = useRef(true);
  // Guards `loadJobData` below (the effect that syncs the form from Redux/
  // the backend) so it only reconciles the form once per job id, not on
  // every later Redux update. `jobDetails` (the whole Redux object) is one
  // of that effect's dependencies, and changes reference on any dispatch
  // that touches it — including ones with nothing to do with this form's
  // fields, e.g. an AI-suggested skill getting accepted. Without this guard,
  // every such unrelated dispatch re-ran `reset(formData)`/
  // `updateFormWithJobData`, replacing the whole live form (Location
  // included) with Redux's/the server's still-stale copy — live edits only
  // reach either one on save — which is exactly the reported "the page
  // refreshes and location gets deselected" bug.
  const hasSyncedFormForJobIdRef = useRef<string | null>(null);

  const { jobDetails, jobOpeningId, interViewRound, aiJobDescription, isDraft } = useSelector(
    (state: RootState) => ({
      jobDetails: state.EditJobSlice.details,
      interViewRound: state.EditJobSlice.interviewRounds,
      jobOpeningId: state.EditJobSlice.jobOpeningId,
      aiJobDescription: state.EditJobSlice.aiJobDescription,
      isDraft: state.EditJobSlice.isDraft,
    }),
    shallowEqual
  );
  const { loginToken } = useSelector((state: RootState) => state.LoginSlice, shallowEqual);
  const tenantId = useSessionTenantId();
  const decodedToken = safeDecodeToken<{ companyId?: number | string }>(loginToken);
  const parsedCompanyId = Number(decodedToken?.companyId || 0);
  const [, setSelectedLocationIdForUsers] = useState<string | undefined>(undefined);

  const { data: offices = [], isFetching: loadingJobLocations } = useListTenantOfficesQuery(
    { tenantId: tenantId ?? '' },
    { skip: !tenantId }
  );
  const { data: orgDepartments = [], isFetching: orgDepartmentsLoading } =
    useListTenantDepartmentsQuery(tenantId ?? '', { skip: !tenantId });
  const [addTenantDepartment] = useAddTenantDepartmentMutation();
  const [updateTenantDepartment] = useUpdateTenantDepartmentMutation();
  const [deleteTenantDepartment] = useDeleteTenantDepartmentMutation();
  const { data: companyDetails } = useGetCompanyDetailsQuery(
    { companyId: parsedCompanyId },
    { skip: !parsedCompanyId }
  );
  const [createTenantJobTitle] = useCreateTenantJobTitleMutation();
  const [updateTenantJobTitle] = useUpdateTenantJobTitleMutation();
  const [deleteTenantJobTitle] = useDeleteTenantJobTitleMutation();
  const [importMasterJobTitle] = useImportMasterJobTitleMutation();
  const [assignTenantJobTitleToDepartment] = useAssignTenantJobTitleToDepartmentMutation();
  const { data: jobTitleCatalogue = [], isFetching: loadingCatalogue } =
    useListTenantJobTitleCatalogueQuery(tenantId ?? '', { skip: !tenantId });
  const { data: tenantJobTitles = [] } = useListTenantJobTitlesQuery(tenantId ?? '', {
    skip: !tenantId,
  });
  const {
    jobOpeningDropdown: jobTypes,
    loading: jobTypesLoading,
    refetch: refetchJobTypes,
  } = useJobOpeningDropdown('JOB_TYPE', 'edit', parsedJobId);
  const { jobOpeningDropdown: jobModes, loading: jobModesLoading } = useJobOpeningDropdown(
    'JOB_MODE',
    'edit',
    parsedJobId
  );
  const { jobOpeningDropdown: shiftOptions, loading: shiftsLoading } = useJobOpeningDropdown(
    'SHIFT',
    'edit',
    parsedJobId
  );
  const { jobOpeningDropdown: exemptionStatus, loading: exemptionLoading } = useJobOpeningDropdown(
    'EXEMPTION_STATUS',
    'edit',
    parsedJobId
  );
  const {
    jobOpeningDropdown: educationPreference,
    loading: educationPreferenceLoading,
    refetch: refetchEducationPreference,
  } = useJobOpeningDropdown('EDUCATION_PREFERENCE', 'edit', parsedJobId);
  const { jobOpeningDropdown: languageOptions, loading: languagesLoading } = useJobOpeningDropdown(
    'LANGUAGE',
    'edit',
    parsedJobId
  );
  const {
    jobOpeningDropdown: mandatorySkills,
    loading: mandatorySkillsLoading,
    searchSkills: searchMandatorySkills,
  } = useJobOpeningDropdown('MANDATORY_SKILLS', 'edit', parsedJobId);
  const {
    jobOpeningDropdown: optionalSkills,
    loading: optionalSkillsLoading,
    searchSkills: searchOptionalSkills,
  } = useJobOpeningDropdown('OPTIONAL_SKILLS', 'edit', parsedJobId);
  const { jobOpeningDropdown: hiringManagers, loading: hiringManagerLoading } =
    useJobOpeningDropdown('HIRING_MANAGER', 'edit', parsedJobId);
  const { jobOpeningDropdown: recruiters, loading: recruitersLoading } = useJobOpeningDropdown(
    'RECRUITER',
    'edit',
    parsedJobId
  );

  const [updateJobType] = useUpdateJobTypeMutation();
  const [deleteJobType] = useDeleteJobTypeMutation();
  const [updateEducationPreference] = useUpdateEducationPreferenceMutation();
  const [deleteEducationPreference] = useDeleteEducationPreferenceMutation();

  const [openModalFor, setOpenModalFor] = useState<
    | null
    | 'jobTitle'
    | 'department'
    | 'jobType'
    | 'educationPreference'
    | 'mandatorySkills'
    | 'optionalSkills'
  >(null);
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [showRegenerateConfirmModal, setShowRegenerateConfirmModal] = useState(false);
  const [pendingNavigationData, setPendingNavigationData] = useState<any>(null);
  const [isCheckingJdSource, setIsCheckingJdSource] = useState(false);
  const [isAddingToDropdown, setIsAddingToDropdown] = useState<string | null>(null);
  const [suggestedSkillsDismissed, setSuggestedSkillsDismissed] = useState(false);
  // Backs the "Selected Skills" chips for a suggested skill the recruiter
  // accepted via the AI-suggestions banner before the live catalogue search
  // dropdown (`mandatorySkills`/`optionalSkills` below) had cached a label
  // for it — that dropdown only knows skills someone has actually searched
  // for, so a freshly-accepted suggestion needs its own label source.
  const [extraSuggestedSkillOptions, setExtraSuggestedSkillOptions] = useState<
    JobOpeningDropdownOption[]
  >([]);
  const [isHiringManagerDropdownOpen, setIsHiringManagerDropdownOpen] = useState(false);
  const [isRecruiterDropdownOpen, setIsRecruiterDropdownOpen] = useState(false);
  const [isMandatorySkillsDropdownOpen, setIsMandatorySkillsDropdownOpen] = useState(false);
  const [isOptionalSkillsDropdownOpen, setIsOptionalSkillsDropdownOpen] = useState(false);

  const [updateJobOpening, { isLoading: isUpdatingDraft }] = useUpdateJobOpeningMutation();
  const [createOrganizationSkill] = useCreateOrganizationSkillMutation();
  const [createJobType] = useCreateJobTypeMutation();
  const [createEducationPreference] = useCreateEducationPreferenceMutation();
  const [triggerGetJobDescriptionById] = useLazyGetJobDescriptionByIdQuery();
  const { data: jdDetailsForSync } = useGetJobDescriptionByIdQuery(
    { jobOpeningId: parsedJobId },
    { skip: !parsedJobId }
  );
  const [regenerateJobDescription, { isLoading: isRegenerating }] =
    useRegenerateJobDescriptionMutation();
  const [enhanceJd] = useEnhanceJdMutation();
  const {
    data: jobData,
    refetch,
    isLoading: isFetchingJobData,
    // isError,
  } = useGetJobOpeningByIdQuery(
    { jobOpeningId: parsedJobId },
    { skip: !parsedJobId, refetchOnMountOrArgChange: true }
  );

  const {
    handleSubmit,
    control,
    setValue,
    getValues,
    reset,
    watch,
    setError,
    trigger,
    formState: { errors },
  } = useForm<JobDetailsState>({
    resolver: zodResolver(editJobDetailsSchema) as Resolver<JobDetailsState>,
    defaultValues: {},
  });

  // Whatever ai-service parses out of an uploaded JD file (or, for an
  // AI-Prompt job, generates) lands on the job asynchronously — the initial
  // `loadJobData` effect below only ever reads `jobData` once, at mount /
  // job-id change, so a recruiter who lands here right after an Upload JD
  // (still `jd_status: PROCESSING` at that point — see upload_jd.py) would
  // otherwise see an empty form that never fills in on its own, only a
  // manual page reload. Same light poll + GENERATING/PROCESSING -> READY
  // transition check jobdetails.tsx's own create-wizard equivalent already
  // uses for the same problem on the AI-Prompt path.
  const prevJdStatusForHydrationRef = useRef<string | undefined>(undefined);
  const { data: jdStatusForHydration } = useGetJdStatusQuery(parsedJobId ?? '', {
    skip: !parsedJobId,
    pollingInterval: 3000,
  });

  const [initialFormValues, setInitialFormValues] = useState<any>(null);

  const formValues = watch();
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

  const selectedDepartmentId = watch('department')?.[0];

  const { data: departmentJobTitlesData = [], isFetching: jobTitlesLoading } =
    useListTenantDepartmentJobTitlesQuery(
      { tenantId: tenantId ?? '', departmentId: String(selectedDepartmentId) },
      { skip: !tenantId || !selectedDepartmentId }
    );
  const selectedJobTitleId = watch('jobTitle')?.[0];

  const resolveOrgJobTitleId = (id: string | number): string | undefined => {
    const match = (title: TenantJobTitle) =>
      idsMatch(title.org_job_title_id, id) || idsMatch(title.source_job_title_id, id);
    return (
      departmentJobTitlesData.find(match)?.org_job_title_id ||
      tenantJobTitles.find(match)?.org_job_title_id
    );
  };

  const departmentJobTitles = departmentJobTitlesData.map((jt) => ({
    id: tenantJobTitleFormId(jt),
    name: jt.name,
    isDeleted: false,
    source: 'department' as const,
  }));

  const catalogueJobTitles = (jobTitleCatalogue ?? []).map((jt) => ({
    id: jt.job_title_id,
    name: jt.name,
    isDeleted: false,
    source: 'catalogue' as const,
  }));

  const jobTitleOptions = useMemo(() => {
    const search = debouncedJobTitleSearch.toLowerCase();
    const merged = search
      ? [...departmentJobTitles, ...catalogueJobTitles].filter((title) =>
          title.name.toLowerCase().includes(search)
        )
      : selectedDepartmentId
        ? departmentJobTitles.length > 0
          ? departmentJobTitles
          : catalogueJobTitles
        : [];
    return merged.filter(
      (title, index, self) => index === self.findIndex((t) => idsMatch(t.id, title.id))
    );
  }, [catalogueJobTitles, debouncedJobTitleSearch, departmentJobTitles, selectedDepartmentId]);

  const departments = (() => {
    const activeDepartments = (orgDepartments ?? []).map((department) => ({
      id: department.org_department_id,
      name: department.name,
      isDeleted: false,
    }));

    const selectedDepartments =
      jobData?.data?.department?.map((department: { id: number; departmentName: string }) => ({
        id: department.id,
        name: department.departmentName,
        isDeleted: true,
      })) || [];

    const departmentOptions = new Map(
      activeDepartments.map((department) => [String(department.id), department])
    );

    selectedDepartments.forEach((department) => {
      const key = String(department.id);
      if (!departmentOptions.has(key)) {
        departmentOptions.set(key, { ...department, id: key });
      }
    });

    return Array.from(departmentOptions.values());
  })();

  const selectedDepartment = departments.find((department) =>
    idsMatch(department.id, selectedDepartmentId)
  );
  const isSelectedDepartmentDeactivated = Boolean(selectedDepartment?.isDeleted);

  const selectedJobTitle = jobTitleOptions.find((jt) => idsMatch(jt.id, selectedJobTitleId));
  const isSelectedJobTitleDeactivated = Boolean(selectedJobTitle?.isDeleted);
  const selectedJobTypeId = watch('jobType')?.[0];

  // AI-suggested skills (from the job's own parsed/generated JD, merged with
  // any title→skill mapping) — needs a job title picked first since the
  // backend merges in title-based suggestions too, not just JD-extracted
  // ones.
  const { data: suggestedSkillsData } = useGetSuggestedSkillsQuery(
    {
      jobId: id ?? '',
      job_title_id: selectedJobTitleId ? String(selectedJobTitleId) : undefined,
      job_title_text: selectedJobTitle?.name,
    },
    { skip: !id || !selectedJobTitleId || !selectedJobTitle?.name }
  );
  const suggestedSkills = suggestedSkillsData?.skills ?? [];
  const unaddedSuggestedSkills = suggestedSkills.filter(
    (skill) =>
      !selectedMandatorySkillIds.includes(skill.skill_id) &&
      !selectedOptionalSkillIds.includes(skill.skill_id)
  );

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
    setExtraSuggestedSkillOptions((prev) => [
      ...prev,
      ...unaddedSuggestedSkills.map((skill) => ({ id: skill.skill_id, name: skill.skill_label })),
    ]);
    setSuggestedSkillsDismissed(true);
    showToast({
      message: `Added ${unaddedSuggestedSkills.length} AI-suggested skill${unaddedSuggestedSkills.length === 1 ? '' : 's'}`,
      type: 'success',
    });
  };

  const getOptionName = (option: Record<string, unknown> | null | undefined): string => {
    if (!option) return '';

    const candidateName =
      option.name ?? option.jobTypeName ?? option.typeName ?? option.value ?? option.label;

    return typeof candidateName === 'string' ? candidateName : '';
  };

  const jobTypeOptions = useMemo(() => {
    const optionMap = new Map<string, { id: string; name: string; isDeleted?: boolean }>();

    (jobTypes || []).forEach((jobType) => {
      const id = String(jobType.id);
      if (!id) return;

      optionMap.set(id, {
        id,
        name: jobType.name,
        isDeleted: Boolean(jobType.isDeleted),
      });
    });

    const selectedFromBackend = (jobData?.data?.jobType || []).find(
      (jobType: Record<string, unknown>) => idsMatch(jobType?.id, selectedJobTypeId)
    );

    const selectedName = getOptionName(selectedFromBackend);
    const selectedId =
      selectedJobTypeId != null && selectedJobTypeId !== '' ? String(selectedJobTypeId) : '';

    if (selectedId && selectedName && !optionMap.has(selectedId)) {
      optionMap.set(selectedId, {
        id: selectedId,
        name: selectedName,
        isDeleted: true,
      });
    }

    return Array.from(optionMap.values());
  }, [jobTypes, jobData, selectedJobTypeId]);

  const jobLocationOptions = (offices ?? []).map((office) => ({
    id: office.office_id,
    name: officeDisplayName(office),
  }));
  const cultureInfoText = String(companyDetails?.cultureIntroText || '').trim();
  const hasCultureInfo = Boolean(cultureInfoText);

  const selectedLocationDetails = offices.find((office) =>
    idsMatch(office.office_id, selectedOfficeLocationId)
  );

  const isFormDirty = initialFormValues
    ? JSON.stringify(formValues) !== JSON.stringify(initialFormValues)
    : false;

  const { isBlocked, confirmNavigation, cancelNavigation } = useNavigationBlocker(
    true,
    isFormDirty && !allowNavigation
  );

  // Helper function to update form with job data
  const updateFormWithJobData = (jobData: any) => {
    if (!jobData?.data) return;

    const asCatalogId = (value: unknown): string | null => {
      if (value == null || value === '') return null;
      if (typeof value === 'object') {
        const id = (value as { id?: unknown }).id;
        if (id == null || id === '') return null;
        return String(id);
      }
      return String(value);
    };

    const catalogIdArray = (values: unknown[]): string[] =>
      values.map(asCatalogId).filter((id): id is string => Boolean(id));

    dispatch(setEditJobOpeningId(asJobId(jobData.data.id)));
    dispatch(setAtsJobOpeningId(jobData.data.atsJobOpeningId || ''));

    const locationData = jobData.data.location;
    const countryName = locationData?.country || '';
    const stateName = locationData?.state || '';
    const asLocationId = (value: unknown): string | null => {
      if (value == null || value === '') return null;
      const id = String(value);
      return id === 'undefined' || id === 'null' ? null : id;
    };
    const resolvedOfficeLocation =
      asLocationId(locationData?.id) !== null
        ? [asLocationId(locationData?.id) as string]
        : jobData.data.officeLocation
            ?.map((item: any) => asLocationId(item?.id ?? item?.city?.id))
            .filter((locationId: string | null): locationId is string => locationId !== null) || [];

    const processedData = {
      ...jobData.data,
      jobTitle: catalogIdArray(jobData.data.jobTitle || []),
      jobType: catalogIdArray(jobData.data.jobType || []),
      jobMode: catalogIdArray(jobData.data.jobMode || []),
      department: catalogIdArray(jobData.data.department || []),
      jobProfileCode: jobData.data.jobProfileCode || '',
      country: countryName,
      state: stateName,
      officeLocation: resolvedOfficeLocation,
      exemptionStatus: jobData.data.exemptionStatus?.id || null,
      hiringManagers: catalogIdArray(
        Array.isArray(jobData.data.hiringManagers)
          ? jobData.data.hiringManagers
          : jobData.data.hiringManager?.id
            ? [jobData.data.hiringManager.id]
            : []
      ),
      recruiters: catalogIdArray(
        Array.isArray(jobData.data.recruiters)
          ? jobData.data.recruiters
          : jobData.data.recruiter?.id
            ? [jobData.data.recruiter.id]
            : []
      ),
      referralBonus:
        jobData.data.referralBonus != null && !isNaN(Number(jobData.data.referralBonus))
          ? Number(jobData.data.referralBonus)
          : null,
      shift: jobData.data.shiftId ? [String(jobData.data.shiftId)] : [],
      languages: jobData.data.languages || [],
      openings: jobData.data.openings ? Number(jobData.data.openings) : null,
      minSalary: jobData.data.minSalary ? String(jobData.data.minSalary) : null,
      maxSalary: jobData.data.maxSalary ? String(jobData.data.maxSalary) : null,
      minExperience: jobData.data.minExperience != null ? Number(jobData.data.minExperience) : null,
      maxExperience: jobData.data.maxExperience != null ? Number(jobData.data.maxExperience) : null,
      responsibilities: jobData.data.responsibilities || '',
      educationPreference:
        jobData.data.educationPreference?.map((edu: { id: number }) => edu.id) || [],
      mandatorySkills: jobData.data.mandatorySkills?.map((skill: { id: number }) => skill.id) || [],
      optionalSkills: jobData.data.optionalSkills?.map((skill: { id: number }) => skill.id) || [],
      otherRequirements: jobData.data.otherRequirements || '',
      useCultureIntro: Boolean(jobData.data.useCultureIntro),
    };

    const descriptionData = {
      educationPreference:
        jobData.data.educationPreference?.map((edu: { id: number }) => edu.id) || [],
      communicationSkills: jobData.data.communicationSkills || '',
      mandatorySkills: jobData.data.mandatorySkills?.map((skill: { id: number }) => skill.id) || [],
      optionalSkills: jobData.data.optionalSkills?.map((skill: { id: number }) => skill.id) || [],
      responsibilities: jobData.data.responsibilities || '',
      otherRequirements: jobData.data.otherRequirements || '',
    };

    const interviewRounds = (jobData.data.interviewRounds || []).map(
      (round: any): InterviewRoundState => ({
        ...round,
        roundType: round.roundType as 'AI' | 'VIDEO' | 'MANUAL',
      })
    );

    const aiJobDescriptionData = {
      id: jobData.data.aiJobDescription?.id || 0,
      jobDescription: jobData.data.aiJobDescription?.jobDescription || '',
      jobOpeningId: asJobId(jobData.data.aiJobDescription?.jobOpeningId) || parsedJobId,
    };

    dispatch(updateEditJobDetails(processedData));
    dispatch(updateEditJobDescription(descriptionData));
    dispatch(updateEditInterviewRounds(interviewRounds));
    dispatch(updateEditAiJobDescription(aiJobDescriptionData));
    dispatch(setIsDraft(jobData.data?.isDraft || false));

    setInitialFormValues({ ...processedData });
    reset({ ...processedData });
    if (!processedData.department || processedData.department.length === 0) {
      setTimeout(() => {
        trigger('department');
      }, 0);
    }
    setSelectedLocationIdForUsers(
      processedData.officeLocation?.[0] != null && processedData.officeLocation[0] !== ''
        ? String(processedData.officeLocation[0])
        : undefined
    );
  };

  // Load job data when component mounts or ID changes
  useEffect(() => {
    const loadJobData = async () => {
      if (!parsedJobId) return;
      // Reconcile the form from Redux/the backend once per job id — see the
      // ref's own doc comment above for why re-running this on every later
      // Redux update would clobber in-progress edits.
      if (hasSyncedFormForJobIdRef.current === parsedJobId) return;
      hasSyncedFormForJobIdRef.current = parsedJobId;

      // Preserve in-progress edits when navigating between steps in the same edit session.
      // This keeps latest selections (like configured Job Title) visible on return.
      if (jobOpeningId === parsedJobId && jobDetails?.jobProfileCode) {
        // Ensure the language selection is always synced to the backend value
        // once interviews have started (matches the disabled Select above).
        const hasInterviewsStarted = jobData?.data?.interviewedCandidateCount !== 0;
        const formData = { ...jobDetails };
        if (hasInterviewsStarted && jobData?.data?.languages !== undefined) {
          formData.languages = jobData.data.languages;
        }
        reset(formData);
        if (!formData.department || formData.department.length === 0) {
          setTimeout(() => {
            trigger('department');
          }, 0);
        }
        setInitialFormValues(formData);
        setSelectedLocationIdForUsers(
          jobDetails.officeLocation?.[0] != null && jobDetails.officeLocation[0] !== ''
            ? String(jobDetails.officeLocation[0])
            : undefined
        );
        return;
      }

      // If we already have the data and it matches, use it
      if (jobData?.data && asJobId(jobData.data.id) === parsedJobId) {
        updateFormWithJobData(jobData);
      }
      // Otherwise refetch fresh data
      else if (!justSavedRef.current) {
        try {
          const { data } = await refetch();
          if (data?.data) {
            updateFormWithJobData(data);
          }
        } catch (error) {
          console.error('Failed to fetch job data:', error);
        }
      }
    };

    loadJobData();

    // Cleanup function
    return () => {
      justSavedRef.current = false;
      initialLoadRef.current = true;
    };
  }, [parsedJobId, jobOpeningId, jobDetails, reset]);

  // AI-fill: applies whatever responsibilities/other requirements/
  // experience/salary/skills ai-service just parsed (Upload JD) or
  // generated (AI Prompt) onto this still-open form. Keyed off an observed
  // GENERATING/PROCESSING -> READY transition, not just "status is
  // currently READY" — that's also every already-parsed job's resting
  // state, so treating it as a completion signal would re-apply (and
  // potentially re-toast) on every mount. Explicitly refetches `/details`
  // rather than trusting `jobData` in this same render — that's still the
  // pre-completion snapshot until the refetch below resolves. Only ever
  // fills a field the recruiter hasn't already got something in, so it's
  // safe even if they started editing while parsing was still in flight.
  useEffect(() => {
    const previousStatus = prevJdStatusForHydrationRef.current;
    const currentStatus = jdStatusForHydration?.status;
    prevJdStatusForHydrationRef.current = currentStatus;

    const justFinishedProcessing =
      (previousStatus === 'GENERATING' || previousStatus === 'PROCESSING') &&
      currentStatus === 'READY';
    if (!justFinishedProcessing || !parsedJobId) return;

    void triggerGetJobDescriptionById({ jobOpeningId: parsedJobId }).then((result) => {
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
      // Skills AI suggested via job.jd.enhance/parse are auto-committed
      // straight onto the job (job.add_skill), so they're already in
      // `fresh.skills` the moment this refetch lands. Merge in only the
      // ones not already selected, split by the catalogue's own type name —
      // same pattern as handleAddAllSuggestedSkills above.
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
          setExtraSuggestedSkillOptions((prev) => [...prev, ...newOptions]);
        }
      }
      if (appliedAnything) {
        showToast({
          message: 'AI filled in some job details from your uploaded JD — review before saving.',
          type: 'success',
        });
      }
    });
  }, [
    jdStatusForHydration?.status,
    parsedJobId,
    triggerGetJobDescriptionById,
    getValues,
    setValue,
  ]);

  // Overwrites fields with fresh backend values, unlike the effect above.
  useEffect(() => {
    if (!jdDetailsForSync) return;
    const current = getValues();
    // Form field is `openings`, backend calls it `vacancies`.
    const { vacancies: vacanciesUpdate, ...otherUpdates } = diffAiOwnedFields(jdDetailsForSync, {
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
      jdDetailsForSync.skills,
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
    }
  }, [jdDetailsForSync, getValues, setValue]);

  useEffect(() => {
    dispatch(setIsChanged(isFormDirty));
  }, [isFormDirty, dispatch]);

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

  useEffect(() => {
    if (!selectedLocationDetails) return;

    setValue('country', selectedLocationDetails.country ?? '', { shouldValidate: true });
    setValue('state', selectedLocationDetails.state ?? '', { shouldValidate: true });
  }, [selectedLocationDetails, setValue]);

  /**
   * Handle Job Title validation and restoration after department selection.
   *
   * This effect ensures that:
   * 1. Job titles are only displayed if a department is selected
   * 2. If a department is not selected, job title field is cleared
   * 3. After a department is selected, previously stored job titles are restored
   *    if they exist in the department's job titles list
   */
  useEffect(() => {
    if (jobTitlesLoading || loadingCatalogue) return;

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
    jobTitlesLoading,
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
        const currentSkillIds = (watch(addType) || []).map(String);
        const existingSkill = [...mandatorySkills, ...optionalSkills].find(
          (skill) => skill.name.toLowerCase() === normalizedValue
        );
        if (existingSkill) {
          setValue(addType, [...currentSkillIds, existingSkill.id], { shouldValidate: true });
          return;
        }
        const createdSkill = await createOrganizationSkill({ name: formattedValue }).unwrap();
        showToast({ message: 'Skill added successfully', type: 'success' });
        setValue(addType, [...currentSkillIds, createdSkill.skill_id], { shouldValidate: true });
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
        const createdJobType = await createJobType({ name: formattedValue }).unwrap();
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
    // /skills only supports POST (create) and /skills/search (read).
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
      if (Array.isArray(currentValue) && currentValue.some((value) => idsMatch(value, id))) {
        setValue(type as keyof JobDetailsState, [], { shouldValidate: true });
      } else if (idsMatch(currentValue, id)) {
        setValue(type as keyof JobDetailsState, null, { shouldValidate: true });
      }
    };

    if (type === 'jobType') {
      try {
        await deleteJobType({ jobTypeId: String(id) }).unwrap();
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

  const handleJobTitleChange = async (value: number | string | undefined) => {
    if (!value) {
      setValue('jobTitle', [], { shouldValidate: true });
      setJobTitleSearchText('');
      setDebouncedJobTitleSearch('');
      return;
    }

    const selectedTitleId = String(value);
    setValue('jobTitle', [selectedTitleId], { shouldValidate: true });
    setJobTitleSearchText('');
    setDebouncedJobTitleSearch('');

    if (!tenantId || !selectedDepartmentId) return;

    const alreadyMappedToDepartment = departmentJobTitlesData.some(
      (jobTitle) =>
        idsMatch(tenantJobTitleFormId(jobTitle), selectedTitleId) ||
        idsMatch(jobTitle.org_job_title_id, selectedTitleId)
    );
    if (alreadyMappedToDepartment) return;

    const existingOrgId = resolveOrgJobTitleId(selectedTitleId);
    try {
      if (existingOrgId) {
        await assignTenantJobTitleToDepartment({
          tenantId,
          departmentId: String(selectedDepartmentId),
          job_title_id: existingOrgId,
        }).unwrap();
      } else {
        await importMasterJobTitle({
          tenantId,
          master_job_title_id: selectedTitleId,
          department_id: String(selectedDepartmentId),
        }).unwrap();
      }
    } catch (error) {
      showToast({
        message: getOrgErrorMessage(error, 'Failed to map this job title to the department.'),
        type: 'error',
      });
    }
  };

  const onSaveDraft = async (data: Partial<JobDetailsState>) => {
    setAllowNavigation(true);
    const { errors } = validateDraft<JobDetailsState>(data, editJobDetailsDraftSchema);

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
      const details = buildSaveJobDetailsPayload({ data, offices });
      const jobId = parsedJobId || asJobId(jobOpeningId);
      await updateJobOpening({
        jobOpeningId: jobId,
        body: details,
      }).unwrap();

      showToast({
        message: 'Job saved as draft successfully',
        type: 'success',
      });
      justSavedRef.current = true;
      dispatch(resetEditJobState());
      await refetch();
      navigate('/jobs');
    } catch (error) {
      showToast({
        message: getJobErrorMessage(error, 'Failed to save draft'),
        type: 'error',
      });
    }
  };

  const handleConfirmRegenerate = async () => {
    if (!pendingNavigationData) return;
    const { aiJdId } = pendingNavigationData;
    let finalAiJobDescription = { ...aiJobDescription };
    try {
      const regenResult = await regenerateJobDescription({
        aiJobDescriptionId: aiJdId,
        text: '',
        generateFromScratch: true,
      }).unwrap();

      if (regenResult?.success && regenResult.data) {
        finalAiJobDescription = {
          id: regenResult.data.id || aiJdId,
          jobDescription: regenResult.data.jobDescription || '',
          jobOpeningId: parsedJobId || jobOpeningId,
        };
      }
    } catch (regenErr) {
      console.error('Failed to regenerate AI job description:', regenErr);
      showToast({
        message:
          'Failed to automatically generate AI Job Description. You can try regenerating it on the next page.',
        type: 'warning',
      });
    }
    dispatch(updateEditAiJobDescription(finalAiJobDescription));
    setShowRegenerateConfirmModal(false);
    setPendingNavigationData(null);
    setAllowNavigation(true);
    navigate(`/jobs/edit/${id}/AiJobDescription/${finalAiJobDescription.id}`);
  };

  const handleCancelRegenerate = (close?: boolean) => {
    if (close) {
      setShowRegenerateConfirmModal(false);
      setPendingNavigationData(null);
      setAllowNavigation(false);
      return;
    }
    if (!pendingNavigationData) return;
    dispatch(updateEditAiJobDescription(pendingNavigationData.finalAiJobDescription));
    setShowRegenerateConfirmModal(false);
    setPendingNavigationData(null);
    setAllowNavigation(true);
    navigate(`/jobs/edit/${id}/AiJobDescription/${pendingNavigationData.finalAiJobDescription.id}`);
  };

  const onSubmit = async (data: JobDetailsState) => {
    setAllowNavigation(true);

    // Ensure the language selection cannot be changed if interviews have started
    const hasInterviewsStarted = jobData?.data?.interviewedCandidateCount !== 0;
    const languagesValue = hasInterviewsStarted
      ? (data.languages ?? [])
      : (jobData?.data?.languages ?? []);

    const processedData = {
      ...data,
      referralBonus:
        data.referralBonus === null ||
        data.referralBonus === undefined ||
        data.referralBonus === 0 ||
        data.referralBonus === ''
          ? ''
          : data.referralBonus,
      languages: languagesValue,
      useCultureIntro: Boolean(data.useCultureIntro),
      isDraft: false,
    };
    const payload = {
      ...jobDetails,
      ...processedData,
    };
    const jobDescriptionPayload = {
      educationPreference: data.educationPreference,
      // communicationSkills: jobDescritpion.communicationSkills,
      mandatorySkills: data.mandatorySkills,
      optionalSkills: data.optionalSkills,
      otherRequirements: data.otherRequirements,
      responsibilities: data.responsibilities,
    };

    try {
      const jobId = parsedJobId || asJobId(jobOpeningId);

      // Snapshot what the AI description currently reflects BEFORE saving
      // — used below to decide whether this save actually changed a field
      // the description was generated from, so an unrelated change (e.g.
      // swapping the Recruiter) doesn't blow away a manually-edited
      // description for no reason. Best-effort: if this fails, the
      // regenerate check below just skips, same as "no description yet".
      let jdBeforeSave: Awaited<ReturnType<typeof triggerGetJobDescriptionById>>['data'];
      try {
        jdBeforeSave = await triggerGetJobDescriptionById({ jobOpeningId: jobId }).unwrap();
      } catch {
        jdBeforeSave = undefined;
      }

      const details = buildSaveJobDetailsPayload({ data: payload, offices });
      await updateJobOpening({
        jobOpeningId: jobId,
        body: details,
      }).unwrap();

      showToast({
        message: 'Job details updated successfully',
        type: 'success',
      });
      justSavedRef.current = true;
      dispatch(setIsDraft(false));
      dispatch(updateEditJobDetails(payload));
      dispatch(updateEditJobDescription(jobDescriptionPayload));
      dispatch(updateEditInterviewRounds(interViewRound));

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
          await enhanceJd({ jobOpeningId: jobId, regenerate: true }).unwrap();
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

      const aiJdId = jobId;
      const finalAiJobDescription = {
        id: aiJdId,
        jobDescription: aiJobDescription.jobDescription || '',
        jobOpeningId: jobId,
      };

      dispatch(updateEditAiJobDescription(finalAiJobDescription));
      setAllowNavigation(true);
      navigate(`/jobs/edit/${id}/AiJobDescription/${finalAiJobDescription.id}`);
    } catch (error) {
      setAllowNavigation(false);
      showToast({
        message: getJobErrorMessage(error, 'Failed to update job details'),
        type: 'error',
      });
    }
  };
  return (
    <>
      {(isFetchingJobData || isUpdatingDraft || isRegenerating || isCheckingJdSource) && <Loader />}
      <Form
        layout="vertical"
        onFinish={handleSubmit(onSubmit, (err) =>
          console.log('Job Details Validation Errors:', err)
        )}
        autoComplete="off"
      >
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
              <Controller
                name="jobProfileCode"
                control={control}
                disabled
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Job Profile Code"
                    className={`bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 ${errors.jobProfileCode ? 'border-red-500' : 'border-[var(--border)]'}`}
                  />
                )}
              />
            </Form.Item>
            <Form.Item
              label={
                <span>
                  Department <span className="required-asterisk">*</span>
                </span>
              }
            >
              <DropdownWithAddOption
                className={`w-full custom-select-jobs placeholder-style ${
                  isSelectedDepartmentDeactivated
                    ? '[&_.ant-select-selection-item]:!text-gray-400'
                    : ''
                }`}
                autoFocus
                value={watch('department')?.[0]}
                onChange={(value) => {
                  setValue('department', value ? [value] : [], { shouldValidate: true });
                  setValue('jobTitle', []);
                  setJobTitleSearchText('');
                  setDebouncedJobTitleSearch('');
                }}
                options={departments}
                loading={orgDepartmentsLoading || isAddingToDropdown === 'department'}
                placeholder="Select Department"
                label="Department"
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
                className={`w-full custom-select-jobs placeholder-style ${
                  isSelectedJobTitleDeactivated
                    ? '[&_.ant-select-selection-item]:!text-gray-400'
                    : ''
                }`}
                value={watch('jobTitle')?.[0]}
                onChange={handleJobTitleChange}
                onSearchChange={setJobTitleSearchText}
                options={jobTitleOptions}
                loading={jobTitlesLoading || loadingCatalogue || isAddingToDropdown === 'jobTitle'}
                placeholder={
                  !selectedDepartmentId && !debouncedJobTitleSearch
                    ? 'Please select a department first'
                    : 'Select Job Title'
                }
                label="Job Title"
                onAddOption={(value) => handleAddOption(value, 'jobTitle')}
                type="jobTitle"
                error={errors.jobTitle?.message}
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
                value={watch('jobType')?.[0]}
                onChange={(value) => {
                  setValue('jobType', value ? [value] : [], { shouldValidate: true });
                }}
                options={jobTypeOptions}
                loading={jobTypesLoading || isAddingToDropdown === 'jobType'}
                placeholder="Select Job Type"
                label="Job Type"
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
                value={watch('jobMode')?.[0]}
                onChange={(value) => {
                  setValue('jobMode', value ? [value] : [], { shouldValidate: true });
                }}
                options={jobModes}
                loading={jobModesLoading}
                placeholder="Select Job Mode"
                label="Job Mode"
                type="jobMode"
                enableEditDelete={false}
              />
            </Form.Item>
            <Form.Item label={<span>Shift</span>}>
              <DropdownWithAddOption
                className="w-full custom-select-jobs placeholder-style"
                value={watch('shift')?.[0]}
                onChange={(value) => {
                  setValue('shift', value ? [value] : [], { shouldValidate: true });
                }}
                options={shiftOptions}
                loading={shiftsLoading}
                placeholder="Select Shift"
                label="Shift"
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
                render={({ field: { value, onChange } }) => {
                  // Use interviewedCandidateCount from route state if present, else backend
                  const effectiveInterviewedCandidateCount =
                    typeof routeInterviewedCandidateCount === 'number'
                      ? routeInterviewedCandidateCount
                      : (jobData?.data?.interviewedCandidateCount ?? 0);
                  const isDisabled = effectiveInterviewedCandidateCount > 0;
                  return (
                    <Tooltip
                      title={
                        isDisabled
                          ? 'Cannot change communication language - interview(s) in progress'
                          : ''
                      }
                    >
                      <Select
                        mode="multiple"
                        allowClear
                        disabled={isDisabled}
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
                    </Tooltip>
                  );
                }}
              />
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
                checked={Boolean(watch('useCultureIntro'))}
                onChange={(checked) => {
                  setValue('useCultureIntro', checked, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                disabled={!hasCultureInfo}
                style={{
                  backgroundColor: watch('useCultureIntro') ? 'var(--color-primary)' : undefined,
                }}
              />
              <span className="text-sm text-gray-700 leading-5">
                Play Company Culture Introduction at the start of AI Audio Screening
              </span>
            </div>
          </div>
        </div>
        {/* Location */}
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
        </div>
        <div className="mt-2">
          <div className="w-full">
            <span className="text-lg font-semibold">Hiring Panel</span>
          </div>
          <div className="grid grid-cols-3 gap-x-4 mt-2">
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
                                (id) => !idsMatch(id, manager.id)
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
                          <button
                            type="button"
                            onClick={() => {
                              const updated = selectedRecruiterIds.filter(
                                (id) => !idsMatch(id, recruiter.id)
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
              <Controller
                name="openDate"
                control={control}
                render={({ field }) => (
                  <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                    <DatePicker
                      {...field}
                      value={field.value ? dayjs(field.value, 'DD-MM-YYYY') : null}
                      onChange={(date) => {
                        const formattedDate = date ? date.format('DD-MM-YYYY') : '';
                        setValue('openDate', formattedDate, { shouldValidate: true });
                      }}
                      variant="borderless"
                      className="w-full custom-date-picker placeholder-style"
                      format="MMM DD, YYYY"
                      placeholder="Select Open Date"
                      disabledDate={(current) =>
                        current && current.isBefore(dayjs().startOf('day'))
                      }
                    />
                  </div>
                )}
              />
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
              <Input
                inputMode="numeric"
                value={watch('openings') ?? ''}
                onChange={(e) => {
                  let value = e.target.value;
                  // Only allow digits
                  value = value.replace(/[^0-9]/g, '');
                  // Remove leading zeros but keep single zero
                  value = value.replace(/^0+/, '0').replace(/^0+(\d)/, '$1');
                  // Cap at 99 and min 1
                  const numValue = value === '' ? null : Math.max(1, Math.min(99, Number(value)));
                  setValue('openings', numValue, {
                    shouldValidate: true,
                  });
                }}
                placeholder="Opening(s)"
                className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              />
              {errors.openings && (
                <p className="text-red-500 text-sm mt-1">{errors.openings.message}</p>
              )}
            </Form.Item>

            <Form.Item label="Close Date">
              <Controller
                name="closeDate"
                control={control}
                render={({ field }) => (
                  <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                    <DatePicker
                      {...field}
                      value={field.value ? dayjs(field.value, 'DD-MM-YYYY') : null}
                      onChange={(date) => {
                        const formattedDate = date ? date.format('DD-MM-YYYY') : '';
                        setValue('closeDate', formattedDate, { shouldValidate: true });
                      }}
                      variant="borderless"
                      className="w-full custom-date-picker placeholder-style"
                      format="MMM DD, YYYY"
                      placeholder="Select Close Date"
                      disabledDate={(current) =>
                        current && current.isBefore(dayjs().startOf('day'))
                      }
                    />
                  </div>
                )}
              />
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
              <Controller
                name="exemptionStatus"
                control={control}
                render={({ field }) => (
                  <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl ">
                    <Select
                      {...field}
                      value={field.value}
                      onChange={(value) => {
                        setValue('exemptionStatus', value ?? null, { shouldValidate: true });
                      }}
                      className="w-full custom-select-jobs placeholder-style"
                      placeholder="Select Exemption Status"
                      popupClassName="rounded-3xl"
                      loading={exemptionLoading}
                      allowClear
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
                )}
              />
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
              <Controller
                name="minSalary"
                control={control}
                render={() => (
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
                    // Exemption Status (`false`/Non-Exempt is the backend's
                    // own default for every job — see `Job.is_exempted`,
                    // job.py — for any job the recruiter hasn't touched that
                    // dropdown on yet, AI-filled ones very much included)
                    // isn't a reliable signal for what unit a salary figure
                    // is in, and a JD's stated salary is virtually always
                    // annual.
                    placeholder="Minimum Salary"
                    className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)] placeholder:capitalize"
                    intlConfig={{ locale: 'en-US', currency: 'USD' }}
                  />
                )}
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
              <Controller
                name="maxSalary"
                control={control}
                render={() => (
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
                    // Exemption Status (`false`/Non-Exempt is the backend's
                    // own default for every job — see `Job.is_exempted`,
                    // job.py — for any job the recruiter hasn't touched that
                    // dropdown on yet, AI-filled ones very much included)
                    // isn't a reliable signal for what unit a salary figure
                    // is in, and a JD's stated salary is virtually always
                    // annual.
                    placeholder="Maximum Salary"
                    className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)] placeholder:capitalize"
                    intlConfig={{ locale: 'en-US', currency: 'USD' }}
                  />
                )}
              />
              {errors.maxSalary && (
                <p className="text-red-500 text-sm mt-1">{errors.maxSalary.message}</p>
              )}
            </Form.Item>
          </div>
        </div>
        <div className="form-grid-equal-labels grid grid-cols-3 gap-x-4 mt-2">
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
                const numValue = value === '' ? null : Math.max(0, Math.min(50, Number(value)));
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
                const numValue = value === '' ? null : Math.max(0, Math.min(50, Number(value)));
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
        <div className="mt-2">
          <div className="w-full">
            <span className="text-lg font-semibold">Job Skills</span>
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
                                (id) => !idsMatch(id, skill.id)
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
                  error={errors.optionalSkills?.message as string | undefined}
                  enableEditDelete
                  onEditOption={handleEditOption}
                  onDeleteOption={handleDeleteOption}
                  onReuseOption={handleReuseOption}
                  maxTagCount={0}
                  maxTagPlaceholder={
                    !isOptionalSkillsDropdownOpen
                      ? (omittedValues: { value: number | string }[]) => (
                          <span>
                            {omittedValues.length} of {optionalSkills?.length || 20} skills selected
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
                                (id) => !idsMatch(id, skill.id)
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
                loading={educationPreferenceLoading || isAddingToDropdown === 'educationPreference'}
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
        </div>
        <div className="flex items-center justify-center mt-6 gap-6">
          {isDraft && (
            <Button
              type="button"
              className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
              onClick={() => onSaveDraft(watch())}
              disabled={isUpdatingDraft}
            >
              SAVE AS DRAFT
            </Button>
          )}
          <Button
            type="button"
            className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
            onClick={handleSubmit(onSubmit, (err) =>
              console.log('Job Details Validation Errors:', err)
            )}
            disabled={isFetchingJobData}
          >
            SAVE & NEXT
          </Button>
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
          isLoading={isRegenerating}
        />
      )}
    </>
  );
};

export default memo(EditJobDetail);
