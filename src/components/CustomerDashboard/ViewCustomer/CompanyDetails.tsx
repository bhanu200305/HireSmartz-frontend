import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Select, Switch, Button } from 'antd';
import { Input, showToast, Textarea } from '../../shared';
import DropdownWithAddOption from '../../shared/ui/DropdownWithAddOption';
import { formatPhoneNumber } from '../../../shared/utils/methods';
import { countryCodes } from '../../../constants/countryCode';
import { CompanyDetailsResponse } from '../../../api/tenant-service/Company/viewCompany';
import { MdEdit, MdDelete } from 'react-icons/md';
import { shallowEqual, useSelector } from 'react-redux';
import { RootState } from '../../../redux/provider/store';
import { get } from 'lodash-es';
import {
  UpdateCompanyOrgRequest,
  useUpdateCompanyOrgMutation,
} from '../../../api/tenant-service/Company/updateCompany';
import {
  useCreateDepartmentMutation,
  useCreateIndustryMutation,
  useGetAllDepartmentsQuery,
  useGetCompanyIndustriesQuery,
  useGetDepartmentsByCompanyIdQuery,
  useGetCompanyIndustryByIdQuery,
  useUpdateCompanyLocationMutation,
  useUpdateDepartmentMutation,
  useUpdateIndustryMutation,
} from '../../../api/tenant-service/Company/addCompany';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';

interface CompanyDetailsProps {
  companyData: CompanyDetailsResponse;
  onCompanyUpdated?: () => Promise<unknown> | unknown;
  onDirtyChange?: (isDirty: boolean) => void;
  isEditMode?: boolean;
  onEditModeChange?: (isEditMode: boolean) => void;
  logoEditState?: {
    base64: string;
    fileName: string;
    isDirty: boolean;
    isDeleted?: boolean;
  };
}

type CompanyEditFormState = {
  companyName: string;
  websiteUrl: string;
  primaryFirstName: string;
  primaryLastName: string;
  primaryCountryCode: string;
  primaryPhone: string;
  primaryEmail: string;
  primaryTitle: string;
  secondaryFirstName: string;
  secondaryLastName: string;
  secondaryCountryCode: string;
  secondaryPhone: string;
  secondaryEmail: string;
  secondaryTitle: string;
  cultureIntroText: string;
  cultureIntroDefaultEnabled: boolean;
  locationName: string;
  locationCode: string | null;
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  zip: string;
};

type CompanyEditBaselineState = {
  formState: CompanyEditFormState;
  industryId: string;
  departmentIds: string[];
};

const getPrimaryLocationRecord = (
  companyData: CompanyDetailsResponse
): Record<string, unknown> | null => {
  const locations = get(companyData, 'locations', []) as Array<Record<string, unknown>>;

  return (
    locations.find((location) => get(location, 'primary', false) === true) ||
    (get(companyData, 'primaryLocation', null) as Record<string, unknown> | null) ||
    (get(companyData, 'location', null) as Record<string, unknown> | null)
  );
};

const mapCompanyDataToFormState = (companyData: CompanyDetailsResponse): CompanyEditFormState => {
  const primaryLocation = getPrimaryLocationRecord(companyData);
  const primaryLocationCode = get(primaryLocation, 'code');

  return {
    companyName: companyData.companyName || '',
    websiteUrl: companyData.websiteUrl || '',
    primaryFirstName: companyData.primaryFirstName || '',
    primaryLastName: companyData.primaryLastName || '',
    primaryCountryCode: companyData.primaryCountryCode || '+1',
    primaryPhone: formatPhoneNumber(companyData.primaryPhone || ''),
    primaryEmail: companyData.primaryEmail || '',
    primaryTitle: companyData.primaryTitle || '',
    secondaryFirstName: companyData.secondaryFirstName || '',
    secondaryLastName: companyData.secondaryLastName || '',
    secondaryCountryCode: companyData.secondaryCountryCode || '+1',
    secondaryPhone: formatPhoneNumber(companyData.secondaryPhone || ''),
    secondaryEmail: companyData.secondaryEmail || '',
    secondaryTitle: companyData.secondaryTitle || '',
    cultureIntroText: companyData.cultureIntroText || '',
    cultureIntroDefaultEnabled: companyData.cultureIntroDefaultEnabled || false,
    locationName:
      (get(primaryLocation, 'name', '') as string) || get(companyData, 'locationName', ''),
    locationCode:
      primaryLocationCode == null
        ? get(companyData, 'locationCode', null)
        : String(primaryLocationCode),
    addressLine1:
      (get(primaryLocation, 'addressLine1', '') as string) || companyData.addressLine1 || '',
    addressLine2:
      (get(primaryLocation, 'addressLine2', '') as string) || companyData.addressLine2 || '',
    country: (get(primaryLocation, 'country', '') as string) || companyData.country || '',
    state: (get(primaryLocation, 'state', '') as string) || companyData.state || '',
    city: (get(primaryLocation, 'city', '') as string) || companyData.city || '',
    zip:
      (get(primaryLocation, 'zipCode', '') as string) ||
      get(companyData, 'zip', get(companyData, 'zipCode', '')),
  };
};

const cleanPhone = (value: string): string => value.replace(/\D/g, '');
const toOptionalString = (value: string | null | undefined): string | undefined =>
  value == null || value === '' ? undefined : value;

type DepartmentRecord = {
  id: number;
  name: string;
  status: boolean;
  departmentId?: number | null;
  masterDepartmentId?: number | null;
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

const getUniqueDepartmentsByMasterId = (departments: DepartmentRecord[]): DepartmentRecord[] => {
  const uniqueDepartmentsMap = new Map<number, DepartmentRecord>();

  departments.forEach((department) => {
    const masterDepartmentId = getMasterDepartmentId(department);
    const existingDepartment = uniqueDepartmentsMap.get(masterDepartmentId);

    if (!existingDepartment) {
      uniqueDepartmentsMap.set(masterDepartmentId, department);
      return;
    }

    if (existingDepartment.status === false && department.status !== false) {
      uniqueDepartmentsMap.set(masterDepartmentId, department);
    }
  });

  return Array.from(uniqueDepartmentsMap.values());
};

const getDepartmentReferenceId = (department: DepartmentRecord): string =>
  String(getMasterDepartmentId(department));

const getActiveDepartmentReferenceIds = (departments: DepartmentRecord[]): string[] =>
  getUniqueDepartmentsByMasterId(departments)
    .filter((department) => department.status !== false)
    .map(getDepartmentReferenceId);

const CompanyDetails = ({
  companyData,
  onCompanyUpdated,
  onDirtyChange,
  isEditMode: controlledEditMode,
  onEditModeChange,
  logoEditState,
}: CompanyDetailsProps) => {
  const { role } = useSelector((state: RootState) => state.LoginSlice, shallowEqual);
  const companyId = Number(companyData?.id);
  const industryId = Number(companyData?.companyIndustryId || 0);
  const hasPrimaryLocationViewAccess =
    role?.name?.trim().toLowerCase() === 'master super admin' ||
    role?.type?.trim().toLowerCase() === 'owner';
  const isMasterSuperAdmin = role?.name?.trim().toLowerCase() === 'master super admin';
  const isUser =
    role?.name?.trim().toLowerCase() === 'user' || role?.type?.trim().toLowerCase() === 'owner';
  const [internalIsEditMode, setInternalIsEditMode] = useState<boolean>(false);
  const isControlledEditMode = typeof controlledEditMode === 'boolean';
  const isEditMode = isControlledEditMode ? Boolean(controlledEditMode) : internalIsEditMode;
  const [formState, setFormState] = useState<CompanyEditFormState>(
    mapCompanyDataToFormState(companyData)
  );
  const [selectedIndustryId, setSelectedIndustryId] = useState<string>(
    String(companyData?.companyIndustryId || '')
  );
  const [editBaselineState, setEditBaselineState] = useState<CompanyEditBaselineState | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState<boolean>(false);
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState<string>('');
  const isDepartmentSearchActive = departmentSearchTerm.trim().length > 0;
  const [isDepartmentFocused, setIsDepartmentFocused] = useState<boolean>(false);
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState<boolean>(false);

  const [updateCompanyOrg, { isLoading: isUpdating }] = useUpdateCompanyOrgMutation();
  const [updateCompanyLocation] = useUpdateCompanyLocationMutation();
  const [createDepartment] = useCreateDepartmentMutation();
  const [updateDepartment] = useUpdateDepartmentMutation();
  const [createIndustry] = useCreateIndustryMutation();
  const [updateIndustry] = useUpdateIndustryMutation();
  const initialFormState = useMemo(() => mapCompanyDataToFormState(companyData), [companyData]);
  const primaryLocationRecord = useMemo(() => getPrimaryLocationRecord(companyData), [companyData]);

  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
  const initialIndustryId = useMemo(
    () => String(companyData?.companyIndustryId || ''),
    [companyData]
  );

  const setEditMode = useCallback(
    (nextEditMode: boolean): void => {
      if (onEditModeChange) {
        onEditModeChange(nextEditMode);
      }

      if (!isControlledEditMode) {
        setInternalIsEditMode(nextEditMode);
      }
    },
    [isControlledEditMode, onEditModeChange]
  );

  const handleCancelEdit = (): void => {
    setFormState(mapCompanyDataToFormState(companyData));
    setSelectedIndustryId(String(companyData?.companyIndustryId || ''));
    setSelectedDepartmentIds(initialDepartmentIds);
    if (industryId > 0) {
      void createSafeRefetchTask(() => Promise.resolve(refetchIndustryById()));
    }
    void createSafeRefetchTask(() => Promise.resolve(refetchIndustries()));
    void createSafeRefetchTask(() => Promise.resolve(refetchCompanyDepartments()));
    setEditBaselineState(null);
    setEditMode(false);
  };

  const handleCancelClick = (): void => {
    if (isFormChanged || Boolean(logoEditState?.isDirty)) {
      setShowCancelConfirmation(true);
      return;
    }

    handleCancelEdit();
  };

  const handleInputChange = (field: keyof CompanyEditFormState, value: string): void => {
    setFormState((previous) => {
      if (field === 'cultureIntroText') {
        const hasCultureIntroText = value.trim().length > 0;

        return {
          ...previous,
          [field]: value,
          cultureIntroDefaultEnabled: hasCultureIntroText
            ? previous.cultureIntroDefaultEnabled
            : false,
        };
      }

      return { ...previous, [field]: value };
    });
  };

  const createSafeRefetchTask = (refetchAction: () => Promise<unknown>): Promise<unknown> => {
    return (async () => refetchAction())();
  };

  const refetchAllCompanyDetailsData = async (): Promise<void> => {
    const refetchTasks: Array<Promise<unknown>> = [];
    const shouldRefetchIndustryById = industryId > 0;

    if (onCompanyUpdated) {
      refetchTasks.push(createSafeRefetchTask(() => Promise.resolve(onCompanyUpdated())));
    }

    if (shouldRefetchIndustryById) {
      refetchTasks.push(createSafeRefetchTask(() => Promise.resolve(refetchIndustryById())));
    }

    refetchTasks.push(
      createSafeRefetchTask(() => Promise.resolve(refetchIndustries())),
      createSafeRefetchTask(() => Promise.resolve(refetchCompanyDepartments()))
    );

    if (isEditMode) {
      refetchTasks.push(createSafeRefetchTask(() => Promise.resolve(refetchMasterDepartments())));
    }

    const refetchResults = await Promise.allSettled(refetchTasks);
    const failedRefetches = refetchResults.filter((result) => result.status === 'rejected');

    if (failedRefetches.length > 0) {
      console.error('Some Company Details refetches failed after save.', failedRefetches);
    }
  };

  const handleSaveChanges = async (): Promise<void> => {
    if (!companyId || (!isFormChanged && !logoEditState?.isDirty)) return;

    const hasCultureIntroText = formState.cultureIntroText.trim().length > 0;

    const newlyAddedDepartmentIds = selectedDepartmentIds.filter(
      (id) => !initialDepartmentIds.includes(id)
    );

    const payload: UpdateCompanyOrgRequest = {
      companyId,
      companyName: formState.companyName,
      websiteUrl: toOptionalString(formState.websiteUrl),
      primaryFirstName: formState.primaryFirstName,
      primaryLastName: formState.primaryLastName,
      primaryEmail: formState.primaryEmail,
      primaryPhone: cleanPhone(formState.primaryPhone),
      primaryCountryCode: formState.primaryCountryCode || companyData.primaryCountryCode || '',
      secondaryFirstName: formState.secondaryFirstName || '',
      secondaryLastName: formState.secondaryLastName || '',
      secondaryEmail: toOptionalString(formState.secondaryEmail),
      secondaryPhone: cleanPhone(formState.secondaryPhone) || undefined,
      secondaryCountryCode:
        toOptionalString(formState.secondaryCountryCode) ??
        toOptionalString(companyData.secondaryCountryCode),
      locationName: formState.locationName,
      locationCode: formState.locationCode?.trim() ? formState.locationCode.trim() : null,
      addressLine1: formState.addressLine1,
      addressLine2: formState.addressLine2 || '',
      city: formState.city,
      state: formState.state,
      zip: formState.zip,
      country: formState.country,
      companyIndustryId: Number(selectedIndustryId) || null,
      departmentIds: newlyAddedDepartmentIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id)),
      status: companyData.status,
      allowedToManageLocation: companyData.allowedToManageLocation,
      primaryTitle: formState.primaryTitle || '',
      secondaryTitle: formState.secondaryTitle || '',
      cultureIntroText: formState.cultureIntroText ?? '',
      cultureIntroDefaultEnabled: hasCultureIntroText && formState.cultureIntroDefaultEnabled,
    };

    if (logoEditState?.isDirty) {
      if (logoEditState.isDeleted) {
        payload.companyLogoDeleted = true;
      } else if (logoEditState.base64) {
        payload.companyLogo = logoEditState.base64;
        payload.companyLogoType = logoEditState.fileName;
      }
    }

    const primaryLocationId = Number(get(primaryLocationRecord, 'id', 0));
    const primaryLocationPhoneNumber = String(
      get(primaryLocationRecord, 'phoneNumber', '') || ''
    ).trim();
    const primaryLocationCountryCode = String(
      get(primaryLocationRecord, 'countryCode', '') || ''
    ).trim();
    const shouldSyncPrimaryLocation = Number.isFinite(primaryLocationId) && primaryLocationId > 0;

    try {
      const [response] = await Promise.all([
        updateCompanyOrg(payload).unwrap(),
        shouldSyncPrimaryLocation
          ? updateCompanyLocation({
              locationId: primaryLocationId,
              companyId,
              name: formState.locationName,
              code: formState.locationCode ? formState.locationCode.trim() : null,
              addressLine1: formState.addressLine1,
              addressLine2: formState.addressLine2 || '',
              country: formState.country,
              state: formState.state,
              city: formState.city,
              zipCode: formState.zip,
              countryCode:
                primaryLocationPhoneNumber.length > 0
                  ? primaryLocationCountryCode || '+1'
                  : undefined,
              phoneNumber: primaryLocationPhoneNumber || undefined,
              status: Boolean(get(primaryLocationRecord, 'status', true)),
              primary: true,
            }).unwrap()
          : Promise.resolve(null),
      ]);

      await refetchAllCompanyDetailsData();

      showToast({
        message: response?.message || 'Company details updated successfully',
        type: 'success',
      });
      setEditBaselineState(null);
      setEditMode(false);
    } catch (error: any) {
      showToast({
        message: error?.data?.message || 'Failed to update company details. Please try again.',
        type: 'error',
      });
    }
  };

  const {
    data: industryResponse,
    isLoading: industryLoading,
    refetch: refetchIndustryById,
  } = useGetCompanyIndustryByIdQuery({ industryId }, { skip: !industryId });
  const {
    data: industriesData,
    isLoading: industriesLoading,
    refetch: refetchIndustries,
  } = useGetCompanyIndustriesQuery({ companyId }, { skip: !companyId });
  const {
    data: departments = [],
    isLoading: departmentsLoading,
    refetch: refetchCompanyDepartments,
  } = useGetDepartmentsByCompanyIdQuery({ companyId }, { skip: !companyId });

  const baseCompanyDepartmentsList = useMemo(() => {
    if (Array.isArray(departments)) {
      return departments as DepartmentRecord[];
    }

    if (
      departments &&
      typeof departments === 'object' &&
      'data' in departments &&
      Array.isArray((departments as { data: unknown }).data)
    ) {
      return (departments as { data: DepartmentRecord[] }).data;
    }

    if (
      departments &&
      typeof departments === 'object' &&
      'content' in departments &&
      Array.isArray((departments as { content: unknown }).content)
    ) {
      return (departments as { content: DepartmentRecord[] }).content;
    }

    return [] as DepartmentRecord[];
  }, [departments]);

  const initialDepartmentIds = useMemo(() => {
    return getActiveDepartmentReferenceIds(baseCompanyDepartmentsList);
  }, [baseCompanyDepartmentsList]);

  const initializeEditMode = useCallback((): void => {
    const mappedFormState = mapCompanyDataToFormState(companyData);
    const mappedIndustryId = String(companyData?.companyIndustryId || '');
    setFormState(mappedFormState);
    setSelectedIndustryId(mappedIndustryId);
    if (initialDepartmentIds.length > 0) {
      const initialIds = initialDepartmentIds;
      setSelectedDepartmentIds(initialIds);
      setEditBaselineState({
        formState: mappedFormState,
        industryId: mappedIndustryId,
        departmentIds: [...initialIds],
      });
    } else {
      setEditBaselineState({
        formState: mappedFormState,
        industryId: mappedIndustryId,
        departmentIds: [],
      });
    }
  }, [companyData, initialDepartmentIds]);

  const wasEditModeRef = useRef<boolean>(isEditMode);

  useEffect(() => {
    if (isEditMode && !wasEditModeRef.current) {
      initializeEditMode();
    }

    wasEditModeRef.current = isEditMode;
  }, [initializeEditMode, isEditMode]);

  const isFormChanged = useMemo(() => {
    const baselineFormState = editBaselineState?.formState ?? initialFormState;
    const baselineIndustryId = editBaselineState?.industryId ?? initialIndustryId;
    const baselineDepartmentIds = editBaselineState?.departmentIds ?? initialDepartmentIds;

    const formChanged = JSON.stringify(formState) !== JSON.stringify(baselineFormState);
    const industryChanged = selectedIndustryId !== baselineIndustryId;
    const departmentsChanged =
      JSON.stringify([...selectedDepartmentIds].sort()) !==
      JSON.stringify([...baselineDepartmentIds].sort());

    return formChanged || industryChanged || departmentsChanged;
  }, [
    editBaselineState,
    formState,
    initialDepartmentIds,
    initialFormState,
    initialIndustryId,
    selectedDepartmentIds,
    selectedIndustryId,
  ]);
  const hasAnyChanges = isFormChanged || Boolean(logoEditState?.isDirty);

  useEffect(() => {
    if (!isEditMode) {
      setFormState(mapCompanyDataToFormState(companyData));
      setSelectedIndustryId(String(companyData?.companyIndustryId || ''));
      setSelectedDepartmentIds(initialDepartmentIds);
    }
  }, [companyData, initialDepartmentIds, isEditMode]);

  useEffect(() => {
    onDirtyChange?.(isEditMode && hasAnyChanges);
  }, [hasAnyChanges, isEditMode, onDirtyChange]);

  useEffect(() => {
    if (industryId > 0) {
      refetchIndustryById();
    }
  }, [industryId, refetchIndustryById]);

  const {
    data: masterDepartmentsData,
    isLoading: masterDepartmentsLoading,
    refetch: refetchMasterDepartments,
  } = useGetAllDepartmentsQuery(
    {
      status: 'ACTIVE',
      page: 0,
      size: 1000,
      sortBy: 'name',
      sortDirection: 'ASC',
    },
    { skip: !isEditMode }
  );

  const searchedMasterDepartmentsLoading = masterDepartmentsLoading;

  const industries = useMemo(() => {
    if (Array.isArray(industriesData)) {
      return industriesData;
    }

    if (
      industriesData &&
      typeof industriesData === 'object' &&
      'content' in industriesData &&
      Array.isArray((industriesData as { content: unknown }).content)
    ) {
      return (industriesData as { content: Array<{ id: number; name: string; status?: boolean }> })
        .content;
    }

    if (
      industriesData &&
      typeof industriesData === 'object' &&
      'data' in industriesData &&
      Array.isArray((industriesData as { data: unknown }).data)
    ) {
      return (industriesData as { data: Array<{ id: number; name: string; status?: boolean }> })
        .data;
    }

    return [] as Array<{ id: number; name: string; status?: boolean }>;
  }, [industriesData]);

  const masterDepartments = useMemo(() => {
    const sourceData = masterDepartmentsData;

    if (Array.isArray(sourceData)) {
      return sourceData as DepartmentRecord[];
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
  }, [masterDepartmentsData]);

  const uniqueDepartmentOptions = useMemo(() => {
    if (!isDepartmentSearchActive) {
      return getUniqueDepartmentsByMasterId(baseCompanyDepartmentsList);
    }

    const term = departmentSearchTerm.trim().toLowerCase();

    // 1. Filter the current company list first (includes deactivated entries)
    const matchesInCurrentList = baseCompanyDepartmentsList.filter((dept) =>
      dept.name.toLowerCase().includes(term)
    );
    const currentListMasterIds = new Set(
      matchesInCurrentList.map((dept) => getMasterDepartmentId(dept))
    );

    // 2. Supplement with master results not already represented in the current list
    const masterMatches = masterDepartments.filter(
      (dept) => !currentListMasterIds.has(getMasterDepartmentId(dept))
    );

    return getUniqueDepartmentsByMasterId([...matchesInCurrentList, ...masterMatches]);
  }, [
    isDepartmentSearchActive,
    departmentSearchTerm,
    baseCompanyDepartmentsList,
    masterDepartments,
  ]);

  const allAvailableDepartments = useMemo(() => {
    const combinedDepartments = getUniqueDepartmentsByMasterId(baseCompanyDepartmentsList);
    const existingMasterDepartmentIds = new Set(
      combinedDepartments.map((department) => getMasterDepartmentId(department))
    );

    masterDepartments.forEach((department) => {
      const masterDepartmentId = getMasterDepartmentId(department);
      if (!existingMasterDepartmentIds.has(masterDepartmentId)) {
        combinedDepartments.push(department);
        existingMasterDepartmentIds.add(masterDepartmentId);
      }
    });

    return combinedDepartments;
  }, [baseCompanyDepartmentsList, masterDepartments]);

  const selectedDepartments = useMemo(() => {
    const selectedIdSet = new Set(selectedDepartmentIds.map((id) => Number(id)));
    return allAvailableDepartments.filter((department) =>
      selectedIdSet.has(getMasterDepartmentId(department))
    );
  }, [allAvailableDepartments, selectedDepartmentIds]);

  const activeDepartmentOptionsCount = useMemo(
    () => allAvailableDepartments.filter((department) => department.status !== false).length,
    [allAvailableDepartments]
  );

  const isNewlySelectedDepartment = (departmentId: string): boolean => {
    return !initialDepartmentIds.includes(departmentId);
  };

  const resolveDepartmentByAnyId = useCallback(
    (departmentId: string | number): DepartmentRecord | undefined => {
      const numericDepartmentId = Number(departmentId);
      if (!Number.isFinite(numericDepartmentId)) {
        return undefined;
      }

      return allAvailableDepartments.find(
        (department) =>
          department.id === numericDepartmentId ||
          getMasterDepartmentId(department) === numericDepartmentId
      );
    },
    [allAvailableDepartments]
  );

  const handleAddDepartmentOption = async (departmentName: string): Promise<void> => {
    const trimmedName = departmentName.trim();
    if (!trimmedName) {
      showToast({ message: 'Department name cannot be empty.', type: 'error' });
      return;
    }

    try {
      const response = await createDepartment({ name: trimmedName, status: 'ACTIVE' }).unwrap();
      await refetchMasterDepartments();
      await refetchCompanyDepartments();

      const newDepartmentId = response?.data?.id;
      if (newDepartmentId) {
        setSelectedDepartmentIds((previous) => {
          const id = String(newDepartmentId);
          return previous.includes(id) ? previous : [...previous, id];
        });
      }

      showToast({ message: 'Department created successfully.', type: 'success' });
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to create department.'),
        type: 'error',
      });
    }
  };

  const handleEditDepartmentOption = async (
    departmentId: string | number,
    newName: string
  ): Promise<void> => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      showToast({ message: 'Department name cannot be empty.', type: 'error' });
      return;
    }

    const existingDepartment = resolveDepartmentByAnyId(departmentId);

    if (!existingDepartment) {
      showToast({ message: 'Invalid department selected.', type: 'error' });
      return;
    }

    try {
      await updateDepartment({
        departmentId: existingDepartment.id,
        companyId,
        name: trimmedName,
        status: 'ACTIVE',
      }).unwrap();
      await refetchMasterDepartments();
      await refetchCompanyDepartments();
      showToast({ message: 'Department updated successfully.', type: 'success' });
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to update department.'),
        type: 'error',
      });
    }
  };

  const handleDeleteDepartmentOption = async (departmentId: string | number): Promise<void> => {
    const existingDepartment = resolveDepartmentByAnyId(departmentId);

    if (!existingDepartment) {
      showToast({ message: 'Invalid department selected.', type: 'error' });
      return;
    }

    const resolvedDepartment = existingDepartment;

    try {
      await updateDepartment({
        departmentId: resolvedDepartment.id,
        companyId,
        name: resolvedDepartment.name,
        status: 'INACTIVE',
      }).unwrap();
      await refetchMasterDepartments();
      await refetchCompanyDepartments();
      setSelectedDepartmentIds((previous) =>
        previous.filter((id) => Number(id) !== getMasterDepartmentId(resolvedDepartment))
      );
      showToast({ message: 'Department deactivated successfully.', type: 'success' });
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to deactivate department.'),
        type: 'error',
      });
    }
  };

  const handleReuseDepartmentOption = async (departmentId: string | number): Promise<void> => {
    const existingDepartment = resolveDepartmentByAnyId(departmentId);

    if (!existingDepartment) {
      showToast({ message: 'Invalid department selected.', type: 'error' });
      return;
    }

    try {
      await updateDepartment({
        departmentId: existingDepartment.id,
        companyId,
        name: existingDepartment.name,
        status: 'ACTIVE',
      }).unwrap();
      await refetchMasterDepartments();
      await refetchCompanyDepartments();
      const masterDepartmentId = String(getMasterDepartmentId(existingDepartment));
      setSelectedDepartmentIds((previous) =>
        previous.includes(masterDepartmentId) ? previous : [...previous, masterDepartmentId]
      );
      showToast({ message: 'Department reactivated successfully.', type: 'success' });
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to reactivate department.'),
        type: 'error',
      });
    }
  };

  const handleAddIndustryOption = async (industryNameToAdd: string): Promise<void> => {
    const trimmedName = industryNameToAdd.trim();
    if (!trimmedName) {
      showToast({ message: 'Industry name cannot be empty.', type: 'error' });
      return;
    }

    try {
      const response = await createIndustry({
        companyId,
        industryName: trimmedName,
        status: true,
      }).unwrap();
      await refetchIndustries();
      const newIndustryId = response?.data?.id;
      if (newIndustryId) {
        setSelectedIndustryId(String(newIndustryId));
      }
      showToast({ message: 'Industry created successfully.', type: 'success' });
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to create industry.'),
        type: 'error',
      });
    }
  };

  const handleEditIndustryOption = async (
    industryIdToUpdate: string | number,
    newName: string
  ): Promise<void> => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      showToast({ message: 'Industry name cannot be empty.', type: 'error' });
      return;
    }

    try {
      await updateIndustry({
        industryId: Number(industryIdToUpdate),
        companyId,
        name: trimmedName,
        status: true,
      }).unwrap();
      await refetchIndustries();
      showToast({ message: 'Industry updated successfully.', type: 'success' });
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to update industry.'),
        type: 'error',
      });
    }
  };

  const handleDeleteIndustryOption = async (industryIdToUpdate: string | number): Promise<void> => {
    const numericIndustryId = Number(industryIdToUpdate);
    const existingIndustry = industries.find((industry) => industry.id === numericIndustryId);
    if (!existingIndustry) {
      showToast({ message: 'Invalid industry selected.', type: 'error' });
      return;
    }

    try {
      await updateIndustry({
        industryId: numericIndustryId,
        companyId,
        name: existingIndustry.name,
        status: false,
      }).unwrap();
      await refetchIndustries();
      if (selectedIndustryId === String(numericIndustryId)) {
        setSelectedIndustryId('');
      }
      showToast({ message: 'Industry deactivated successfully.', type: 'success' });
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to deactivate industry.'),
        type: 'error',
      });
    }
  };

  const handleReuseIndustryOption = async (industryIdToUpdate: string | number): Promise<void> => {
    const numericIndustryId = Number(industryIdToUpdate);
    const existingIndustry = industries.find((industry) => industry.id === numericIndustryId);
    if (!existingIndustry) {
      showToast({ message: 'Invalid industry selected.', type: 'error' });
      return;
    }

    try {
      await updateIndustry({
        industryId: numericIndustryId,
        companyId,
        name: existingIndustry.name,
        status: true,
      }).unwrap();
      await refetchIndustries();
      setSelectedIndustryId(String(numericIndustryId));
      showToast({ message: 'Industry reactivated successfully.', type: 'success' });
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to reactivate industry.'),
        type: 'error',
      });
    }
  };

  const industryName = industryResponse?.name || companyData.industry || '';

  return (
    <div className="w-full p-6  bg-white">
      {/* Company Information Title */}
      <div className="flex items-start justify-between gap-4 mb-8">
        {/* <div className="p-3 bg-gray-50 rounded-lg">
          <MdApartment className="text-2xl text-gray-400" />
        </div> */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Company Information</h2>
        </div>
        {!isControlledEditMode && !isMasterSuperAdmin && !isEditMode && !isUser && (
          <button
            type="button"
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Edit company details"
            onClick={() => setEditMode(true)}
          >
            <MdEdit size={16} className="text-gray-600" />
          </button>
        )}
      </div>

      {/* Company Information Form */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm capitalize">
            Company Name <span className="required-asterisk">*</span>
          </label>
          <Input
            type="text"
            className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
            value={formState.companyName}
            onChange={(event) => handleInputChange('companyName', event.target.value)}
            disabled={!isEditMode}
          />
        </div>

        <div>
          <label className="text-sm capitalize ">Company website url</label>
          <Input
            className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
            value={formState.websiteUrl}
            onChange={(event) => handleInputChange('websiteUrl', event.target.value)}
            disabled={!isEditMode}
          />
        </div>

        <div>
          <label className="text-sm capitalize">Industry</label>
          {isEditMode ? (
            <div className="relative">
              <DropdownWithAddOption
                className="w-full custom-select-jobs placeholder-style"
                value={selectedIndustryId || undefined}
                onChange={(value) => setSelectedIndustryId(String(value || ''))}
                options={industries.map((industry) => ({
                  id: String(industry.id),
                  name: industry.name,
                  isDeleted: industry.status === false,
                }))}
                loading={industriesLoading}
                placeholder="Select Industry"
                label="Industry"
                type="industry"
                onAddOption={handleAddIndustryOption}
                onEditOption={handleEditIndustryOption}
                onDeleteOption={handleDeleteIndustryOption}
                onReuseOption={handleReuseIndustryOption}
              />
            </div>
          ) : (
            <Input
              type="text"
              className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
              value={industryLoading ? 'Loading industry...' : industryName}
              disabled
            />
          )}
        </div>
        <div>
          <label className="text-sm capitalize">Departments</label>

          {isEditMode ? (
            <div
              className="relative"
              onFocus={() => setIsDepartmentFocused(true)}
              onBlur={() => setIsDepartmentFocused(false)}
            >
              <DropdownWithAddOption
                className="w-full custom-select-jobs placeholder-style"
                mode="multiple"
                value={selectedDepartmentIds}
                onChange={(value) => {
                  const newValue = (value ?? []).map((item: string | number) => String(item));
                  // Prevent unchecking pre-selected departments - keep them in the selection
                  const filteredValue =
                    newValue.length < selectedDepartmentIds.length
                      ? [
                          ...newValue,
                          ...selectedDepartmentIds.filter(
                            (id) => !newValue.includes(id) && initialDepartmentIds.includes(id)
                          ),
                        ]
                      : newValue;
                  setSelectedDepartmentIds(filteredValue);
                }}
                onSearchChange={setDepartmentSearchTerm}
                onOpenChange={setIsDepartmentDropdownOpen}
                options={uniqueDepartmentOptions.map((department) => ({
                  id: String(getMasterDepartmentId(department)),
                  name: department.name,
                  isDeleted: department.status === false,
                }))}
                loading={
                  departmentsLoading ||
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
                onDeleteOption={handleDeleteDepartmentOption}
                onReuseOption={handleReuseDepartmentOption}
                maxTagCount={0}
                maxTagPlaceholder={() => null}
                tagRender={() => <></>}
              />
              {Array.isArray(selectedDepartmentIds) &&
                selectedDepartmentIds.length > 0 &&
                !isDepartmentDropdownOpen && (
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                    <span className="text-sm text-gray-700 truncate max-w-xs">
                      {`${selectedDepartmentIds.length} of ${activeDepartmentOptionsCount} departments selected`}
                    </span>
                  </div>
                )}
            </div>
          ) : (
            <Input
              type="text"
              className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
              value={`${selectedDepartments.length} of ${activeDepartmentOptionsCount} departments selected`}
              disabled
            />
          )}

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mt-3 max-h-40 overflow-auto pr-2">
            {departmentsLoading ? (
              <span className="text-sm text-gray-600">Loading departments...</span>
            ) : selectedDepartments.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Selected Departments</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedDepartments.map((department) => {
                    const isNewlyAdded = isNewlySelectedDepartment(
                      String(getMasterDepartmentId(department))
                    );
                    return (
                      <span
                        key={department.id}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          isNewlyAdded
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-gray-200 text-gray-700 border border-gray-300'
                        }`}
                      >
                        {department.name}
                        {isEditMode && (
                          <div className="flex items-center gap-1 ml-2">
                            {isNewlyAdded && (
                              <Button
                                size="small"
                                type="text"
                                onClick={() => {
                                  handleEditDepartmentOption(
                                    getMasterDepartmentId(department),
                                    department.name
                                  );
                                }}
                                className="p-0 w-4 h-4 text-blue-600 hover:text-blue-800"
                                title="Edit"
                              >
                                <MdEdit size={12} />
                              </Button>
                            )}
                            {isNewlyAdded && (
                              <Button
                                size="small"
                                type="text"
                                onClick={() => {
                                  handleDeleteDepartmentOption(getMasterDepartmentId(department));
                                }}
                                className="p-0 w-4 h-4 text-red-600 hover:text-red-800"
                                title="Deactivate"
                              >
                                <MdDelete size={12} />
                              </Button>
                            )}
                          </div>
                        )}
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
        <div>
          <label className="text-sm capitalize">Culture Introduction</label>
          <Textarea
            placeholder="Enter culture introduction text"
            rows={7}
            className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-2xl text-gray-700 leading-7 resize-none focus:border-gray-400 focus:shadow-none"
            style={{ backgroundColor: '#ffffff' }}
            value={formState.cultureIntroText}
            onChange={(event) => handleInputChange('cultureIntroText', event.target.value)}
            disabled={!isEditMode}
          />
          <div className="mt-3 flex items-center gap-3">
            <Switch
              checked={formState.cultureIntroDefaultEnabled}
              onChange={(checked) =>
                setFormState((previous) => ({
                  ...previous,
                  cultureIntroDefaultEnabled: checked,
                }))
              }
              disabled={!isEditMode || !formState.cultureIntroText.trim()}
              style={{
                backgroundColor: formState.cultureIntroDefaultEnabled
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

      <h3 className="text-lg font-semibold mt-6 mb-2">Primary Contact</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm capitalize">
            First Name <span className="required-asterisk">*</span>
          </label>
          <Input
            type="text"
            className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
            value={formState.primaryFirstName}
            onChange={(event) => handleInputChange('primaryFirstName', event.target.value)}
            disabled={!isEditMode}
          />
        </div>

        <div>
          <label className="text-sm capitalize">
            Last Name <span className="required-asterisk">*</span>
          </label>
          <Input
            type="text"
            className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
            value={formState.primaryLastName}
            onChange={(event) => handleInputChange('primaryLastName', event.target.value)}
            disabled={!isEditMode}
          />
        </div>

        <div>
          <label className="text-sm capitalize">
            Phone Number <span className="required-asterisk">*</span>
          </label>
          <div className="phone-input-wrapper flex items-center w-full px-4 mt-1 border rounded-3xl border-[var(--border)]">
            <Select
              value={formState.primaryCountryCode}
              onChange={(value) => handleInputChange('primaryCountryCode', value)}
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
              disabled={!isEditMode}
              tabIndex={-1}
            />
            <div className="h-6 mx-2"></div>
            <Input
              type="tel"
              value={formState.primaryPhone}
              placeholder="(555) 123-4567"
              className="border-none focus:ring-0 focus:outline-none w-full"
              onChange={(e) => handleInputChange('primaryPhone', formatPhoneNumber(e.target.value))}
              maxLength={14}
              disabled={!isEditMode}
            />
          </div>
        </div>

        <div>
          <label className="text-sm capitalize">
            Email <span className="required-asterisk">*</span>
          </label>
          <Input
            className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
            value={formState.primaryEmail}
            onChange={(event) => handleInputChange('primaryEmail', event.target.value)}
            disabled={!isEditMode}
          />
        </div>

        <div>
          <label className="text-sm capitalize">Title</label>
          <Input
            type="text"
            className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
            value={formState.primaryTitle}
            onChange={(event) => handleInputChange('primaryTitle', event.target.value)}
            disabled={!isEditMode}
          />
        </div>

        <div>
          <label className="text-sm capitalize">
            Role<span className="required-asterisk">*</span>
          </label>
          <Input
            type="text"
            className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
            value={companyData?.primaryRole || ''}
            disabled
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold mt-6 mb-2">Secondary Contact</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm capitalize">First Name</label>
          <Input
            type="text"
            className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
            value={formState.secondaryFirstName}
            onChange={(event) => handleInputChange('secondaryFirstName', event.target.value)}
            disabled={!isEditMode}
          />
        </div>

        <div>
          <label className="text-sm capitalize">Last Name</label>
          <Input
            type="text"
            className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
            value={formState.secondaryLastName}
            onChange={(event) => handleInputChange('secondaryLastName', event.target.value)}
            disabled={!isEditMode}
          />
        </div>

        <div>
          <label className="text-sm capitalize">Phone Number</label>
          <div className="phone-input-wrapper flex items-center bg-white w-full px-4 mt-1 border rounded-3xl border-[var(--border)]">
            <Select
              value={formState.secondaryCountryCode || undefined}
              onChange={(value) => handleInputChange('secondaryCountryCode', value)}
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
              disabled={!isEditMode}
              tabIndex={-1}
            />
            <div className="border-l-2 border-gray-300 h-6 mx-2"></div>
            <Input
              type="tel"
              value={formState.secondaryPhone}
              placeholder="(555) 123-4567"
              className="border-none focus:ring-0 focus:outline-none w-full"
              onChange={(e) =>
                handleInputChange('secondaryPhone', formatPhoneNumber(e.target.value))
              }
              maxLength={14}
              disabled={!isEditMode}
            />
          </div>
        </div>

        <div>
          <label className="text-sm capitalize">Email</label>
          <Input
            className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
            value={formState.secondaryEmail}
            onChange={(event) => handleInputChange('secondaryEmail', event.target.value)}
            disabled={!isEditMode}
          />
        </div>

        <div>
          <label className="text-sm capitalize">Title</label>
          <Input
            type="text"
            className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
            value={formState.secondaryTitle}
            onChange={(event) => handleInputChange('secondaryTitle', event.target.value)}
            disabled={!isEditMode}
          />
        </div>

        <div>
          <label className="text-sm capitalize">Role</label>
          <Input
            type="text"
            className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
            value={companyData?.secondaryRole || ''}
            disabled
          />
        </div>
      </div>

      {hasPrimaryLocationViewAccess && (
        <>
          <h3 className="text-lg font-semibold mt-6 mb-2">LOCATION (PRIMARY)</h3>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="text-sm capitalize">
                Location Name <span className="required-asterisk">*</span>
              </label>
              <Input
                type="text"
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={formState.locationName}
                onChange={(event) => handleInputChange('locationName', event.target.value)}
                disabled={!isEditMode}
              />
            </div>

            <div>
              <label className="text-sm capitalize">Location Code</label>
              <Input
                type="text"
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={formState?.locationCode || ''}
                onChange={(event) => handleInputChange('locationCode', event.target.value)}
                disabled={!isEditMode}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="text-sm capitalize">
                Address Line 1 <span className="required-asterisk">*</span>
              </label>
              <Input
                type="text"
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={formState.addressLine1}
                onChange={(event) => handleInputChange('addressLine1', event.target.value)}
                disabled={!isEditMode}
              />
            </div>

            <div>
              <label className="text-sm capitalize">Address Line 2</label>
              <Input
                type="text"
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={formState.addressLine2}
                onChange={(event) => handleInputChange('addressLine2', event.target.value)}
                disabled={!isEditMode}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="text-sm capitalize">
                Country <span className="required-asterisk">*</span>
              </label>
              <Input
                type="text"
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={formState.country}
                onChange={(event) => handleInputChange('country', event.target.value)}
                disabled={!isEditMode}
              />
            </div>

            <div>
              <label className="text-sm capitalize">
                State <span className="required-asterisk">*</span>
              </label>
              <Input
                type="text"
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={formState.state}
                onChange={(event) => handleInputChange('state', event.target.value)}
                disabled={!isEditMode}
              />
            </div>

            <div>
              <label className="text-sm capitalize">
                City <span className="required-asterisk">*</span>
              </label>
              <Input
                type="text"
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={formState.city}
                onChange={(event) => handleInputChange('city', event.target.value)}
                disabled={!isEditMode}
              />
            </div>

            <div>
              <label className="text-sm capitalize">
                Zip Code <span className="required-asterisk">*</span>
              </label>
              <Input
                type="text"
                className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={formState.zip}
                onChange={(event) => handleInputChange('zip', event.target.value)}
                disabled={!isEditMode}
              />
            </div>
          </div>
        </>
      )}

      {isEditMode && (
        <div className="mt-8 flex justify-end items-center gap-3">
          <button
            type="button"
            className="px-6 py-2 border border-gray-300 rounded-3xl text-sm"
            onClick={handleCancelClick}
            disabled={isUpdating}
          >
            CANCEL
          </button>
          <button
            type="button"
            className="px-6 py-2 bg-primary text-white rounded-3xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSaveChanges}
            disabled={isUpdating || !hasAnyChanges}
          >
            {isUpdating ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </div>
      )}
      {showCancelConfirmation && (
        <ConfirmationModal
          onClose={() => setShowCancelConfirmation(false)}
          onConfirm={() => {
            setShowCancelConfirmation(false);
            handleCancelEdit();
          }}
          title="Are you sure you want to leave? Unsaved changes will be lost."
          confirmText="LEAVE PAGE"
        />
      )}
    </div>
  );
};

export default CompanyDetails;
