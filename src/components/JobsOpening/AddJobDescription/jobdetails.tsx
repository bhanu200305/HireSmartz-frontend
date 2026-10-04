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
  setJobOpeningId,
  updateJobDescription,
  updateJobDetails,
} from '../../../redux/slices/jobOpeningSlice';
import { lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DropdownWithAddOption from '../../shared/ui/DropdownWithAddOption';
import FillWithAiWidget from './FillWithAiWidget';
import { useUpdateJobOpeningMutation } from '../../../api/job-service/JobOpening/UpdateJobOpening';
import { useDeleteDraftJobMutation } from '../../../api/job-service/JobOpening/AddJobOpening';
import { useGetPermittedOfficesQuery } from '../../../api/job-service/JobOpening/GetPermittedOffices';
import {
  useCreateEducationPreferenceMutation,
  useDeleteEducationPreferenceMutation,
  useReactivateEducationPreferenceMutation,
  useUpdateEducationPreferenceMutation,
  useListEducationPreferencesQuery,
  useGetEducationPreferenceByIdQuery,
  useActivateEducationPreferenceMutation,
  useDeactivateEducationPreferenceMutation,
} from '../../../api/job-service/JobOpening/educationPreferences';
import {
  useGetJobDescriptionByIdQuery,
  useLazyGetJobDescriptionByIdQuery,
} from '../../../api/job-service/JobOpening/ViewJobDescriptionById';
import { useGetTenantCultureIntroQuery } from '../../../api/organization-service/Tenants/cultureIntro';
import { buildSaveJobDetailsPayload } from '../../../api/job-service/buildSaveJobDetailsPayload';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import { hasFeatureAccess } from '../../../shared/utils/auth/getAccess';
import useEffectivePermissions, {
  useEffectivePermissionsRefetch,
} from '../../../hooks/useEffectivePermissions';
import { Authorities } from '../../../constants/authorities.constant';
import { formatTime12h } from '../../../utils/formatTime';
import { asJobId } from '../../../api/job-service/jobId';
import {
  officeDisplayName,
  useListTenantOfficesQuery,
} from '../../../api/organization-service/Tenants/offices';
import { useListPlatformTenantsQuery } from '../../../api/organization-service/Platform/tenants';
import {
  useActivateTenantDepartmentMutation,
  useAddTenantDepartmentMutation,
  useDeactivateTenantDepartmentMutation,
  useDeleteTenantDepartmentMutation,
  useListTenantDepartmentsQuery,
  useUpdateTenantDepartmentMutation,
} from '../../../api/organization-service/Tenants/departments';
import {
  idsMatch,
  tenantJobTitleFormId,
  useActivateTenantJobTitleMutation,
  useAssignTenantJobTitleToDepartmentMutation,
  useCreateTenantJobTitleMutation,
  useDeactivateTenantJobTitleMutation,
  useDeleteTenantJobTitleMutation,
  useImportMasterJobTitleMutation,
  useListTenantDepartmentJobTitlesQuery,
  useListTenantJobTitleCatalogueQuery,
  useListTenantJobTitlesQuery,
  useUpdateTenantJobTitleMutation,
  type TenantJobTitle,
} from '../../../api/organization-service/Tenants/jobTitles';
import { getOrgErrorMessage } from '../../../shared/utils/auth/orgError.helpers';
import { useEnhanceJdMutation } from '../../../api/job-service/JobOpening/JdUpload';
import { useJdStatusPolling } from '../../../hooks/useJdStatusPolling';
import { useGetSuggestedSkillsQuery } from '../../../api/job-service/JobOpenings/jobOpenings';
import {
  useCreateOrganizationSkillMutation,
  useUpdateOrganizationSkillMutation,
  useDeleteOrganizationSkillMutation,
  useReactivateOrganizationSkillMutation,
  useCreateJobTypeMutation,
  useDeleteJobTypeMutation,
  useReactivateJobTypeMutation,
  useUpdateJobTypeMutation,
  useCreateJobModeMutation,
  useUpdateJobModeMutation,
  useDeleteJobModeMutation,
  useReactivateJobModeMutation,
  useListOrganizationJobModesQuery,
  useGetJobModeByIdQuery,
  useListJobTypesQuery,
  useGetJobTypeByIdQuery,
  useListActiveSkillsQuery,
  useActivateJobTypeMutation,
  useDeactivateJobTypeMutation,
  useActivateJobModeMutation,
  useDeactivateJobModeMutation,
  useActivateOrganizationSkillMutation,
  useDeactivateOrganizationSkillMutation,
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
  useGetOrganizationShiftsQuery,
  useGetOrganizationShiftByIdQuery,
  useCreateOrganizationShiftMutation,
  useUpdateOrganizationShiftMutation,
  useDeleteOrganizationShiftMutation,
  useReactivateOrganizationShiftMutation,
  useActivateOrganizationShiftMutation,
  useDeactivateOrganizationShiftMutation,
} from '../../../api/job-service/Shifts/shifts';
import ShiftFormModal, { computeShiftDurationMinutes } from '../ShiftFormModal';
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
  jobMode: 'Job Location',
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
  exemptMinSalary: 'Exempt Minimum Salary',
  exemptMaxSalary: 'Exempt Maximum Salary',
  nonExemptMinSalary: 'Non-Exempt Minimum Salary',
  nonExemptMaxSalary: 'Non-Exempt Maximum Salary',
  referralBonus: 'Referral Bonus',
  minExperience: 'Minimum Experience',
  maxExperience: 'Maximum Experience',
  educationPreference: 'Education Preference',
  mandatorySkills: 'Required Skills',
  optionalSkills: 'Optional Skills',
  responsibilities: 'Responsibilities',
  otherRequirements: 'Other Requirements',
  benefits: 'Benefits',
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
  'exemptMinSalary',
  'exemptMaxSalary',
  'nonExemptMinSalary',
  'nonExemptMaxSalary',
  'minExperience',
  'maxExperience',
  'mandatorySkills',
  'educationPreference',
  'responsibilities',
];

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
  const effectivePermissions = useEffectivePermissions();
  const refetchEffectivePermissions = useEffectivePermissionsRefetch();
  // Backed by organization:update, job-service's real "add" permission.
  const canManageCatalogueEntries = effectivePermissions.includes(
    Authorities.COMPANY_SETTINGS_EDIT
  );
  // Department gets its own narrower grant, same reasoning as Job Title below.
  const canAddDepartment =
    canManageCatalogueEntries || effectivePermissions.includes(Authorities.DEPARTMENT_ADD);
  const canEditDepartment =
    canManageCatalogueEntries || effectivePermissions.includes(Authorities.DEPARTMENT_EDIT);
  const canDeleteDepartment =
    canManageCatalogueEntries || effectivePermissions.includes(Authorities.DEPARTMENT_DELETE);
  const canManageDepartment = canAddDepartment || canEditDepartment || canDeleteDepartment;
  // Job Title gets its own narrower grant (tenant_job_title:write/update/
  // delete) so a Hiring Manager can add/rename/remove titles inline without
  // the broader company-settings permission the other catalogue fields need.
  const canAddJobTitle =
    canManageCatalogueEntries || effectivePermissions.includes(Authorities.TENANT_JOB_TITLE_ADD);
  const canEditJobTitle =
    canManageCatalogueEntries || effectivePermissions.includes(Authorities.TENANT_JOB_TITLE_EDIT);
  const canDeleteJobTitle =
    canManageCatalogueEntries || effectivePermissions.includes(Authorities.TENANT_JOB_TITLE_DELETE);
  const canManageJobTitle = canAddJobTitle || canEditJobTitle || canDeleteJobTitle;
  // Job Type/Job Mode/Shift/Education Preference: job_catalog:write adds only.
  const canManageJobCatalogues =
    canManageCatalogueEntries || effectivePermissions.includes(Authorities.JOB_CATALOG_EDIT);
  // Editing/deleting an existing entry needs the admin-level grant — write
  // alone (Hiring Manager) can only add new ones.
  const canDeleteJobCatalogues =
    canManageCatalogueEntries || effectivePermissions.includes(Authorities.JOB_CATALOG_DELETE);
  // Same add/edit-delete split for the skill catalogue.
  const canAddSkill =
    canManageCatalogueEntries || effectivePermissions.includes(Authorities.SKILL_WRITE);
  const canDeleteSkill =
    canManageCatalogueEntries || effectivePermissions.includes(Authorities.SKILL_DELETE);
  const [dismissedUnresolvedAiFields, setDismissedUnresolvedAiFields] = useState<Set<string>>(
    new Set()
  );
  // Re-evaluated every render, so a location switch re-checks live.
  const canEditJobAtActiveLocation = hasFeatureAccess(
    'job_opening',
    'edit',
    role,
    effectivePermissions
  );
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
  // organization-service's real culture-intro backend.
  const { data: tenantCultureIntro } = useGetTenantCultureIntroQuery(tenantId ?? '', {
    skip: !tenantId,
  });
  const [selectedLocationIdForUsers, setSelectedLocationIdForUsers] = useState<string | undefined>(
    undefined
  );

  const [allowNavigation, setAllowNavigation] = useState(false);
  const [isAddingToDropdown, setIsAddingToDropdown] = useState<string | null>(null);
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
  const [deleteDraftJob, { isLoading: isCancelling }] = useDeleteDraftJobMutation();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
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
  const { data: jdStatusForHydration, isFetching: jdStatusFetching } =
    useJdStatusPolling(resolvedJobId);
  // Fields stay disabled until AI has finished parsing/generating the JD -
  // editing mid-parse would just get overwritten the moment it lands.
  const fieldsLocked =
    jdStatusForHydration?.status === 'PROCESSING' || jdStatusForHydration?.status === 'GENERATING';
  const prevJdStatusForHydrationRef = useRef<string | undefined>(undefined);
  // Tracks which job id the "already READY on first observation" fallback
  // has run for, so it fires at most once per job.
  const appliedAiFillJobIdRef = useRef<string | null>(null);
  const [enhanceJd] = useEnhanceJdMutation();
  const [createOrganizationSkill] = useCreateOrganizationSkillMutation();
  const [updateOrganizationSkill] = useUpdateOrganizationSkillMutation();
  const [deleteOrganizationSkill] = useDeleteOrganizationSkillMutation();
  const [createJobType] = useCreateJobTypeMutation();
  const [createEducationPreference] = useCreateEducationPreferenceMutation();
  const [updateEducationPreference] = useUpdateEducationPreferenceMutation();
  const [deleteEducationPreference] = useDeleteEducationPreferenceMutation();
  const [updateJobType] = useUpdateJobTypeMutation();
  const [deleteJobType] = useDeleteJobTypeMutation();
  const [createJobMode] = useCreateJobModeMutation();
  const [updateJobMode] = useUpdateJobModeMutation();
  const [deleteJobMode] = useDeleteJobModeMutation();
  const [createOrganizationShift] = useCreateOrganizationShiftMutation();
  const [updateOrganizationShift] = useUpdateOrganizationShiftMutation();
  const [deleteOrganizationShift] = useDeleteOrganizationShiftMutation();
  const [reactivateJobType] = useReactivateJobTypeMutation();
  const [reactivateJobMode] = useReactivateJobModeMutation();
  const [reactivateOrganizationShift] = useReactivateOrganizationShiftMutation();
  const [reactivateEducationPreference] = useReactivateEducationPreferenceMutation();
  const [reactivateOrganizationSkill] = useReactivateOrganizationSkillMutation();
  const [activateJobType] = useActivateJobTypeMutation();
  const [deactivateJobType] = useDeactivateJobTypeMutation();
  const [activateJobMode] = useActivateJobModeMutation();
  const [deactivateJobMode] = useDeactivateJobModeMutation();
  const [activateOrganizationShift] = useActivateOrganizationShiftMutation();
  const [deactivateOrganizationShift] = useDeactivateOrganizationShiftMutation();
  const [activateEducationPreference] = useActivateEducationPreferenceMutation();
  const [deactivateEducationPreference] = useDeactivateEducationPreferenceMutation();
  const [activateOrganizationSkill] = useActivateOrganizationSkillMutation();
  const [deactivateOrganizationSkill] = useDeactivateOrganizationSkillMutation();
  const [shiftModalMode, setShiftModalMode] = useState<'add' | 'edit' | null>(null);
  const [isSavingShift, setIsSavingShift] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftAddPrefillName, setShiftAddPrefillName] = useState('');
  const [isSyncingWithATS, setIsSyncingWithATS] = useState(false);
  const showAtsSyncCheckbox = false;
  const [showRegenerateConfirmModal, setShowRegenerateConfirmModal] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
  const [isSubmittingWithModal, setIsSubmittingWithModal] = useState(false);
  const [showContinueJdChoiceModal, setShowContinueJdChoiceModal] = useState(false);
  const [pendingContinueJobId, setPendingContinueJobId] = useState<string | null>(null);
  const [triggerGetJobDescriptionById] = useLazyGetJobDescriptionByIdQuery();
  const {
    data: offices = [],
    isFetching: loadingOfficesList,
    isError: isOfficesError,
    error: officesError,
  } = useListTenantOfficesQuery({ tenantId: tenantId ?? '', isMaster }, { skip: !tenantId });
  const officesErrorMessage = isOfficesError
    ? getJobErrorMessage(officesError, 'Failed to load locations.')
    : undefined;
  // Filters the Location dropdown to offices this user holds job:update
  // at (job-service re-validates on save regardless).
  const existingJobIdForPermissions = jobIdRef.current || resolvedJobId;
  const officeIdsForPermissionCheck = useMemo(
    () => offices.map((office) => office.office_id),
    [offices]
  );
  const { data: permittedOfficesData, isFetching: loadingPermittedOffices } =
    useGetPermittedOfficesQuery(
      { jobOpeningId: existingJobIdForPermissions, officeIds: officeIdsForPermissionCheck },
      { skip: !existingJobIdForPermissions || officeIdsForPermissionCheck.length === 0 }
    );
  const permittedOfficeIds = useMemo(
    () => new Set(permittedOfficesData?.permitted_office_ids ?? []),
    [permittedOfficesData]
  );
  const loadingJobLocations = loadingOfficesList || loadingPermittedOffices;
  const {
    data: orgDepartments = [],
    isFetching: departmentsLoading,
    refetch: refetchDepartments,
  } = useListTenantDepartmentsQuery({ tenantId: tenantId ?? '', isMaster }, { skip: !tenantId });
  const [addTenantDepartment] = useAddTenantDepartmentMutation();
  const [updateTenantDepartment] = useUpdateTenantDepartmentMutation();
  const [deleteTenantDepartment] = useDeleteTenantDepartmentMutation();
  const [activateTenantDepartment] = useActivateTenantDepartmentMutation();
  const [deactivateTenantDepartment] = useDeactivateTenantDepartmentMutation();
  const [createTenantJobTitle] = useCreateTenantJobTitleMutation();
  const [updateTenantJobTitle] = useUpdateTenantJobTitleMutation();
  const [deleteTenantJobTitle] = useDeleteTenantJobTitleMutation();
  const [activateTenantJobTitle] = useActivateTenantJobTitleMutation();
  const [deactivateTenantJobTitle] = useDeactivateTenantJobTitleMutation();
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
  const { jobOpeningDropdown: exemptionStatusOptions, loading: exemptionStatusLoading } =
    useJobOpeningDropdown('EXEMPTION_STATUS', 'create');
  // Raw shift objects — needed to prefill start/end time when editing.
  // Active-only, unbounded (dropdown consumers need the complete list, not
  // one page of it). A currently-assigned-but-deactivated shift is resolved
  // separately below via a targeted by-id lookup, not this list.
  const { data: organizationShiftsData, isFetching: shiftsLoading } =
    useGetOrganizationShiftsQuery();
  const organizationShifts = organizationShiftsData?.shifts ?? [];
  const { jobOpeningDropdown: languageOptions, loading: languagesLoading } = useJobOpeningDropdown(
    'LANGUAGE',
    'create'
  );
  const {
    jobOpeningDropdown: mandatorySkills,
    loading: mandatorySkillsLoading,
    refetch: refetchMandatorySkills,
    searchSkills: searchMandatorySkills,
    totalSkillsCount: totalMandatorySkillsCount,
  } = useJobOpeningDropdown('MANDATORY_SKILLS', 'create');
  const {
    jobOpeningDropdown: optionalSkills,
    loading: optionalSkillsLoading,
    refetch: refetchOptionalSkills,
    searchSkills: searchOptionalSkills,
    totalSkillsCount: totalOptionalSkillsCount,
  } = useJobOpeningDropdown('OPTIONAL_SKILLS', 'create');

  const { jobOpeningDropdown: hiringManagers, loading: hiringManagerLoading } =
    useJobOpeningDropdown(
      'HIRING_MANAGER',
      'create',
      undefined,
      undefined,
      selectedLocationIdForUsers
    );
  const { jobOpeningDropdown: recruiters, loading: recruitersLoading } = useJobOpeningDropdown(
    'RECRUITER',
    'create'
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
    // HM dropdown re-filters on location change; a stale pick is caught by validation.
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
      // exemptionStatus isn't a stored field - derive it from whichever
      // salary values are already present, same as the live AI-fill does.
      exemptionStatus: jobDetails?.exemptionStatus?.length
        ? jobDetails.exemptionStatus
        : [
            ...(jobDetails?.exemptMinSalary != null ? ['true'] : []),
            ...(jobDetails?.nonExemptMinSalary != null ? ['false'] : []),
          ],
    },
  });

  // A currently-assigned-but-deactivated shift stays visible (flagged
  // isDeleted) via a targeted by-id lookup, fired only when the selected id
  // isn't already in the active list above.
  // English is the default communication language while the field is empty.
  const languagesTouchedRef = useRef(false);
  const languagesValue = watch('languages');
  useEffect(() => {
    if (languagesTouchedRef.current || languagesLoading) return;
    if ((languagesValue ?? []).length > 0) return;
    const english = languageOptions.find((l) => l.name.trim().toLowerCase() === 'english');
    if (english) setValue('languages', [String(english.id)], { shouldDirty: false });
  }, [languagesLoading, languageOptions, languagesValue, setValue]);

  const selectedShiftId = (watch('shift') || [])[0];
  const selectedShiftIdStr = selectedShiftId != null ? String(selectedShiftId) : '';
  const shiftMissingFromActiveList =
    Boolean(selectedShiftIdStr) &&
    !organizationShifts.some((item) => String(item.id) === selectedShiftIdStr);
  const { data: deactivatedShift } = useGetOrganizationShiftByIdQuery(selectedShiftIdStr, {
    skip: !shiftMissingFromActiveList,
  });
  const shiftOptions = useMemo(() => {
    const base = organizationShifts.map((item) => ({
      id: item.id,
      name: `${item.shift_name} (${formatTime12h(item.start_time)} - ${formatTime12h(item.end_time)})`,
      isDeleted: Boolean(item.is_deleted),
      isActive: item.is_active,
    }));
    if (shiftMissingFromActiveList && deactivatedShift) {
      base.push({
        id: deactivatedShift.id,
        name: `${deactivatedShift.shift_name} (${formatTime12h(deactivatedShift.start_time)} - ${formatTime12h(deactivatedShift.end_time)})`,
        isDeleted: true,
        isActive: deactivatedShift.is_active,
      });
    }
    return base;
  }, [organizationShifts, shiftMissingFromActiveList, deactivatedShift]);

  // Same fallback as shift above, for a deactivated department.
  const selectedDepartmentIdForFallback = (watch('department') || [])[0];
  const selectedDepartmentIdForFallbackStr =
    selectedDepartmentIdForFallback != null ? String(selectedDepartmentIdForFallback) : '';
  const departmentMissingFromActiveList =
    Boolean(selectedDepartmentIdForFallbackStr) &&
    !orgDepartments.some(
      (item) => String(item.org_department_id) === selectedDepartmentIdForFallbackStr
    );
  const { data: orgDepartmentsInclInactive } = useListTenantDepartmentsQuery(
    { tenantId: tenantId ?? '', isMaster, includeInactive: true },
    { skip: !tenantId || !departmentMissingFromActiveList }
  );
  const deactivatedDepartment = orgDepartmentsInclInactive?.find(
    (item) => String(item.org_department_id) === selectedDepartmentIdForFallbackStr
  );

  // Active-only, unbounded job-type list — same reasoning as shifts above.
  const {
    data: jobTypesData,
    isFetching: jobTypesInclInactiveLoading,
    isError: isJobTypesError,
    error: jobTypesErrorRaw,
    refetch: refetchJobTypes,
  } = useListJobTypesQuery({ isMaster: false });
  const jobTypesError = isJobTypesError
    ? getJobErrorMessage(jobTypesErrorRaw, 'Failed to load options.')
    : undefined;
  const organizationJobTypes = jobTypesData ?? [];
  const jobTypes = organizationJobTypes;
  const selectedJobTypeIdForOptions = (watch('jobType') || [])[0];
  const selectedJobTypeIdStr =
    selectedJobTypeIdForOptions != null ? String(selectedJobTypeIdForOptions) : '';
  const jobTypeMissingFromActiveList =
    Boolean(selectedJobTypeIdStr) &&
    !organizationJobTypes.some((item) => String(item.id) === selectedJobTypeIdStr);
  const { data: deactivatedJobType } = useGetJobTypeByIdQuery(selectedJobTypeIdStr, {
    skip: !jobTypeMissingFromActiveList,
  });
  const jobTypeOptions = useMemo(() => {
    const base = organizationJobTypes.map((item) => ({
      id: item.id,
      name: item.job_type_name,
      isDeleted: Boolean(item.is_deleted),
      isActive: item.is_active,
    }));
    if (jobTypeMissingFromActiveList && deactivatedJobType) {
      base.push({
        id: deactivatedJobType.id,
        name: deactivatedJobType.job_type_name,
        isDeleted: true,
        isActive: deactivatedJobType.is_active,
      });
    }
    return base;
  }, [organizationJobTypes, jobTypeMissingFromActiveList, deactivatedJobType]);

  // Active-only, unbounded job-mode list — same reasoning as shifts above.
  const {
    data: jobModesData,
    isFetching: jobModesInclInactiveLoading,
    isError: isJobModesError,
    error: jobModesErrorRaw,
    refetch: refetchJobModes,
  } = useListOrganizationJobModesQuery();
  const jobModesError = isJobModesError
    ? getJobErrorMessage(jobModesErrorRaw, 'Failed to load options.')
    : undefined;
  const organizationJobModes = jobModesData ?? [];
  const jobModes = organizationJobModes;
  const selectedJobModeId = (watch('jobMode') || [])[0];
  const selectedJobModeIdStr = selectedJobModeId != null ? String(selectedJobModeId) : '';
  const jobModeMissingFromActiveList =
    Boolean(selectedJobModeIdStr) &&
    !organizationJobModes.some((item) => String(item.id) === selectedJobModeIdStr);
  const { data: deactivatedJobMode } = useGetJobModeByIdQuery(selectedJobModeIdStr, {
    skip: !jobModeMissingFromActiveList,
  });
  const jobModeOptions = useMemo(() => {
    const base = organizationJobModes.map((item) => ({
      id: item.id,
      name: item.job_mode_name,
      isDeleted: Boolean(item.is_deleted),
      isActive: item.is_active,
    }));
    if (jobModeMissingFromActiveList && deactivatedJobMode) {
      base.push({
        id: deactivatedJobMode.id,
        name: deactivatedJobMode.job_mode_name,
        isDeleted: true,
        isActive: deactivatedJobMode.is_active,
      });
    }
    return base;
  }, [organizationJobModes, jobModeMissingFromActiveList, deactivatedJobMode]);

  // Active-only, unbounded education-preference list — same reasoning as shifts above.
  const {
    data: educationPreferenceData,
    isFetching: educationPreferenceInclInactiveLoading,
    refetch: refetchEducationPreference,
  } = useListEducationPreferencesQuery();
  const organizationEducationPreferences = educationPreferenceData ?? [];
  const educationPreference = organizationEducationPreferences;
  const selectedEducationPreferenceId = (watch('educationPreference') || [])[0];
  const selectedEducationPreferenceIdStr =
    selectedEducationPreferenceId != null ? String(selectedEducationPreferenceId) : '';
  const educationPreferenceMissingFromActiveList =
    Boolean(selectedEducationPreferenceIdStr) &&
    !organizationEducationPreferences.some(
      (item) => String(item.id) === selectedEducationPreferenceIdStr
    );
  const { data: deactivatedEducationPreference } = useGetEducationPreferenceByIdQuery(
    selectedEducationPreferenceIdStr,
    { skip: !educationPreferenceMissingFromActiveList }
  );
  const educationPreferenceOptions = useMemo(() => {
    const base = organizationEducationPreferences.map((item) => ({
      id: item.id,
      name: item.education_preference_name,
      isDeleted: Boolean(item.is_deleted),
      isActive: item.is_active,
    }));
    if (educationPreferenceMissingFromActiveList && deactivatedEducationPreference) {
      base.push({
        id: deactivatedEducationPreference.id,
        name: deactivatedEducationPreference.education_preference_name,
        isDeleted: true,
        isActive: deactivatedEducationPreference.is_active,
      });
    }
    return base;
  }, [
    organizationEducationPreferences,
    educationPreferenceMissingFromActiveList,
    deactivatedEducationPreference,
  ]);

  // Full skill catalogue including deactivated rows, used only to source a
  // real name for a currently-selected-but-deactivated skill - the dropdown's
  // own active-only list (mandatorySkills/optionalSkills) never carries one.
  const { data: allSkillsInclInactive } = useListActiveSkillsQuery({ includeInactive: true });

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

  // A currently-selected-but-deactivated skill stays visible (flagged
  // isDeleted), same treatment shiftOptions/jobModeOptions give their fields.
  const mandatorySkillOptions = useMemo(() => {
    const extraDeactivated = (allSkillsInclInactive ?? [])
      .filter(
        (skill) => skill.is_deleted && selectedMandatorySkillIds.includes(String(skill.skill_id))
      )
      .filter((skill) => !mandatorySkills.some((o) => String(o.id) === String(skill.skill_id)))
      .map((skill) => ({
        id: skill.skill_id,
        name: skill.skill_label,
        isDeleted: true,
        isActive: false,
      }));
    return [...mandatorySkills.map((o) => ({ ...o, isActive: true })), ...extraDeactivated];
  }, [mandatorySkills, allSkillsInclInactive, selectedMandatorySkillIds]);
  const optionalSkillOptions = useMemo(() => {
    const extraDeactivated = (allSkillsInclInactive ?? [])
      .filter(
        (skill) => skill.is_deleted && selectedOptionalSkillIds.includes(String(skill.skill_id))
      )
      .filter((skill) => !optionalSkills.some((o) => String(o.id) === String(skill.skill_id)))
      .map((skill) => ({
        id: skill.skill_id,
        name: skill.skill_label,
        isDeleted: true,
        isActive: false,
      }));
    return [...optionalSkills.map((o) => ({ ...o, isActive: true })), ...extraDeactivated];
  }, [optionalSkills, allSkillsInclInactive, selectedOptionalSkillIds]);

  const selectedHiringManagers = hiringManagers.filter((option) =>
    selectedHiringManagerIds.includes(String(option.id))
  );
  const selectedRecruiters = recruiters.filter((option) =>
    selectedRecruiterIds.includes(String(option.id))
  );
  const selectedMandatorySkills = [...mandatorySkillOptions, ...extraSuggestedSkillOptions]
    .filter((option, index, self) => index === self.findIndex((o) => idsMatch(o.id, option.id)))
    .filter((option) => selectedMandatorySkillIds.includes(String(option.id)));
  const selectedOptionalSkills = [...optionalSkillOptions, ...extraSuggestedSkillOptions]
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
        // Permitted offices + whatever's already saved; unfiltered while loading.
        .filter(
          (office) =>
            !permittedOfficesData ||
            permittedOfficeIds.has(office.office_id) ||
            idsMatch(office.office_id, selectedOfficeLocationId)
        )
        .map((office) => ({
          id: office.office_id,
          name: officeDisplayName(office),
        }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [offices, permittedOfficeIds, permittedOfficesData, selectedOfficeLocationId]
  );

  // True only when offices exist but none are permitted — distinct from
  // "org has no offices", which already has its own empty-list UX.
  const hasNoPermittedOfficeToSelect =
    Boolean(permittedOfficesData) && offices.length > 0 && jobLocationOptions.length === 0;

  const selectedLocationDetails = useMemo(
    () => offices.find((office) => idsMatch(office.office_id, selectedOfficeLocationId)),
    [offices, selectedOfficeLocationId]
  );

  const {
    data: departmentJobTitlesData = [],
    isFetching: loadingDepartmentJobTitles,
    refetch: refetchDepartmentJobTitles,
  } = useListTenantDepartmentJobTitlesQuery(
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
    isActive: jt.is_active,
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
        ? mappedDepartmentJobTitles
        : [];
    // extraJobTitleOptions goes last so a real list entry wins over the temporary local one.
    const combined = [...merged, ...extraJobTitleOptions].filter(
      (title, index, self) => index === self.findIndex((t) => idsMatch(t.id, title.id))
    );
    // Unmapped but selected - show its real name, not a raw id.
    const selectedId = formValues.jobTitle?.[0];
    if (selectedId && !combined.some((t) => idsMatch(t.id, selectedId))) {
      const unmapped = tenantJobTitles.find((jt) => idsMatch(jt.org_job_title_id, selectedId));
      if (unmapped) {
        combined.push({
          id: unmapped.org_job_title_id,
          name: unmapped.name,
          isActive: unmapped.is_active,
          isDeleted: true,
        });
      }
    }
    return combined.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [
    debouncedJobTitleSearch,
    extraJobTitleOptions,
    mappedCatalogueJobTitles,
    mappedDepartmentJobTitles,
    selectedDepartmentId,
    tenantJobTitles,
    formValues.jobTitle,
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
    showToast({
      message: `Added ${unaddedSuggestedSkills.length} AI-suggested skill${unaddedSuggestedSkills.length === 1 ? '' : 's'}`,
      type: 'success',
    });
  };

  useEffect(() => {
    if (unaddedSuggestedSkills.length === 0) return;
    handleAddAllSuggestedSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unaddedSuggestedSkills]);

  const departments = (orgDepartments ?? [])
    .map((department) => ({
      id: department.org_department_id,
      name: department.name,
      isActive: department.is_active,
      isDeleted: false,
    }))
    .concat(
      departmentMissingFromActiveList && deactivatedDepartment
        ? [
            {
              id: deactivatedDepartment.org_department_id,
              name: deactivatedDepartment.name,
              isActive: deactivatedDepartment.is_active,
              isDeleted: true,
            },
          ]
        : []
    )
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const cultureInfoText = String(tenantCultureIntro?.intro_text || '').trim();
  const hasCultureInfo = Boolean(cultureInfoText);
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

  // Tells first-load hydration apart from a real department change below.
  const hasHydratedJobTitleDepartmentRef = useRef(false);

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
        educationPreference: atsJobData.educationPreference?.map((item: any) => item.id) || [],
        mandatorySkills: atsJobData.mandatorySkills?.map((item: any) => item.id) || [],
        optionalSkills: atsJobData.optionalSkills?.map((item: any) => item.id) || [],
        responsibilities: atsJobData.responsibilities || '',
        otherRequirements: atsJobData.otherRequirements || '',
        benefits: atsJobData.benefits || '',
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
      // Don't lock in until jobDetails has actually arrived - Redux may
      // still be empty on this first pass if the fetch hasn't resolved yet.
      if (jobDetails && Object.keys(jobDetails).length > 0) {
        hasCheckedInitialLocationHydrationRef.current = true;
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
    // Wait for a real fetch, not just a stale cached value from an earlier view.
    if (jdStatusFetching) return;
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

    // Re-check permissions now rather than waiting for the next mount.
    void refetchEffectivePermissions();

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
      if (fresh.benefits && !current.benefits) {
        setValue('benefits', fresh.benefits, { shouldValidate: true });
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
      if (fresh.exemptMinSalary != null && !current.exemptMinSalary) {
        setValue('exemptMinSalary', String(fresh.exemptMinSalary), { shouldValidate: true });
        const currentStatus = getValues('exemptionStatus') ?? [];
        if (!currentStatus.includes('true')) {
          setValue('exemptionStatus', [...currentStatus, 'true'], { shouldValidate: true });
        }
        appliedAnything = true;
      }
      if (fresh.exemptMaxSalary != null && !current.exemptMaxSalary) {
        setValue('exemptMaxSalary', String(fresh.exemptMaxSalary), { shouldValidate: true });
        appliedAnything = true;
      }
      if (fresh.nonExemptMinSalary != null && !current.nonExemptMinSalary) {
        setValue('nonExemptMinSalary', String(fresh.nonExemptMinSalary), { shouldValidate: true });
        const currentStatus = getValues('exemptionStatus') ?? [];
        if (!currentStatus.includes('false')) {
          setValue('exemptionStatus', [...currentStatus, 'false'], { shouldValidate: true });
        }
        appliedAnything = true;
      }
      if (fresh.nonExemptMaxSalary != null && !current.nonExemptMaxSalary) {
        setValue('nonExemptMaxSalary', String(fresh.nonExemptMaxSalary), { shouldValidate: true });
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
      // Drives the "isn't set up yet" banner - set here so it updates live.
      if (fresh.unresolvedAiSuggestions !== undefined) {
        setValue('unresolvedAiSuggestions', fresh.unresolvedAiSuggestions);
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
    jdStatusFetching,
    resolvedJobId,
    refetchJdDetailsForGate,
    refetchSuggestedSkills,
    refetchEffectivePermissions,
    getValues,
    setValue,
    trigger,
  ]);

  // Fills any AI-owned fields still blank - never overwrites a typed value.
  useEffect(() => {
    if (!jdDetailsForGate) return;
    const current = getValues();
    // Form fields are arrays (`jobType`, `jobMode`, `shift`,
    // `educationPreference`); backend/diff fields are scalar ids.
    const {
      vacancies: vacanciesUpdate,
      jobTypeId: jobTypeUpdate,
      jobModeId: jobModeUpdate,
      shiftId: shiftUpdate,
      educationPreferenceId: educationPreferenceUpdate,
      ...otherUpdates
    } = diffAiOwnedFields(jdDetailsForGate, {
      ...current,
      vacancies: current.openings,
      jobTypeId: current.jobType?.[0],
      jobModeId: current.jobMode?.[0],
      shiftId: current.shift?.[0],
      educationPreferenceId: current.educationPreference?.[0],
    });
    Object.entries(otherUpdates).forEach(([field, value]) => {
      setValue(field as keyof typeof otherUpdates, value, { shouldValidate: true });
    });
    if (vacanciesUpdate != null) {
      setValue('openings', vacanciesUpdate, { shouldValidate: true });
    }
    if (jobTypeUpdate) {
      setValue('jobType', [jobTypeUpdate], { shouldValidate: true });
    }
    if (jobModeUpdate) {
      setValue('jobMode', [jobModeUpdate], { shouldValidate: true });
    }
    if (shiftUpdate) {
      setValue('shift', [shiftUpdate], { shouldValidate: true });
    }
    if (educationPreferenceUpdate) {
      setValue('educationPreference', [educationPreferenceUpdate], { shouldValidate: true });
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

  // Force the toggle off once there's no culture intro left to play.
  useEffect(() => {
    if (!hasCultureInfo && useCultureIntroValue) {
      setValue('useCultureIntro', false, {
        shouldValidate: true,
        shouldDirty: false,
      });
    }
  }, [hasCultureInfo, setValue, useCultureIntroValue]);

  /**
   * Job titles require a department. Keep a stored title when it still
   * exists on the department mapping or in the platform catalogue. The
   * "no department -> clear title" branch skips the effect's first run,
   * so an AI-filled title with no department yet survives page load.
   */
  useEffect(() => {
    if (loadingDepartmentJobTitles || loadingCatalogue) return;

    const currentJobTitleIds = formValues.jobTitle || [];
    const isInitialHydration = !hasHydratedJobTitleDepartmentRef.current;
    hasHydratedJobTitleDepartmentRef.current = true;

    if (!selectedDepartmentId) {
      if (!isInitialHydration && currentJobTitleIds.length > 0) {
        setValue('jobTitle', [], { shouldValidate: true });
      }
      return;
    }

    // Department-scoped list only, not the tenant-wide catalogue.
    const validJobTitleIds = currentJobTitleIds.filter(
      (titleId) =>
        mappedDepartmentJobTitles.some((jt) => idsMatch(jt.id, titleId)) ||
        jobTitleCatalogue.some((jt) => idsMatch(jt.job_title_id, titleId))
    );

    if (validJobTitleIds.length !== currentJobTitleIds.length) {
      setValue('jobTitle', validJobTitleIds, { shouldValidate: true });
    }
  }, [
    selectedDepartmentId,
    mappedDepartmentJobTitles,
    jobTitleCatalogue,
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
      | 'jobMode'
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
      jobMode: 'JOB_MODE',
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
      case 'jobMode':
        setValue('jobMode', [], { shouldValidate: false });
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

        // Refetch before setValue so the new option exists in `orgDepartments`;
        // otherwise the label briefly renders as a raw uuid.
        await refetchDepartments();

        setValue('department', [createdDepartment.org_department_id], { shouldValidate: true });
        setValue('jobTitle', [], { shouldValidate: true });
        showToast({
          message: 'Department added successfully',
          type: 'success',
        });
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
          const existingTitleFormId = tenantJobTitleFormId(existingTitle);
          const alreadyMappedToDepartment = departmentJobTitlesData.some((jobTitle) =>
            idsMatch(tenantJobTitleFormId(jobTitle), existingTitleFormId)
          );
          if (!alreadyMappedToDepartment) {
            const existingOrgId = resolveOrgJobTitleId(existingTitleFormId);
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
                master_job_title_id: existingTitleFormId,
                department_id: String(selectedDepartmentId),
                isMaster,
              }).unwrap();
            }
          }
          setExtraJobTitleOptions((prev) =>
            prev.some((opt) => idsMatch(opt.id, existingTitleFormId))
              ? prev
              : [...prev, { id: existingTitleFormId, name: existingTitle.name }]
          );
          setValue('jobTitle', [existingTitleFormId], { shouldValidate: true });
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
          (item) => item.education_preference_name.toLowerCase() === normalizedValue
        );
        if (existingPreference) {
          setValue('educationPreference', [existingPreference.id], { shouldValidate: true });
          return;
        }
        const created = await createEducationPreference({
          education_preference_name: formattedValue,
        }).unwrap();
        // Refetch before setValue so the new option exists in `options`; otherwise
        // the label briefly renders as a raw uuid.
        await refetchEducationPreference?.();
        setValue('educationPreference', [created.id], { shouldValidate: true });
        showToast({ message: 'Education preference added', type: 'success' });
        return;
      }

      if (addType === 'mandatorySkills' || addType === 'optionalSkills') {
        const currentValues = (watch(addType) || []).map(String);
        const existingSkill = [...mandatorySkills, ...optionalSkills].find(
          (skill) => skill.name.toLowerCase() === normalizedValue
        );
        if (existingSkill) {
          // The picker's filter only hides skills already on the other list from
          // selection, not from a typed exact-name match - block that case explicitly.
          const otherType = addType === 'mandatorySkills' ? 'optionalSkills' : 'mandatorySkills';
          const otherSkillIds = (watch(otherType) || []).map(String);
          if (otherSkillIds.includes(String(existingSkill.id))) {
            showToast({
              message: `"${existingSkill.name}" is already selected as ${
                otherType === 'mandatorySkills' ? 'a required' : 'an optional'
              } skill.`,
              type: 'error',
            });
            return;
          }
          setValue(addType, [...currentValues, existingSkill.id], { shouldValidate: true });
          return;
        }
        const createdSkill = await createOrganizationSkill({ skill: formattedValue }).unwrap();
        // Refetch before setValue so the new option exists in `options`; otherwise
        // the label briefly renders as a raw uuid.
        await (addType === 'mandatorySkills' ? refetchMandatorySkills() : refetchOptionalSkills());
        setValue(addType, [...currentValues, createdSkill.skill_id], { shouldValidate: true });
        showToast({ message: 'Skill added successfully', type: 'success' });
        return;
      }

      if (addType === 'jobType') {
        const existingJobType = jobTypes.find(
          (item) => item.job_type_name.toLowerCase() === normalizedValue
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
        await refetchJobTypes?.();
        setValue('jobType', [createdJobType.id], { shouldValidate: true });
        showToast({ message: 'Job type added successfully', type: 'success' });
        return;
      }

      if (addType === 'jobMode') {
        const existingJobMode = jobModes.find(
          (item) => item.job_mode_name.toLowerCase() === normalizedValue
        );
        if (existingJobMode) {
          setValue('jobMode', [existingJobMode.id], { shouldValidate: true });
          return;
        }
        const createdJobMode = await createJobMode({ job_mode_name: formattedValue }).unwrap();
        await refetchJobModes?.();
        setValue('jobMode', [createdJobMode.id], { shouldValidate: true });
        showToast({ message: 'Job location added successfully', type: 'success' });
        return;
      }
    } catch (err) {
      const status = (err as { status?: number })?.status;
      showToast({
        message:
          status === 403
            ? "You don't have permission to link this job title to this department. Ask an admin to do it."
            : getJobErrorMessage(err, 'Something went wrong while updating dropdown.'),
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

  const handleReuseOption = async (id: string | number, type: string) => {
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

    const optionId = String(id);
    try {
      if (type === 'jobType') {
        await reactivateJobType(optionId).unwrap();
      } else if (type === 'jobMode') {
        await reactivateJobMode(optionId).unwrap();
      } else if (type === 'shift') {
        await reactivateOrganizationShift(optionId).unwrap();
      } else if (type === 'educationPreference') {
        await reactivateEducationPreference(optionId).unwrap();
      } else if (type === 'mandatorySkills' || type === 'optionalSkills') {
        await reactivateOrganizationSkill({ skillId: optionId }).unwrap();
      } else {
        showToast({
          message: 'Removed options cannot be restored from this screen.',
          type: 'error',
        });
        return;
      }
      showToast({ message: 'Option reactivated successfully', type: 'success' });
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Something went wrong while reactivating this option.'),
        type: 'error',
      });

      throw err;
    }
  };
  // Status Switch next to Edit/Delete - flips is_active, independent of the
  // isDeleted/reuse soft-delete path above.
  const toggleActiveTypeLabels: Record<string, string> = {
    jobType: 'Job type',
    jobMode: 'Job location',
    shift: 'Shift',
    educationPreference: 'Education preference',
    mandatorySkills: 'Skill',
    optionalSkills: 'Skill',
    department: 'Department',
    jobTitle: 'Job title',
  };

  const handleToggleActive = async (id: string | number, nextActive: boolean, type: string) => {
    const optionId = String(id);
    const typeLabel = toggleActiveTypeLabels[type] ?? 'Option';
    try {
      if (type === 'jobType') {
        await (nextActive ? activateJobType(optionId) : deactivateJobType(optionId)).unwrap();
        refetchJobTypes?.();
      } else if (type === 'jobMode') {
        await (nextActive ? activateJobMode(optionId) : deactivateJobMode(optionId)).unwrap();
        refetchJobModes?.();
      } else if (type === 'shift') {
        await (
          nextActive ? activateOrganizationShift(optionId) : deactivateOrganizationShift(optionId)
        ).unwrap();
      } else if (type === 'educationPreference') {
        await (
          nextActive
            ? activateEducationPreference(optionId)
            : deactivateEducationPreference(optionId)
        ).unwrap();
        refetchEducationPreference?.();
      } else if (type === 'mandatorySkills' || type === 'optionalSkills') {
        await (
          nextActive
            ? activateOrganizationSkill({ skillId: optionId })
            : deactivateOrganizationSkill({ skillId: optionId })
        ).unwrap();
        refetchMandatorySkills?.();
        refetchOptionalSkills?.();
      } else if (type === 'department') {
        await (
          nextActive
            ? activateTenantDepartment({
                tenantId: tenantId ?? '',
                departmentId: optionId,
                isMaster,
              })
            : deactivateTenantDepartment({
                tenantId: tenantId ?? '',
                departmentId: optionId,
                isMaster,
              })
        ).unwrap();
        refetchDepartments?.();
      } else if (type === 'jobTitle') {
        await (
          nextActive
            ? activateTenantJobTitle({ tenantId: tenantId ?? '', jobTitleId: optionId, isMaster })
            : deactivateTenantJobTitle({
                tenantId: tenantId ?? '',
                jobTitleId: optionId,
                isMaster,
              })
        ).unwrap();
        refetchDepartmentJobTitles?.();
      }
      showToast({
        message: `${typeLabel} ${nextActive ? 'activated' : 'deactivated'} successfully`,
        type: 'success',
      });
    } catch (err) {
      showToast({
        message: getJobErrorMessage(
          err,
          `Something went wrong while updating ${typeLabel.toLowerCase()} status.`
        ),
        type: 'error',
      });
    }
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

        throw err;
      }

      return;
    }

    if (type === 'jobTitle') {
      const orgJobTitleId = resolveOrgJobTitleId(id);
      if (!orgJobTitleId || !tenantId) {
        showToast({
          message: 'This title is from the platform catalog and cannot be renamed here.',
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

        throw err;
      }

      return;
    }

    if (type === 'jobType') {
      try {
        await updateJobType({
          jobTypeId: String(id),
          job_type_name: capitalizeWordsAdvanced(newName),
          // Not collected by this rename-only dialog — preserve whatever's
          // already stored rather than wiping it (PUT replaces).
          job_type_description: jobTypes.find((item) => String(item.id) === String(id))
            ?.job_type_description,
          isMaster,
        }).unwrap();

        showToast({ message: 'Job type updated successfully', type: 'success' });
        refetchJobTypes?.();
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Something went wrong while updating job type.'),
          type: 'error',
        });

        throw err;
      }

      return;
    }

    if (type === 'jobMode') {
      try {
        await updateJobMode({
          jobModeId: String(id),
          job_mode_name: capitalizeWordsAdvanced(newName),
          // Not collected by this rename-only dialog — preserve whatever's
          // already stored rather than wiping it (PUT replaces).
          job_mode_description: jobModes.find((item) => String(item.id) === String(id))
            ?.job_mode_description,
        }).unwrap();
        showToast({ message: 'Job location updated successfully', type: 'success' });
        refetchJobModes?.();
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Something went wrong while updating job location.'),
          type: 'error',
        });

        throw err;
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

        throw err;
      }

      return;
    }

    if (type === 'mandatorySkills' || type === 'optionalSkills') {
      // The dropdown only shows the edit icon for this organization's own
      // skills (isEditable) - a platform-shared one never reaches here.
      try {
        await updateOrganizationSkill({
          skillId: String(id),
          skill: capitalizeWordsAdvanced(newName),
        }).unwrap();
        showToast({ message: 'Skill updated successfully', type: 'success' });
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Something went wrong while updating the skill.'),
          type: 'error',
        });

        throw err;
      }
      return;
    }
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

        throw err;
      }

      return;
    }

    if (type === 'jobTitle') {
      const orgJobTitleId = resolveOrgJobTitleId(id);
      if (!orgJobTitleId || !tenantId) {
        showToast({
          message: 'This title is from the platform catalog and cannot be removed here.',
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

        throw err;
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

        throw err;
      }

      return;
    }

    if (type === 'jobMode') {
      try {
        await deleteJobMode(String(id)).unwrap();
        showToast({ message: 'Job location removed successfully', type: 'success' });
        clearIfSelected();
        refetchJobModes?.();
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Something went wrong while removing job location.'),
          type: 'error',
        });

        throw err;
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

        throw err;
      }

      return;
    }

    if (type === 'mandatorySkills' || type === 'optionalSkills') {
      // The dropdown only shows the delete icon for this organization's own
      // skills (isEditable) - a platform-shared one never reaches here.
      try {
        await deleteOrganizationSkill({ skillId: String(id) }).unwrap();
        showToast({ message: 'Skill removed successfully', type: 'success' });
        clearIfSelected();
      } catch (err) {
        showToast({
          message: getJobErrorMessage(err, 'Something went wrong while removing the skill.'),
          type: 'error',
        });

        throw err;
      }
      return;
    }
  };

  const shiftBeingEdited = organizationShifts.find(
    (item) => String(item.id) === String(editingShiftId)
  );

  const handleSaveShift = async (values: {
    name: string;
    start_time: string;
    end_time: string;
  }) => {
    setIsSavingShift(true);
    try {
      const duration_minutes = computeShiftDurationMinutes(values.start_time, values.end_time);
      if (shiftModalMode === 'edit' && shiftBeingEdited) {
        await updateOrganizationShift({
          shiftId: shiftBeingEdited.id,
          shift_name: values.name.trim(),
          // Not collected by this quick modal — preserve whatever Org
          // Settings already has rather than wiping it (PUT replaces).
          shift_description: shiftBeingEdited.shift_description,
          start_time: values.start_time,
          end_time: values.end_time,
          duration_minutes: duration_minutes ?? undefined,
        }).unwrap();
        showToast({ message: 'Shift updated successfully', type: 'success' });
      } else {
        const created = await createOrganizationShift({
          shift_name: values.name.trim(),
          start_time: values.start_time,
          end_time: values.end_time,
          duration_minutes: duration_minutes ?? undefined,
        }).unwrap();
        setValue('shift', [created.id], { shouldValidate: true });
        showToast({ message: 'Shift added successfully', type: 'success' });
      }
      setShiftModalMode(null);
      setEditingShiftId(null);
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Something went wrong while saving the shift.'),
        type: 'error',
      });
    } finally {
      setIsSavingShift(false);
    }
  };

  const handleDeleteShift = async (id: string | number) => {
    try {
      await deleteOrganizationShift(String(id)).unwrap();
      if (String((watch('shift') || [])[0]) === String(id)) {
        setValue('shift', [], { shouldValidate: true });
      }
      showToast({ message: 'Shift removed successfully', type: 'success' });
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Something went wrong while removing the shift.'),
        type: 'error',
      });

      throw err;
    }
  };

  const handleEditShiftOption = (id: string | number) => {
    setEditingShiftId(String(id));
    setShiftModalMode('edit');
  };

  const handleAddShiftOption = (value: string) => {
    setShiftAddPrefillName(value);
    setEditingShiftId(null);
    setShiftModalMode('add');
  };

  // location has no single-string add-flow (a full address) - text only.
  const UNRESOLVED_AI_FIELD_LABELS: Record<string, string> = {
    job_type: 'Job Type',
    work_mode: 'Job Location',
    shift: 'Shift',
    education_preference: 'Education Preference',
    location: 'Location',
    job_title: 'Job Title',
    department: 'Department',
  };
  // Same add-only permission each field's own dropdown "+ Add" already
  // uses - location has no per-field add permission, stays Admin-only.
  const canAddUnresolvedField = (fieldKey: string): boolean => {
    switch (fieldKey) {
      case 'department':
        return canAddDepartment;
      case 'job_title':
        return canAddJobTitle;
      case 'job_type':
      case 'work_mode':
      case 'education_preference':
      case 'shift':
        return canManageJobCatalogues;
      default:
        return canManageCatalogueEntries;
    }
  };

  const handleCreateFromUnresolvedSuggestion = (fieldKey: string, guess: string) => {
    switch (fieldKey) {
      case 'job_type':
        handleAddOption(guess, 'jobType');
        break;
      case 'work_mode':
        handleAddOption(guess, 'jobMode');
        break;
      case 'education_preference':
        handleAddOption(guess, 'educationPreference');
        break;
      case 'job_title':
        handleAddOption(guess, 'jobTitle');
        break;
      case 'department':
        handleAddOption(guess, 'department');
        break;
      case 'shift':
        handleAddShiftOption(guess);
        break;
    }
  };
  // Once the mapped form field has a real value, its banner row auto-clears
  // - not just on explicit dismiss.
  const UNRESOLVED_AI_FIELD_TO_FORM_FIELD: Record<string, keyof JobDetailsState> = {
    job_type: 'jobType',
    work_mode: 'jobMode',
    shift: 'shift',
    education_preference: 'educationPreference',
    job_title: 'jobTitle',
    department: 'department',
    // location intentionally excluded - no single form field to check.
  };
  // Reads the live form state (same as jobType/jobMode/shift below), not
  // the jobDetails Redux slice - the sync effect that fills this in only
  // calls setValue, it never dispatches into Redux.
  // Dismissal is keyed by job id + field, not just field - otherwise
  // dismissing "shift" on one job would silently hide it for every other
  // job in the same browser session too.
  const visibleUnresolvedAiSuggestions = Object.entries(
    watch('unresolvedAiSuggestions') ?? {}
  ).filter(([fieldKey]) => {
    if (dismissedUnresolvedAiFields.has(`${resolvedJobId}:${fieldKey}`)) return false;
    const formField = UNRESOLVED_AI_FIELD_TO_FORM_FIELD[fieldKey];
    if (!formField) return true;
    const currentValue = watch(formField);
    const isFilled = Array.isArray(currentValue) ? currentValue.length > 0 : !!currentValue;
    return !isFilled;
  });

  const resolveSavedJobId = (): string => resolveExistingJobId();

  // Cancel: discards the job outright, same for Company Admin and Hiring
  // Manager - no draft left behind, unlike Save as Draft. Stays on the page
  // on failure rather than claiming success while a draft still exists.
  const handleConfirmCancel = async () => {
    setAllowNavigation(true);
    const existingId = resolveExistingJobId();
    if (existingId) {
      try {
        await deleteDraftJob(existingId).unwrap();
      } catch (error) {
        setAllowNavigation(false);
        showToast({
          message: getJobErrorMessage(error, 'Failed to remove job opening'),
          type: 'error',
        });
        setShowCancelConfirm(false);
        return;
      }
    }
    setShowCancelConfirm(false);
    navigate('/jobs');
  };

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
        suggestedSkills,
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
        benefits: data.benefits || '',
      })
    );

    const payload = {
      ...data,
      locationId: data.officeLocation?.[0],
      generateAiJd: true,
      useCultureIntro: Boolean(data.useCultureIntro),
      maxExperience: data.maxExperience,
      exemptMinSalary: data.exemptMinSalary ? parseFloat(data.exemptMinSalary) : undefined,
      exemptMaxSalary: data.exemptMaxSalary ? parseFloat(data.exemptMaxSalary) : undefined,
      nonExemptMinSalary: data.nonExemptMinSalary ? parseFloat(data.nonExemptMinSalary) : undefined,
      nonExemptMaxSalary: data.nonExemptMaxSalary ? parseFloat(data.nonExemptMaxSalary) : undefined,
      minExperience: data.minExperience ?? undefined,
      responsibilities: data.responsibilities || undefined,
      otherRequirements: data.otherRequirements || undefined,
      benefits: data.benefits || undefined,
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
      suggestedSkills,
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
                'Job saved. AI description could not be started - try Refine on the next step.'
              ),
              type: 'warning',
            });
          });
      }

      setShowRegenerateConfirmModal(false);
      setPendingSubmitData(null);
      setIsSubmittingWithModal(false);

      // Save now takes the recruiter straight to the next step.
      goToDescriptionPage();
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
          suggestedSkills,
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

      const isUploadedJdPath =
        jdBeforeSave?.source === 'UPLOADED' || jdBeforeSave?.entryPath === 'upload_jd';
      if (isUploadedJdPath && jdBeforeSave?.jobDescription?.trim()) {
        setPendingContinueJobId(savedId);
        setShowContinueJdChoiceModal(true);
        return;
      }

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
            message: 'Job details changed - regenerating the AI description to match',
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

    goToDescriptionPage();
  };

  const goToDescriptionPage = () => {
    setAllowNavigation(true);
    const fullUrl = getFullURL('/job-description', true);
    const safeUrl =
      typeof fullUrl === 'string' && fullUrl.startsWith('/') ? fullUrl : '/job-description';
    navigate(safeUrl, { viewTransition: true });
  };

  const handleContinueUseUploadedJd = () => {
    setShowContinueJdChoiceModal(false);
    setPendingContinueJobId(null);
    goToDescriptionPage();
  };

  const handleContinueRegenerateJd = async () => {
    if (!pendingContinueJobId) return;
    setIsSubmittingWithModal(true);
    try {
      await enhanceJd({ jobOpeningId: pendingContinueJobId, regenerate: true }).unwrap();
      showToast({ message: 'Regenerating the AI description', type: 'success' });
    } catch (enhanceError) {
      showToast({
        message: getJobErrorMessage(
          enhanceError,
          'Could not start regeneration - use Regenerate on the next step.'
        ),
        type: 'warning',
      });
    } finally {
      setIsSubmittingWithModal(false);
    }
    setShowContinueJdChoiceModal(false);
    setPendingContinueJobId(null);
    goToDescriptionPage();
  };

  return (
    <>
      {(isUpdating || isSubmittingWithModal) && <Loader />}
      <MainLayout>
        <JobDetailsLayout>
          <div ref={formContainerRef}>
            {!canEditJobAtActiveLocation && (
              <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                You don&apos;t have permission to create or edit a job opening at this location.
                Switch back to a location where you have access, or contact your company admin.
              </div>
            )}
            <div
              className={
                canEditJobAtActiveLocation
                  ? undefined
                  : 'pointer-events-none select-none opacity-60'
              }
              aria-disabled={!canEditJobAtActiveLocation}
            >
              <Form layout="vertical" autoComplete="off" onFinish={handleSubmit(onSubmit)}>
                {visibleUnresolvedAiSuggestions.length > 0 && (
                  <div className="mt-2 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    {visibleUnresolvedAiSuggestions.map(([fieldKey, guess]) => {
                      const canAddThisField = canAddUnresolvedField(fieldKey);
                      return (
                        <div key={fieldKey} className="flex items-center justify-between gap-4">
                          <span className="text-sm text-amber-900">
                            <span className="mr-1.5">⚠️</span>
                            <strong>{UNRESOLVED_AI_FIELD_LABELS[fieldKey] ?? fieldKey}:</strong> the
                            job description mentions &quot;{guess}&quot;, but that isn&apos;t set up
                            in your organization&apos;s catalogue yet.{' '}
                            {fieldKey === 'location'
                              ? canManageCatalogueEntries
                                ? 'Add it under Company Settings > Locations.'
                                : 'Contact your company admin to add it.'
                              : !canAddThisField
                                ? 'Contact your company admin to add it.'
                                : fieldKey === 'job_title' && !selectedDepartmentId
                                  ? 'Select a Department first to add it.'
                                  : null}
                          </span>
                          <div className="flex items-center gap-3 shrink-0">
                            {canAddThisField && fieldKey !== 'location' && (
                              <Button
                                type="button"
                                className="text-white bg-button rounded-3xl px-4 py-1.5 text-xs font-semibold cursor-pointer"
                                onClick={() =>
                                  handleCreateFromUnresolvedSuggestion(fieldKey, guess)
                                }
                              >
                                Create It
                              </Button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                setDismissedUnresolvedAiFields((prev) =>
                                  new Set(prev).add(`${resolvedJobId}:${fieldKey}`)
                                )
                              }
                              className="text-amber-600 hover:text-amber-800 cursor-pointer"
                              aria-label="Dismiss notice"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {fieldsLocked && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    <span
                      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"
                      aria-hidden="true"
                    />
                    <span>
                      Let AI fill in the parsed fields below from your job description. Fields will
                      unlock automatically once it&apos;s done.
                    </span>
                  </div>
                )}
                <div className="mt-2">
                  <div className="w-full">
                    <span className="text-lg font-semibold">Job Info</span>
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
                          disabled={fieldsLocked}
                          label="Department"
                          placeholder="Select Department"
                          onAddOption={
                            canAddDepartment
                              ? (value) => handleAddOption(value, 'department')
                              : undefined
                          }
                          type="department"
                          error={errors.department?.message}
                          enableEditDelete={canManageDepartment}
                          onEditOption={canEditDepartment ? handleEditOption : undefined}
                          onDeleteOption={canDeleteDepartment ? handleDeleteOption : undefined}
                          onReuseOption={canManageDepartment ? handleReuseOption : undefined}
                          onToggleActive={canDeleteDepartment ? handleToggleActive : undefined}
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
                          disabled={fieldsLocked}
                          label="Job Title"
                          onAddOption={
                            canAddJobTitle
                              ? (value) => handleAddOption(value, 'jobTitle')
                              : undefined
                          }
                          type="jobTitle"
                          error={errors.jobTitle?.message}
                          className="w-full custom-select-jobs placeholder-style"
                          enableEditDelete={canManageJobTitle}
                          onEditOption={canEditJobTitle ? handleEditOption : undefined}
                          onDeleteOption={canDeleteJobTitle ? handleDeleteOption : undefined}
                          onReuseOption={canManageJobTitle ? handleReuseOption : undefined}
                          onToggleActive={canDeleteJobTitle ? handleToggleActive : undefined}
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
                          onChange={(value) =>
                            setValue('jobType', [value], { shouldValidate: true })
                          }
                          options={jobTypeOptions}
                          loading={jobTypesInclInactiveLoading || isAddingToDropdown === 'jobType'}
                          disabled={fieldsLocked}
                          label="Job Type"
                          placeholder="Select Job Type"
                          onAddOption={
                            canManageJobCatalogues
                              ? (value) => handleAddOption(value, 'jobType')
                              : undefined
                          }
                          type="jobType"
                          error={errors.jobType?.message}
                          emptyMessage={jobTypesError ?? undefined}
                          enableEditDelete={canDeleteJobCatalogues}
                          onEditOption={canDeleteJobCatalogues ? handleEditOption : undefined}
                          onDeleteOption={canDeleteJobCatalogues ? handleDeleteOption : undefined}
                          onReuseOption={canDeleteJobCatalogues ? handleReuseOption : undefined}
                          onToggleActive={canDeleteJobCatalogues ? handleToggleActive : undefined}
                        />
                      </div>
                    </Form.Item>
                    <Form.Item label={<span>Job Location</span>}>
                      <div id="field-jobMode">
                        <DropdownWithAddOption
                          className="w-full custom-select-jobs placeholder-style"
                          value={(watch('jobMode') || [])[0]}
                          onChange={(value) =>
                            setValue('jobMode', [value], { shouldValidate: true })
                          }
                          options={jobModeOptions}
                          loading={jobModesInclInactiveLoading || isAddingToDropdown === 'jobMode'}
                          disabled={fieldsLocked}
                          label="Job Location"
                          placeholder="Select Job Location"
                          onAddOption={
                            canManageJobCatalogues
                              ? (value) => handleAddOption(value, 'jobMode')
                              : undefined
                          }
                          type="jobMode"
                          error={errors.jobMode?.message}
                          emptyMessage={jobModesError ?? undefined}
                          enableEditDelete={canDeleteJobCatalogues}
                          onEditOption={canDeleteJobCatalogues ? handleEditOption : undefined}
                          onDeleteOption={canDeleteJobCatalogues ? handleDeleteOption : undefined}
                          onReuseOption={canDeleteJobCatalogues ? handleReuseOption : undefined}
                          onToggleActive={canDeleteJobCatalogues ? handleToggleActive : undefined}
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
                        disabled={fieldsLocked}
                        label="Shift"
                        placeholder="Select Shift"
                        type="shift"
                        enableEditDelete={canDeleteJobCatalogues}
                        onAddOption={
                          canManageJobCatalogues
                            ? (value) => handleAddShiftOption(value)
                            : undefined
                        }
                        onEditOption={
                          canDeleteJobCatalogues ? (id) => handleEditShiftOption(id) : undefined
                        }
                        onDeleteOption={
                          canDeleteJobCatalogues ? (id) => handleDeleteShift(id) : undefined
                        }
                        onReuseOption={canDeleteJobCatalogues ? handleReuseOption : undefined}
                        onToggleActive={canDeleteJobCatalogues ? handleToggleActive : undefined}
                      />
                      {errors.shift && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.shift?.message as string}
                        </p>
                      )}
                    </Form.Item>
                    <ShiftFormModal
                      open={shiftModalMode !== null}
                      mode={shiftModalMode ?? 'add'}
                      initialValues={
                        shiftModalMode === 'edit' && shiftBeingEdited
                          ? {
                              name: shiftBeingEdited.shift_name,
                              start_time: shiftBeingEdited.start_time.slice(0, 5),
                              end_time: shiftBeingEdited.end_time.slice(0, 5),
                            }
                          : shiftModalMode === 'add'
                            ? { name: shiftAddPrefillName, start_time: '', end_time: '' }
                            : undefined
                      }
                      isSaving={isSavingShift}
                      onClose={() => {
                        setShiftModalMode(null);
                        setEditingShiftId(null);
                      }}
                      onSubmit={handleSaveShift}
                    />
                    <Form.Item label={<span>Communication Language</span>}>
                      <Controller
                        name="languages"
                        control={control}
                        render={({ field: { value, onChange } }) => (
                          <div className="border-wrapper dropdown-focus-ring border border-[var(--border)] p-1 w-full rounded-3xl relative">
                            <Select
                              mode="multiple"
                              allowClear
                              showSearch
                              optionFilterProp="label"
                              variant="borderless"
                              placeholder="Select languages"
                              className="w-full custom-select-jobs placeholder-style"
                              loading={languagesLoading}
                              disabled={fieldsLocked}
                              value={languagesLoading ? [] : (value ?? []).map(String)}
                              onChange={(next) => {
                                languagesTouchedRef.current = true;
                                onChange(next);
                              }}
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
                              className="inline-flex items-center justify-center text-gray-500 hover:text-[var(--color-primary)] cursor-pointer"
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
                            setValue('useCultureIntro', checked, {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }}
                          disabled={!hasCultureInfo || fieldsLocked}
                          style={{
                            backgroundColor: useCultureIntroValue
                              ? 'var(--color-primary)'
                              : undefined,
                          }}
                        />
                        <span className="text-sm text-gray-700 leading-5">
                          Play Company Culture Introduction at the start of AI Audio Screening and
                          AI Video Interview
                        </span>
                      </div>
                    </Form.Item>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="w-full">
                    <span className="text-lg font-semibold">Location</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-2">
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
                          disabled={fieldsLocked}
                          label="Location"
                          placeholder="Select Location"
                          type="location"
                          error={errors.officeLocation?.message}
                          emptyMessage={officesErrorMessage}
                          enableEditDelete={false}
                        />
                      </div>
                      {!isOfficesError &&
                        hasNoPermittedOfficeToSelect &&
                        !errors.officeLocation && (
                          <p className="text-xs text-amber-600 mt-1">
                            You are not permitted to create a job at any office location. Contact
                            your admin to get access.
                          </p>
                        )}
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-2">
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-2">
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
                          {errors.country && (
                            <p className="text-red-500">{errors.country.message}</p>
                          )}
                        </Form.Item>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-2">
                  <div className="w-full">
                    <span className="text-lg font-semibold">Hiring Panel</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-2">
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
                          disabled={fieldsLocked}
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
                                    disabled={fieldsLocked}
                                    className="ml-1 w-4 h-4 flex items-center justify-center text-brand-500 hover:text-brand-700 hover:bg-brand-200 rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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
                          disabled={fieldsLocked}
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
                                    disabled={fieldsLocked}
                                    className="ml-1 w-4 h-4 flex items-center justify-center text-brand-500 hover:text-brand-700 hover:bg-brand-200 rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-2">
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
                          format="MMM D, YYYY"
                          placeholder="Select Open Date"
                          disabledDate={(current) =>
                            current && current.isBefore(dayjs().startOf('day'))
                          }
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                              e.preventDefault();
                            }
                          }}
                          disabled={fieldsLocked}
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
                            disabled={fieldsLocked}
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
                          value={
                            watch('closeDate') ? dayjs(watch('closeDate'), 'DD-MM-YYYY') : null
                          }
                          onChange={(date) => {
                            setValue('closeDate', date ? date.format('DD-MM-YYYY') : '', {
                              shouldValidate: true,
                            });
                          }}
                          variant="borderless"
                          className="w-full custom-date-picker placeholder-style"
                          format="MMM D, YYYY"
                          placeholder="Select Close Date"
                          disabledDate={(current) =>
                            current && current.isBefore(dayjs().startOf('day'))
                          }
                          onKeyDown={(e) => {
                            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                              e.preventDefault();
                            }
                          }}
                          disabled={fieldsLocked}
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-2">
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
                          mode="multiple"
                          value={watch('exemptionStatus') ?? []}
                          onChange={(value: string[]) => {
                            setValue('exemptionStatus', value, { shouldValidate: true });
                            if (!value.includes('true')) {
                              setValue('exemptMinSalary', null);
                              setValue('exemptMaxSalary', null);
                            }
                            if (!value.includes('false')) {
                              setValue('nonExemptMinSalary', null);
                              setValue('nonExemptMaxSalary', null);
                            }
                            trigger([
                              'exemptionStatus',
                              'exemptMinSalary',
                              'exemptMaxSalary',
                              'nonExemptMinSalary',
                              'nonExemptMaxSalary',
                            ]);
                          }}
                          className="w-full custom-select-jobs placeholder-style"
                          placeholder="Select Exemption Status"
                          popupClassName="rounded-3xl"
                          loading={exemptionStatusLoading}
                          disabled={fieldsLocked}
                        >
                          {exemptionStatusOptions.length > 0 ? (
                            exemptionStatusOptions.map((status) => (
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
                        <p className="text-red-500 text-sm mt-1">
                          {errors.exemptionStatus.message as string}
                        </p>
                      )}
                    </Form.Item>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 mt-2">
                    {(watch('exemptionStatus') ?? []).includes('true') && (
                      <div>
                        <span className="font-medium text-[#4f4f4f]">Exempt - Annual</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-2">
                          <Form.Item
                            label={
                              <span>
                                Minimum Salary (in USD) <span className="required-asterisk">*</span>
                              </span>
                            }
                          >
                            <CurrencyInput
                              id="field-exemptMinSalary"
                              value={watch('exemptMinSalary') ?? ''}
                              onValueChange={(value) => {
                                setValue('exemptMinSalary', value ?? null, {
                                  shouldValidate: true,
                                });
                                trigger(['exemptMinSalary', 'exemptMaxSalary']);
                              }}
                              decimalsLimit={2}
                              decimalScale={2}
                              prefix="$"
                              suffix="/year"
                              placeholder="Minimum Salary"
                              className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)] placeholder:capitalize"
                              intlConfig={{ locale: 'en-US', currency: 'USD' }}
                              disabled={fieldsLocked}
                            />
                            {errors.exemptMinSalary && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors.exemptMinSalary.message}
                              </p>
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
                              id="field-exemptMaxSalary"
                              value={watch('exemptMaxSalary') ?? ''}
                              onValueChange={(value) => {
                                setValue('exemptMaxSalary', value ?? null, {
                                  shouldValidate: true,
                                });
                                trigger(['exemptMinSalary', 'exemptMaxSalary']);
                              }}
                              decimalsLimit={2}
                              decimalScale={2}
                              prefix="$"
                              suffix="/year"
                              placeholder="Maximum Salary"
                              className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)] placeholder:capitalize"
                              intlConfig={{ locale: 'en-US', currency: 'USD' }}
                              disabled={fieldsLocked}
                            />
                            {errors.exemptMaxSalary && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors.exemptMaxSalary.message}
                              </p>
                            )}
                          </Form.Item>
                        </div>
                      </div>
                    )}
                    {(watch('exemptionStatus') ?? []).includes('false') && (
                      <div>
                        <span className="font-medium text-[#4f4f4f]">Non-Exempt - Hourly</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-2">
                          <Form.Item
                            label={
                              <span>
                                Minimum Salary (in USD) <span className="required-asterisk">*</span>
                              </span>
                            }
                          >
                            <CurrencyInput
                              id="field-nonExemptMinSalary"
                              value={watch('nonExemptMinSalary') ?? ''}
                              onValueChange={(value) => {
                                setValue('nonExemptMinSalary', value ?? null, {
                                  shouldValidate: true,
                                });
                                trigger(['nonExemptMinSalary', 'nonExemptMaxSalary']);
                              }}
                              decimalsLimit={2}
                              decimalScale={2}
                              prefix="$"
                              suffix="/hr"
                              placeholder="Minimum Salary"
                              className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)] placeholder:capitalize"
                              intlConfig={{ locale: 'en-US', currency: 'USD' }}
                              disabled={fieldsLocked}
                            />
                            {errors.nonExemptMinSalary && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors.nonExemptMinSalary.message}
                              </p>
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
                              id="field-nonExemptMaxSalary"
                              value={watch('nonExemptMaxSalary') ?? ''}
                              onValueChange={(value) => {
                                setValue('nonExemptMaxSalary', value ?? null, {
                                  shouldValidate: true,
                                });
                                trigger(['nonExemptMinSalary', 'nonExemptMaxSalary']);
                              }}
                              decimalsLimit={2}
                              decimalScale={2}
                              prefix="$"
                              suffix="/hr"
                              placeholder="Maximum Salary"
                              className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)] placeholder:capitalize"
                              intlConfig={{ locale: 'en-US', currency: 'USD' }}
                              disabled={fieldsLocked}
                            />
                            {errors.nonExemptMaxSalary && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors.nonExemptMaxSalary.message}
                              </p>
                            )}
                          </Form.Item>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <div className="w-full">
                    <span className="text-lg font-semibold">Job Skills</span>
                  </div>
                  <div className="form-grid-equal-labels grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-4">
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
                            disabled={fieldsLocked}
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
                        disabled={fieldsLocked}
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
                        disabled={fieldsLocked}
                      />
                      {errors.maxExperience && (
                        <p className="text-red-500 text-sm mt-1">{errors.maxExperience.message}</p>
                      )}
                    </Form.Item>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-2">
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
                          options={mandatorySkillOptions.filter(
                            (option) => !selectedOptionalSkillIds.includes(String(option.id))
                          )}
                          loading={
                            mandatorySkillsLoading || isAddingToDropdown === 'mandatorySkills'
                          }
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
                          disabled={fieldsLocked}
                          error={errors.mandatorySkills?.message}
                          // isEditable hides icons on platform-shared skills; canDeleteSkill hides
                          // them for roles without skill:delete, which the API would 403 anyway.
                          enableEditDelete
                          onEditOption={canDeleteSkill ? handleEditOption : undefined}
                          onDeleteOption={canDeleteSkill ? handleDeleteOption : undefined}
                          onReuseOption={handleReuseOption}
                          onToggleActive={canDeleteSkill ? handleToggleActive : undefined}
                          maxTagCount={0}
                          maxTagPlaceholder={(omittedValues: { value: number | string }[]) => (
                            <span>
                              {omittedValues.length} of {totalMandatorySkillsCount} skills selected
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
                                    disabled={fieldsLocked}
                                    className="ml-1 w-4 h-4 flex items-center justify-center text-brand-500 hover:text-brand-700 hover:bg-brand-200 rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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
                          options={optionalSkillOptions.filter(
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
                          disabled={fieldsLocked}
                          error={errors.optionalSkills?.message}
                          enableEditDelete
                          onEditOption={canDeleteSkill ? handleEditOption : undefined}
                          onDeleteOption={canDeleteSkill ? handleDeleteOption : undefined}
                          onReuseOption={handleReuseOption}
                          onToggleActive={canDeleteSkill ? handleToggleActive : undefined}
                          maxTagCount={0}
                          maxTagPlaceholder={(omittedValues: { value: number | string }[]) => (
                            <span>
                              {omittedValues.length} of {totalOptionalSkillsCount} skills selected
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
                                    disabled={fieldsLocked}
                                    className="ml-1 w-4 h-4 flex items-center justify-center text-brand-500 hover:text-brand-700 hover:bg-brand-200 rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mt-2">
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
                          options={educationPreferenceOptions}
                          loading={
                            educationPreferenceInclInactiveLoading ||
                            isAddingToDropdown === 'educationPreference'
                          }
                          placeholder="Select Education Preference"
                          label="Education Preference"
                          onAddOption={
                            canManageJobCatalogues
                              ? (value) => handleAddOption(value, 'educationPreference')
                              : undefined
                          }
                          type="educationPreference"
                          disabled={fieldsLocked}
                          error={errors.educationPreference?.message}
                          enableEditDelete={canDeleteJobCatalogues}
                          onEditOption={canDeleteJobCatalogues ? handleEditOption : undefined}
                          onDeleteOption={canDeleteJobCatalogues ? handleDeleteOption : undefined}
                          onReuseOption={canDeleteJobCatalogues ? handleReuseOption : undefined}
                          onToggleActive={canDeleteJobCatalogues ? handleToggleActive : undefined}
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
                            maxLength={2000}
                            showCount={{
                              formatter: ({ count, maxLength }) =>
                                `${count}/${maxLength} characters`,
                            }}
                            className="w-full px-4 py-2 border rounded-lg"
                            disabled={fieldsLocked}
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
                            maxLength={2000}
                            showCount={{
                              formatter: ({ count, maxLength }) =>
                                `${count}/${maxLength} characters`,
                            }}
                            className="w-full px-4 py-2 border rounded-lg"
                            disabled={fieldsLocked}
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

                  <div className="grid grid-cols-1 mt-2">
                    <Form.Item label={<span>Benefits</span>}>
                      <Controller
                        name="benefits"
                        control={control}
                        render={({ field }) => (
                          <TextArea
                            {...field}
                            placeholder="Enter benefits offered"
                            rows={4}
                            maxLength={2000}
                            showCount={{
                              formatter: ({ count, maxLength }) =>
                                `${count}/${maxLength} characters`,
                            }}
                            className="w-full px-4 py-2 border rounded-lg"
                            disabled={fieldsLocked}
                          />
                        )}
                      />
                      {errors.benefits && (
                        <p className="text-red-500 text-sm mt-1">{errors.benefits.message}</p>
                      )}
                    </Form.Item>
                  </div>
                </div>

                {showAtsSyncCheckbox && aiJobDescriptionId && (
                  <div className="flex w-full justify-center py-2">
                    <Checkbox
                      checked={isSyncingWithATS}
                      onChange={(e) => setIsSyncingWithATS(e.target.checked)}
                      disabled={fieldsLocked}
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
                  <Tooltip title="Save progress and come back later.">
                    <Button
                      type="button"
                      className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
                      onClick={() => onSaveDraft(watch())}
                    >
                      Save As Draft
                    </Button>
                  </Tooltip>
                  <Tooltip title="Delete this job opening and everything in it.">
                    <Button
                      type="button"
                      className="text-white bg-gray-400 hover:bg-gray-500 rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
                      onClick={() => setShowCancelConfirm(true)}
                    >
                      Cancel
                    </Button>
                  </Tooltip>
                  <Tooltip title="Save this page and continue.">
                    <Button
                      type="button"
                      className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
                      onClick={
                        hasSavedDetails
                          ? handleContinueToDescription
                          : handleSubmit(onSubmit, (invalidFields) => {
                              showToast({
                                message: 'Please fill all required fields before saving.',
                                type: 'error',
                              });
                              scrollToFirstFormError(invalidFields, JOB_DETAILS_FIELD_ORDER);
                            })
                      }
                    >
                      Save & Next
                    </Button>
                  </Tooltip>
                </div>
              </Form>
            </div>
          </div>
          {isBlocked && (
            <ConfirmationModal
              onClose={cancelNavigation}
              onConfirm={confirmNavigation}
              title="You have unsaved changes. Are you sure you want to leave?"
              confirmText="Leave Page"
            />
          )}
          {showCancelConfirm && (
            <ConfirmationModal
              onClose={() => setShowCancelConfirm(false)}
              onConfirm={handleConfirmCancel}
              title="Cancel this job opening? Everything added so far will be permanently deleted."
              confirmText="Cancel Job"
              isLoading={isCancelling}
            />
          )}
          {showRegenerateConfirmModal && (
            <ConfirmationModal
              onClose={handleCancelRegenerate}
              onConfirm={handleConfirmRegenerate}
              title="Would you like to regenerate the Job Description using AI, or use the current uploaded Job Description?"
              confirmText="AI-Regenerate"
              cancelText="Use Uploaded JD"
              isLoading={isSubmittingWithModal}
            />
          )}
          {showContinueJdChoiceModal && (
            <ConfirmationModal
              onClose={handleContinueUseUploadedJd}
              onConfirm={handleContinueRegenerateJd}
              title="Would you like to regenerate the Job Description using AI, or use the current uploaded Job Description?"
              confirmText="AI-Regenerate"
              cancelText="Use Uploaded JD"
              isLoading={isSubmittingWithModal}
            />
          )}
        </JobDetailsLayout>
      </MainLayout>
      {resolvedJobId && jdDetailsForGate?.entryPath === 'manual' && (
        <FillWithAiWidget jobOpeningId={resolvedJobId} />
      )}
    </>
  );
};
export default JobDetails;
