import { InfoCircleOutlined } from '@ant-design/icons';
import { scrollToFirstFormError } from '../../../shared/utils/scrollToFirstFormError';
import { DatePicker, Form, Modal, Select, Switch, Tooltip } from 'antd';
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
import { useGetPermittedOfficesQuery } from '../../../api/job-service/JobOpening/GetPermittedOffices';
import {
  useLazyGetJobDescriptionByIdQuery,
  useGetJobDescriptionByIdQuery,
} from '../../../api/job-service/JobOpening/ViewJobDescriptionById';
import { useEnhanceJdMutation } from '../../../api/job-service/JobOpening/JdUpload';
import { useJdStatusPolling } from '../../../hooks/useJdStatusPolling';
import {
  haveDescriptionInputsChanged,
  diffAiOwnedFields,
  mergeNewAiSkills,
} from '../../../shared/utils/jdSync';
import { lazy, memo, useEffect, useMemo, useRef, useState } from 'react';
import { useIsEditingDraft } from '../../../hooks/useIsEditingDraft';
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
import { capitalizeWordsAdvanced, validateDraft } from '../../../shared/utils/methods';
import { useUpdateJobOpeningMutation } from '../../../api/job-service/JobOpening/UpdateJobOpening';
import {
  useCreateOrganizationSkillMutation,
  useUpdateOrganizationSkillMutation,
  useDeleteOrganizationSkillMutation,
  useReactivateOrganizationSkillMutation,
  useCreateJobTypeMutation,
  useUpdateJobTypeMutation,
  useDeleteJobTypeMutation,
  useReactivateJobTypeMutation,
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
  useCreateEducationPreferenceMutation,
  useUpdateEducationPreferenceMutation,
  useDeleteEducationPreferenceMutation,
  useReactivateEducationPreferenceMutation,
  useListEducationPreferencesQuery,
  useGetEducationPreferenceByIdQuery,
  useActivateEducationPreferenceMutation,
  useDeactivateEducationPreferenceMutation,
} from '../../../api/job-service/JobOpening/educationPreferences';
import { buildSaveJobDetailsPayload } from '../../../api/job-service/buildSaveJobDetailsPayload';
import { asJobId } from '../../../api/job-service/jobId';
import { useDeleteDraftJobMutation } from '../../../api/job-service/JobOpening/AddJobOpening';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';
import { hasFeatureAccess, isAssignedToJob } from '../../../shared/utils/auth/getAccess';
import useEffectivePermissions, {
  useEffectivePermissionsRefetch,
} from '../../../hooks/useEffectivePermissions';
import { Authorities } from '../../../constants/authorities.constant';
import { formatTime12h } from '../../../utils/formatTime';
import {
  officeDisplayName,
  useListTenantOfficesQuery,
} from '../../../api/organization-service/Tenants/offices';
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
import { Loader } from '../../shared/ui/loader';
import { useNavigationBlocker } from '../../../hooks/useNavigationBlocker';
import { useOfferedSuggestedSkills } from '../../../hooks/useOfferedSuggestedSkills';
import { useSessionTenantId } from '../../../hooks/useSessionTenantId';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { useGetTenantCultureIntroQuery } from '../../../api/organization-service/Tenants/cultureIntro';
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
import { toMoneyString } from '../../../shared/utils/money';
import { parseCalendarDate } from '../../../shared/utils/calendarDate';

const CurrencyInput = lazy(() => import('react-currency-input-field'));

const { Option } = Select;

// openDate/closeDate hold ISO from the backend until touched, then 'DD-MM-YYYY'
// once the picker rewrites them - parse leniently to handle both shapes.
const parseFormDate = (value: string) => parseCalendarDate(value) ?? dayjs(value);

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

// Shared by updateFormWithJobData (initial load) and the JD-parsing refresh
// below — job-service returns these as raw ids or nested catalog objects
// depending on endpoint, so both call sites normalize the same way.
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

const asLocationId = (value: unknown): string | null => {
  if (value == null || value === '') return null;
  const id = String(value);
  return id === 'undefined' || id === 'null' ? null : id;
};

// Fields the fresh-data backfill (see `backfilledAtRef`) may fill when still
// empty. Department, job title, location, skills and languages are left out
// on purpose: each one drives other effects in this form when it changes.
const BACKFILLABLE_JOB_FIELDS = [
  'hiringManagers',
  'recruiters',
  'exemptionStatus',
  'exemptMinSalary',
  'exemptMaxSalary',
  'nonExemptMinSalary',
  'nonExemptMaxSalary',
  'referralBonus',
  'openings',
  'minExperience',
  'maxExperience',
  'jobType',
  'jobMode',
  'shift',
  'educationPreference',
] as const;

const EditJobDetail = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isDraft = useIsEditingDraft(id) === true;
  const parsedJobId = asJobId(id);
  const location = useLocation();
  // Prefer value from route state if present, else fallback to backend
  const routeInterviewedCandidateCount = location.state?.interviewedCandidateCount;
  // Set by a bulk JD upload that sent the user to this, its first job.
  const bulkUploadNotice = location.state?.bulkUploadNotice as
    | { draftCount: number; failedFiles: string[] }
    | undefined;
  const [bulkNoticeOpen, setBulkNoticeOpen] = useState(Boolean(bulkUploadNotice));
  const closeBulkNotice = () => {
    setBulkNoticeOpen(false);
    // Not `navigate`: the unsaved-changes blocker would see it. Stops a reload re-showing it.
    window.history.replaceState(
      { ...window.history.state, usr: { ...location.state, bulkUploadNotice: undefined } },
      ''
    );
  };

  const justSavedRef = useRef(false);
  const initialLoadRef = useRef(true);
  // Tells first-load hydration apart from a real department change below.
  const hasHydratedJobTitleDepartmentRef = useRef(false);
  // Ensures loadJobData below reconciles the form only once per job id, not
  // on every later Redux update (which would clobber live edits).
  const hasSyncedFormForJobIdRef = useRef<string | null>(null);

  const { jobDetails, jobOpeningId, interViewRound, aiJobDescription } = useSelector(
    (state: RootState) => ({
      jobDetails: state.EditJobSlice.details,
      interViewRound: state.EditJobSlice.interviewRounds,
      jobOpeningId: state.EditJobSlice.jobOpeningId,
      aiJobDescription: state.EditJobSlice.aiJobDescription,
    }),
    shallowEqual
  );
  const { role, userId } = useSelector((state: RootState) => state.LoginSlice, shallowEqual);
  const effectivePermissions = useEffectivePermissions();
  const refetchEffectivePermissions = useEffectivePermissionsRefetch();
  // Backed by organization:update, job-service's real "manage" permission.
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
  const tenantId = useSessionTenantId();
  const [selectedLocationIdForUsers, setSelectedLocationIdForUsers] = useState<string | undefined>(
    undefined
  );
  const [dismissedUnresolvedAiFields, setDismissedUnresolvedAiFields] = useState<Set<string>>(
    new Set()
  );

  const { data: offices = [], isFetching: loadingOfficesList } = useListTenantOfficesQuery(
    { tenantId: tenantId ?? '' },
    { skip: !tenantId }
  );
  // Location dropdown: only offices this user holds job:update at.
  const officeIdsForPermissionCheck = useMemo(
    () => offices.map((office) => office.office_id),
    [offices]
  );
  const { data: permittedOfficesData, isFetching: loadingPermittedOffices } =
    useGetPermittedOfficesQuery(
      { jobOpeningId: parsedJobId, officeIds: officeIdsForPermissionCheck },
      { skip: !parsedJobId || officeIdsForPermissionCheck.length === 0 }
    );
  const permittedOfficeIds = useMemo(
    () => new Set(permittedOfficesData?.permitted_office_ids ?? []),
    [permittedOfficesData]
  );
  const loadingJobLocations = loadingOfficesList || loadingPermittedOffices;
  const {
    data: orgDepartments = [],
    isFetching: orgDepartmentsLoading,
    refetch: refetchDepartments,
  } = useListTenantDepartmentsQuery(tenantId ?? '', { skip: !tenantId });
  const [addTenantDepartment] = useAddTenantDepartmentMutation();
  const [updateTenantDepartment] = useUpdateTenantDepartmentMutation();
  const [deleteTenantDepartment] = useDeleteTenantDepartmentMutation();
  const [activateTenantDepartment] = useActivateTenantDepartmentMutation();
  const [deactivateTenantDepartment] = useDeactivateTenantDepartmentMutation();
  // organization-service's real culture-intro backend.
  const { data: tenantCultureIntro } = useGetTenantCultureIntroQuery(tenantId ?? '', {
    skip: !tenantId,
  });
  const [createTenantJobTitle] = useCreateTenantJobTitleMutation();
  const [updateTenantJobTitle] = useUpdateTenantJobTitleMutation();
  const [deleteTenantJobTitle] = useDeleteTenantJobTitleMutation();
  const [activateTenantJobTitle] = useActivateTenantJobTitleMutation();
  const [deactivateTenantJobTitle] = useDeactivateTenantJobTitleMutation();
  const [importMasterJobTitle] = useImportMasterJobTitleMutation();
  const [assignTenantJobTitleToDepartment] = useAssignTenantJobTitleToDepartmentMutation();
  const { data: jobTitleCatalogue = [], isFetching: loadingCatalogue } =
    useListTenantJobTitleCatalogueQuery(tenantId ?? '', { skip: !tenantId });
  const { data: tenantJobTitles = [] } = useListTenantJobTitlesQuery(tenantId ?? '', {
    skip: !tenantId,
  });
  const { jobOpeningDropdown: exemptionStatusOptions, loading: exemptionStatusLoading } =
    useJobOpeningDropdown('EXEMPTION_STATUS', 'edit', parsedJobId);
  // Raw shift objects — needed to prefill start/end time when editing.
  // Active-only, unbounded (dropdown consumers need the complete list, not
  // one page of it). A currently-assigned-but-deactivated shift is resolved
  // separately below via a targeted by-id lookup, not this list.
  const { data: organizationShiftsData, isFetching: shiftsLoading } =
    useGetOrganizationShiftsQuery();
  const organizationShifts = organizationShiftsData?.shifts ?? [];
  const { jobOpeningDropdown: languageOptions, loading: languagesLoading } = useJobOpeningDropdown(
    'LANGUAGE',
    'edit',
    parsedJobId
  );
  const {
    jobOpeningDropdown: mandatorySkills,
    loading: mandatorySkillsLoading,
    searchSkills: searchMandatorySkills,
    totalSkillsCount: totalMandatorySkillsCount,
    refetch: refetchMandatorySkills,
  } = useJobOpeningDropdown('MANDATORY_SKILLS', 'edit', parsedJobId);
  const {
    jobOpeningDropdown: optionalSkills,
    loading: optionalSkillsLoading,
    searchSkills: searchOptionalSkills,
    totalSkillsCount: totalOptionalSkillsCount,
    refetch: refetchOptionalSkills,
  } = useJobOpeningDropdown('OPTIONAL_SKILLS', 'edit', parsedJobId);
  const { jobOpeningDropdown: hiringManagers, loading: hiringManagerLoading } =
    useJobOpeningDropdown(
      'HIRING_MANAGER',
      'edit',
      parsedJobId,
      undefined,
      selectedLocationIdForUsers
    );
  const { jobOpeningDropdown: recruiters, loading: recruitersLoading } = useJobOpeningDropdown(
    'RECRUITER',
    'edit',
    parsedJobId,
    undefined,
    selectedLocationIdForUsers
  );

  const [updateJobType] = useUpdateJobTypeMutation();
  const [deleteJobType] = useDeleteJobTypeMutation();
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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [deleteDraftJob, { isLoading: isCancelling }] = useDeleteDraftJobMutation();
  const [showRegenerateConfirmModal, setShowRegenerateConfirmModal] = useState(false);
  const [pendingContinueJobId, setPendingContinueJobId] = useState<string | null>(null);
  const [isAddingToDropdown, setIsAddingToDropdown] = useState<string | null>(null);
  // Local labels for AI-suggested skills the catalogue dropdown hasn't cached yet.
  const [extraSuggestedSkillOptions, setExtraSuggestedSkillOptions] = useState<
    JobOpeningDropdownOption[]
  >([]);
  // Local fallback label for a job title just created, until the list
  // query refetches and picks it up.
  const [extraJobTitleOptions, setExtraJobTitleOptions] = useState<JobOpeningDropdownOption[]>([]);

  const [updateJobOpening, { isLoading: isUpdatingDraft }] = useUpdateJobOpeningMutation();
  const [createOrganizationSkill] = useCreateOrganizationSkillMutation();
  const [updateOrganizationSkill] = useUpdateOrganizationSkillMutation();
  const [deleteOrganizationSkill] = useDeleteOrganizationSkillMutation();
  const [createJobType] = useCreateJobTypeMutation();
  const [createJobMode] = useCreateJobModeMutation();
  const [createEducationPreference] = useCreateEducationPreferenceMutation();
  const [triggerGetJobDescriptionById] = useLazyGetJobDescriptionByIdQuery();
  const { data: jdDetailsForSync } = useGetJobDescriptionByIdQuery(
    { jobOpeningId: parsedJobId },
    { skip: !parsedJobId }
  );
  const [enhanceJd, { isLoading: isRegenerating }] = useEnhanceJdMutation();
  const {
    data: jobData,
    refetch,
    isLoading: isFetchingJobData,
    isFetching: isRefreshingJobData,
    fulfilledTimeStamp: jobDataFetchedAt,
    // isError,
  } = useGetJobOpeningByIdQuery(
    { jobOpeningId: parsedJobId },
    { skip: !parsedJobId, refetchOnMountOrArgChange: true }
  );

  // True while jobData hasn't loaded yet, so this never blocks Save early.
  // Two checks, not one: hasFeatureAccess covers the ROLE ("can this role
  // ever edit a job it's assigned to" — false for recruiter, who is
  // view-only now), isAssignedToJob covers the SPECIFIC job ("is this one of
  // the jobs this person is assigned to"). Recruiter reaching this page
  // directly (e.g. a stale URL) for a job they ARE assigned to must still be
  // blocked — job-service's own permission check would reject the save
  // anyway, but this keeps the form from looking editable in the meantime.
  const canEditThisJob = !jobData
    ? true
    : hasFeatureAccess('job_opening', 'edit', role, effectivePermissions) &&
      isAssignedToJob(
        {
          hiringManagerIds: jobData.details?.hiring_manager_ids,
          recruiterIds: jobData.details?.recruiter_ids,
          createdById: jobData.details?.created_by,
        },
        userId,
        role,
        effectivePermissions
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
    formState: { errors, dirtyFields },
  } = useForm<JobDetailsState>({
    resolver: zodResolver(editJobDetailsSchema) as Resolver<JobDetailsState>,
    defaultValues: {},
  });

  // English is the default communication language while the field is empty
  // (not once interviews have started, when the language is locked).
  const languagesTouchedRef = useRef(false);
  const languagesValue = watch('languages');
  useEffect(() => {
    if (languagesTouchedRef.current || languagesLoading || !jobData?.data) return;
    if (jobData.data.interviewedCandidateCount) return;
    if ((languagesValue ?? []).length > 0) return;
    const english = languageOptions.find((l) => l.name.trim().toLowerCase() === 'english');
    if (english) setValue('languages', [String(english.id)], { shouldDirty: false });
  }, [languagesLoading, languageOptions, languagesValue, jobData, setValue]);

  // A currently-assigned-but-deactivated shift stays visible (flagged
  // isDeleted) via a targeted by-id lookup, fired only when the selected id
  // isn't already in the active list above.
  const selectedShiftId = watch('shift')?.[0];
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

  // Active-only, unbounded job-mode list — same reasoning as shifts above.
  const {
    data: jobModesData,
    isFetching: jobModesInclInactiveLoading,
    refetch: refetchJobModes,
  } = useListOrganizationJobModesQuery();
  const organizationJobModes = jobModesData ?? [];
  const jobModes = organizationJobModes;
  const selectedJobModeId = watch('jobMode')?.[0];
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
  const selectedEducationPreferenceId = watch('educationPreference')?.[0];
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

  // Polls jd/status so AI fields fill in without a manual reload.
  const prevJdStatusForHydrationRef = useRef<string | undefined>(undefined);
  // Tracks which job id the READY fallback has already run for.
  const appliedAiFillJobIdRef = useRef<string | null>(null);
  const { data: jdStatusForHydration, isFetching: jdStatusFetching } = useJdStatusPolling(
    parsedJobId ?? undefined
  );
  // Fields stay disabled until AI has finished parsing/generating the JD -
  // editing mid-parse would just get overwritten the moment it lands.
  const fieldsLocked =
    jdStatusForHydration?.status === 'PROCESSING' || jdStatusForHydration?.status === 'GENERATING';

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

  const selectedDepartmentId = watch('department')?.[0];

  const {
    data: departmentJobTitlesData = [],
    isFetching: jobTitlesLoading,
    refetch: refetchDepartmentJobTitles,
  } = useListTenantDepartmentJobTitlesQuery(
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
    isActive: jt.is_active,
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
        ? departmentJobTitles
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
    catalogueJobTitles,
    debouncedJobTitleSearch,
    departmentJobTitles,
    extraJobTitleOptions,
    selectedDepartmentId,
    tenantJobTitles,
    formValues.jobTitle,
  ]);

  const departments = (() => {
    const activeDepartments = (orgDepartments ?? []).map((department) => ({
      id: department.org_department_id,
      name: department.name,
      isActive: department.is_active,
      isDeleted: false,
    }));

    const selectedDepartments =
      jobData?.data?.department?.map((department: { id: number; departmentName: string }) => ({
        id: department.id,
        name: department.departmentName,
        isActive: true,
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

    return Array.from(departmentOptions.values()).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );
  })();

  const selectedDepartment = departments.find((department) =>
    idsMatch(department.id, selectedDepartmentId)
  );
  const isSelectedDepartmentDeactivated = Boolean(selectedDepartment?.isDeleted);

  const selectedJobTitle = jobTitleOptions.find((jt) => idsMatch(jt.id, selectedJobTitleId));
  const isSelectedJobTitleDeactivated = Boolean(selectedJobTitle?.isDeleted);
  const selectedJobTypeId = watch('jobType')?.[0];

  // AI-suggested skills for the currently selected job title.
  const { data: suggestedSkillsData, refetch: refetchSuggestedSkills } = useGetSuggestedSkillsQuery(
    {
      jobId: id ?? '',
      job_title_id: selectedJobTitleId ? String(selectedJobTitleId) : undefined,
      job_title_text: selectedJobTitle?.name,
    },
    { skip: !id || !selectedJobTitleId || !selectedJobTitle?.name }
  );
  const suggestedSkills = suggestedSkillsData?.skills ?? [];
  // Each suggestion is auto-added once, so a skill the user removes stays removed.
  const offeredSuggestedSkills = useOfferedSuggestedSkills(id ?? '');
  const unaddedSuggestedSkills = suggestedSkills.filter(
    (skill) =>
      !offeredSuggestedSkills.has(String(skill.skill_id)) &&
      !selectedMandatorySkillIds.includes(skill.skill_id) &&
      !selectedOptionalSkillIds.includes(skill.skill_id)
  );

  const handleAddAllSuggestedSkills = () => {
    if (unaddedSuggestedSkills.length === 0) return;
    unaddedSuggestedSkills.forEach((skill) => offeredSuggestedSkills.add(String(skill.skill_id)));
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
    setExtraSuggestedSkillOptions((prev) => [
      ...prev,
      ...unaddedSuggestedSkills.map((skill) => ({ id: skill.skill_id, name: skill.skill_label })),
    ]);
    showToast({
      message: `Added ${unaddedSuggestedSkills.length} AI-suggested skill${unaddedSuggestedSkills.length === 1 ? '' : 's'}`,
      type: 'success',
    });
  };

  useEffect(() => {
    // Selected suggested skills count as offered, so a removal sticks.
    suggestedSkills.forEach((skill) => {
      const id = String(skill.skill_id);
      if (selectedMandatorySkillIds.includes(id) || selectedOptionalSkillIds.includes(id)) {
        offeredSuggestedSkills.add(id);
      }
    });
    if (unaddedSuggestedSkills.length === 0) return;
    handleAddAllSuggestedSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unaddedSuggestedSkills]);

  // Active-only, unbounded job-type list - jobData never carries a real job
  // type name (always blanked by mapJobOpeningToLegacyView), so a fallback
  // built from it can't work. A currently-assigned-but-deactivated job type
  // is resolved separately below via a targeted by-id lookup.
  const {
    data: jobTypesData,
    isFetching: jobTypesInclInactiveLoading,
    refetch: refetchJobTypes,
  } = useListJobTypesQuery({ isMaster: false });
  const organizationJobTypes = jobTypesData ?? [];
  const jobTypes = organizationJobTypes;
  const selectedJobTypeIdStr = selectedJobTypeId != null ? String(selectedJobTypeId) : '';
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

  const jobLocationOptions = (offices ?? [])
    // Permitted offices + whatever's already saved; unfiltered while loading.
    .filter(
      (office) =>
        !permittedOfficesData ||
        permittedOfficeIds.has(office.office_id) ||
        idsMatch(office.office_id, selectedLocationIdForUsers)
    )
    .map((office) => ({
      id: office.office_id,
      name: officeDisplayName(office),
    }))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const cultureInfoText = String(tenantCultureIntro?.intro_text || '').trim();
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

  // No edits means nothing to save, so Save As Draft and Save & Next stay off. A missing
  // description still lets Save & Next run to generate it.
  const jdMissing = jdDetailsForSync !== undefined && !jdDetailsForSync.jobDescription?.trim();
  const nothingToSave = Boolean(initialFormValues) && !isFormDirty && !jdMissing;
  const nothingToSaveHint = 'No changes to save';

  // The job's server data as this form's values — shared by the initial fill
  // (updateFormWithJobData) and the backfill of still-empty fields below.
  const toFormValues = (jobData: any) => {
    const locationData = jobData.data.location;
    const countryName = locationData?.country || '';
    const stateName = locationData?.state || '';
    const resolvedOfficeLocation =
      asLocationId(locationData?.id) !== null
        ? [asLocationId(locationData?.id) as string]
        : jobData.data.officeLocation
            ?.map((item: any) => asLocationId(item?.id ?? item?.city?.id))
            .filter((locationId: string | null): locationId is string => locationId !== null) || [];

    return {
      ...jobData.data,
      jobTitle: catalogIdArray(jobData.data.jobTitle || []),
      jobType: catalogIdArray(jobData.data.jobType || []),
      jobMode: catalogIdArray(jobData.data.jobMode || []),
      department: catalogIdArray(jobData.data.department || []),
      jobProfileCode: jobData.data.jobProfileCode || '',
      country: countryName,
      state: stateName,
      officeLocation: resolvedOfficeLocation,
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
          ? toMoneyString(jobData.data.referralBonus)
          : null,
      shift: jobData.data.shiftId ? [String(jobData.data.shiftId)] : [],
      languages: jobData.data.languages || [],
      openings: jobData.data.openings ? Number(jobData.data.openings) : null,
      exemptMinSalary:
        jobData.data.exemptMinSalary != null ? toMoneyString(jobData.data.exemptMinSalary) : null,
      exemptMaxSalary:
        jobData.data.exemptMaxSalary != null ? toMoneyString(jobData.data.exemptMaxSalary) : null,
      nonExemptMinSalary:
        jobData.data.nonExemptMinSalary != null
          ? toMoneyString(jobData.data.nonExemptMinSalary)
          : null,
      nonExemptMaxSalary:
        jobData.data.nonExemptMaxSalary != null
          ? toMoneyString(jobData.data.nonExemptMaxSalary)
          : null,
      exemptionStatus: [
        ...(jobData.data.exemptMinSalary != null || jobData.data.exemptMaxSalary != null
          ? ['true']
          : []),
        ...(jobData.data.nonExemptMinSalary != null || jobData.data.nonExemptMaxSalary != null
          ? ['false']
          : []),
      ],
      minExperience: jobData.data.minExperience != null ? Number(jobData.data.minExperience) : null,
      maxExperience: jobData.data.maxExperience != null ? Number(jobData.data.maxExperience) : null,
      responsibilities: jobData.data.responsibilities || '',
      educationPreference:
        jobData.data.educationPreference?.map((edu: { id: number }) => edu.id) || [],
      mandatorySkills: jobData.data.mandatorySkills?.map((skill: { id: number }) => skill.id) || [],
      optionalSkills: jobData.data.optionalSkills?.map((skill: { id: number }) => skill.id) || [],
      otherRequirements: jobData.data.otherRequirements || '',
      benefits: jobData.data.benefits || '',
      useCultureIntro: Boolean(jobData.data.useCultureIntro),
    };
  };

  // Helper function to update form with job data
  const updateFormWithJobData = (jobData: any) => {
    if (!jobData?.data) return;

    dispatch(setEditJobOpeningId(asJobId(jobData.data.id)));
    dispatch(setAtsJobOpeningId(jobData.data.atsJobOpeningId || ''));

    const processedData = toFormValues(jobData);

    const descriptionData = {
      educationPreference:
        jobData.data.educationPreference?.map((edu: { id: number }) => edu.id) || [],
      communicationSkills: jobData.data.communicationSkills || '',
      mandatorySkills: jobData.data.mandatorySkills?.map((skill: { id: number }) => skill.id) || [],
      optionalSkills: jobData.data.optionalSkills?.map((skill: { id: number }) => skill.id) || [],
      responsibilities: jobData.data.responsibilities || '',
      otherRequirements: jobData.data.otherRequirements || '',
      benefits: jobData.data.benefits || '',
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
      // Reconcile the form from Redux/the backend once per job id.
      if (hasSyncedFormForJobIdRef.current === parsedJobId) return;
      hasSyncedFormForJobIdRef.current = parsedJobId;

      // Preserve in-progress edits when navigating between steps in the same edit session.
      if (jobOpeningId === parsedJobId && jobDetails?.jobProfileCode) {
        // Language selection always follows the backend value once interviews have started.
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
          const { data, error } = await refetch();
          if (data?.data) {
            updateFormWithJobData(data);
          } else if (error) {
            showToast({
              message: getJobErrorMessage(error, 'Could not load this job - please refresh.'),
              type: 'error',
            });
          }
        } catch (error) {
          console.error('Failed to fetch job data:', error);
          showToast({ message: 'Could not load this job - please refresh.', type: 'error' });
        }
      }
    };

    loadJobData();

    return () => {
      justSavedRef.current = false;
      initialLoadRef.current = true;
    };
  }, [parsedJobId, jobOpeningId, jobDetails, reset]);

  // The fill above runs once per job, from whatever was on hand first — the
  // Redux edit copy, or job data already cached — and the fresh server copy
  // that lands right after (refetchOnMountOrArgChange) was never applied, so
  // any field that first source lacked stayed blank (intermittently: it
  // depended on what was on hand). Fills only fields still EMPTY and
  // untouched from each fresh copy; a value already shown or typed is never
  // replaced. Limited to fields with no follow-on effects of their own
  // (department/job title/location/skills/languages each drive other logic).
  const backfilledAtRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!parsedJobId || hasSyncedFormForJobIdRef.current !== parsedJobId) return;
    if (justSavedRef.current || isRefreshingJobData || !jobDataFetchedAt) return;
    if (!jobData?.data || asJobId(jobData.data.id) !== parsedJobId) return;
    if (backfilledAtRef.current === jobDataFetchedAt) return;
    backfilledAtRef.current = jobDataFetchedAt;

    const fresh = toFormValues(jobData) as Record<string, unknown>;
    const current = getValues() as Record<string, unknown>;
    const isEmpty = (value: unknown) =>
      value == null || value === '' || (Array.isArray(value) && value.length === 0);
    const filled: Record<string, unknown> = {};
    BACKFILLABLE_JOB_FIELDS.forEach((field) => {
      if (!isEmpty(current[field]) || isEmpty(fresh[field])) return;
      if ((dirtyFields as Record<string, unknown>)[field]) return;
      filled[field] = fresh[field];
    });
    if (Object.keys(filled).length === 0) return;

    Object.entries(filled).forEach(([field, value]) =>
      setValue(field as keyof JobDetailsState, value as never, { shouldDirty: false })
    );
    // Part of the loaded baseline, not an edit: no unsaved-changes prompt.
    setInitialFormValues((prev: Record<string, unknown> | null) =>
      prev ? { ...prev, ...filled } : prev
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedJobId, jobData, jobDataFetchedAt, isRefreshingJobData, jobDetails]);

  // Pre-fills Job Details from an uploaded JD once its parse finishes. Generating or
  // regenerating the AI description never writes into Job Details.
  useEffect(() => {
    if (jdStatusFetching) return;
    const previousStatus = prevJdStatusForHydrationRef.current;
    const currentStatus = jdStatusForHydration?.status;
    prevJdStatusForHydrationRef.current = currentStatus;

    const justFinishedProcessing = previousStatus === 'PROCESSING' && currentStatus === 'READY';
    // Fallback: refresh once per job the first time status is seen READY,
    // in case the transition above was missed.
    const notYetSyncedThisJob =
      currentStatus === 'READY' && appliedAiFillJobIdRef.current !== parsedJobId;
    if ((!justFinishedProcessing && !notYetSyncedThisJob) || !parsedJobId) return;
    appliedAiFillJobIdRef.current = parsedJobId;

    // Refetch suggested skills now that JD parsing is done, if that query has started.
    if (id && selectedJobTitleId && selectedJobTitle?.name) {
      void refetchSuggestedSkills();
    }

    // Re-check permissions now rather than waiting for the next mount.
    void refetchEffectivePermissions();

    if (jdDetailsForSync?.entryPath !== 'upload_jd') return;

    // Job title/department/office location aren't AI-composed text — job-service
    // resolves them against the org catalogue directly on the job opening record
    // while parsing an uploaded JD, so they only arrive via a GetJobOpeningById
    // refetch, not the `/jd` details endpoint above. Without this, they stayed
    // blank until the recruiter manually refreshed the page.
    void Promise.all([triggerGetJobDescriptionById({ jobOpeningId: parsedJobId }), refetch()]).then(
      ([jdResult, jobResult]) => {
        const fresh = jdResult.data;
        const freshJobDetails = jobResult.data?.data;

        const current = getValues();
        let appliedAnything = false;

        if (freshJobDetails) {
          if (!current.department || current.department.length === 0) {
            const freshDepartment = catalogIdArray(freshJobDetails.department || []);
            if (freshDepartment.length > 0) {
              setValue('department', freshDepartment, { shouldValidate: true });
              appliedAnything = true;
            }
          }
          if (!current.jobTitle || current.jobTitle.length === 0) {
            const freshJobTitle = catalogIdArray(freshJobDetails.jobTitle || []);
            if (freshJobTitle.length > 0) {
              setValue('jobTitle', freshJobTitle, { shouldValidate: true });
              appliedAnything = true;
            }
          }
          if (!current.officeLocation || current.officeLocation.length === 0) {
            const freshLocationData = freshJobDetails.location;
            const freshOfficeLocation =
              asLocationId(freshLocationData?.id) !== null
                ? [asLocationId(freshLocationData?.id) as string]
                : (freshJobDetails.officeLocation ?? [])
                    .map((item: any) => asLocationId(item?.id ?? item?.city?.id))
                    .filter((locId: string | null): locId is string => locId !== null);
            if (freshOfficeLocation.length > 0) {
              setValue('officeLocation', freshOfficeLocation, { shouldValidate: true });
              setValue('country', freshLocationData?.country || '', { shouldValidate: true });
              setValue('state', freshLocationData?.state || '', { shouldValidate: true });
              appliedAnything = true;
            }
          }
        }

        if (!fresh) {
          if (appliedAnything) {
            showToast({
              message:
                'Some fields were pre-filled from your job description - review before saving.',
              type: 'success',
            });
          }
          return;
        }
        if (
          fresh.responsibilities &&
          fresh.responsibilities !== current.responsibilities &&
          !dirtyFields.responsibilities
        ) {
          setValue('responsibilities', fresh.responsibilities, { shouldValidate: true });
          appliedAnything = true;
        }
        if (
          fresh.otherRequirements &&
          fresh.otherRequirements !== current.otherRequirements &&
          !dirtyFields.otherRequirements
        ) {
          setValue('otherRequirements', fresh.otherRequirements, { shouldValidate: true });
          appliedAnything = true;
        }
        if (fresh.benefits && fresh.benefits !== current.benefits && !dirtyFields.benefits) {
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
          setValue('exemptMinSalary', toMoneyString(fresh.exemptMinSalary), {
            shouldValidate: true,
          });
          const currentStatus = getValues('exemptionStatus') ?? [];
          if (!currentStatus.includes('true')) {
            setValue('exemptionStatus', [...currentStatus, 'true'], { shouldValidate: true });
          }
          appliedAnything = true;
        }
        if (fresh.exemptMaxSalary != null && !current.exemptMaxSalary) {
          setValue('exemptMaxSalary', toMoneyString(fresh.exemptMaxSalary), {
            shouldValidate: true,
          });
          appliedAnything = true;
        }
        if (fresh.nonExemptMinSalary != null && !current.nonExemptMinSalary) {
          setValue('nonExemptMinSalary', toMoneyString(fresh.nonExemptMinSalary), {
            shouldValidate: true,
          });
          const currentStatus = getValues('exemptionStatus') ?? [];
          if (!currentStatus.includes('false')) {
            setValue('exemptionStatus', [...currentStatus, 'false'], { shouldValidate: true });
          }
          appliedAnything = true;
        }
        if (fresh.nonExemptMaxSalary != null && !current.nonExemptMaxSalary) {
          setValue('nonExemptMaxSalary', toMoneyString(fresh.nonExemptMaxSalary), {
            shouldValidate: true,
          });
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
            if (offeredSuggestedSkills.has(id)) continue;
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
            setExtraSuggestedSkillOptions((prev) => [...prev, ...newOptions]);
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
            message:
              'Some fields were pre-filled from your job description - review before saving.',
            type: 'success',
          });
        }
      }
    );
  }, [
    jdStatusForHydration?.status,
    jdStatusFetching,
    parsedJobId,
    jdDetailsForSync?.entryPath,
    triggerGetJobDescriptionById,
    refetch,
    refetchSuggestedSkills,
    refetchEffectivePermissions,
    getValues,
    setValue,
    trigger,
  ]);

  // Uploaded-JD jobs only: fills fields still blank from the parse, never a typed value.
  useEffect(() => {
    if (!jdDetailsForSync || jdDetailsForSync.entryPath !== 'upload_jd') return;
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
    } = diffAiOwnedFields(jdDetailsForSync, {
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
      jdDetailsForSync.skills,
      currentMandatory,
      currentOptional,
      offeredSuggestedSkills.has
    );
    [...newMandatoryIds, ...newOptionalIds].forEach(offeredSuggestedSkills.add);
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
    // HM dropdown re-filters on location change; a stale pick is caught by validation.
  };

  useEffect(() => {
    if (!selectedLocationDetails) return;

    setValue('country', selectedLocationDetails.country ?? '', { shouldValidate: true });
    setValue('state', selectedLocationDetails.state ?? '', { shouldValidate: true });
  }, [selectedLocationDetails, setValue]);

  /**
   * Job title requires a department: clears the title if none is selected,
   * restores it once a matching department is picked. The clear rule skips
   * the effect's first run, so an AI-filled title with no department yet
   * survives page load.
   */
  useEffect(() => {
    if (jobTitlesLoading || loadingCatalogue) return;

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
        departmentJobTitles.some((jt) => idsMatch(jt.id, titleId)) ||
        jobTitleCatalogue.some((jt) => idsMatch(jt.job_title_id, titleId))
    );

    if (validJobTitleIds.length !== currentJobTitleIds.length) {
      setValue('jobTitle', validJobTitleIds, { shouldValidate: true });
    }
  }, [
    selectedDepartmentId,
    departmentJobTitles,
    jobTitleCatalogue,
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
                isMaster: false,
              }).unwrap();
            } else {
              await importMasterJobTitle({
                tenantId,
                master_job_title_id: existingTitleFormId,
                department_id: String(selectedDepartmentId),
                isMaster: false,
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
        }).unwrap();

        showToast({
          message: 'Job Title added successfully',
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
        const currentSkillIds = (watch(addType) || []).map(String);
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
          setValue(addType, [...currentSkillIds, existingSkill.id], { shouldValidate: true });
          return;
        }
        const createdSkill = await createOrganizationSkill({ skill: formattedValue }).unwrap();
        // Refetch before setValue so the new option exists in `options`; otherwise
        // the label briefly renders as a raw uuid.
        await (addType === 'mandatorySkills' ? refetchMandatorySkills() : refetchOptionalSkills());
        setValue(addType, [...currentSkillIds, createdSkill.skill_id], { shouldValidate: true });
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
        const createdJobType = await createJobType({
          job_type_name: formattedValue,
          isMaster: false,
        }).unwrap();
        await refetchJobTypes?.();
        setValue('jobType', [createdJobType.id], { shouldValidate: true });
        showToast({ message: 'Job Type added successfully', type: 'success' });
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
        showToast({ message: 'Job Location added successfully', type: 'success' });
        return;
      }
    } catch (err) {
      showToast({
        message: getJobErrorMessage(err, 'Something went wrong while updating dropdown.'),
        type: 'error',
      });
    } finally {
      setIsAddingToDropdown(null);
      setOpenModalFor(null);
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
    jobType: 'Job Type',
    jobMode: 'Job Location',
    shift: 'Shift',
    educationPreference: 'Education preference',
    mandatorySkills: 'Skill',
    optionalSkills: 'Skill',
    department: 'Department',
    jobTitle: 'Job Title',
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
            ? activateTenantDepartment({ tenantId: tenantId ?? '', departmentId: optionId })
            : deactivateTenantDepartment({ tenantId: tenantId ?? '', departmentId: optionId })
        ).unwrap();
        refetchDepartments?.();
      } else if (type === 'jobTitle') {
        await (
          nextActive
            ? activateTenantJobTitle({ tenantId: tenantId ?? '', jobTitleId: optionId })
            : deactivateTenantJobTitle({ tenantId: tenantId ?? '', jobTitleId: optionId })
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
        }).unwrap();

        showToast({
          message: 'Job Title updated successfully',
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
          isMaster: false,
        }).unwrap();
        showToast({ message: 'Job Type updated successfully', type: 'success' });
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
        showToast({ message: 'Job Location updated successfully', type: 'success' });
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
        }).unwrap();

        showToast({
          message: 'Job Title removed successfully',
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
      if (Array.isArray(currentValue) && currentValue.some((value) => idsMatch(value, id))) {
        setValue(type as keyof JobDetailsState, [], { shouldValidate: true });
      } else if (idsMatch(currentValue, id)) {
        setValue(type as keyof JobDetailsState, null, { shouldValidate: true });
      }
    };

    if (type === 'jobType') {
      try {
        await deleteJobType({ jobTypeId: String(id), isMaster: false }).unwrap();
        showToast({ message: 'Job Type removed successfully', type: 'success' });
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
        showToast({ message: 'Job Location removed successfully', type: 'success' });
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
      if (String(watch('shift')?.[0]) === String(id)) {
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
  // Dismissal is keyed by job id + field, not just field - otherwise
  // dismissing "shift" on one job would silently hide it for every other
  // job in the same browser session too.
  const visibleUnresolvedAiSuggestions = Object.entries(
    jobData?.data?.unresolvedAiSuggestions ?? {}
  ).filter(([fieldKey]) => {
    if (dismissedUnresolvedAiFields.has(`${parsedJobId}:${fieldKey}`)) return false;
    const formField = UNRESOLVED_AI_FIELD_TO_FORM_FIELD[fieldKey];
    if (!formField) return true;
    const currentValue = watch(formField);
    const isFilled = Array.isArray(currentValue) ? currentValue.length > 0 : !!currentValue;
    return !isFilled;
  });

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

  const handleConfirmCancel = async () => {
    setAllowNavigation(true);
    if (parsedJobId) {
      try {
        await deleteDraftJob(parsedJobId).unwrap();
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

  const goToDescriptionPage = (jobId: string) => {
    const finalAiJobDescription = {
      id: jobId,
      jobDescription: aiJobDescription.jobDescription || '',
      jobOpeningId: jobId,
    };
    dispatch(updateEditAiJobDescription(finalAiJobDescription));
    setAllowNavigation(true);
    navigate(`/jobs/edit/${id}/AiJobDescription/${finalAiJobDescription.id}`);
  };

  // Details changed on a job that has a description: Regenerate, Keep Current, or X to stay here.
  const [detailsChangedJobId, setDetailsChangedJobId] = useState<string | null>(null);

  const handleKeepCurrentJd = (stayOnPage: boolean) => {
    const jobId = detailsChangedJobId;
    setDetailsChangedJobId(null);
    if (stayOnPage || !jobId) {
      setAllowNavigation(false);
      return;
    }
    goToDescriptionPage(jobId);
  };

  const handleRegenerateAfterChange = async () => {
    const jobId = detailsChangedJobId;
    if (!jobId) return;
    try {
      await enhanceJd({ jobOpeningId: jobId, regenerate: true }).unwrap();
      showToast({ message: 'Regenerating the AI description', type: 'success' });
    } catch (enhanceError) {
      showToast({
        message: getJobErrorMessage(
          enhanceError,
          'Could not start regeneration - use Regenerate on the next step.'
        ),
        type: 'warning',
      });
    }
    setDetailsChangedJobId(null);
    goToDescriptionPage(jobId);
  };

  const handleCancelRegenerate = () => {
    if (!pendingContinueJobId) return;
    const jobId = pendingContinueJobId;
    setShowRegenerateConfirmModal(false);
    setPendingContinueJobId(null);
    goToDescriptionPage(jobId);
  };

  const handleConfirmRegenerate = async () => {
    if (!pendingContinueJobId) return;
    const jobId = pendingContinueJobId;
    try {
      await enhanceJd({ jobOpeningId: jobId, regenerate: true }).unwrap();
      showToast({ message: 'Regenerating the AI description', type: 'success' });
    } catch (enhanceError) {
      showToast({
        message: getJobErrorMessage(
          enhanceError,
          'Could not start regeneration - use Regenerate on the next step.'
        ),
        type: 'warning',
      });
    }
    setShowRegenerateConfirmModal(false);
    setPendingContinueJobId(null);
    goToDescriptionPage(jobId);
  };

  const onSubmit = async (data: JobDetailsState) => {
    setAllowNavigation(true);

    // Ensure the language selection cannot be changed if interviews have started
    const hasInterviewsStarted = jobData?.data?.interviewedCandidateCount !== 0;
    const languagesValue = hasInterviewsStarted
      ? (jobData?.data?.languages ?? [])
      : (data.languages ?? []);

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
      benefits: data.benefits,
      responsibilities: data.responsibilities,
    };

    try {
      const jobId = parsedJobId || asJobId(jobOpeningId);

      // Snapshot for the regenerate check below; best-effort.
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
      dispatch(updateEditJobDetails(payload));
      dispatch(updateEditJobDescription(jobDescriptionPayload));
      dispatch(updateEditInterviewRounds(interViewRound));

      const isUploadedJdPath =
        jdBeforeSave?.source === 'UPLOADED' || jdBeforeSave?.entryPath === 'upload_jd';
      if (isUploadedJdPath && jdBeforeSave?.jobDescription?.trim()) {
        setPendingContinueJobId(jobId);
        setShowRegenerateConfirmModal(true);
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
      // No description yet (for example a blocked generation): generate it now.
      const jdIsEmpty = jdBeforeSave !== undefined && !jdBeforeSave.jobDescription?.trim();
      // Details changed on a job that already has a description: ask before regenerating.
      if (
        !jdIsEmpty &&
        jdBeforeSave?.jobDescription &&
        haveDescriptionInputsChanged(descriptionInputs, jdBeforeSave)
      ) {
        setDetailsChangedJobId(jobId);
        return;
      }
      if (jdIsEmpty) {
        try {
          await enhanceJd({ jobOpeningId: jobId, regenerate: true }).unwrap();
          showToast({
            message: 'Generating the AI description',
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

      goToDescriptionPage(jobId);
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
      {(isFetchingJobData || isUpdatingDraft || isRegenerating) && <Loader />}
      <Form
        layout="vertical"
        onFinish={handleSubmit(onSubmit, (invalidFields) => {
          showToast({
            message: 'Please fill all required fields before saving.',
            type: 'error',
          });
          scrollToFirstFormError(invalidFields, JOB_DETAILS_FIELD_ORDER);
        })}
        autoComplete="off"
      >
        {visibleUnresolvedAiSuggestions.length > 0 && (
          <div className="mt-2 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            {visibleUnresolvedAiSuggestions.map(([fieldKey, guess]) => {
              const canAddThisField = canAddUnresolvedField(fieldKey);
              return (
                <div key={fieldKey} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-amber-900">
                    <span className="mr-1.5">⚠️</span>
                    <strong>{UNRESOLVED_AI_FIELD_LABELS[fieldKey] ?? fieldKey}:</strong> the job
                    description mentions &quot;{guess}&quot;, but that isn&apos;t set up in your
                    organization&apos;s catalogue yet.{' '}
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
                        onClick={() => handleCreateFromUnresolvedSuggestion(fieldKey, guess)}
                      >
                        Create It
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setDismissedUnresolvedAiFields((prev) =>
                          new Set(prev).add(`${parsedJobId}:${fieldKey}`)
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
              Let AI fill in the parsed fields below from your job description. Fields will unlock
              automatically once it&apos;s done.
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
              <Controller
                name="jobProfileCode"
                control={control}
                disabled
                render={({ field }) => (
                  <Input
                    {...field}
                    id="field-jobProfileCode"
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
              <div id="field-department">
                <DropdownWithAddOption
                  className={`w-full custom-select-jobs placeholder-style ${
                    isSelectedDepartmentDeactivated
                      ? '[&_.ant-select-selection-item]:!text-gray-400'
                      : ''
                  }`}
                  value={watch('department')?.[0]}
                  onChange={(value) => {
                    setValue('department', value ? [value] : [], { shouldValidate: true });
                    setValue('jobTitle', []);
                    setJobTitleSearchText('');
                    setDebouncedJobTitleSearch('');
                  }}
                  options={departments}
                  loading={orgDepartmentsLoading || isAddingToDropdown === 'department'}
                  disabled={fieldsLocked}
                  placeholder="Select Department"
                  label="Department"
                  onAddOption={
                    canAddDepartment ? (value) => handleAddOption(value, 'department') : undefined
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
                  className={`w-full custom-select-jobs placeholder-style ${
                    isSelectedJobTitleDeactivated
                      ? '[&_.ant-select-selection-item]:!text-gray-400'
                      : ''
                  }`}
                  value={watch('jobTitle')?.[0]}
                  onChange={handleJobTitleChange}
                  onSearchChange={setJobTitleSearchText}
                  options={jobTitleOptions}
                  loading={
                    jobTitlesLoading || loadingCatalogue || isAddingToDropdown === 'jobTitle'
                  }
                  placeholder={
                    !selectedDepartmentId && !debouncedJobTitleSearch
                      ? 'Please select a department first'
                      : 'Select Job Title'
                  }
                  disabled={fieldsLocked}
                  label="Job Title"
                  onAddOption={
                    canAddJobTitle ? (value) => handleAddOption(value, 'jobTitle') : undefined
                  }
                  type="jobTitle"
                  error={errors.jobTitle?.message}
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
                  value={watch('jobType')?.[0]}
                  onChange={(value) => {
                    setValue('jobType', value ? [value] : [], { shouldValidate: true });
                  }}
                  options={jobTypeOptions}
                  loading={jobTypesInclInactiveLoading || isAddingToDropdown === 'jobType'}
                  disabled={fieldsLocked}
                  placeholder="Select Job Type"
                  label="Job Type"
                  onAddOption={
                    canManageJobCatalogues
                      ? (value) => handleAddOption(value, 'jobType')
                      : undefined
                  }
                  type="jobType"
                  error={errors.jobType?.message}
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
                  value={watch('jobMode')?.[0]}
                  onChange={(value) => {
                    setValue('jobMode', value ? [value] : [], { shouldValidate: true });
                  }}
                  options={jobModeOptions}
                  loading={jobModesInclInactiveLoading || isAddingToDropdown === 'jobMode'}
                  disabled={fieldsLocked}
                  placeholder="Select Job Location"
                  label="Job Location"
                  onAddOption={
                    canManageJobCatalogues
                      ? (value) => handleAddOption(value, 'jobMode')
                      : undefined
                  }
                  type="jobMode"
                  error={errors.jobMode?.message}
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
                value={watch('shift')?.[0]}
                onChange={(value) => {
                  setValue('shift', value ? [value] : [], { shouldValidate: true });
                }}
                options={shiftOptions}
                loading={shiftsLoading}
                disabled={fieldsLocked}
                placeholder="Select Shift"
                label="Shift"
                type="shift"
                enableEditDelete={canDeleteJobCatalogues}
                onAddOption={
                  canManageJobCatalogues ? (value) => handleAddShiftOption(value) : undefined
                }
                onEditOption={
                  canDeleteJobCatalogues ? (id) => handleEditShiftOption(id) : undefined
                }
                onDeleteOption={canDeleteJobCatalogues ? (id) => handleDeleteShift(id) : undefined}
                onReuseOption={canDeleteJobCatalogues ? handleReuseOption : undefined}
                onToggleActive={canDeleteJobCatalogues ? handleToggleActive : undefined}
              />
              {errors.shift && (
                <p className="text-red-500 text-sm mt-1">{errors.shift?.message as string}</p>
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
                      <div className="border-wrapper dropdown-focus-ring border border-[var(--border)] p-1 w-full rounded-3xl relative">
                        <Select
                          mode="multiple"
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          variant="borderless"
                          disabled={isDisabled || fieldsLocked}
                          placeholder="Select Languages"
                          className="w-full custom-select-jobs placeholder-style"
                          loading={languagesLoading}
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
                    </Tooltip>
                  );
                }}
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
                checked={Boolean(watch('useCultureIntro'))}
                onChange={(checked) => {
                  setValue('useCultureIntro', checked, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
                disabled={!hasCultureInfo || fieldsLocked}
                className="culture-switch"
              />
              <span className="text-sm text-gray-700 leading-5">
                Play Company Culture Introduction at the start of AI Audio Screening and AI Video
                Interview
              </span>
            </div>
          </div>
        </div>
        {/* Location */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-2">
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
                      {omittedValues.length} of {hiringManagers.length} hiring managers selected
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
                                (id) => !idsMatch(id, manager.id)
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
              <Controller
                name="openDate"
                control={control}
                render={({ field }) => (
                  <div
                    id="field-openDate"
                    className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl"
                  >
                    <DatePicker
                      {...field}
                      value={field.value ? parseFormDate(field.value) : null}
                      onChange={(date) => {
                        const formattedDate = date ? date.format('DD-MM-YYYY') : '';
                        setValue('openDate', formattedDate, { shouldValidate: true });
                      }}
                      variant="borderless"
                      className="w-full custom-date-picker placeholder-style"
                      format="MMM D, YYYY"
                      placeholder="Select Open Date"
                      disabledDate={(current) =>
                        current && current.isBefore(dayjs().startOf('day'))
                      }
                      disabled={fieldsLocked}
                    />
                  </div>
                )}
              />
              {errors.openDate && (
                <p className="text-red-500 text-sm mt-1">{errors.openDate.message}</p>
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
                      value={field.value ? parseFormDate(field.value) : null}
                      onChange={(date) => {
                        const formattedDate = date ? date.format('DD-MM-YYYY') : '';
                        setValue('closeDate', formattedDate, { shouldValidate: true });
                      }}
                      variant="borderless"
                      className="w-full custom-date-picker placeholder-style"
                      format="MMM D, YYYY"
                      placeholder="Select Close Date"
                      disabledDate={(current) =>
                        current && current.isBefore(dayjs().startOf('day'))
                      }
                      disabled={fieldsLocked}
                    />
                  </div>
                )}
              />
              {errors.closeDate && (
                <p className="text-red-500 text-sm mt-1">{errors.closeDate.message}</p>
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
                id="field-openings"
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
                disabled={fieldsLocked}
              />
              {errors.openings && (
                <p className="text-red-500 text-sm mt-1">{errors.openings.message}</p>
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
                    <Controller
                      name="exemptMinSalary"
                      control={control}
                      render={() => (
                        <CurrencyInput
                          id="field-exemptMinSalary"
                          value={watch('exemptMinSalary') ?? ''}
                          onValueChange={(value) => {
                            setValue('exemptMinSalary', value ?? null, { shouldValidate: true });
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
                      )}
                    />
                    {errors.exemptMinSalary && (
                      <p className="text-red-500 text-sm mt-1">{errors.exemptMinSalary.message}</p>
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
                      name="exemptMaxSalary"
                      control={control}
                      render={() => (
                        <CurrencyInput
                          id="field-exemptMaxSalary"
                          value={watch('exemptMaxSalary') ?? ''}
                          onValueChange={(value) => {
                            setValue('exemptMaxSalary', value ?? null, { shouldValidate: true });
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
                      )}
                    />
                    {errors.exemptMaxSalary && (
                      <p className="text-red-500 text-sm mt-1">{errors.exemptMaxSalary.message}</p>
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
                    <Controller
                      name="nonExemptMinSalary"
                      control={control}
                      render={() => (
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
                      )}
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
                    <Controller
                      name="nonExemptMaxSalary"
                      control={control}
                      render={() => (
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
                      )}
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
        <div className="form-grid-equal-labels grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 mt-2">
          <Form.Item label={<span>Referral Bonus (in USD)</span>}>
            <Controller
              name="referralBonus"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  value={field.value ?? ''}
                  onValueChange={(value) => {
                    field.onChange(Number(value) ? value : null);
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
                const numValue = value === '' ? null : Math.max(0, Math.min(50, Number(value)));
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
                const numValue = value === '' ? null : Math.max(0, Math.min(50, Number(value)));
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
        <div className="mt-2">
          <div className="w-full">
            <span className="text-lg font-semibold">Job Skills</span>
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
                  loading={mandatorySkillsLoading || isAddingToDropdown === 'mandatorySkills'}
                  mode="multiple"
                  placeholder="Select Required Skills"
                  label="Required Skills"
                  onAddOption={
                    canAddSkill ? (value) => handleAddOption(value, 'mandatorySkills') : undefined
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
                                (id) => !idsMatch(id, skill.id)
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
                    canAddSkill ? (value) => handleAddOption(value, 'optionalSkills') : undefined
                  }
                  onSearchChange={searchOptionalSkills}
                  type="optionalSkills"
                  disabled={fieldsLocked}
                  error={errors.optionalSkills?.message as string | undefined}
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
                                (id) => !idsMatch(id, skill.id)
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
                      formatter: ({ count, maxLength }) => `${count}/${maxLength} characters`,
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
                      formatter: ({ count, maxLength }) => `${count}/${maxLength} characters`,
                    }}
                    className="w-full px-4 py-2 border rounded-lg"
                    disabled={fieldsLocked}
                  />
                )}
              />
              {errors.otherRequirements && (
                <p className="text-red-500 text-sm mt-1">{errors.otherRequirements.message}</p>
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
                      formatter: ({ count, maxLength }) => `${count}/${maxLength} characters`,
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
        {!canEditThisJob && (
          <p className="text-center text-red-500 text-sm mt-4">
            You don&apos;t have permission to edit this job.
          </p>
        )}
        <div className="flex items-center justify-center mt-6 gap-6">
          {isDraft && (
            <Tooltip
              title={nothingToSave ? nothingToSaveHint : 'Save progress and come back later.'}
            >
              <span className="inline-flex">
                <Button
                  type="button"
                  className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => onSaveDraft(watch())}
                  disabled={isUpdatingDraft || !canEditThisJob || nothingToSave}
                >
                  Save As Draft
                </Button>
              </span>
            </Tooltip>
          )}
          {isDraft && (
            <Tooltip title="Delete this job opening and everything in it.">
              <Button
                type="button"
                className="text-white bg-gray-400 hover:bg-gray-500 rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
                onClick={() => setShowCancelConfirm(true)}
              >
                Cancel
              </Button>
            </Tooltip>
          )}
          <Tooltip title={nothingToSave ? nothingToSaveHint : 'Save this page and continue.'}>
            <span className="inline-flex">
              <Button
                type="button"
                className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmit(onSubmit, (invalidFields) => {
                  showToast({
                    message: 'Please fill all required fields before saving.',
                    type: 'error',
                  });
                  scrollToFirstFormError(invalidFields, JOB_DETAILS_FIELD_ORDER);
                })}
                disabled={isFetchingJobData || !canEditThisJob || nothingToSave}
              >
                Save & Next
              </Button>
            </span>
          </Tooltip>
        </div>
      </Form>
      <Modal
        open={bulkNoticeOpen && Boolean(bulkUploadNotice)}
        title="Bulk upload complete"
        onOk={closeBulkNotice}
        onCancel={closeBulkNotice}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="Got it"
        centered
      >
        <p>
          You are starting with the first job from your upload.
          {bulkUploadNotice && bulkUploadNotice.draftCount > 0
            ? ` The other ${bulkUploadNotice.draftCount} ${bulkUploadNotice.draftCount === 1 ? 'job was' : 'jobs were'} saved as drafts. Find ${bulkUploadNotice.draftCount === 1 ? 'it' : 'them'} on the Job Openings page.`
            : ''}
        </p>
        {bulkUploadNotice && bulkUploadNotice.failedFiles.length > 0 && (
          <p className="text-red-600">
            {`${bulkUploadNotice.failedFiles.length} file(s) could not be processed: ${bulkUploadNotice.failedFiles.join(', ')}.`}
          </p>
        )}
      </Modal>
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
      {detailsChangedJobId && (
        <ConfirmationModal
          onClose={(close) => handleKeepCurrentJd(close === true)}
          onConfirm={handleRegenerateAfterChange}
          title="You have made changes to the job details. Would you like to regenerate the Job Description using AI?"
          confirmText="Regenerate"
          cancelText="Keep Current"
          isLoading={isRegenerating}
        />
      )}
      {showRegenerateConfirmModal && (
        <ConfirmationModal
          onClose={handleCancelRegenerate}
          onConfirm={handleConfirmRegenerate}
          title="Would you like to regenerate the Job Description using AI, or use the current uploaded Job Description?"
          confirmText="AI-Regenerate"
          cancelText="Use Uploaded JD"
          isLoading={isRegenerating}
        />
      )}
    </>
  );
};

export default memo(EditJobDetail);
