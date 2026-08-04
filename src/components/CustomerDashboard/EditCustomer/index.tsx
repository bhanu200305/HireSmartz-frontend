import { z } from 'zod';
import {
  MdDelete,
  MdEdit,
  MdEmail,
  MdOutlineArrowBack,
  MdOutlineLocationOn,
  MdPhone,
} from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import { Button, Input, showToast, Textarea } from '../../shared';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { message, Select, Switch, Tabs, Upload } from 'antd';
import { Loader } from '../../shared/ui/loader';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import DropdownWithAddOption from '../../shared/ui/DropdownWithAddOption';
import CompanyLocations from '../ViewCustomer/CompanyLocations';
import { useGetCompanyDetailsQuery } from '../../../api/tenant-service/Company/viewCompany';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { countryCodes } from '../../../constants/countryCode';
import { useUpdateCompanyMutation } from '../../../api/tenant-service/Company/updateCompany';
import {
  useGetAllDepartmentsQuery,
  useGetDepartmentsByCompanyIdQuery,
  useGetCompanyIndustryByIdQuery,
  useGetIndustriesQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useCreateIndustryMutation,
  useUpdateIndustryMutation,
  useGetCompanyIndustriesQuery,
  useGetCompanyLocationsFilterQuery,
} from '../../../api/tenant-service/Company/addCompany';
import { get } from 'lodash-es';
import { EditCompanySchema } from './EditCompanySchema';
import React, { useEffect, useMemo, useState } from 'react';
import useLocationDropdown from '../../../hooks/useCountryDropdown';
import {
  cleanPhoneNumber,
  convertFileToBase64,
  formatPhoneNumber,
  makeFirstLetterUpperCase,
} from '../../../shared/utils/methods';
import {
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_FILE_SIZE_BYTES,
  LOGO_FILE_SIZE_ERROR_MESSAGE,
  LOGO_FILE_TYPE_ERROR_MESSAGE,
} from '../../../constants/file.constants';
import {
  handlePhoneNumberChange,
  sanitizeInput,
} from '../../../shared/utils/validation/input.helpers';
import './editCustomer.css';
import { sanitizeImagePreview } from '../../../shared/utils/business-logic';
import CompanyUsers from '../ViewCustomer/CompanyUsers';
import useFetchOrgRoles from '../../../hooks/useFetchOrgRoles';
import { Role } from '../../../api/rbac-service/Roles/allRoles';

type EditCompanyFormValues = z.infer<typeof EditCompanySchema>;

type DepartmentRecord = {
  id: number;
  name: string;
  status: boolean;
  departmentId?: number | null;
  masterDepartmentId?: number | null;
};

type IndustryRecord = {
  id: number;
  name: string;
  status: boolean;
};

const getMasterDepartmentId = (department: DepartmentRecord): number => {
  if (
    typeof department.masterDepartmentId === 'number' &&
    Number.isFinite(department.masterDepartmentId)
  ) {
    return department.masterDepartmentId;
  }

  if (typeof department.departmentId === 'number' && Number.isFinite(department.departmentId)) {
    return department.departmentId;
  }

  return department.id;
};

const { Option } = Select;

const EditCompany = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('companyId');
  const isEditSecondaryContactRoleEnabled =
    import.meta.env.VITE_SECONDARY_CONTACT_ROLE_FEATURE === 'true';
  const { data: companyData, isLoading } = useGetCompanyDetailsQuery(
    { companyId: Number(companyId) },
    { refetchOnMountOrArgChange: true, skip: !companyId || isNaN(Number(companyId)) }
  );

  // Fetch roles
  const { roles, loading: rolesLoading } = useFetchOrgRoles();

  const initialAllowedToManageLocation = companyData?.allowedToManageLocation ?? false;
  const parsedCompanyId = Number(companyId || 0);
  const { data: locationsResponse } = useGetCompanyLocationsFilterQuery(
    {
      companyId: parsedCompanyId,
      status: 'ALL',
      page: 0,
      size: 100,
      sortBy: 'createdAt',
      sortDir: 'desc',
    },
    { skip: !parsedCompanyId }
  );
  const industryId = Number(companyData?.companyIndustryId || companyData?.industryId || null);

  const { data: industryResponse, isLoading: industryLoading } = useGetCompanyIndustryByIdQuery(
    { industryId },
    { skip: !industryId }
  );

  const {
    data: industriesData,
    isLoading: loadingIndustries,
    refetch: refetchIndustries,
  } = useGetCompanyIndustriesQuery({ companyId: parsedCompanyId }, { skip: !parsedCompanyId });

  const industries = useMemo(() => {
    const normalizeIndustry = (industry: unknown): IndustryRecord | null => {
      if (!industry || typeof industry !== 'object') {
        return null;
      }

      const industryValue = industry as {
        id?: unknown;
        industryId?: unknown;
        masterIndustryId?: unknown;
        name?: unknown;
        industryName?: unknown;
        status?: unknown;
      };

      const idCandidate =
        industryValue.id ?? industryValue.industryId ?? industryValue.masterIndustryId;
      const parsedId = Number(idCandidate);
      const nameCandidate =
        typeof industryValue.name === 'string'
          ? industryValue.name
          : typeof industryValue.industryName === 'string'
            ? industryValue.industryName
            : '';

      if (!Number.isFinite(parsedId) || !nameCandidate.trim()) {
        return null;
      }

      return {
        id: parsedId,
        name: nameCandidate,
        status: typeof industryValue.status === 'boolean' ? industryValue.status : true,
      };
    };

    if (Array.isArray(industriesData)) {
      return industriesData
        .map((industry) => normalizeIndustry(industry))
        .filter((industry): industry is IndustryRecord => Boolean(industry));
    }

    if (
      industriesData &&
      typeof industriesData === 'object' &&
      'content' in industriesData &&
      Array.isArray((industriesData as { content: unknown }).content)
    ) {
      return (industriesData as { content: unknown[] }).content
        .map((industry) => normalizeIndustry(industry))
        .filter((industry): industry is IndustryRecord => Boolean(industry));
    }

    if (
      industriesData &&
      typeof industriesData === 'object' &&
      'data' in industriesData &&
      Array.isArray((industriesData as { data: unknown }).data)
    ) {
      return (industriesData as { data: unknown[] }).data
        .map((industry) => normalizeIndustry(industry))
        .filter((industry): industry is IndustryRecord => Boolean(industry));
    }

    return [] as IndustryRecord[];
  }, [industriesData]);

  const {
    data: masterDepartmentsData,
    isLoading: masterDepartmentsLoading,
    refetch: refetchMasterDepartments,
  } = useGetAllDepartmentsQuery(
    {
      page: 0,
      size: 1000,
      sortBy: 'name',
      sortDirection: 'ASC',
    },
    {
      skip: true,
    }
  );
  const {
    data: companyDepartmentsData,
    isLoading: companyDepartmentsLoading,
    refetch: refetchCompanyDepartments,
  } = useGetDepartmentsByCompanyIdQuery({ companyId: parsedCompanyId }, { skip: !parsedCompanyId });
  const [locallyAddedDepartments, setLocallyAddedDepartments] = useState<DepartmentRecord[]>([]);

  const [departmentSearchTerm, setDepartmentSearchTerm] = useState<string>('');
  const isDepartmentSearchActive = departmentSearchTerm.trim().length > 0;

  const { data: searchedMasterDepartmentsData, isLoading: searchedMasterDepartmentsLoading } =
    useGetAllDepartmentsQuery(
      {
        page: 0,
        size: 1000,
        sortBy: 'name',
        sortDirection: 'ASC',
      },
      {
        skip: !isDepartmentSearchActive,
      }
    );

  const masterDepartments = useMemo(() => {
    const sourceData = isDepartmentSearchActive
      ? searchedMasterDepartmentsData
      : masterDepartmentsData;

    if (Array.isArray(sourceData)) {
      return sourceData;
    }

    if (
      sourceData &&
      typeof sourceData === 'object' &&
      'content' in sourceData &&
      Array.isArray((sourceData as { content: unknown }).content)
    ) {
      return (sourceData as { content: DepartmentRecord[] }).content;
    }

    return [] as DepartmentRecord[];
  }, [isDepartmentSearchActive, searchedMasterDepartmentsData, masterDepartmentsData]);

  const baseCompanyDepartmentsList = useMemo(() => {
    if (Array.isArray(companyDepartmentsData)) {
      return companyDepartmentsData as DepartmentRecord[];
    }

    if (
      companyDepartmentsData &&
      typeof companyDepartmentsData === 'object' &&
      'data' in companyDepartmentsData &&
      Array.isArray((companyDepartmentsData as { data: unknown }).data)
    ) {
      return (companyDepartmentsData as { data: DepartmentRecord[] }).data;
    }

    if (
      companyDepartmentsData &&
      typeof companyDepartmentsData === 'object' &&
      'content' in companyDepartmentsData &&
      Array.isArray((companyDepartmentsData as { content: unknown }).content)
    ) {
      return (companyDepartmentsData as { content: DepartmentRecord[] }).content;
    }

    return [] as DepartmentRecord[];
  }, [companyDepartmentsData]);

  const companyDepartmentsList = useMemo(() => {
    const mergedDepartments = [...baseCompanyDepartmentsList];
    const existingMasterDepartmentIds = new Set(
      mergedDepartments.map((department) => getMasterDepartmentId(department))
    );

    locallyAddedDepartments.forEach((department) => {
      const masterDepartmentId = getMasterDepartmentId(department);
      if (!existingMasterDepartmentIds.has(masterDepartmentId)) {
        mergedDepartments.push(department);
        existingMasterDepartmentIds.add(masterDepartmentId);
      }
    });

    return mergedDepartments;
  }, [baseCompanyDepartmentsList, locallyAddedDepartments]);

  const departmentOptions = useMemo(
    () => (isDepartmentSearchActive ? masterDepartments : companyDepartmentsList),
    [isDepartmentSearchActive, masterDepartments, companyDepartmentsList]
  );
  const [updateCompany, { isLoading: updateLoading }] = useUpdateCompanyMutation();
  const [createDepartment, { isLoading: creatingDepartmentLoading }] =
    useCreateDepartmentMutation();
  const [updateDepartment, { isLoading: updatingDepartmentLoading }] =
    useUpdateDepartmentMutation();
  const [createIndustry, { isLoading: creatingIndustryLoading }] = useCreateIndustryMutation();
  const [updateIndustry, { isLoading: updatingIndustryLoading }] = useUpdateIndustryMutation();

  const [selectedCountry, setSelectedCountry] = useState<string>(companyData?.country || '');
  const [selectedState, setSelectedState] = useState<string>(companyData?.state || '');
  const [selectedCity, setSelectedCity] = useState<string>(companyData?.city || '');
  const [selectedCountryId, setSelectedCountryId] = useState<number | undefined>(undefined);
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(undefined);
  const [isHovered, setIsHovered] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [imageChanged, setImageChanged] = useState(false);
  const [isProfileDeleted, setIsProfileDeleted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || '1');
  const [hasSecondaryData, setHasSecondaryData] = useState(false);
  const [isDepartmentsFocused, setIsDepartmentsFocused] = useState<boolean>(false);
  const [isDepartmentsDropdownOpen, setIsDepartmentsDropdownOpen] = useState<boolean>(false);
  const [customCreatedDepartmentIds, setCustomCreatedDepartmentIds] = useState<Set<number>>(
    new Set()
  );
  const [showCancelConfirmation, setShowCancelConfirmation] = useState<boolean>(false);
  const uploadRef = React.useRef<any>(null);
  const [deletedIndustries, setDeletedIndustries] = useState<Set<number>>(new Set());
  const { countries, states, cities, loadingCountries } = useLocationDropdown(
    selectedCountryId,
    selectedStateId
  );
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<EditCompanyFormValues>({
    resolver: zodResolver(EditCompanySchema),
    mode: 'onChange',
    defaultValues: {
      firstNamePrimary: '',
      lastNamePrimary: '',
      firstNameSecondary: '',
      lastNameSecondary: '',
      phonePrimary: '',
      phoneSecondary: '',
      countryCodePrimary: '+1',
      countryCodeSecondary: '+1',
      emailPrimary: '',
      emailSecondary: '',
      companyName: '',
      locationName: '',
      locationCode: '',
      addressLine1: '',
      addressLine2: '',
      titlePrimary: '',
      titleSecondary: '',
      city: '',
      state: '',
      zip: '',
      country: '',
      companyLogo: '',
      companyLogoType: '',
      websiteLink: '',
      departmentIds: [],
      industryId: '',
      status: false,
      allowedToManageLocation: false,
      cultureIntroText: '',
      cultureIntroDefaultEnabled: false,
      isScoringConfigEditable: false,
      candidateIntroEnabled: false,
      candidateEnquiriesEnabled: false,
      roleIdSecondary: '', // Add this for secondary role
    },
  });

  const selectedIndustryId = String(watch('industryId') ?? '');
  const selectedDepartmentIds = (watch('departmentIds') ?? []) as string[];
  const cultureIntroText = String(watch('cultureIntroText') || '');
  const hasCultureIntroText = cultureIntroText.trim().length > 0;
  const isCultureIntroDefaultEnabled = Boolean(watch('cultureIntroDefaultEnabled'));

  // Watch secondary role ID
  const secondaryRoleId = watch('roleIdSecondary');

  const industryOptions = useMemo(() => {
    const mappedOptions = industries.map((industry) => ({
      id: String(industry.id),
      name: industry.name,
      isDeleted: industry.status === false || deletedIndustries.has(industry.id),
    }));

    if (!selectedIndustryId) {
      return mappedOptions;
    }

    const hasSelectedOption = mappedOptions.some((option) => option.id === selectedIndustryId);
    if (hasSelectedOption) {
      return mappedOptions;
    }

    const fallbackName = (industryResponse?.name || companyData?.industry || '').trim();

    if (!fallbackName) {
      return mappedOptions;
    }

    return [
      {
        id: selectedIndustryId,
        name: fallbackName,
        isDeleted: false,
      },
      ...mappedOptions,
    ];
  }, [
    industries,
    deletedIndustries,
    selectedIndustryId,
    industryResponse?.name,
    companyData?.industry,
  ]);

  const selectedDepartments = useMemo(() => {
    const combinedDepartments = [...companyDepartmentsList, ...masterDepartments];
    const departmentLookup = new Map<number, DepartmentRecord>();
    combinedDepartments.forEach((department) => {
      departmentLookup.set(department.id, department);
      departmentLookup.set(getMasterDepartmentId(department), department);
    });

    const selectedIds = new Set(selectedDepartmentIds.map((id) => Number(id)));
    return Array.from(selectedIds)
      .map((id) => departmentLookup.get(id))
      .filter(
        (
          department
        ): department is {
          id: number;
          name: string;
          status: boolean;
        } => Boolean(department)
      );
  }, [companyDepartmentsList, masterDepartments, selectedDepartmentIds]);
  const hasInitializedDepartments = React.useRef(false);
  const initialDepartmentIdsRef = React.useRef<Set<string>>(new Set());

  const isNewlySelectedDepartment = (departmentId: string | number): boolean => {
    const idString = String(departmentId);
    return !initialDepartmentIdsRef.current.has(idString);
  };

  const activeDepartmentOptionsCount = useMemo(
    () => departmentOptions.filter((department) => department.status !== false).length,
    [departmentOptions]
  );

  const selectedDepartmentsSummary = useMemo(() => {
    const selectedCount = selectedDepartments.length;
    const totalCount = activeDepartmentOptionsCount;

    if (totalCount > 0) {
      return `${selectedCount} of ${totalCount} departments selected`;
    }

    return `${selectedCount} departments selected`;
  }, [selectedDepartments.length, activeDepartmentOptionsCount]);

  const watchSecondaryFields = watch([
    'firstNameSecondary',
    'lastNameSecondary',
    'phoneSecondary',
    'emailSecondary',
  ]);
  const watchAllowedToManageLocation = watch('allowedToManageLocation');
  const hasManageLocationChanged = watchAllowedToManageLocation !== initialAllowedToManageLocation;
  const hasUnsavedChanges = isDirty || imageChanged || hasManageLocationChanged;
  const canSaveChanges =
    hasUnsavedChanges && !updateLoading && !updatingDepartmentLoading && isValid;

  const handleCancel = (): void => {
    if (hasUnsavedChanges) {
      setShowCancelConfirmation(true);
      return;
    }

    navigate(-1);
  };

  const addDepartmentsLocally = (departmentIds: number[]) => {
    if (departmentIds.length === 0) {
      return;
    }

    const existingMasterDepartmentIds = new Set(
      [...companyDepartmentsList, ...locallyAddedDepartments].map((department) =>
        getMasterDepartmentId(department)
      )
    );

    const departmentsToAdd = departmentIds
      .map((id) => {
        const matchedDepartment = masterDepartments.find(
          (department) => getMasterDepartmentId(department) === id || department.id === id
        );

        if (!matchedDepartment || existingMasterDepartmentIds.has(id)) {
          return null;
        }

        return {
          ...matchedDepartment,
          id,
          departmentId: id,
          masterDepartmentId: id,
          status: true,
        } as DepartmentRecord;
      })
      .filter((department): department is DepartmentRecord => Boolean(department));

    if (departmentsToAdd.length > 0) {
      setLocallyAddedDepartments((previous) => [...previous, ...departmentsToAdd]);
    }
  };
  useEffect(() => {
    const hasAnyValue = watchSecondaryFields.some(
      (field) => field && field.toString().trim() !== ''
    );
    setHasSecondaryData(hasAnyValue);
  }, [watchSecondaryFields]);

  useEffect(() => {
    if (selectedCountry && countries.length > 0 && !selectedCountryId) {
      const country = countries.find((c) => c.name === selectedCountry);
      if (country) {
        setSelectedCountryId(country.id);
      }
    }
  }, [selectedCountry, countries, selectedCountryId]);

  useEffect(() => {
    if (selectedState && states.length > 0 && !selectedStateId && selectedCountryId) {
      const state = states.find((s) => s.name === selectedState);
      if (state) {
        setSelectedStateId(state.id);
      }
    }
  }, [selectedState, states, selectedStateId, selectedCountryId]);

  useEffect(() => {
    if (companyData) {
      const locations = get(companyData, 'locations', []) as Array<Record<string, unknown>>;
      const primaryLocation =
        locations.find((location) => get(location, 'primary', false) === true) ||
        (get(companyData, 'primaryLocation', null) as Record<string, unknown> | null) ||
        (get(companyData, 'location', null) as Record<string, unknown> | null);

      const locationName = get(primaryLocation, 'name', '') || get(companyData, 'locationName', '');
      const locationCode = get(primaryLocation, 'code', '') || get(companyData, 'locationCode', '');
      const addressLine1 =
        get(primaryLocation, 'addressLine1', '') || get(companyData, 'addressLine1', '');
      const addressLine2 =
        get(primaryLocation, 'addressLine2', '') || get(companyData, 'addressLine2', '');
      const city = get(primaryLocation, 'city', '') || get(companyData, 'city', '');
      const state = get(primaryLocation, 'state', '') || get(companyData, 'state', '');
      const zip = get(primaryLocation, 'zipCode', '') || get(companyData, 'zip', '');
      const country = get(primaryLocation, 'country', '') || get(companyData, 'country', '');

      const cultureIntroText = companyData.cultureIntroText || '';

      // Map secondary role to role ID
      let secondaryRoleIdValue = '';
      if (companyData.secondaryRole && roles?.data) {
        if (roles?.data && Array.isArray(roles.data)) {
          const matchedRole = roles.data?.find(
            (role: Role) =>
              role.roleName?.toLowerCase() === companyData.secondaryRole?.toLowerCase()
          );
          if (matchedRole) {
            secondaryRoleIdValue = String(matchedRole.id);
          }
        }
      }

      reset({
        firstNamePrimary: companyData.primaryFirstName || '',
        lastNamePrimary: companyData.primaryLastName || '',
        firstNameSecondary: companyData.secondaryFirstName || '',
        lastNameSecondary: companyData.secondaryLastName || '',
        phonePrimary: formatPhoneNumber(companyData.primaryPhone || ''),
        phoneSecondary: formatPhoneNumber(companyData.secondaryPhone || ''),
        countryCodePrimary: companyData.primaryCountryCode || '+1',
        countryCodeSecondary: companyData.secondaryCountryCode || '+1',
        emailPrimary: companyData.primaryEmail || '',
        emailSecondary: companyData.secondaryEmail || '',
        companyName: companyData.companyName || '',
        locationName: String(locationName || ''),
        locationCode: String(locationCode || ''),
        addressLine1: String(addressLine1 || ''),
        addressLine2: String(addressLine2 || ''),
        titlePrimary: companyData.primaryTitle || '',
        titleSecondary: companyData.secondaryTitle || '',
        city: String(city || ''),
        state: String(state || ''),
        zip: String(zip || ''),
        country: String(country || ''),
        companyLogo: companyData.companyLogo || '',
        companyLogoType: companyData.companyLogoType || '',
        websiteLink: companyData.websiteUrl || '',
        departmentIds: [],
        status: companyData.status || false,
        allowedToManageLocation: companyData.allowedToManageLocation || false,
        cultureIntroText,
        cultureIntroDefaultEnabled:
          cultureIntroText.trim().length > 0 && Boolean(companyData.cultureIntroDefaultEnabled),
        isScoringConfigEditable:
          companyData.scoringConfigEditable ?? companyData.isScoringConfigEditable ?? false,
        candidateIntroEnabled: Boolean(companyData.candidateIntroEnabled),
        candidateEnquiriesEnabled: Boolean(companyData.candidateEnquiriesEnabled),
        roleIdSecondary: secondaryRoleIdValue, // Set secondary role ID
      });
      setSelectedCountry(String(country || ''));
      setSelectedState(String(state || ''));
      setSelectedCity(String(city || ''));

      if (companyData.companyLogo) {
        setImagePreview(companyData.companyLogo);
      }
      setImageChanged(false);
      setIsProfileDeleted(false);
      setValue(
        'industryId',
        String(companyData.companyIndustryId ?? companyData.industryId ?? ''),
        { shouldValidate: true }
      );
      trigger();
    }
  }, [companyData, reset, trigger, roles]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');

    if (requestedTab && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [activeTab, searchParams]);

  useEffect(() => {
    hasInitializedDepartments.current = false;
    setLocallyAddedDepartments([]);
    setCustomCreatedDepartmentIds(new Set());
  }, [parsedCompanyId]);

  useEffect(() => {
    if (companyDepartmentsLoading) {
      return;
    }

    if (companyDepartmentsData === undefined) {
      return;
    }

    const initialDepartmentIds = companyDepartmentsList
      .filter((department) => department.status !== false)
      .map((department) => String(getMasterDepartmentId(department)));

    const shouldHydrateDepartments =
      !hasInitializedDepartments.current ||
      (!isDirty && selectedDepartmentIds.length === 0 && initialDepartmentIds.length > 0);

    if (!shouldHydrateDepartments) {
      return;
    }

    initialDepartmentIdsRef.current = new Set(initialDepartmentIds);

    setValue('departmentIds', initialDepartmentIds, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });

    if (initialDepartmentIds.length > 0) {
      trigger('departmentIds');
    }

    hasInitializedDepartments.current = true;
  }, [
    companyDepartmentsData,
    companyDepartmentsList,
    companyDepartmentsLoading,
    isDirty,
    selectedDepartmentIds.length,
    setValue,
    trigger,
  ]);

  const handleCountryChange = (countryName: string) => {
    const country = countries.find((c) => c.name === countryName);
    setSelectedCountry(countryName);
    setSelectedCountryId(country?.id);
    setSelectedState('');
    setSelectedStateId(undefined);
    setSelectedCity('');
    setValue('country', countryName, { shouldDirty: true });
    setValue('state', '', { shouldDirty: true });
    setValue('city', '', { shouldDirty: true });
    trigger(['country', 'state', 'city']);
  };

  const handleStateChange = (stateName: string) => {
    const state = states.find((s) => s.name === stateName);
    setSelectedState(stateName);
    setSelectedStateId(state?.id);
    setSelectedCity('');
    setValue('state', stateName, { shouldDirty: true });
    setValue('city', '', { shouldDirty: true });
    trigger(['state', 'city']);
  };

  const handleCityChange = (cityName: string) => {
    setSelectedCity(cityName);
    setValue('city', cityName, { shouldDirty: true });
    trigger('city');
  };

  const handleSwitchChange = (checked: boolean) => {
    setValue('status', checked, { shouldDirty: true });
    trigger('status');
  };

  const handleManageLocationsToggle = (checked: boolean) => {
    setValue('allowedToManageLocation', checked, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    trigger('allowedToManageLocation');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValue(name as keyof EditCompanyFormValues, value, { shouldDirty: true });
    if (name.includes('Secondary')) {
      trigger([
        'firstNameSecondary',
        'lastNameSecondary',
        'phoneSecondary',
        'countryCodeSecondary',
        'emailSecondary',
        'roleIdSecondary',
      ]);
    } else {
      trigger(name as keyof EditCompanyFormValues);
    }
  };

  const handleSecondaryPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handlePhoneNumberChange(e, setValue, 'phoneSecondary', trigger);
    setTimeout(() => {
      trigger([
        'firstNameSecondary',
        'lastNameSecondary',
        'phoneSecondary',
        'countryCodeSecondary',
        'emailSecondary',
        'roleIdSecondary',
      ]);
    }, 0);
  };

  const handleSecondaryEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const noSpaces = e.target.value.replace(/\s/g, '');
    setValue('emailSecondary', noSpaces, { shouldDirty: true });
    setTimeout(() => {
      trigger([
        'firstNameSecondary',
        'lastNameSecondary',
        'phoneSecondary',
        'countryCodeSecondary',
        'emailSecondary',
        'roleIdSecondary',
      ]);
    }, 0);
  };

  const handleSecondaryCountryCodeChange = (value: string) => {
    setValue('countryCodeSecondary', value ?? '', { shouldDirty: true });
    setTimeout(() => {
      trigger([
        'firstNameSecondary',
        'lastNameSecondary',
        'phoneSecondary',
        'countryCodeSecondary',
        'emailSecondary',
        'roleIdSecondary',
      ]);
    }, 0);
  };

  const handleDeleteProfilePicture = () => {
    setImagePreview('');
    setValue('companyLogo', '');
    setValue('companyLogoType', '');
    setImageChanged(true);
    setIsProfileDeleted(true);
    showToast({ message: 'Logo removed. Save changes to apply.', type: 'success' });
  };

  const handleDepartmentChange = async (value: Array<string | number>) => {
    const normalizedValue = (value ?? []).map((item) => String(item));
    const currentSelectedIds = new Set(selectedDepartmentIds);
    const newSelectedIds = new Set(normalizedValue);

    const removedDepartmentIds = Array.from(currentSelectedIds).filter(
      (id) => !newSelectedIds.has(id)
    );

    const lockedDepartmentsBeingRemoved = removedDepartmentIds.filter(
      (id) => !isNewlySelectedDepartment(id)
    );

    if (lockedDepartmentsBeingRemoved.length > 0) {
      const correctedValue = [...normalizedValue, ...lockedDepartmentsBeingRemoved];
      setValue('departmentIds', correctedValue, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    const addedDepartmentIds = normalizedValue.filter((id) => !selectedDepartmentIds.includes(id));

    setValue('departmentIds', normalizedValue, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (addedDepartmentIds.length === 0) {
      return;
    }

    addDepartmentsLocally(addedDepartmentIds.map(Number));
  };

  const handleAddDepartment = async (departmentName: string) => {
    const trimmedDepartmentName = departmentName.trim().toLowerCase();
    if (!trimmedDepartmentName) {
      return;
    }

    const matchedDepartment = [...masterDepartments, ...companyDepartmentsList].find(
      (department) => department.name.toLowerCase() === trimmedDepartmentName
    );

    if (!matchedDepartment) {
      showToast({
        message: 'Please select a valid department from the list.',
        type: 'error',
      });
      return;
    }

    const matchedDepartmentId = String(getMasterDepartmentId(matchedDepartment));
    if (selectedDepartmentIds.includes(matchedDepartmentId)) {
      return;
    }

    const updatedDepartmentIds = [...selectedDepartmentIds, matchedDepartmentId];
    setValue('departmentIds', updatedDepartmentIds, {
      shouldDirty: true,
      shouldValidate: true,
    });

    addDepartmentsLocally([getMasterDepartmentId(matchedDepartment)]);
  };

  const handleIndustryChange = (value: string) => {
    setValue('industryId', value, { shouldDirty: true, shouldValidate: true });
    trigger('industryId');
  };

  const handleDeleteDepartment = async (departmentId: string | number) => {
    const numericDepartmentId = Number(departmentId);
    if (!Number.isFinite(numericDepartmentId)) {
      showToast({
        message: 'Invalid department selected.',
        type: 'error',
      });
      return;
    }

    const isLocallyAddedDepartment = locallyAddedDepartments.some(
      (department) => getMasterDepartmentId(department) === numericDepartmentId
    );

    if (isLocallyAddedDepartment) {
      setLocallyAddedDepartments((previous) =>
        previous.filter((department) => getMasterDepartmentId(department) !== numericDepartmentId)
      );

      const updatedDepartmentIds = selectedDepartmentIds.filter(
        (id) => Number(id) !== numericDepartmentId
      );

      setValue('departmentIds', updatedDepartmentIds, {
        shouldDirty: true,
        shouldValidate: true,
      });
      trigger('departmentIds');

      showToast({
        message: 'Department removed successfully.',
        type: 'success',
      });
      return;
    }

    const companyDepartmentToDelete = companyDepartmentsList.find(
      (department) => getMasterDepartmentId(department) === numericDepartmentId
    );

    if (!companyDepartmentToDelete) {
      const updatedDepartmentIds = selectedDepartmentIds.filter(
        (id) => Number(id) !== numericDepartmentId
      );

      setValue('departmentIds', updatedDepartmentIds, {
        shouldDirty: true,
        shouldValidate: true,
      });
      trigger('departmentIds');

      showToast({
        message: 'Department removed successfully.',
        type: 'success',
      });
      return;
    }

    try {
      await updateDepartment({
        departmentId: companyDepartmentToDelete.id,
        companyId: parsedCompanyId,
        name: companyDepartmentToDelete.name,
        status: 'INACTIVE',
      }).unwrap();

      const updatedDepartmentIds = selectedDepartmentIds.filter(
        (id) => Number(id) !== numericDepartmentId
      );

      setValue('departmentIds', updatedDepartmentIds, {
        shouldDirty: true,
        shouldValidate: true,
      });
      trigger('departmentIds');

      await refetchCompanyDepartments();
      showToast({
        message: 'Department deactivated successfully.',
        type: 'success',
      });
    } catch (error) {
      showToast({
        message: get(error, 'data.message', 'Failed to deactivate department.'),
        type: 'error',
      });
    }
  };

  const handleDeleteDepartmentAction = async (departmentId: string | number) => {
    const numericDepartmentId = Number(departmentId);
    if (!Number.isFinite(numericDepartmentId)) {
      showToast({
        message: 'Invalid department selected.',
        type: 'error',
      });
      return;
    }

    const isLocallyAddedDepartment = locallyAddedDepartments.some(
      (department) => getMasterDepartmentId(department) === numericDepartmentId
    );

    if (isLocallyAddedDepartment) {
      setLocallyAddedDepartments((previous) =>
        previous.filter((department) => getMasterDepartmentId(department) !== numericDepartmentId)
      );

      const updatedDepartmentIds = selectedDepartmentIds.filter(
        (id) => Number(id) !== numericDepartmentId
      );

      setValue('departmentIds', updatedDepartmentIds, {
        shouldDirty: true,
        shouldValidate: true,
      });
      trigger('departmentIds');

      setDepartmentSearchTerm('');
      setIsDepartmentsDropdownOpen(false);
      setIsDepartmentsFocused(false);

      showToast({
        message: 'Department deactivated successfully.',
        type: 'success',
      });
      return;
    }

    const companyDepartmentToDelete = baseCompanyDepartmentsList.find(
      (department) => getMasterDepartmentId(department) === numericDepartmentId
    );

    if (!companyDepartmentToDelete) {
      const updatedDepartmentIds = selectedDepartmentIds.filter(
        (id) => Number(id) !== numericDepartmentId
      );

      setValue('departmentIds', updatedDepartmentIds, {
        shouldDirty: true,
        shouldValidate: true,
      });
      trigger('departmentIds');

      showToast({
        message: 'Department deactivated successfully.',
        type: 'success',
      });
      return;
    }

    try {
      await updateDepartment({
        departmentId: companyDepartmentToDelete.id,
        companyId: parsedCompanyId,
        name: companyDepartmentToDelete.name,
        status: 'INACTIVE',
      }).unwrap();

      const updatedDepartmentIds = selectedDepartmentIds.filter(
        (id) => Number(id) !== numericDepartmentId
      );

      setValue('departmentIds', updatedDepartmentIds, {
        shouldDirty: true,
        shouldValidate: true,
      });
      trigger('departmentIds');

      await refetchCompanyDepartments();
      setDepartmentSearchTerm('');
      setIsDepartmentsDropdownOpen(false);
      setIsDepartmentsFocused(false);
      showToast({
        message: 'Department deactivated successfully.',
        type: 'success',
      });
    } catch (error) {
      showToast({
        message: get(error, 'data.message', 'Failed to deactivate department.'),
        type: 'error',
      });
    }
  };

  // Department handlers
  const handleAddDepartmentOption = async (departmentName: string) => {
    if (!departmentName.trim()) {
      showToast({
        message: 'Department name cannot be empty.',
        type: 'error',
      });
      return;
    }

    try {
      const response = await createDepartment({
        name: departmentName.trim(),
        companyId: parsedCompanyId,
        status: 'ACTIVE',
      }).unwrap();

      await refetchCompanyDepartments();

      showToast({
        message: 'Department created successfully.',
        type: 'success',
      });

      // Auto-select the newly created department
      const newDepartmentId = response.data?.id;
      if (newDepartmentId) {
        const normalizedDepartmentId = Number(newDepartmentId);
        if (Number.isFinite(normalizedDepartmentId)) {
          setCustomCreatedDepartmentIds((previous) => {
            const next = new Set(previous);
            next.add(normalizedDepartmentId);
            return next;
          });
        }

        const updatedDepartmentIds = [...selectedDepartmentIds, String(newDepartmentId)];
        setValue('departmentIds', updatedDepartmentIds, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    } catch (error) {
      showToast({
        message: get(error, 'data.message', 'Failed to create department.'),
        type: 'error',
      });
    }
  };

  const handleEditDepartmentOption = async (departmentId: string | number, newName: string) => {
    if (!newName.trim()) {
      showToast({
        message: 'Department name cannot be empty.',
        type: 'error',
      });
      return;
    }

    try {
      await updateDepartment({
        departmentId: Number(departmentId),
        companyId: parsedCompanyId,
        name: newName.trim(),
        status: 'ACTIVE',
      }).unwrap();

      await refetchCompanyDepartments();
      setDepartmentSearchTerm('');
      setIsDepartmentsDropdownOpen(false);
      setIsDepartmentsFocused(false);

      showToast({
        message: 'Department updated successfully.',
        type: 'success',
      });
    } catch (error) {
      showToast({
        message: get(error, 'data.message', 'Failed to update department.'),
        type: 'error',
      });
    }
  };

  const handleReuseDepartmentOption = async (departmentId: string | number) => {
    const numericDepartmentId = Number(departmentId);
    const matchedDepartment = [...companyDepartmentsList, ...masterDepartments].find(
      (department) =>
        getMasterDepartmentId(department) === numericDepartmentId ||
        department.id === numericDepartmentId
    );

    try {
      await updateDepartment({
        departmentId: numericDepartmentId,
        companyId: parsedCompanyId,
        name: matchedDepartment?.name ?? '',
        status: 'ACTIVE',
      }).unwrap();

      await refetchCompanyDepartments();
      setDepartmentSearchTerm('');
      setIsDepartmentsDropdownOpen(false);
      setIsDepartmentsFocused(false);

      showToast({
        message: 'Department reactivated successfully.',
        type: 'success',
      });
    } catch (error) {
      showToast({
        message: get(error, 'data.message', 'Failed to reactivate department.'),
        type: 'error',
      });
    }
  };

  // Industry handlers
  const handleAddIndustryOption = async (industryName: string) => {
    if (!industryName.trim()) {
      showToast({
        message: 'Industry name cannot be empty.',
        type: 'error',
      });
      return;
    }

    try {
      const response = await createIndustry({
        companyId: parsedCompanyId,
        industryName: industryName.trim(),
        status: true,
      }).unwrap();

      showToast({
        message: 'Industry created successfully.',
        type: 'success',
      });

      // Auto-select the newly created industry
      const newIndustryId = response.data?.id;
      if (newIndustryId) {
        setValue('industryId', String(newIndustryId), {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    } catch (error) {
      showToast({
        message: get(error, 'data.message', 'Failed to create industry.'),
        type: 'error',
      });
    }
  };

  const handleEditIndustryOption = async (industryId: string | number, newName: string) => {
    if (!newName.trim()) {
      showToast({
        message: 'Industry name cannot be empty.',
        type: 'error',
      });
      return;
    }

    try {
      await updateIndustry({
        industryId: Number(industryId),
        companyId: parsedCompanyId,
        name: newName.trim(),
        status: true,
      }).unwrap();

      await refetchIndustries();

      showToast({
        message: 'Industry updated successfully.',
        type: 'success',
      });
    } catch (error) {
      showToast({
        message: get(error, 'data.message', 'Failed to update industry.'),
        type: 'error',
      });
    }
  };

  const handleDeleteIndustryOption = async (industryId: string | number) => {
    const numericIndustryId = Number(industryId);
    const existingIndustry = industries.find((industry) => industry.id === numericIndustryId);
    if (!existingIndustry) {
      showToast({
        message: 'Invalid industry selected.',
        type: 'error',
      });
      return;
    }

    try {
      await updateIndustry({
        industryId: numericIndustryId,
        companyId: parsedCompanyId,
        name: existingIndustry.name,
        status: false,
      }).unwrap();

      await refetchIndustries();
      setDeletedIndustries((prev) => new Set(prev).add(numericIndustryId));

      showToast({
        message: 'Industry deactivated successfully.',
        type: 'success',
      });

      // Clear industry if it was selected
      if (watch('industryId') === String(numericIndustryId)) {
        setValue('industryId', '', {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    } catch (error) {
      showToast({
        message: get(error, 'data.message', 'Failed to deactivate industry.'),
        type: 'error',
      });
    }
  };

  const handleReuseIndustryOption = async (industryId: string | number) => {
    const numericIndustryId = Number(industryId);
    const existingIndustry = industries.find((industry) => industry.id === numericIndustryId);
    if (!existingIndustry) {
      showToast({
        message: 'Invalid industry selected.',
        type: 'error',
      });
      return;
    }

    try {
      await updateIndustry({
        industryId: numericIndustryId,
        companyId: parsedCompanyId,
        name: existingIndustry.name,
        status: true,
      }).unwrap();

      await refetchIndustries();

      setDeletedIndustries((prev) => {
        const newSet = new Set(prev);
        newSet.delete(numericIndustryId);
        return newSet;
      });

      showToast({
        message: 'Industry reactivated successfully.',
        type: 'success',
      });

      // Auto-select the reactivated industry
      setValue('industryId', String(numericIndustryId), {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (error) {
      showToast({
        message: get(error, 'data.message', 'Failed to reactivate industry.'),
        type: 'error',
      });
    }
  };

  const handleUpdateCompany = async (data: any) => {
    const cleanedPhonePrimary = cleanPhoneNumber(data.phonePrimary);
    const cleanedPhoneSecondary = cleanPhoneNumber(data.phoneSecondary);
    const submittedDepartmentIds: Array<string | number> = Array.isArray(data.departmentIds)
      ? data.departmentIds
      : selectedDepartmentIds;
    const newlyAddedDepartmentIds = submittedDepartmentIds
      .map((departmentId: string | number) => Number(departmentId))
      .filter(
        (departmentId: number): departmentId is number =>
          Number.isFinite(departmentId) &&
          !initialDepartmentIdsRef.current.has(String(departmentId)) &&
          !customCreatedDepartmentIds.has(departmentId)
      );

    // Get the secondary role ID
    const parsedSecondaryRoleId = data.roleIdSecondary ? Number(data.roleIdSecondary) : null;
    const secondaryRoleIdValue =
      parsedSecondaryRoleId != null && Number.isFinite(parsedSecondaryRoleId)
        ? parsedSecondaryRoleId
        : null;

    const updatedCompanyData = {
      companyId: companyId ? Number(companyId) : 0,
      companyLogo: data.companyLogo,
      companyLogoType: data.companyLogoType,
      companyName: makeFirstLetterUpperCase(sanitizeInput(data.companyName)),
      primaryFirstName: makeFirstLetterUpperCase(sanitizeInput(data.firstNamePrimary)),
      primaryLastName: makeFirstLetterUpperCase(sanitizeInput(data.lastNamePrimary)),
      primaryEmail: data.emailPrimary,
      primaryTitle: makeFirstLetterUpperCase(sanitizeInput(data.titlePrimary)) || '',
      primaryPhone: cleanedPhonePrimary,
      primaryCountryCode: data.countryCodePrimary,
      secondaryFirstName: makeFirstLetterUpperCase(sanitizeInput(data.firstNameSecondary)) || '',
      secondaryLastName: makeFirstLetterUpperCase(sanitizeInput(data.lastNameSecondary)) || '',
      secondaryEmail: data.emailSecondary || null,
      secondaryTitle: makeFirstLetterUpperCase(sanitizeInput(data.titleSecondary)) || '',
      secondaryPhone: cleanedPhoneSecondary || undefined,
      secondaryCountryCode: data.countryCodeSecondary || null,
      roleTypeMappingId: secondaryRoleIdValue, // Pass the selected role ID
      addressLine1: makeFirstLetterUpperCase(sanitizeInput(data.addressLine1)),
      addressLine2: makeFirstLetterUpperCase(sanitizeInput(data.addressLine2)) || '',
      locationName: makeFirstLetterUpperCase(sanitizeInput(data.locationName)) || '',
      locationCode: (makeFirstLetterUpperCase(sanitizeInput(data.locationCode)) || '').trim()
        ? makeFirstLetterUpperCase(sanitizeInput(data.locationCode)).trim()
        : null,
      city: makeFirstLetterUpperCase(sanitizeInput(data.city)) || '',
      state: makeFirstLetterUpperCase(sanitizeInput(data.state)) || '',
      zip: makeFirstLetterUpperCase(sanitizeInput(data.zip)) || '',
      country: makeFirstLetterUpperCase(sanitizeInput(data.country)) || '',
      websiteUrl: data.websiteLink || null,
      companyIndustryId: Number(data.industryId) || null,
      departmentIds: newlyAddedDepartmentIds.length > 0 ? newlyAddedDepartmentIds : undefined,
      status: data.status,
      allowedToManageLocation:
        typeof data.allowedToManageLocation === 'boolean'
          ? data.allowedToManageLocation
          : initialAllowedToManageLocation,
      cultureIntroText: data.cultureIntroText || '',
      cultureIntroDefaultEnabled:
        String(data.cultureIntroText || '').trim().length > 0 &&
        Boolean(data.cultureIntroDefaultEnabled),
      isScoringConfigEditable: Boolean(data.isScoringConfigEditable),
      candidateIntroEnabled: Boolean(data.candidateIntroEnabled),
      candidateEnquiriesEnabled: Boolean(data.candidateEnquiriesEnabled),
      companyLogoDeleted: isProfileDeleted,
    };

    if (imageChanged) {
      updatedCompanyData.companyLogo = isProfileDeleted ? null : data.companyLogo;
      updatedCompanyData.companyLogoType = isProfileDeleted ? null : data.companyLogoType;
    } else {
      updatedCompanyData.companyLogo = null;
      updatedCompanyData.companyLogoType = null;
    }

    updateCompany(updatedCompanyData)
      .unwrap()
      .then(async (res) => {
        if (res) {
          await refetchCompanyDepartments();
          showToast({
            message: get(res, 'message', 'User has been updated successfully'),
            type: 'success',
          });
          navigate(-1);
        } else {
          showToast({
            message: get(res, 'message', 'Failed to update user. Please try again.'),
            type: 'error',
          });
        }
      })
      .catch((err) => {
        showToast({
          message: get(err, 'data.message', 'Failed to update user. Please try again.'),
          type: 'error',
        });
      });
  };

  const handleFileUpload = async (file: File) => {
    try {
      // Validate file type
      if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
        showToast({ message: LOGO_FILE_TYPE_ERROR_MESSAGE, type: 'error' });
        return Upload.LIST_IGNORE;
      }

      // Validate file size (must not exceed 5 MB)
      if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
        showToast({ message: LOGO_FILE_SIZE_ERROR_MESSAGE, type: 'error' });
        return Upload.LIST_IGNORE;
      }

      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);

      const base64 = await convertFileToBase64(file);
      setValue('companyLogo', base64);
      setValue('companyLogoType', file.name);
      setImageChanged(true);
      setIsProfileDeleted(false);
      showToast({
        message: 'Image uploaded successfully. Save changes to apply.',
        type: 'success',
      });
    } catch (err) {
      console.error(err);
      showToast({ message: (err as Error).message || 'Image processing failed.', type: 'error' });
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const primaryLocation = locationsResponse?.content?.find((location) => location.primary);

  const editLocations = get(companyData, 'locations', []) as Array<Record<string, unknown>>;
  const editPrimaryLocation =
    editLocations.find((location) => get(location, 'primary', false) === true) ||
    (get(companyData, 'primaryLocation', null) as Record<string, unknown> | null) ||
    (get(companyData, 'location', null) as Record<string, unknown> | null);

  const companyAddress = [
    watch('addressLine1') ||
      get(editPrimaryLocation, 'addressLine1', get(companyData, 'addressLine1', '')),
    watch('addressLine2') ||
      get(editPrimaryLocation, 'addressLine2', get(companyData, 'addressLine2', '')),
    watch('city') || get(editPrimaryLocation, 'city', get(companyData, 'city', '')),
    watch('state') || get(editPrimaryLocation, 'state', get(companyData, 'state', '')),
    watch('zip') ||
      get(
        editPrimaryLocation,
        'zipCode',
        get(editPrimaryLocation, 'zip', get(companyData, 'zip', get(companyData, 'zipCode', '')))
      ),
    watch('country') || get(editPrimaryLocation, 'country', get(companyData, 'country', '')),
  ]
    .filter(Boolean)
    .join(', ');

  const companyAddressMapUrl = companyAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(companyAddress)}`
    : '';

  return (
    <div>
      <MainLayout>
        <div className="p-4 pt-16 relative">
          {isLoading && <Loader />}
          <div className="mb-4 self-start px-6 py-4 absolute">
            <button
              onClick={handleCancel}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
            >
              <MdOutlineArrowBack className="mr-2" />
              <span>Back</span>
            </button>
          </div>
          <div className="w-full p-4 pt-14">
            <div className="flex gap-4 bg-[#FAFAFA] rounded-3xl p-4">
              <div
                className="relative w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden group"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {imagePreview ? (
                  <img
                    src={sanitizeImagePreview(imagePreview)}
                    alt={watch('companyName') || 'companyLogo'}
                    className="w-full h-full object-cover"
                    onError={() => {
                      setImageLoadFailed(true);
                      setImagePreview('');
                    }}
                  />
                ) : (
                  <span className="text-xl font-semibold text-white">
                    {watch('companyName')?.[0]?.toUpperCase() || ''}
                  </span>
                )}

                <Upload
                  beforeUpload={handleFileUpload}
                  showUploadList={false}
                  className="hidden"
                  accept="image/png, image/jpeg, image/jpg"
                >
                  <button ref={uploadRef} className="hidden"></button>
                </Upload>
                {isHovered && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 gap-2">
                    <div
                      onClick={() => uploadRef.current?.click()}
                      className="bg-primary rounded-full p-2 cursor-pointer hover:bg-primary-dark"
                    >
                      <MdEdit className="text-white text-xl" />
                    </div>
                    {imagePreview && (
                      <div
                        className="bg-red-500 rounded-full p-2 cursor-pointer hover:bg-red-600"
                        onClick={handleDeleteProfilePicture}
                      >
                        <MdDelete className="text-white text-xl" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{watch('companyName')}</h2>
                <div className="flex items-center text-sm gap-2">
                  <MdEmail size={16} />
                  <a href={`mailto:${watch('emailPrimary')}`} className="underline">
                    {watch('emailPrimary')}
                  </a>
                </div>
                <div className="flex items-center text-sm gap-2">
                  <MdPhone size={16} />
                  <a
                    href={`tel:${watch('countryCodePrimary')}${watch('phonePrimary')}`}
                    className="underline"
                  >
                    {watch('countryCodePrimary')}-{formatPhoneNumber(watch('phonePrimary'))}
                  </a>
                </div>
                <div className="flex items-center text-sm gap-2">
                  <MdOutlineLocationOn size={16} />
                  {companyAddress ? (
                    <a
                      href={companyAddressMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {companyAddress}
                    </a>
                  ) : (
                    <span>-</span>
                  )}
                </div>
              </div>
              <div className="items-start flex gap-1">
                <div className="p-1 text-sm flex flex-col items-end gap-1.5">
                  <Switch
                    checked={watch('status')}
                    checkedChildren="ACTIVE"
                    unCheckedChildren="INACTIVE"
                    onChange={handleSwitchChange}
                    style={{
                      backgroundColor: watch('status') ? 'var(--color-primary)' : '#CDC721',
                      color: 'white',
                    }}
                  />
                  <div className="flex items-center gap-2 self-end">
                    <span className="text-sm whitespace-nowrap">
                      Allow Company to Manage Locations
                    </span>
                    <Switch
                      checked={watch('allowedToManageLocation')}
                      onChange={handleManageLocationsToggle}
                      style={{
                        backgroundColor: watch('allowedToManageLocation')
                          ? 'var(--color-primary)'
                          : undefined,
                        color: 'white',
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 self-end">
                    <span className="text-sm whitespace-nowrap">Is Scoring Config Editable</span>
                    <Switch
                      checked={Boolean(watch('isScoringConfigEditable'))}
                      onChange={(checked) => {
                        setValue('isScoringConfigEditable', checked, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      style={{
                        backgroundColor: watch('isScoringConfigEditable')
                          ? 'var(--color-primary)'
                          : undefined,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 self-end">
                    <span className="text-sm whitespace-nowrap">
                      Enable Candidate Intro in AI Audio Call
                    </span>
                    <Switch
                      checked={Boolean(watch('candidateIntroEnabled'))}
                      onChange={(checked) => {
                        setValue('candidateIntroEnabled', checked, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      style={{
                        backgroundColor: watch('candidateIntroEnabled')
                          ? 'var(--color-primary)'
                          : undefined,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 self-end">
                    <span className="text-sm whitespace-nowrap">
                      Enable General Inquiry in AI Audio Call
                    </span>
                    <Switch
                      checked={Boolean(watch('candidateEnquiriesEnabled'))}
                      onChange={(checked) => {
                        setValue('candidateEnquiriesEnabled', checked, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      style={{
                        backgroundColor: watch('candidateEnquiriesEnabled')
                          ? 'var(--color-primary)'
                          : undefined,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              destroyInactiveTabPane={false}
              items={[
                {
                  key: '1',
                  label: <span className="px-4 py-2 font-medium">Company Details</span>,
                },
                {
                  key: '2',
                  label: <span className="px-4 py-2 font-medium">Locations</span>,
                },
                {
                  key: '3',
                  label: <span className="px-4 py-2 font-medium">Users</span>,
                },
              ]}
              className="custom-tabs mt-4"
            />
            {activeTab === '1' && (
              <>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Company Information</h2>
                </div>
                <div className="grid grid-cols-3 gap-x-4 mt-4">
                  {/* Company Name */}
                  <div className="mt-4">
                    <label className="text-sm capitalize">
                      Company Name <span className="required-asterisk">*</span>
                    </label>
                    <Input
                      type="text"
                      className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      {...register('companyName')}
                      onChange={handleInputChange}
                      placeholder="Company Name"
                    />
                    <p className="text-red-500">{errors.companyName?.message}</p>
                  </div>
                  {/* Company website url */}
                  <div className="mt-4">
                    <label className="text-sm capitalize ">Company website url</label>
                    <Input
                      className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      {...register('websiteLink')}
                      placeholder="Website Link"
                      onChange={handleInputChange}
                    />
                    <p className="text-red-500">{errors.websiteLink?.message}</p>
                  </div>

                  <div className="mt-4">
                    <label className="text-sm capitalize">Industry</label>
                    <DropdownWithAddOption
                      className="w-full custom-select-jobs placeholder-style"
                      value={selectedIndustryId || undefined}
                      onChange={handleIndustryChange}
                      options={industryOptions}
                      loading={loadingIndustries}
                      placeholder="Select Industry"
                      label="Industry"
                      type="industry"
                      enableEditDelete={true}
                      onAddOption={handleAddIndustryOption}
                      onEditOption={handleEditIndustryOption}
                      onDeleteOption={handleDeleteIndustryOption}
                      onReuseOption={handleReuseIndustryOption}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-x-4 mt-4">
                  <div className="mt-4 ">
                    <label className="text-sm capitalize">Departments</label>

                    <div
                      className="relative"
                      onFocus={() => setIsDepartmentsFocused(true)}
                      onBlur={() => setIsDepartmentsFocused(false)}
                    >
                      <DropdownWithAddOption
                        className="w-full custom-select-jobs placeholder-style"
                        mode="multiple"
                        value={selectedDepartmentIds}
                        onChange={handleDepartmentChange}
                        onSearchChange={setDepartmentSearchTerm}
                        onOpenChange={setIsDepartmentsDropdownOpen}
                        options={departmentOptions.map((department) => ({
                          id: String(getMasterDepartmentId(department)),
                          name: department.name,
                          isDeleted: department.status === false,
                        }))}
                        loading={
                          companyDepartmentsLoading ||
                          (isDepartmentSearchActive
                            ? searchedMasterDepartmentsLoading
                            : masterDepartmentsLoading)
                        }
                        placeholder="Select Departments"
                        label="Department"
                        type="department"
                        enableEditDelete={!isDepartmentSearchActive}
                        onAddOption={handleAddDepartmentOption}
                        onEditOption={handleEditDepartmentOption}
                        onDeleteOption={(id) => handleDeleteDepartmentAction(id)}
                        onReuseOption={handleReuseDepartmentOption}
                        maxTagCount={0}
                        maxTagPlaceholder={() => null}
                        tagRender={() => <></>}
                      />
                      {selectedDepartmentIds.length > 0 &&
                        !isDepartmentsFocused &&
                        !isDepartmentsDropdownOpen && (
                          <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                            <span className="text-sm text-gray-700 truncate max-w-xs">
                              {selectedDepartmentIds.length} of {activeDepartmentOptionsCount || 0}{' '}
                              departments selected
                            </span>
                          </div>
                        )}
                    </div>

                    {errors.departmentIds && (
                      <p className="text-red-500">{errors.departmentIds.message as string}</p>
                    )}

                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mt-3 max-h-40 overflow-auto pr-2">
                      {companyDepartmentsLoading ? (
                        <span className="text-sm text-gray-600">Loading departments...</span>
                      ) : selectedDepartments.length > 0 ? (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Selected Departments
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedDepartments.map((department) => {
                              const isNewlyAdded = isNewlySelectedDepartment(
                                String(getMasterDepartmentId(department))
                              );
                              return (
                                <span
                                  key={department.id}
                                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${'bg-gray-200 text-gray-700 border border-gray-300'}`}
                                >
                                  {department.name}
                                </span>
                              );
                            })}
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-gray-600">No departments assigned</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 ">
                    <label className="text-sm capitalize">Culture Introduction</label>
                    <Textarea
                      rows={7}
                      className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-2xl text-gray-700 leading-7 resize-none"
                      value={cultureIntroText}
                      onChange={(event) => {
                        const value = event.target.value;
                        const hasValue = value.trim().length > 0;

                        setValue('cultureIntroText', value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });

                        if (!hasValue) {
                          setValue('cultureIntroDefaultEnabled', false, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }
                      }}
                      placeholder="Enter culture introduction text"
                    />
                    <div className="mt-3 flex items-center gap-3">
                      <Switch
                        checked={isCultureIntroDefaultEnabled}
                        onChange={(checked) => {
                          setValue('cultureIntroDefaultEnabled', checked, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                        disabled={!hasCultureIntroText}
                        style={{
                          backgroundColor: isCultureIntroDefaultEnabled
                            ? 'var(--color-primary)'
                            : undefined,
                        }}
                      />
                      <span className="text-sm text-gray-700 leading-5">
                        Enable Culture Introduction by default for new jobs
                      </span>
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mt-4 mb-2">Primary Contact</h3>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {/* First Name */}
                  <div>
                    <label className="text-sm capitalize">
                      First Name <span className="required-asterisk">*</span>
                    </label>
                    <Input
                      {...register('firstNamePrimary')}
                      type="text"
                      maxLength={100}
                      placeholder="First name"
                      onChange={handleInputChange}
                      className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                    />
                    <p className="text-red-500">{errors.firstNamePrimary?.message}</p>
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="text-sm capitalize">
                      Last Name <span className="required-asterisk">*</span>
                    </label>
                    <Input
                      type="text"
                      maxLength={100}
                      placeholder="Last Name"
                      className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      {...register('lastNamePrimary')}
                      onChange={handleInputChange}
                    />
                    <p className="text-red-500">{errors.lastNamePrimary?.message}</p>
                  </div>
                  {/* Phone Number */}
                  <div>
                    <label className="text-sm capitalize">
                      Phone Number <span className="required-asterisk">*</span>
                    </label>
                    <div className="phone-input-wrapper flex items-center bg-white w-full px-4 mt-1 border rounded-3xl border-[var(--border)]">
                      {/* Country Code Select */}
                      <Select
                        value={watch('countryCodePrimary')}
                        onChange={(value) => {
                          setValue('countryCodePrimary', value, { shouldDirty: true });
                          trigger('countryCodePrimary');
                        }}
                        className="border-none focus:ring-0 focus:outline-none bg-transparent"
                        dropdownStyle={{ minWidth: '300px' }}
                        variant="borderless"
                        style={{ width: '80px', fontSize: '14px' }}
                        options={countryCodes.map(({ label, value, short }) => ({
                          label: `${short} - ${label}`,
                          value,
                        }))}
                        optionLabelProp="value"
                        showSearch
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        placeholder="Search..."
                        tabIndex={-1}
                      />
                      <div className="border-l-2 border-gray-300 h-6 mx-2"></div>

                      {/* Phone Number Input */}
                      <Input
                        type="tel"
                        value={watch('phonePrimary')}
                        placeholder="(555) 123-4567"
                        className="border-none focus:ring-0 focus:outline-none w-full"
                        onChange={(e) =>
                          handlePhoneNumberChange(e, setValue, 'phonePrimary', trigger)
                        }
                        maxLength={14}
                      />
                    </div>
                    <p className="text-red-500">{errors.countryCodePrimary?.message}</p>
                    <p className="text-red-500">{errors.phonePrimary?.message}</p>
                  </div>
                  {/* Email */}
                  <div>
                    <label className="text-sm capitalize">
                      Email <span className="required-asterisk">*</span>
                    </label>
                    <Input
                      className=" w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      value={watch('emailPrimary')}
                      placeholder="Email"
                      onChange={(e) => {
                        const noSpaces = e.target.value.replace(/\s/g, '');
                        setValue('emailPrimary', noSpaces, { shouldDirty: true });
                        trigger('emailPrimary');
                      }}
                    />
                    <p className="text-red-500">{errors.emailPrimary?.message}</p>
                  </div>
                  {/* Title */}
                  <div>
                    <label className="text-sm capitalize">Title</label>
                    <Input
                      type="text"
                      maxLength={100}
                      className=" w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      {...register('titlePrimary')}
                      placeholder="Title"
                      onChange={handleInputChange}
                    />
                    <p className="text-red-500">{errors.titlePrimary?.message}</p>
                  </div>
                  {/* Role */}
                  <div>
                    <label className="text-sm capitalize">
                      Role <span className="required-asterisk">*</span>
                    </label>
                    <Input
                      type="text"
                      className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      value={companyData?.primaryRole || ''}
                      placeholder="Role"
                      disabled
                    />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mt-4 mb-2">Secondary Contact</h3>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {/* First Name */}
                  <div>
                    <label className="text-sm capitalize">
                      First Name {hasSecondaryData && <span className="required-asterisk">*</span>}
                    </label>
                    <Input
                      type="text"
                      maxLength={100}
                      className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      {...register('firstNameSecondary')}
                      placeholder="First name"
                      onChange={handleInputChange}
                    />
                    <p className="text-red-500">{errors.firstNameSecondary?.message}</p>
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="text-sm capitalize">
                      Last Name {hasSecondaryData && <span className="required-asterisk">*</span>}
                    </label>
                    <Input
                      type="text"
                      maxLength={100}
                      placeholder="Last Name"
                      className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      {...register('lastNameSecondary')}
                      onChange={handleInputChange}
                    />
                    <p className="text-red-500">{errors.lastNameSecondary?.message}</p>
                  </div>
                  {/* Phone Number */}
                  <div>
                    <label className="text-sm capitalize">
                      Phone Number{' '}
                      {hasSecondaryData && <span className="required-asterisk">*</span>}
                    </label>
                    <div className="phone-input-wrapper flex items-center bg-white w-full px-4 mt-1 border rounded-3xl border-[var(--border)]">
                      {/* Country Code Select */}
                      <Select
                        value={watch('countryCodeSecondary')}
                        onChange={handleSecondaryCountryCodeChange}
                        className="border-none focus:ring-0 focus:outline-none bg-transparent"
                        dropdownStyle={{ minWidth: '300px' }}
                        variant="borderless"
                        style={{ width: '80px', fontSize: '14px' }}
                        options={countryCodes.map(({ label, value, short }) => ({
                          label: `${short} - ${label}`,
                          value,
                        }))}
                        optionLabelProp="value"
                        showSearch
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        allowClear
                        tabIndex={-1}
                      />
                      <div className="border-l-2 border-gray-300 h-6 mx-2"></div>

                      {/* Phone Number Input */}
                      <Input
                        type="tel"
                        value={watch('phoneSecondary')}
                        placeholder="(555) 123-4567"
                        className="border-none focus:ring-0 focus:outline-none w-full"
                        onChange={handleSecondaryPhoneChange}
                        maxLength={14}
                      />
                    </div>
                    <p className="text-red-500">{errors.countryCodeSecondary?.message}</p>
                    <p className="text-red-500">{errors.phoneSecondary?.message}</p>
                  </div>
                  {/* Email */}
                  <div>
                    <label className="text-sm capitalize">
                      Email {hasSecondaryData && <span className="required-asterisk">*</span>}
                    </label>
                    <Input
                      className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      value={watch('emailSecondary')}
                      placeholder="Email"
                      onChange={handleSecondaryEmailChange}
                    />
                    <p className="text-red-500">{errors.emailSecondary?.message}</p>
                  </div>
                  {/* Title */}
                  <div>
                    <label className="text-sm capitalize">Title</label>
                    <Input
                      type="text"
                      maxLength={100}
                      placeholder="Title"
                      className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      {...register('titleSecondary')}
                      onChange={handleInputChange}
                    />
                    <p className="text-red-500">{errors.titleSecondary?.message}</p>
                  </div>
                  {/* Role - Now Editable */}
                  {/* Role - Show but conditionally editable */}
                  <div>
                    <label className="text-sm capitalize">
                      Role {hasSecondaryData && <span className="required-asterisk">*</span>}
                    </label>
                    <div className="border-wrapper border border-[var(--border)] p-1 mt-1 w-full rounded-3xl">
                      {isEditSecondaryContactRoleEnabled ? (
                        <Select
                          value={
                            secondaryRoleId && secondaryRoleId !== 'undefined'
                              ? secondaryRoleId
                              : undefined
                          }
                          onChange={(value) => {
                            setValue('roleIdSecondary', value != null ? String(value) : '', {
                              shouldDirty: true,
                            });
                            trigger([
                              'firstNameSecondary',
                              'lastNameSecondary',
                              'phoneSecondary',
                              'countryCodeSecondary',
                              'emailSecondary',
                              'roleIdSecondary',
                            ]);
                          }}
                          className="w-full custom-select"
                          placeholder="Select Role"
                          popupClassName="rounded-3xl"
                          loading={rolesLoading}
                          disabled={!hasSecondaryData}
                          allowClear
                        >
                          {Array.isArray(roles?.data) &&
                            roles.data.map((role: Role) => (
                              <Option key={role.id} value={String(role.id)}>
                                {role.roleName}
                              </Option>
                            ))}
                        </Select>
                      ) : (
                        <Input
                          type="text"
                          className="w-full p-2 bg-gray-50 border-none focus:ring-0 focus:outline-none"
                          value={(() => {
                            const selectedRole = Array.isArray(roles?.data)
                              ? roles.data.find((role: Role) => String(role.id) === secondaryRoleId)
                              : null;
                            return selectedRole?.roleName || companyData?.secondaryRole || '-';
                          })()}
                          disabled
                          readOnly
                        />
                      )}
                    </div>
                    {hasSecondaryData && errors.roleIdSecondary && (
                      <p className="text-red-500">{errors.roleIdSecondary.message as string}</p>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-semibold mt-4 mb-2">LOCATION (PRIMARY)</h3>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {/* Location Name */}
                  <div>
                    <label className="text-sm capitalize">
                      Location Name <span className="required-asterisk">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Location Name"
                      className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      {...register('locationName')}
                      onChange={handleInputChange}
                    />
                    <p className="text-red-500">{errors.locationName?.message}</p>
                  </div>

                  {/* Location Code */}
                  <div>
                    <label className="text-sm capitalize">Location Code</label>
                    <Input
                      type="text"
                      placeholder="Location Code"
                      className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      {...register('locationCode')}
                      onChange={handleInputChange}
                    />
                    <p className="text-red-500">{errors.locationCode?.message}</p>
                  </div>
                </div>

                {/* Address Line 1 */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="text-sm capitalize">
                      Address Line 1 <span className="required-asterisk">*</span>
                    </label>
                    <Input
                      type="text"
                      placeholder="Address Line 1"
                      className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      {...register('addressLine1')}
                      onChange={handleInputChange}
                    />
                    <p className="text-red-500">{errors.addressLine1?.message}</p>
                  </div>

                  {/* Address Line 2 */}
                  <div>
                    <label className="text-sm capitalize">Address Line 2</label>
                    <Input
                      type="text"
                      placeholder="Address Line 2"
                      className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      {...register('addressLine2')}
                      onChange={handleInputChange}
                    />
                    <p className="text-red-500">{errors.addressLine2?.message}</p>
                  </div>
                </div>

                {/* Country */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="text-sm capitalize">
                      Country <span className="required-asterisk">*</span>
                    </label>
                    <div className="border-wrapper border border-[var(--border)] p-1 mt-1 w-full rounded-3xl">
                      <Select
                        showSearch
                        placeholder="Select Country"
                        optionFilterProp="children"
                        loading={loadingCountries}
                        onChange={handleCountryChange}
                        filterOption={false}
                        className="w-full custom-select-company placeholder-style"
                        value={selectedCountry || undefined}
                      >
                        {countries.map((country) => (
                          <Option key={country.id} value={country.name}>
                            {country.name}
                          </Option>
                        ))}
                      </Select>
                    </div>
                    <p className="text-red-500">{errors.country?.message}</p>
                  </div>

                  {/* State Dropdown */}
                  <div>
                    <label className="text-sm capitalize">
                      State <span className="required-asterisk">*</span>
                    </label>
                    <div className="border-wrapper border border-[var(--border)] p-1 mt-1 w-full rounded-3xl">
                      <Select
                        showSearch
                        placeholder="Select State"
                        onChange={handleStateChange}
                        disabled={!selectedCountry}
                        className="w-full custom-select-company placeholder-style"
                        value={selectedState || undefined}
                      >
                        {states.map((state) => (
                          <Option key={state.id} value={state.name}>
                            {state.name}
                          </Option>
                        ))}
                      </Select>
                    </div>
                    <p className="text-red-500">{errors.state?.message}</p>
                  </div>

                  {/* City Dropdown */}
                  <div>
                    <label className="text-sm capitalize">
                      City <span className="required-asterisk">*</span>
                    </label>
                    <div className="border-wrapper border border-[var(--border)] p-1 mt-1 w-full rounded-3xl">
                      <Select
                        showSearch
                        placeholder="Select City"
                        onChange={handleCityChange}
                        disabled={!selectedState}
                        className="w-full custom-select-company placeholder-style"
                        value={selectedCity || undefined}
                      >
                        {cities.map((city) => (
                          <Option key={city.id} value={city.name}>
                            {city.name}
                          </Option>
                        ))}
                      </Select>
                    </div>
                    <p className="text-red-500">{errors.city?.message}</p>
                  </div>

                  {/* Zip */}
                  <div>
                    <label className="text-sm capitalize">
                      Zip Code <span className="required-asterisk">*</span>
                    </label>
                    <Input
                      type="text"
                      className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                      {...register('zip')}
                      onChange={handleInputChange}
                      placeholder="Zip Code"
                    />
                    <p className="text-red-500">{errors.zip?.message}</p>
                  </div>
                </div>
              </>
            )}
            {activeTab === '2' && <CompanyLocations companyId={companyId} />}
            {activeTab === '3' && <CompanyUsers />}
          </div>
        </div>
        {activeTab === '1' && (
          <div className="flex w-full gap-2 p-8 pt-26 justify-end">
            {(updateLoading || updatingDepartmentLoading) && <Loader />}
            <Button
              appname=""
              className="w-40 bg-white border text-black p-2 rounded-3xl "
              onClick={handleCancel}
            >
              CANCEL
            </Button>
            <Button
              disabled={!canSaveChanges}
              className="w-40 p-2 bg-primary text-white rounded-3xl disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleSubmit(handleUpdateCompany)}
            >
              {updateLoading ? 'UPDATING...' : 'SAVE CHANGES'}
            </Button>
          </div>
        )}
      </MainLayout>
      {showCancelConfirmation && (
        <ConfirmationModal
          onClose={() => setShowCancelConfirmation(false)}
          onConfirm={() => {
            setShowCancelConfirmation(false);
            navigate(-1);
          }}
          title="Are you sure you want to leave? Unsaved changes will be lost."
          confirmText="LEAVE PAGE"
        />
      )}
    </div>
  );
};

export default EditCompany;
