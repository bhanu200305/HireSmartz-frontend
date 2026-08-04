import MainLayout from '../../../layouts/MainLayout';
import './addJob.css';
import { InfoCircleOutlined } from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';
import { DatePicker, Form, Select, Switch, TimePicker, Tooltip, Input as AntInput } from 'antd';
import { Button, Input, showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import JobDetailsLayout from '../../../layouts/JobDetailsLayout';
import useJobOpeningDropdown from '../../../hooks/useJobOpeningDropdown';
import dayjs from 'dayjs';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { RootState } from '../../../redux/provider/store';
import { useDispatch, useSelector } from 'react-redux';
import { JobDetailsState, SaveJobOpeningRequest } from '../../../types';
import { zodResolver } from '@hookform/resolvers/zod';
import { jobDetailsDraftSchema, jobDetailsSchema } from './AddJobSchema';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  setAiJobDescriptionId,
  setJobOpeningId,
  updateJobDescription,
  updateJobDetails,
} from '../../../redux/slices/jobOpeningSlice';
import { lazy, useEffect, useMemo, useState } from 'react';
import {
  useDeleteDropdownMutation,
  useEditDropdownMutation,
  useReuseDropdownMutation,
  useUpdateDropdownByTypeMutation,
} from '../../../api/job-service/AddableDropdown/UpdateDropdownByType';
import { get } from 'lodash-es';
import DropdownWithAddOption from '../../shared/ui/DropdownWithAddOption';
import {
  useAddCustomDepartmentMutation,
  useConfigureDepartmentJobTitlesMutation,
  useGetDepartmentsQuery,
  useGetDepartmentJobTitlesQuery,
  useUpdateCustomDepartmentMutation,
} from '../../../api/tenant-service/MyCompany/departments';
import {
  useAddCustomJobRoleMutation,
  useGetJobRolesQuery,
  useUpdateCustomJobRoleMutation,
} from '../../../api/tenant-service/MyCompany/jobRoles';
import { useSaveJobOpeningMutation } from '../../../api/job-service/JobOpening/AddJobOpening';
import { useUpdateJobOpeningMutation } from '../../../api/job-service/JobOpening/UpdateJobOpening';
import { useLazyGetJobDescriptionByIdQuery } from '../../../api/job-service/JobOpening/ViewJobDescriptionById';
import { useGetMyLocationsQuery } from '../../../api/job-service/JobOpening/GetJobLocations';
import { useGetCompanyDetailsQuery } from '../../../api/tenant-service/Company/viewCompany';
import {
  capitalizeWordsAdvanced,
  changeNullValuesToEmptyArray,
  safeDecodeToken,
  validateDraft,
} from '../../../shared/utils/methods';

import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { useNavigationBlocker } from '../../../hooks/useNavigationBlocker';
import { useStreamManager } from '../../../hooks/useStreamManager';

const CurrencyInput = lazy(() => import('react-currency-input-field'));

const { Option } = Select;

const JobDetails = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
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
  const { jobDetails, aiJobDescriptionId, isFormCompleted, jobOpeningId } = useSelector(
    (state: RootState) => ({
      jobDetails: state.JobSlice.details,
      aiJobDescriptionId: state.JobSlice.aiJobDescriptionId,
      isFormCompleted: state.JobSlice.isFormCompleted,
      jobOpeningId: state.JobSlice.jobOpeningId,
    })
  );
  const { loginToken } = useSelector((state: any) => state.LoginSlice);

  const decodedToken = safeDecodeToken<{ companyName: string; companyId?: number | string }>(
    loginToken
  );
  const parsedCompanyId = Number(decodedToken?.companyId || 0);
  const [selectedLocationIdForUsers, setSelectedLocationIdForUsers] = useState<number | undefined>(
    undefined
  );
  const [isRemoteJob, setIsRemoteJob] = useState(false);

  const [allowNavigation, setAllowNavigation] = useState(false);
  const [isAddingToDropdown, setIsAddingToDropdown] = useState<string | null>(null);
  const [isHiringManagerDropdownOpen, setIsHiringManagerDropdownOpen] = useState(false);
  const [isRecruiterDropdownOpen, setIsRecruiterDropdownOpen] = useState(false);
  const [isMandatorySkillsDropdownOpen, setIsMandatorySkillsDropdownOpen] = useState(false);
  const [isOptionalSkillsDropdownOpen, setIsOptionalSkillsDropdownOpen] = useState(false);
  const [departmentSearchText, setDepartmentSearchText] = useState('');
  const [debouncedDepartmentSearch, setDebouncedDepartmentSearch] = useState('');

  const [saveJobOpening, { isLoading: isSavingDraft }] = useSaveJobOpeningMutation();
  const [updateJobOpening, { isLoading: isUpdating }] = useUpdateJobOpeningMutation();
  const { startStream } = useStreamManager();
  const [showRegenerateConfirmModal, setShowRegenerateConfirmModal] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
  const [isSubmittingWithModal, setIsSubmittingWithModal] = useState(false);
  const [triggerGetJobDescriptionById] = useLazyGetJobDescriptionByIdQuery();
  const [updateDropdownByType] = useUpdateDropdownByTypeMutation();
  const [editDropdown] = useEditDropdownMutation();
  const [deleteDropdown] = useDeleteDropdownMutation();
  const [reuseDropdown] = useReuseDropdownMutation();
  const {
    data: departmentsResponse,
    isFetching: departmentsLoading,
    refetch: refetchDepartments,
  } = useGetDepartmentsQuery({
    page: 0,
    size: 1000,
    status: 'ALL',
    search: debouncedDepartmentSearch || undefined,
    sortBy: 'name',
    sortDirection: 'ASC',
  });
  const [addCustomDepartment] = useAddCustomDepartmentMutation();
  const [updateCustomDepartment] = useUpdateCustomDepartmentMutation();
  const [addCustomJobRole] = useAddCustomJobRoleMutation();
  const [updateCustomJobRole] = useUpdateCustomJobRoleMutation();
  const [configureDepartmentJobTitles] = useConfigureDepartmentJobTitlesMutation();
  const {
    jobOpeningDropdown: jobTypes,
    loading: jobTypesLoading,
    refetch: refetchJobTypes,
  } = useJobOpeningDropdown('JOB_TYPE', 'create');
  const { jobOpeningDropdown: exemptionStatus, loading: exemptionLoading } = useJobOpeningDropdown(
    'EXEMPTION_STATUS',
    'create'
  );
  const {
    jobOpeningDropdown: educationPreference,
    loading: educationPreferenceLoading,
    refetch: refetchEducationPreference,
  } = useJobOpeningDropdown('EDUCATION_PREFERENCE', 'create');
  const {
    jobOpeningDropdown: mandatorySkills,
    loading: mandatorySkillsLoading,
    refetch: refetchMandatorySkills,
  } = useJobOpeningDropdown('MANDATORY_SKILLS', 'create');
  const {
    jobOpeningDropdown: optionalSkills,
    loading: optionalSkillsLoading,
    refetch: refetchOptionalSkills,
  } = useJobOpeningDropdown('OPTIONAL_SKILLS', 'create');

  const { jobOpeningDropdown: hiringManagers, loading: hiringManagerLoading } =
    useJobOpeningDropdown(
      'HIRING_MANAGER',
      'create',
      undefined,
      !selectedLocationIdForUsers && !isRemoteJob,
      isRemoteJob ? undefined : selectedLocationIdForUsers,
      isRemoteJob
    );
  const { jobOpeningDropdown: recruiters, loading: recruitersLoading } = useJobOpeningDropdown(
    'RECRUITER',
    'create',
    undefined,
    !selectedLocationIdForUsers && !isRemoteJob,
    isRemoteJob ? undefined : selectedLocationIdForUsers,
    isRemoteJob
  );

  const { data: jobLocationsResponse, isFetching: loadingJobLocations } = useGetMyLocationsQuery({
    activeOnly: false,
  });
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

  const handleLocationChange = (locationId: number) => {
    const selectedLocation = jobLocationsResponse?.data?.find(
      (location) => location.id === locationId
    );

    setSelectedLocationIdForUsers(locationId || undefined);
    setValue('officeLocation', locationId ? [locationId] : [], { shouldValidate: true });
    setValue('country', selectedLocation?.country ?? '', { shouldValidate: true });
    setValue('state', selectedLocation?.state ?? '', { shouldValidate: true });
    setValue('hiringManagers', [], { shouldValidate: true });
    setValue('recruiters', [], { shouldValidate: true });
  };

  const handleRemoteToggle = (checked: boolean) => {
    setIsRemoteJob(checked);
    setValue('isRemote', checked, { shouldValidate: true });
    if (checked) {
      // Clear location selection but keep HM/recruiter reset
      setSelectedLocationIdForUsers(undefined);
      setValue('officeLocation', [], { shouldValidate: true });
      setValue('country', '', { shouldValidate: true });
      setValue('state', '', { shouldValidate: true });
      setValue('hiringManagers', [], { shouldValidate: true });
      setValue('recruiters', [], { shouldValidate: true });
    } else {
      // When turning remote off, also clear HM/recruiter since location is unset
      setValue('hiringManagers', [], { shouldValidate: true });
      setValue('recruiters', [], { shouldValidate: true });
    }
  };

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    setError,
    trigger,
    formState: { errors, isValid },
  } = useForm<JobDetailsState>({
    resolver: zodResolver(jobDetailsSchema),
    mode: 'onChange',
    defaultValues: {
      ...jobDetails,
      jobProfileCode: jobDetails?.jobProfileCode || generateJobProfileCode(),
      openDate: jobDetails?.openDate || dayjs().format('DD-MM-YYYY'),
      country: jobDetails?.country || '',
      state: jobDetails?.state || '',
      useCultureIntro: jobDetails?.useCultureIntro ?? false,
    },
  });
  const formValues = watch();
  const selectedDepartmentId = formValues.department?.[0];
  const selectedOfficeLocation = useWatch({
    control,
    name: 'officeLocation',
  });
  const selectedOfficeLocationId = selectedOfficeLocation?.[0];
  const selectedHiringManagerIds = (watch('hiringManagers') || []).map((id) => Number(id));
  const selectedRecruiterIds = (watch('recruiters') || []).map((id) => Number(id));
  const selectedMandatorySkillIds = (watch('mandatorySkills') || []).map((id) => Number(id));
  const selectedOptionalSkillIds = (watch('optionalSkills') || []).map((id) => Number(id));

  const selectedHiringManagers = hiringManagers.filter((option) =>
    selectedHiringManagerIds.includes(Number(option.id))
  );
  const selectedRecruiters = recruiters.filter((option) =>
    selectedRecruiterIds.includes(Number(option.id))
  );
  const selectedMandatorySkills = mandatorySkills.filter((option) =>
    selectedMandatorySkillIds.includes(Number(option.id))
  );
  const selectedOptionalSkills = optionalSkills.filter((option) =>
    selectedOptionalSkillIds.includes(Number(option.id))
  );
  const [jobTitleSearchText, setJobTitleSearchText] = useState('');
  const [debouncedJobTitleSearch, setDebouncedJobTitleSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedJobTitleSearch(jobTitleSearchText.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [jobTitleSearchText]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedDepartmentSearch(departmentSearchText.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [departmentSearchText]);

  const jobLocationOptions = useMemo(
    () =>
      (jobLocationsResponse?.data ?? []).map((location) => ({
        id: location.id,
        name: location.name,
        isDeleted: location.status === false,
        isPrimary: location.primary === true,
      })),
    [jobLocationsResponse]
  );

  const selectedLocationDetails = useMemo(
    () =>
      (jobLocationsResponse?.data ?? []).find(
        (location) => location.id === selectedOfficeLocationId
      ),
    [jobLocationsResponse, selectedOfficeLocationId]
  );

  const {
    data: departmentJobTitlesData,
    isFetching: loadingDepartmentJobTitles,
    refetch: refetchJobTitles,
  } = useGetDepartmentJobTitlesQuery(
    { departmentId: selectedDepartmentId as number },
    { skip: !selectedDepartmentId, refetchOnMountOrArgChange: true }
  );

  const mappedJobTitles =
    departmentJobTitlesData
      ?.filter((jt) => jt.status === 'ACTIVE')
      .map((jt) => ({
        id: jt.id,
        name: jt.name,
        isDeleted: false,
        source: 'department' as const,
      })) || [];

  const shouldFetchGlobalJobTitles = Boolean(debouncedJobTitleSearch);

  const { data: globalJobTitlesData, isFetching: loadingGlobalJobTitles } = useGetJobRolesQuery(
    {
      page: 0,
      size: 50,
      sortBy: 'name',
      sortDirection: 'ASC',
      search: debouncedJobTitleSearch || undefined,
    },
    {
      skip: !shouldFetchGlobalJobTitles,
    }
  );

  const globalFallbackJobTitles =
    globalJobTitlesData?.content
      ?.filter((jobTitle) => jobTitle.status === 'ACTIVE')
      .map((jobTitle) => ({
        id: jobTitle.id,
        name: jobTitle.name,
        isDeleted: false,
        source: 'global' as const,
      })) || [];

  const jobTitleOptions = useMemo(() => {
    if (debouncedJobTitleSearch) {
      const allGlobalTitles = [...globalFallbackJobTitles];
      const uniqueGlobalTitles = allGlobalTitles.filter(
        (title, index, self) => index === self.findIndex((t) => t.id === title.id)
      );
      return uniqueGlobalTitles;
    }

    if (selectedDepartmentId) {
      return mappedJobTitles;
    }

    return [];
  }, [debouncedJobTitleSearch, globalFallbackJobTitles, selectedDepartmentId, mappedJobTitles]);

  const departments =
    departmentsResponse?.content?.map((department) => ({
      id: department.id,
      name: department.name,
      isDeleted: department.status !== 'ACTIVE',
    })) || [];
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
    const { jobProfileCode, openDate, ...rest } = obj;
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
      setSelectedLocationIdForUsers(transformedAtsData.officeLocation?.[0]);
      refetchEducationPreference?.();
      refetchMandatorySkills?.();
      refetchOptionalSkills?.();
    } else if (jobDetails && Object.keys(jobDetails).length > 0) {
      setValue('country', jobDetails.country || '');
      setValue('state', jobDetails.state || '');
      setValue('officeLocation', jobDetails.officeLocation || []);
      setSelectedLocationIdForUsers(jobDetails.officeLocation?.[0]);
    }
  }, [atsJobData, isFromAts, jobDetails, setValue]);

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
   * Handle Job Title validation and restoration after department selection.
   *
   * This effect ensures that:
   * 1. Job titles are only displayed if a department is selected
   * 2. If a department is not selected, job title field is cleared
   * 3. After a department is selected, previously stored job titles are restored
   *    if they exist in the department's job titles list
   */
  useEffect(() => {
    if (loadingDepartmentJobTitles) return;

    const currentJobTitleIds = formValues.jobTitle || [];

    // If no department selected, clear job titles
    if (!selectedDepartmentId) {
      if (currentJobTitleIds.length > 0) {
        setValue('jobTitle', [], { shouldValidate: true });
      }
      return;
    }

    if (!departmentJobTitlesData) return;

    // If department is selected, validate that job titles exist in the department
    const validJobTitleIds = currentJobTitleIds.filter((titleId: number) =>
      mappedJobTitles.some((jt) => jt.id === titleId)
    );

    // If stored job title IDs don't match valid ones, update the form
    if (validJobTitleIds.length !== currentJobTitleIds.length) {
      setValue('jobTitle', validJobTitleIds, { shouldValidate: true });
    }
  }, [
    selectedDepartmentId,
    mappedJobTitles,
    loadingDepartmentJobTitles,
    departmentJobTitlesData,
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
        const existingDepartment = departmentsResponse?.content?.find(
          (department) => department.name.trim().toLowerCase() === normalizedValue
        );

        if (existingDepartment) {
          if (existingDepartment.status !== 'ACTIVE') {
            showToast({
              message:
                'Department already exists in a deactivated state. Reactivate the existing department instead of creating a new one.',
              type: 'error',
            });
            setDepartmentSearchText(existingDepartment.name);
          }
          return;
        }

        await addCustomDepartment({
          name: formattedValue,
          status: 'ACTIVE',
        }).unwrap();

        const refreshedDepartments = await refetchDepartments();
        const createdDepartment = refreshedDepartments?.data?.content?.find(
          (department) => department.name.toLowerCase() === formattedValue.toLowerCase()
        );

        showToast({
          message: 'Department added successfully',
          type: 'success',
        });

        if (createdDepartment) {
          setValue('department', [createdDepartment.id], { shouldValidate: true });
          setValue('jobTitle', [], { shouldValidate: true });
        }
        setDepartmentSearchText('');
        setDebouncedDepartmentSearch('');
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

        await addCustomJobRole({
          name: formattedValue,
          status: true,
          departmentIds: [Number(selectedDepartmentId)],
        }).unwrap();

        const refreshedJobTitles = await refetchJobTitles();
        const createdJobTitle = refreshedJobTitles?.data?.find(
          (jobTitle) => jobTitle.name.toLowerCase() === formattedValue.toLowerCase()
        );

        showToast({
          message: 'Job title added successfully',
          type: 'success',
        });

        if (createdJobTitle) {
          setValue('jobTitle', [createdJobTitle.id], { shouldValidate: true });
          setJobTitleSearchText('');
          setDebouncedJobTitleSearch('');
        }
        return;
      }

      const currentValues = (watch(addType as keyof JobDetailsState) || []) as number[];

      const res = await updateDropdownByType({
        type: mappedType,
        value: formattedValue,
      }).unwrap();

      if (res.success) {
        showToast({
          message: res.message || 'Dropdown has been updated successfully',
          type: 'success',
        });

        // Wait for the refetch to complete before setting the value
        const refetchPromise =
          addType === 'jobType'
            ? refetchJobTypes?.()
            : addType === 'educationPreference'
              ? refetchEducationPreference?.()
              : addType === 'mandatorySkills'
                ? refetchMandatorySkills?.()
                : addType === 'optionalSkills'
                  ? refetchOptionalSkills?.()
                  : undefined;

        // Wait for refetch to complete before setting the value
        if (refetchPromise) {
          await refetchPromise;
        }

        // Now set the value after the dropdown data is updated
        if (addType === 'jobType') {
          setValue('jobType', [res.data.id], { shouldValidate: true });
        } else if (addType === 'educationPreference') {
          setValue('educationPreference', [res.data.id], { shouldValidate: true });
        } else if (addType === 'mandatorySkills' || addType === 'optionalSkills') {
          setValue(addType, [...currentValues, res.data.id], { shouldValidate: true });
        }
      } else {
        showToast({
          message: res.message || 'Failed to update dropdown.',
          type: 'error',
        });
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

    const selectedJobTitleId = Number(value);

    if (selectedDepartmentId) {
      const isAlreadyMappedToDepartment = mappedJobTitles.some(
        (jobTitle) => Number(jobTitle.id) === selectedJobTitleId
      );

      if (!isAlreadyMappedToDepartment) {
        const departmentDropdownJobTitleIds = mappedJobTitles
          .map((jobTitle) => Number(jobTitle.id))
          .filter((id) => Number.isFinite(id));

        const configureJobTitleIds = Array.from(
          new Set([...departmentDropdownJobTitleIds, selectedJobTitleId])
        ).filter((id): id is number => typeof id === 'number' && Number.isFinite(id));

        try {
          await configureDepartmentJobTitles({
            departmentId: Number(selectedDepartmentId),
            jobTitleIds: configureJobTitleIds,
          }).unwrap();

          await refetchJobTitles();
        } catch (error) {
          showToast({
            message: get(
              error,
              'data.message',
              'Failed to configure job title for the department.'
            ),
            type: 'error',
          });
          return;
        }
      }
    }

    setValue('jobTitle', [selectedJobTitleId], { shouldValidate: true });
    setJobTitleSearchText('');
    setDebouncedJobTitleSearch('');
  };

  const handleReuseOption = async (id: string | number, type: string) => {
    if (type === 'department') {
      const targetDepartment = departmentsResponse?.content?.find(
        (department) => department.id === Number(id)
      );

      if (!targetDepartment) return;

      try {
        await updateCustomDepartment({
          id: Number(id),
          name: targetDepartment.name,
          status: 'ACTIVE',
        }).unwrap();

        showToast({
          message: 'Department activated successfully',
          type: 'success',
        });

        refetchDepartments();
      } catch (err) {
        showToast({
          message: get(err, 'data.message', 'Something went wrong while activating department.'),
          type: 'error',
        });
      }

      return;
    }

    if (type === 'jobTitle') {
      const targetJobTitle = departmentJobTitlesData?.find(
        (jobTitle) => jobTitle.id === Number(id)
      );

      if (!targetJobTitle) return;

      try {
        await updateCustomJobRole({
          id: Number(id),
          name: targetJobTitle.name,
          status: true,
          departmentIds: selectedDepartmentId ? [Number(selectedDepartmentId)] : [],
        }).unwrap();

        showToast({
          message: 'Job title activated successfully',
          type: 'success',
        });

        refetchJobTitles();
      } catch (err) {
        showToast({
          message: get(err, 'data.message', 'Something went wrong while activating job title.'),
          type: 'error',
        });
      }

      return;
    }

    const typeMapping: Record<string, string> = {
      jobTitle: 'JOB_TITLE',
      department: 'DEPARTMENT',
      jobType: 'JOB_TYPE',
      educationPreference: 'EDUCATION_PREFERENCE',
      mandatorySkills: 'MANDATORY_SKILLS',
      optionalSkills: 'OPTIONAL_SKILLS',
    };

    const mappedType = typeMapping[type];
    if (!mappedType) return;

    try {
      const res = await reuseDropdown({
        type: mappedType,
        id: [Number(id)],
      }).unwrap();

      // Check if the operation was successful
      if (res.successCount > 0 && res.results?.[0]?.status === 'SUCCESS') {
        const successMessage =
          res.results[0].message || res.message || 'Option reactivated successfully';

        showToast({
          message: successMessage,
          type: 'success',
        });

        // Refetch the dropdown data
        switch (type) {
          case 'jobTitle':
            refetchJobTitles?.();
            break;
          case 'department':
            refetchDepartments?.();
            break;
          case 'jobType':
            refetchJobTypes?.();
            break;
          case 'educationPreference':
            refetchEducationPreference?.();
            break;
          case 'mandatorySkills':
            refetchMandatorySkills?.();
            break;
          case 'optionalSkills':
            refetchOptionalSkills?.();
            break;
        }
      } else {
        const errorMessage =
          res.results?.[0]?.message || res.message || 'Failed to reactivate option.';

        showToast({
          message: errorMessage,
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        message: get(err, 'data.message', 'Something went wrong while reactivating option.'),
        type: 'error',
      });
    }
  };
  const handleEditOption = async (id: string | number, newName: string, type: string) => {
    if (type === 'department') {
      const targetDepartment = departmentsResponse?.content?.find(
        (department) => department.id === Number(id)
      );

      if (!targetDepartment) return;

      try {
        await updateCustomDepartment({
          id: Number(id),
          name: capitalizeWordsAdvanced(newName),
          status: targetDepartment.status,
        }).unwrap();

        showToast({
          message: 'Department updated successfully',
          type: 'success',
        });

        refetchDepartments();
      } catch (err) {
        showToast({
          message: get(err, 'data.message', 'Something went wrong while updating department.'),
          type: 'error',
        });
      }

      return;
    }

    if (type === 'jobTitle') {
      const targetJobTitle = departmentJobTitlesData?.find(
        (jobTitle) => jobTitle.id === Number(id)
      );

      if (!targetJobTitle) return;

      try {
        await updateCustomJobRole({
          id: Number(id),
          name: capitalizeWordsAdvanced(newName),
          status: targetJobTitle.status === 'ACTIVE',
          departmentIds: selectedDepartmentId ? [Number(selectedDepartmentId)] : [],
        }).unwrap();

        showToast({
          message: 'Job title updated successfully',
          type: 'success',
        });

        refetchJobTitles();
      } catch (err) {
        showToast({
          message: get(err, 'data.message', 'Something went wrong while updating job title.'),
          type: 'error',
        });
      }

      return;
    }

    const typeMapping: Record<string, string> = {
      jobTitle: 'JOB_TITLE',
      department: 'DEPARTMENT',
      jobType: 'JOB_TYPE',
      educationPreference: 'EDUCATION_PREFERENCE',
      mandatorySkills: 'MANDATORY_SKILLS',
      optionalSkills: 'OPTIONAL_SKILLS',
    };

    const mappedType = typeMapping[type];
    if (!mappedType) return;

    try {
      const res = await editDropdown({
        type: mappedType,
        ids: [Number(id)],
        operation: 'update',
        updateFieldsList: [
          {
            name: capitalizeWordsAdvanced(newName),
          },
        ],
      }).unwrap();

      // Check if the operation was successful based on the response structure
      if (res.successCount > 0 && res.results?.[0]?.status === 'SUCCESS') {
        const successMessage =
          type === 'jobType'
            ? 'Job type deactivated successfully'
            : res.results[0].message || res.message || 'Option updated successfully';

        showToast({
          message: successMessage,
          type: 'success',
        });

        // Refetch the dropdown data
        switch (type) {
          case 'jobTitle':
            refetchJobTitles?.();
            break;
          case 'department':
            refetchDepartments?.();
            break;
          case 'jobType':
            refetchJobTypes?.();
            break;
          case 'educationPreference':
            refetchEducationPreference?.();
            break;
          case 'mandatorySkills':
            refetchMandatorySkills?.();
            break;
          case 'optionalSkills':
            refetchOptionalSkills?.();
            break;
        }
      } else {
        const errorMessage =
          type === 'jobType'
            ? 'Failed to deactivate job type.'
            : res.results?.[0]?.message || res.message || 'Failed to update option.';

        showToast({
          message: errorMessage,
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        message: get(err, 'data.message', 'Something went wrong while updating option.'),
        type: 'error',
      });
    }
  };

  const handleDeleteOption = async (id: string | number, type: string) => {
    if (type === 'department') {
      const targetDepartment = departmentsResponse?.content?.find(
        (department) => department.id === Number(id)
      );

      if (!targetDepartment) return;

      try {
        await updateCustomDepartment({
          id: Number(id),
          name: targetDepartment.name,
          status: 'INACTIVE',
        }).unwrap();

        showToast({
          message: 'Department deactivated successfully',
          type: 'success',
        });

        const currentDepartment = watch('department');
        if (Array.isArray(currentDepartment) && currentDepartment.includes(Number(id))) {
          setValue('department', [], { shouldValidate: true });
          setValue('jobTitle', [], { shouldValidate: true });
        }

        refetchDepartments();
      } catch (err) {
        showToast({
          message: get(err, 'data.message', 'Something went wrong while deactivating department.'),
          type: 'error',
        });
      }

      return;
    }

    if (type === 'jobTitle') {
      const targetJobTitle = departmentJobTitlesData?.find(
        (jobTitle) => jobTitle.id === Number(id)
      );

      if (!targetJobTitle) return;

      try {
        await updateCustomJobRole({
          id: Number(id),
          name: targetJobTitle.name,
          status: false,
          departmentIds: selectedDepartmentId ? [Number(selectedDepartmentId)] : [],
        }).unwrap();

        showToast({
          message: 'Job title deactivated successfully',
          type: 'success',
        });

        const currentJobTitle = watch('jobTitle');
        if (Array.isArray(currentJobTitle) && currentJobTitle.includes(Number(id))) {
          setValue('jobTitle', [], { shouldValidate: true });
        }

        refetchJobTitles();
      } catch (err) {
        showToast({
          message: get(err, 'data.message', 'Something went wrong while deactivating job title.'),
          type: 'error',
        });
      }

      return;
    }

    const typeMapping: Record<string, string> = {
      jobTitle: 'JOB_TITLE',
      department: 'DEPARTMENT',
      jobType: 'JOB_TYPE',
      educationPreference: 'EDUCATION_PREFERENCE',
      mandatorySkills: 'MANDATORY_SKILLS',
      optionalSkills: 'OPTIONAL_SKILLS',
    };

    const mappedType = typeMapping[type];
    if (!mappedType) return;

    try {
      const res = await deleteDropdown({
        type: mappedType,
        ids: [Number(id)], // Send as array of IDs
      }).unwrap();

      // Check if the operation was successful
      if (res.successCount > 0 && res.results?.[0]?.status === 'SUCCESS') {
        const successMessage =
          res.results[0].message || res.message || 'Option updated successfully';

        showToast({
          message: successMessage,
          type: 'success',
        });

        // Clear the selected value if the deleted option was selected
        const currentValue = watch(type as keyof JobDetailsState);
        if (Array.isArray(currentValue) && currentValue.includes(Number(id))) {
          setValue(type as keyof JobDetailsState, [], { shouldValidate: true });
        } else if (currentValue === id) {
          setValue(type as keyof JobDetailsState, null, { shouldValidate: true });
        }

        // Refetch the dropdown data
        switch (type) {
          case 'jobTitle':
            refetchJobTitles?.();
            break;
          case 'department':
            refetchDepartments?.();
            break;
          case 'jobType':
            refetchJobTypes?.();
            break;
          case 'educationPreference':
            refetchEducationPreference?.();
            break;
          case 'mandatorySkills':
            refetchMandatorySkills?.();
            break;
          case 'optionalSkills':
            refetchOptionalSkills?.();
            break;
        }
      } else {
        const errorMessage = res.results?.[0]?.message || res.message || 'Failed to update option.';

        showToast({
          message: errorMessage,
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        message:
          type === 'jobType'
            ? get(err, 'data.message', 'Something went wrong while deactivating job type.')
            : get(err, 'data.message', 'Something went wrong while deleting option.'),
        type: 'error',
      });
    }
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

      return;
    }

    try {
      const apiPayload: SaveJobOpeningRequest = {
        jobProfileCode: data.jobProfileCode || '',
        locationId: data.officeLocation?.[0],
        jobTitle: data.jobTitle || [],
        department: data.department || [],
        officeLocation: data.officeLocation || [],
        jobType: data.jobType || [],
        shift: data.shiftStart && data.shiftEnd ? `${data.shiftStart} - ${data.shiftEnd}` : null,
        openings: data.openings || undefined,
        minSalary: data.minSalary ? parseFloat(data.minSalary) : undefined,
        maxSalary: data.maxSalary ? parseFloat(data.maxSalary) : undefined,
        minExperience: data.minExperience ?? undefined,
        maxExperience: data.maxExperience ?? undefined,
        openDate: data.openDate,
        hiringManagers: data.hiringManagers || [],
        recruiters: data.recruiters || [],
        mandatorySkills: data.mandatorySkills || [],
        optionalSkills: data.optionalSkills || [],
        educationPreference: data.educationPreference || [],
        communicationSkills: '',
        responsibilities: data.responsibilities || undefined,
        otherRequirements: data.otherRequirements || undefined,
        exemptionStatus: data.exemptionStatus || undefined,
        referralBonus:
          data.referralBonus === null ||
          data.referralBonus === undefined ||
          data.referralBonus === ''
            ? ''
            : data.referralBonus,
        isMultilingual: data.isMultilingual || false,
        useCultureIntro: Boolean(data.useCultureIntro),
        isRemote: data.isRemote || false,
        isDraft: true,
      };
      const response = await saveJobOpening(apiPayload).unwrap();

      if (response?.success) {
        showToast({
          message: get(response, 'message', 'Job saved as draft successfully'),
          type: 'success',
        });
        navigate('/jobs');
      } else {
        showToast({
          message: get(response, 'message', 'Failed to save draft'),
          type: 'error',
        });
      }
    } catch (error) {
      showToast({
        message: get(error, 'data.message', 'Failed to save draft'),
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
      shift: data.shiftStart && data.shiftEnd ? `${data.shiftStart} - ${data.shiftEnd}` : '',
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
    } else if (jobOpeningId && aiJobDescriptionId) {
      setIsSubmittingWithModal(true);
      try {
        const jdData = await triggerGetJobDescriptionById({
          aiJobDescriptionID: aiJobDescriptionId,
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
    const body = { ...processedPayload, generateAiJd };
    const apiCall = jobOpeningId ? updateJobOpening({ jobOpeningId, body }) : saveJobOpening(body);

    try {
      const res = await apiCall.unwrap();
      if (!res?.success) {
        showToast({
          message: get(res, 'message', 'Failed to save job opening. Please try again.'),
          type: 'error',
        });
        setIsSubmittingWithModal(false);
        return;
      }

      showToast({
        message: get(
          res,
          'message',
          jobOpeningId
            ? 'Job opening has been updated successfully'
            : 'Job opening has been saved successfully'
        ),
        type: 'success',
      });
      dispatch(setJobOpeningId(res.data.jobOpeningId));
      dispatch(setAiJobDescriptionId(res.data.aiJobDescriptionId));

      if (res.data.jobOpeningId && generateAiJd) {
        startStream(res.data.jobOpeningId);
      }

      setShowRegenerateConfirmModal(false);
      setPendingSubmitData(null);
      setIsSubmittingWithModal(false);

      navigate(`/ai-job-description?aiJobDescriptionId=${res.data.aiJobDescriptionId}`, {
        state: {
          jobData: atsJobData,
          refresh: isFromAts,
          atsJobOpeningId: atsJobOpeningId,
          isUpdate: !!jobOpeningId,
        },
      });
    } catch (err) {
      showToast({
        message: get(err, 'data.message', 'Something went wrong while saving job opening.'),
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

  return (
    <>
      {(isSavingDraft || isSubmittingWithModal) && <Loader />}
      <MainLayout>
        <JobDetailsLayout>
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
                    value={watch('jobProfileCode')}
                    readOnly
                    placeholder="Job ID"
                    className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
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
                    onSearchChange={setDepartmentSearchText}
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
                      loadingGlobalJobTitles ||
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
                <Form.Item label={<span>Shift</span>}>
                  <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                    <TimePicker
                      value={watch('shiftStart') ? dayjs(watch('shiftStart'), 'HH:mm') : null}
                      onChange={(time: dayjs.Dayjs | null) => {
                        const newValue = time ? time.format('HH:mm') : '';
                        setValue('shiftStart', newValue, {
                          shouldValidate: true,
                        });
                        trigger(['shiftStart', 'shiftEnd']);
                      }}
                      className="w-full custom-time-picker placeholder-style"
                      variant="borderless"
                      format="hh:mm A"
                      placeholder="Start Time"
                      showNow={false}
                    />
                    <span className="px-2 text-gray-500">-</span>
                    <TimePicker
                      className="w-full custom-time-picker placeholder-style"
                      variant="borderless"
                      format="hh:mm A"
                      placeholder="End Time"
                      showNow={false}
                      value={watch('shiftEnd') ? dayjs(watch('shiftEnd'), 'HH:mm') : null}
                      onChange={(time: dayjs.Dayjs | null) => {
                        const newValue = time ? time.format('HH:mm') : '';
                        setValue('shiftEnd', newValue, {
                          shouldValidate: true,
                        });
                        trigger(['shiftStart', 'shiftEnd']);
                      }}
                    />
                  </div>
                  {(errors.shiftStart || errors.shiftEnd) && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.shiftStart?.message || errors.shiftEnd?.message}
                    </p>
                  )}
                </Form.Item>
                <Form.Item label={<span>Communication Language</span>}>
                  <Controller
                    name="isMultilingual"
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <div className="flex items-center min-h-[42px]">
                        <Switch
                          checked={Boolean(value)}
                          onChange={(checked) => {
                            onChange(checked);
                          }}
                          style={{
                            backgroundColor: value ? 'var(--color-primary)' : undefined,
                          }}
                        />
                        <label className="ml-2 text-sm cursor-pointer">Bilingual</label>
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
                        backgroundColor: useCultureIntroValue ? 'var(--color-primary)' : undefined,
                      }}
                    />
                    <span className="text-sm text-gray-700 leading-5">
                      Play Company Culture Introduction at the start of AI Audio Screening
                    </span>
                  </div>
                </Form.Item>
              </div>
            </div>
            {/* Location */}
            <div className="mt-2">
              <div className="w-full">
                <span className="text-lg font-semibold">Location</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Switch
                  checked={isRemoteJob}
                  onChange={handleRemoteToggle}
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
                        value={selectedLocationDetails?.code ?? ''}
                        readOnly
                        disabled
                        placeholder="Location Code"
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
                        value={selectedLocationDetails?.addressLine1 ?? ''}
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
                        value={selectedLocationDetails?.addressLine2 ?? ''}
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
                        value={selectedLocationDetails?.zipCode ?? ''}
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
              <div className="w-full">
                <span className="text-sm">
                  &bull; Select Job Location to assign Hiring Manager and Recruiter
                </span>
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
                      disabled={!selectedLocationIdForUsers}
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
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
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
                                    (id) => id !== Number(manager.id)
                                  );
                                  setValue('hiringManagers', updated, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                }}
                                className="ml-1 w-4 h-4 flex items-center justify-center text-blue-500 hover:text-blue-700 hover:bg-blue-200 rounded-full"
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
                      disabled={!selectedLocationIdForUsers}
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
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
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
                                    (id) => id !== Number(recruiter.id)
                                  );
                                  setValue('recruiters', updated, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                }}
                                className="ml-1 w-4 h-4 flex items-center justify-center text-blue-500 hover:text-blue-700 hover:bg-blue-200 rounded-full"
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
                        className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      />
                    )}
                  />
                  {errors.openings && (
                    <p className="text-red-500 text-sm mt-1">{errors.openings.message}</p>
                  )}
                </Form.Item>
              </div>
            </div>
            {/* Salary and Status Section */}
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
                    suffix={
                      exemptionStatus?.find((status) => status.id === watch('exemptionStatus'))
                        ?.name === 'Exempt'
                        ? ''
                        : '/hr'
                    }
                    placeholder="Minimum Salary"
                    className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)] placeholder:capitalize"
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
                    suffix={
                      exemptionStatus?.find((status) => status.id === watch('exemptionStatus'))
                        ?.name === 'Exempt'
                        ? ''
                        : '/hr'
                    }
                    placeholder="Maximum Salary"
                    className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)] placeholder:capitalize"
                    intlConfig={{ locale: 'en-US', currency: 'USD' }}
                  />
                  {errors.maxSalary && (
                    <p className="text-red-500 text-sm mt-1">{errors.maxSalary.message}</p>
                  )}
                </Form.Item>
              </div>
            </div>

            {/* Remaining Fields */}
            <div className="grid grid-cols-3 gap-x-4 mt-4">
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
                      className="bg-white w-full px-4 py-2 !lowercase border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)] placeholder:capitalize"
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
                    const numValue = value === '' ? null : Math.max(0, Math.min(50, Number(value)));
                    setValue('minExperience', numValue, {
                      shouldValidate: true,
                    });
                    trigger(['minExperience', 'maxExperience']);
                  }}
                  placeholder="Minimum Experience"
                  className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
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
                  className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
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
              <div className="grid grid-cols-2 gap-x-4 mt-2">
                <Form.Item
                  label={
                    <span>
                      Required Skills <span className="required-asterisk">*</span>
                    </span>
                  }
                >
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
                      options={mandatorySkills}
                      loading={mandatorySkillsLoading || isAddingToDropdown === 'mandatorySkills'}
                      mode="multiple"
                      placeholder="Select Required Skills"
                      label="Required Skills"
                      onAddOption={(value) => handleAddOption(value, 'mandatorySkills')}
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
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
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
                                    (id) => id !== Number(skill.id)
                                  );
                                  setValue('mandatorySkills', updated, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                }}
                                className="ml-1 w-4 h-4 flex items-center justify-center text-blue-500 hover:text-blue-700 hover:bg-blue-200 rounded-full"
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
                      options={optionalSkills}
                      loading={optionalSkillsLoading || isAddingToDropdown === 'optionalSkills'}
                      mode="multiple"
                      placeholder="Select Optional Skills"
                      label="Optional Skills"
                      onAddOption={(value) => handleAddOption(value, 'optionalSkills')}
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
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
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
                                    (id) => id !== Number(skill.id)
                                  );
                                  setValue('optionalSkills', updated, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                }}
                                className="ml-1 w-4 h-4 flex items-center justify-center text-blue-500 hover:text-blue-700 hover:bg-blue-200 rounded-full"
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
            </div>
            <div className="flex items-center justify-center mt-6 gap-6">
              {!aiJobDescriptionId && (
                <Button
                  type="button"
                  className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
                  onClick={() => onSaveDraft(watch())}
                  disabled={isSavingDraft || isUpdating}
                >
                  SAVE AS DRAFT
                </Button>
              )}
              <Button
                type="button"
                className="text-white bg-button rounded-3xl px-8 py-2 flex items-center space-x-2 cursor-pointer"
                onClick={handleSubmit(onSubmit)}
                disabled={isSavingDraft || isUpdating}
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
              isLoading={isSubmittingWithModal}
            />
          )}
        </JobDetailsLayout>
      </MainLayout>
    </>
  );
};
export default JobDetails;
