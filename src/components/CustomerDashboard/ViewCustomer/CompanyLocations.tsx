import { Col, Row, Select, Tooltip } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { IoIosStar } from 'react-icons/io';
import { MdOutlineFilterAlt } from 'react-icons/md';
import { Button, CommonCard, Select as ReusableSelect, showToast, Typography } from '../../shared';
import MasterPagination from '../../shared/ui/MasterPagination';
import { normalizeValue, safeDecodeToken } from '../../../shared/utils/methods';
import { getLocalStorageItem } from '../../../shared/utils/auth/localstorage.helpers';
import { LOCALSTORAGE_KEYS } from '../../../constants/webAPI';
import { shallowEqual, useSelector } from 'react-redux';
import { RootState } from '../../../redux/provider/store';
import {
  useAddCompanyLocationMutation,
  useGetCompanyLocationsFilterQuery,
  type LocationFilterStatus,
  useSetPrimaryCompanyLocationMutation,
  useUpdateLocationStatusMutation,
  useUpdateCompanyLocationMutation,
  GetCompanyLocationsFilterRequest,
} from '../../../api/tenant-service/Company/addCompany';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import useLocationDropdown from '../../../hooks/useCountryDropdown';
import {
  companyLocationSchema,
  type CompanyLocationValidationValues,
} from './CompanyLocationsSchema';
import LocationFormModal, {
  type LocationFormState,
  type LocationFormValidationErrors,
} from '../../shared/ui/locationFormModal';
import { PlusOutlined } from '@ant-design/icons';
import { COL } from '../../shared/ui/Columns';
import { SortDirection } from '../../../types';
import { DEFAULT_PAGE_SIZE } from '../../../constants/app.constants';
import { COMPANY_LOCATION_VALIDATION_FIELDS } from '../../../constants/company.constants';
import {
  getChangedFields,
  getVisibleValidationErrors,
} from '../../../shared/utils/validation/input.helpers';

const { Option } = Select;

interface CompanyLocationsProps {
  companyId: string | null;
  onLocationsUpdated?: () => Promise<unknown> | unknown;
}

type AccessTokenPayload = {
  allowedToManageLocation?: boolean;
};

type LocationRow = {
  id: number;
  locationName: string;
  addressLine1?: string;
  addressLine2?: string;
  code?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  countryCode?: string;
  phoneNumber?: string;
  usersCount?: number;
  status?: boolean;
  primary?: boolean;
  hasActiveUsersOrJobs?: boolean;
};

type EditLocationFormState = LocationFormState;

type ChangePrimaryFormState = {
  locationId: string | null;
};

type LocationValidationField = keyof CompanyLocationValidationValues;

const LOCATION_SORT_KEY_MAP: Record<string, string> = {
  locationName: 'name',
};

const INITIAL_LOCATION_FORM: EditLocationFormState = {
  locationName: '',
  code: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  countryCode: '+1',
  phoneNumber: '',
  status: true,
  primary: false,
};

const CompanyLocations = ({ companyId, onLocationsUpdated }: CompanyLocationsProps) => {
  // Removed Redux filter usage; using local state for sorting/filtering
  const storedRoleType = localStorage.getItem('roleType');
  const { loginToken } = useSelector((state: RootState) => state.LoginSlice, shallowEqual);
  const roleType = useSelector((state: RootState) => state.LoginSlice.role.type) || storedRoleType;
  const roleName = useSelector((state: RootState) => state.LoginSlice.role.name);
  const isOwnerRole = roleType === 'owner' && roleName.toLowerCase() === 'user' ? true : false;
  const tokenFromStorage = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS) as string | null;
  const authToken = loginToken || tokenFromStorage;
  const decodedToken = safeDecodeToken<AccessTokenPayload>(authToken);
  const canManageLocations = decodedToken?.allowedToManageLocation !== false;
  const isLocationActionsDisabled = !canManageLocations || isOwnerRole;
  const parsedCompanyId = Number(companyId || 0);
  const [statusFilter, setStatusFilter] = useState<LocationFilterStatus>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: SortDirection }>({
    key: '',
    direction: null,
  });
  const [openActionId, setOpenActionId] = useState<number | null>(null);
  const [isAddLocationModalOpen, setIsAddLocationModalOpen] = useState<boolean>(false);
  const [isEditLocationModalOpen, setIsEditLocationModalOpen] = useState<boolean>(false);
  const [showAddValidationErrors, setShowAddValidationErrors] = useState<boolean>(false);
  const [showEditValidationErrors, setShowEditValidationErrors] = useState<boolean>(false);
  const [addTouchedFields, setAddTouchedFields] = useState<
    Partial<Record<LocationValidationField, boolean>>
  >({});
  const [editTouchedFields, setEditTouchedFields] = useState<
    Partial<Record<LocationValidationField, boolean>>
  >({});
  const [selectedLocation, setSelectedLocation] = useState<LocationRow | null>(null);
  const [locationPendingDeactivate, setLocationPendingDeactivate] = useState<LocationRow | null>(
    null
  );
  const [isEditPrimaryModalOpen, setIsEditPrimaryModalOpen] = useState<boolean>(false);
  const [isChangePrimaryConfirmModalOpen, setIsChangePrimaryConfirmModalOpen] =
    useState<boolean>(false);
  const [isDeactivateConfirmModalOpen, setIsDeactivateConfirmModalOpen] = useState<boolean>(false);
  const [isDeactivateBlockedModalOpen, setIsDeactivateBlockedModalOpen] = useState<boolean>(false);
  const [isEditMakePrimaryConfirmModalOpen, setIsEditMakePrimaryConfirmModalOpen] =
    useState<boolean>(false);
  const [changePrimaryForm, setChangePrimaryForm] = useState<ChangePrimaryFormState>({
    locationId: null,
  });
  const [initialEditLocationForm, setInitialEditLocationForm] =
    useState<EditLocationFormState | null>(null);
  const [editLocationForm, setEditLocationForm] =
    useState<EditLocationFormState>(INITIAL_LOCATION_FORM);
  const [addLocationForm, setAddLocationForm] = useState<EditLocationFormState>({
    ...INITIAL_LOCATION_FORM,
    primary: false,
  });
  const [addCountryId, setAddCountryId] = useState<number | undefined>(undefined);
  const [addStateId, setAddStateId] = useState<number | undefined>(undefined);
  const [editCountryId, setEditCountryId] = useState<number | undefined>(undefined);
  const [editStateId, setEditStateId] = useState<number | undefined>(undefined);

  const {
    countries: addCountries,
    states: addStates,
    cities: addCities,
  } = useLocationDropdown(addCountryId, addStateId);
  const {
    countries: editCountries,
    states: editStates,
    cities: editCities,
  } = useLocationDropdown(editCountryId, editStateId);

  const addCountryOptions = useMemo(
    () => addCountries.map((country) => ({ label: country.name, value: country.name })),
    [addCountries]
  );
  const addStateOptions = useMemo(
    () => addStates.map((state) => ({ label: state.name, value: state.name })),
    [addStates]
  );
  const addCityOptions = useMemo(
    () => addCities.map((city) => ({ label: city.name, value: city.name })),
    [addCities]
  );

  const editCountryOptions = useMemo(
    () => editCountries.map((country) => ({ label: country.name, value: country.name })),
    [editCountries]
  );
  const editStateOptions = useMemo(
    () => editStates.map((state) => ({ label: state.name, value: state.name })),
    [editStates]
  );
  const editCityOptions = useMemo(
    () => editCities.map((city) => ({ label: city.name, value: city.name })),
    [editCities]
  );

  const currentSortKey = sortConfig.direction
    ? `${sortConfig.direction === 'desc' ? '-' : ''}${sortConfig.key}`
    : undefined;

  const handleSort = (key: string) => {
    let nextDirection: SortDirection;
    let nextKey = key;

    if (sortConfig.key !== key) {
      nextDirection = 'asc';
    } else {
      if (sortConfig.direction === 'asc') {
        nextDirection = 'desc';
      } else if (sortConfig.direction === 'desc') {
        nextDirection = null;
        nextKey = '';
      } else {
        nextDirection = 'asc';
      }
    }

    setSortConfig({ key: nextKey, direction: nextDirection });
    setCurrentPage(1);
  };

  const locationQueryParams: GetCompanyLocationsFilterRequest = {
    companyId: parsedCompanyId,
    status: statusFilter,
    page: Math.max(currentPage - 1, 0),
    size: DEFAULT_PAGE_SIZE,
    sortBy: 'createdAt',
    sortDir: 'desc',
  };
  if (sortConfig.direction) {
    locationQueryParams.sortBy = LOCATION_SORT_KEY_MAP[sortConfig.key] ?? sortConfig.key;
    locationQueryParams.sortDir = sortConfig.direction as 'asc' | 'desc';
  }

  const { data: locationsResponse, isLoading } = useGetCompanyLocationsFilterQuery(
    locationQueryParams,
    { skip: !parsedCompanyId }
  );
  const [updateLocationStatus, { isLoading: isUpdatingLocationStatus }] =
    useUpdateLocationStatusMutation();
  const [addCompanyLocation, { isLoading: isAddingPrimaryLocation }] =
    useAddCompanyLocationMutation();
  const [setPrimaryCompanyLocation, { isLoading: isSettingPrimaryLocation }] =
    useSetPrimaryCompanyLocationMutation();
  const [updateCompanyLocation, { isLoading: isUpdatingLocation }] =
    useUpdateCompanyLocationMutation();

  const locationItems = locationsResponse?.content || [];

  const allLocations: LocationRow[] = useMemo(
    () =>
      locationItems.map((location) => {
        const locationWithActivity = location as typeof location & {
          hasActiveUsersOrJobs?: boolean;
        };

        return {
          id: Number(location.id),
          locationName: location.name || `LOC-${location.id}`,
          code: location.code,
          addressLine1: location.addressLine1,
          addressLine2: location.addressLine2,
          city: location.city,
          state: location.state,
          zipCode: location.zipCode,
          country: location.country,
          countryCode: location.countryCode || '+1',
          phoneNumber: location.phoneNumber || '',
          usersCount: location.userCount || 0,
          status: Boolean(location.status),
          primary: Boolean(location.primary),
          hasActiveUsersOrJobs: locationWithActivity.hasActiveUsersOrJobs,
        };
      }),
    [locationItems]
  );

  const hasActiveUsersOrJobsError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const errorWithData = error as {
      data?: {
        hasActiveUsersOrJobs?: boolean;
        data?: {
          hasActiveUsersOrJobs?: boolean;
        };
      };
    };

    return Boolean(
      errorWithData.data?.hasActiveUsersOrJobs || errorWithData.data?.data?.hasActiveUsersOrJobs
    );
  };

  const availablePrimaryReplacementOptions = useMemo(
    () =>
      allLocations
        .filter(
          (location) =>
            location.status &&
            !location.primary &&
            locationPendingDeactivate &&
            location.id !== locationPendingDeactivate.id
        )
        .map((location) => ({
          label: location.locationName,
          value: String(location.id),
        })),
    [allLocations, locationPendingDeactivate]
  );

  const selectedPrimaryReplacement = useMemo(
    () =>
      allLocations.find((location) => location.id === Number(changePrimaryForm.locationId)) || null,
    [allLocations, changePrimaryForm.locationId]
  );

  const currentPrimaryLocation = useMemo(
    () => allLocations.find((location) => location.primary) || null,
    [allLocations]
  );

  const totalPages = locationsResponse?.totalPages || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages || 1);

  const getLocationValidationState = (form: EditLocationFormState) => {
    const parsed = companyLocationSchema.safeParse(form);

    if (parsed.success) {
      return {
        isValid: true,
        errors: {} as Partial<Record<keyof CompanyLocationValidationValues, string>>,
      };
    }

    const errors: LocationFormValidationErrors = {};
    parsed.error.issues.forEach((issue) => {
      const field = issue.path[0] as keyof CompanyLocationValidationValues;
      if (!errors[field]) {
        errors[field] = issue.message;
      }
    });

    return {
      isValid: false,
      errors,
    };
  };

  const getFirstValidationMessage = (errors: LocationFormValidationErrors): string | null => {
    const orderedFields: LocationValidationField[] = [
      'locationName',
      'addressLine1',
      'country',
      'state',
      'city',
      'zipCode',
      'phoneNumber',
      'countryCode',
    ];

    for (const field of orderedFields) {
      if (errors[field]) {
        return errors[field] || null;
      }
    }

    return null;
  };

  const addLocationValidation = getLocationValidationState(addLocationForm);
  const editLocationValidation = getLocationValidationState(editLocationForm);

  const visibleAddValidationErrors = getVisibleValidationErrors(
    addLocationValidation.errors,
    addTouchedFields,
    showAddValidationErrors
  );
  const visibleEditValidationErrors = getVisibleValidationErrors(
    editLocationValidation.errors,
    editTouchedFields,
    showEditValidationErrors
  );

  const hasEditLocationChanges = useMemo(() => {
    if (!initialEditLocationForm) {
      return false;
    }

    return (
      normalizeValue(editLocationForm.locationName) !==
        normalizeValue(initialEditLocationForm.locationName) ||
      normalizeValue(editLocationForm.code) !== normalizeValue(initialEditLocationForm.code) ||
      normalizeValue(editLocationForm.addressLine1) !==
        normalizeValue(initialEditLocationForm.addressLine1) ||
      normalizeValue(editLocationForm.addressLine2) !==
        normalizeValue(initialEditLocationForm.addressLine2) ||
      normalizeValue(editLocationForm.country) !==
        normalizeValue(initialEditLocationForm.country) ||
      normalizeValue(editLocationForm.state) !== normalizeValue(initialEditLocationForm.state) ||
      normalizeValue(editLocationForm.city) !== normalizeValue(initialEditLocationForm.city) ||
      normalizeValue(editLocationForm.zipCode) !==
        normalizeValue(initialEditLocationForm.zipCode) ||
      normalizeValue(editLocationForm.countryCode) !==
        normalizeValue(initialEditLocationForm.countryCode) ||
      normalizeValue(editLocationForm.phoneNumber) !==
        normalizeValue(initialEditLocationForm.phoneNumber) ||
      editLocationForm.status !== initialEditLocationForm.status ||
      editLocationForm.primary !== initialEditLocationForm.primary
    );
  }, [editLocationForm, initialEditLocationForm]);

  const hasRequiredLocationFields = (form: EditLocationFormState): boolean =>
    [form.locationName, form.addressLine1, form.country, form.state, form.city, form.zipCode].every(
      (value) => value.trim().length > 0
    );

  useEffect(() => {
    if (!isEditLocationModalOpen || !editLocationForm.country || editCountryId) {
      return;
    }

    const selectedCountry = editCountries.find(
      (country) => country.name === editLocationForm.country
    );
    if (selectedCountry) {
      setEditCountryId(selectedCountry.id);
    }
  }, [editCountries, editCountryId, editLocationForm.country, isEditLocationModalOpen]);

  useEffect(() => {
    if (!isEditLocationModalOpen || !editCountryId || !editLocationForm.state || editStateId) {
      return;
    }

    const selectedState = editStates.find((state) => state.name === editLocationForm.state);
    if (selectedState) {
      setEditStateId(selectedState.id);
    }
  }, [editCountryId, editLocationForm.state, editStateId, editStates, isEditLocationModalOpen]);

  useEffect(() => {
    if (openActionId === null) {
      return;
    }

    const handleOutsideActionClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const isInsideActionArea = target.closest('[data-location-action-area="true"]');
      if (!isInsideActionArea) {
        setOpenActionId(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideActionClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideActionClick);
    };
  }, [openActionId]);

  useEffect(() => {
    if (!isAddLocationModalOpen) {
      return;
    }

    const timer = setTimeout(() => {
      const locationNameInput = document.querySelector<HTMLInputElement>(
        'input[placeholder="Location Name"]'
      );
      locationNameInput?.focus();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [isAddLocationModalOpen]);

  useEffect(() => {
    if (!isAddLocationModalOpen) {
      return;
    }

    let zipCodeInput: HTMLInputElement | null = null;

    const handleZipCodeKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' && event.key !== 'Enter') {
        return;
      }

      const buttons = document.querySelectorAll<HTMLButtonElement>('button');
      for (const button of buttons) {
        if (button.textContent?.trim() === 'SAVE') {
          event.preventDefault();
          button.focus();
          break;
        }
      }
    };

    const timer = setTimeout(() => {
      zipCodeInput = document.querySelector<HTMLInputElement>('input[placeholder="Zip Code"]');
      zipCodeInput?.addEventListener('keydown', handleZipCodeKeyDown);
    }, 100);

    return () => {
      clearTimeout(timer);
      zipCodeInput?.removeEventListener('keydown', handleZipCodeKeyDown);
    };
  }, [isAddLocationModalOpen]);

  useEffect(() => {
    if (!isEditLocationModalOpen) {
      return;
    }

    const timer = setTimeout(() => {
      const locationNameInput = document.querySelector<HTMLInputElement>(
        'input[placeholder="Location Name"]'
      );
      locationNameInput?.focus();
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [isEditLocationModalOpen]);

  useEffect(() => {
    if (!isEditLocationModalOpen) {
      return;
    }

    let zipCodeInput: HTMLInputElement | null = null;

    const handleZipCodeKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' && event.key !== 'Enter') {
        return;
      }

      const buttons = document.querySelectorAll<HTMLButtonElement>('button');
      for (const button of buttons) {
        if (button.textContent?.trim() === 'SAVE') {
          event.preventDefault();
          button.focus();
          break;
        }
      }
    };

    const timer = setTimeout(() => {
      zipCodeInput = document.querySelector<HTMLInputElement>('input[placeholder="Zip Code"]');
      zipCodeInput?.addEventListener('keydown', handleZipCodeKeyDown);
    }, 100);

    return () => {
      clearTimeout(timer);
      zipCodeInput?.removeEventListener('keydown', handleZipCodeKeyDown);
    };
  }, [isEditLocationModalOpen]);

  const handleAddCountryChange = (countryName: string) => {
    setAddTouchedFields((previous) => ({
      ...previous,
      country: true,
      state: false,
      city: false,
    }));
    const selectedCountry = addCountries.find((country) => country.name === countryName);
    setAddCountryId(selectedCountry?.id);
    setAddStateId(undefined);
    setAddLocationForm((previous) => ({
      ...previous,
      country: countryName,
      state: '',
      city: '',
    }));
  };

  const handleAddStateChange = (stateName: string) => {
    setAddTouchedFields((previous) => ({
      ...previous,
      state: true,
      city: false,
    }));
    const selectedState = addStates.find((state) => state.name === stateName);
    setAddStateId(selectedState?.id);
    setAddLocationForm((previous) => ({
      ...previous,
      state: stateName,
      city: '',
    }));
  };

  const handleAddCityChange = (cityName: string) => {
    setAddTouchedFields((previous) => ({
      ...previous,
      city: true,
    }));
    setAddLocationForm((previous) => ({
      ...previous,
      city: cityName,
    }));
  };

  const handleEditCountryChange = (countryName: string) => {
    setEditTouchedFields((previous) => ({
      ...previous,
      country: true,
      state: false,
      city: false,
    }));
    const selectedCountry = editCountries.find((country) => country.name === countryName);
    setEditCountryId(selectedCountry?.id);
    setEditStateId(undefined);
    setEditLocationForm((previous) => ({
      ...previous,
      country: countryName,
      state: '',
      city: '',
    }));
  };

  const handleEditStateChange = (stateName: string) => {
    setEditTouchedFields((previous) => ({
      ...previous,
      state: true,
      city: false,
    }));
    const selectedState = editStates.find((state) => state.name === stateName);
    setEditStateId(selectedState?.id);
    setEditLocationForm((previous) => ({
      ...previous,
      state: stateName,
      city: '',
    }));
  };

  const handleEditCityChange = (cityName: string) => {
    setEditTouchedFields((previous) => ({
      ...previous,
      city: true,
    }));
    setEditLocationForm((previous) => ({
      ...previous,
      city: cityName,
    }));
  };

  const handleOpenEditModal = (location: LocationRow) => {
    if (!canManageLocations) {
      showToast({
        message: 'You are not allowed to manage locations.',
        type: 'error',
      });
      return;
    }

    setSelectedLocation(location);
    setEditCountryId(undefined);
    setEditStateId(undefined);
    const editForm: EditLocationFormState = {
      locationName: location.locationName || '',
      code: location.code || '',
      addressLine1: location.addressLine1 || '',
      addressLine2: location.addressLine2 || '',
      city: location.city || '',
      state: location.state || '',
      zipCode: location.zipCode || '',
      country: location.country || '',
      countryCode: location.countryCode || '+1',
      phoneNumber: location.phoneNumber || '',
      status: Boolean(location.status),
      primary: Boolean(location.primary),
    };
    setEditLocationForm(editForm);
    setInitialEditLocationForm(editForm);
    setOpenActionId(null);
    setShowEditValidationErrors(false);
    setEditTouchedFields({});
    setIsEditLocationModalOpen(true);
  };

  const handleOpenAddModal = () => {
    if (!canManageLocations) {
      showToast({
        message: 'You are not allowed to manage locations.',
        type: 'error',
      });
      return;
    }

    setAddCountryId(undefined);
    setAddStateId(undefined);
    setAddLocationForm({
      ...INITIAL_LOCATION_FORM,
      primary: false,
    });
    setShowAddValidationErrors(false);
    setAddTouchedFields({});
    setIsAddLocationModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddLocationModalOpen(false);
    setShowAddValidationErrors(false);
    setAddTouchedFields({});
  };

  const handleCloseEditModal = () => {
    setIsEditLocationModalOpen(false);
    setShowEditValidationErrors(false);
    setEditTouchedFields({});
    setInitialEditLocationForm(null);
  };

  const refetchLatestCompanyData = async (): Promise<void> => {
    if (!onLocationsUpdated) {
      return;
    }

    await Promise.resolve(onLocationsUpdated());
  };

  const handleSaveLocation = async () => {
    if (!selectedLocation || !parsedCompanyId) {
      return;
    }

    if (!editLocationValidation.isValid) {
      setShowEditValidationErrors(true);
      showToast({
        message:
          getFirstValidationMessage(editLocationValidation.errors) ||
          'Please fill all required location fields',
        type: 'error',
      });
      return;
    }

    try {
      await updateCompanyLocation({
        locationId: selectedLocation.id,
        companyId: parsedCompanyId,
        name: editLocationForm.locationName.trim(),
        code: editLocationForm.code?.trim() || '',
        addressLine1: editLocationForm.addressLine1?.trim() || '',
        addressLine2: editLocationForm.addressLine2?.trim() || '',
        country: editLocationForm.country?.trim() || '',
        state: editLocationForm.state?.trim() || '',
        city: editLocationForm.city?.trim() || '',
        zipCode: editLocationForm.zipCode?.trim() || '',
        countryCode:
          editLocationForm.phoneNumber?.trim().length > 0
            ? editLocationForm.countryCode?.trim() || '+1'
            : undefined,
        phoneNumber: editLocationForm.phoneNumber?.trim() || undefined,
        status: editLocationForm.status,
        primary: editLocationForm.primary,
      }).unwrap();

      await refetchLatestCompanyData();

      showToast({
        message: 'Location updated successfully',
        type: 'success',
      });
      setShowEditValidationErrors(false);
      setIsEditLocationModalOpen(false);
    } catch {
      showToast({
        message: 'Failed to update location',
        type: 'error',
      });
    }
  };

  const handleEditPrimaryToggleChange = (checked: boolean) => {
    if (!selectedLocation) {
      return;
    }

    if (!selectedLocation.primary && checked) {
      setIsEditLocationModalOpen(false);
      setIsEditMakePrimaryConfirmModalOpen(true);
      return;
    }

    setEditLocationForm((previous) => ({
      ...previous,
      primary: checked,
    }));
  };

  const handleConfirmEditMakePrimary = async () => {
    if (!selectedLocation) {
      return;
    }

    try {
      await setPrimaryCompanyLocation({ locationId: selectedLocation.id }).unwrap();
      await refetchLatestCompanyData();

      showToast({
        message: 'Primary location updated successfully',
        type: 'success',
      });
      setSelectedLocation((previous) =>
        previous
          ? {
              ...previous,
              primary: true,
            }
          : previous
      );
      setEditLocationForm((previous) => ({
        ...previous,
        primary: true,
      }));
      setIsEditMakePrimaryConfirmModalOpen(false);
      setIsEditLocationModalOpen(true);
    } catch {
      showToast({
        message: 'Failed to set primary location',
        type: 'error',
      });
    }
  };

  const handleSaveAddPrimaryLocation = async () => {
    if (!parsedCompanyId) {
      return;
    }

    if (!addLocationValidation.isValid) {
      setShowAddValidationErrors(true);
      showToast({
        message:
          getFirstValidationMessage(addLocationValidation.errors) ||
          'Please fill all required location fields',
        type: 'error',
      });
      return;
    }

    try {
      await addCompanyLocation({
        companyId: parsedCompanyId,
        name: addLocationForm.locationName.trim(),
        code: addLocationForm.code?.trim() || '',
        addressLine1: addLocationForm.addressLine1?.trim() || '',
        addressLine2: addLocationForm.addressLine2?.trim() || '',
        country: addLocationForm.country?.trim() || '',
        state: addLocationForm.state?.trim() || '',
        city: addLocationForm.city?.trim() || '',
        zipCode: addLocationForm.zipCode?.trim() || '',
        countryCode:
          addLocationForm.phoneNumber?.trim().length > 0
            ? addLocationForm.countryCode?.trim() || '+1'
            : undefined,
        phoneNumber: addLocationForm.phoneNumber?.trim() || undefined,
        status: addLocationForm.status,
        primary: addLocationForm.primary,
      }).unwrap();

      await refetchLatestCompanyData();

      showToast({
        message: addLocationForm.primary
          ? 'Primary location added successfully'
          : 'Location added successfully',
        type: 'success',
      });
      setShowAddValidationErrors(false);
      setIsAddLocationModalOpen(false);
    } catch (error: any) {
      showToast({
        message: error?.data?.message || 'Failed to add primary location',
        type: 'error',
      });
    }
  };

  const handleDeactivateLocation = async (location: LocationRow) => {
    if (!canManageLocations) {
      showToast({
        message: 'You are not allowed to manage locations.',
        type: 'error',
      });
      return;
    }

    if (!location.status) {
      await handleActivateLocation(location);
      return;
    }

    if (location.hasActiveUsersOrJobs) {
      setOpenActionId(null);
      setIsDeactivateBlockedModalOpen(true);
      return;
    }

    if (location.primary) {
      const firstReplacement = allLocations.find(
        (item) => item.status && !item.primary && item.id !== location.id
      );

      if (!firstReplacement) {
        setOpenActionId(null);
        showToast({
          message: 'No active location is available to set as primary',
          type: 'error',
        });
        return;
      }

      setLocationPendingDeactivate(location);
      setChangePrimaryForm({
        locationId: String(firstReplacement.id),
      });
      setOpenActionId(null);
      setIsEditPrimaryModalOpen(true);
      return;
    }

    setLocationPendingDeactivate(location);
    setOpenActionId(null);
    setIsDeactivateConfirmModalOpen(true);
  };

  const handleActivateLocation = async (location: LocationRow) => {
    try {
      await updateLocationStatus({ locationId: location.id, status: true }).unwrap();
      await refetchLatestCompanyData();

      showToast({
        message: 'Location activated successfully',
        type: 'success',
      });
      setOpenActionId(null);
    } catch {
      showToast({
        message: 'Failed to activate location',
        type: 'error',
      });
    }
  };

  const handleConfirmDeactivateLocation = async () => {
    if (!locationPendingDeactivate) {
      return;
    }

    try {
      await updateLocationStatus({
        locationId: locationPendingDeactivate.id,
        status: false,
      }).unwrap();

      await refetchLatestCompanyData();

      showToast({
        message: 'Location deactivated successfully',
        type: 'success',
      });
      setOpenActionId(null);
      setIsDeactivateConfirmModalOpen(false);
      setLocationPendingDeactivate(null);
    } catch (error) {
      if (hasActiveUsersOrJobsError(error)) {
        setIsDeactivateConfirmModalOpen(false);
        setLocationPendingDeactivate(null);
        setIsDeactivateBlockedModalOpen(true);
        return;
      }

      showToast({
        message: 'Failed to deactivate location',
        type: 'error',
      });
    }
  };

  const handleSaveEditPrimaryLocation = () => {
    if (!changePrimaryForm.locationId) {
      showToast({
        message: 'Please select a new primary location',
        type: 'error',
      });
      return;
    }

    setIsEditPrimaryModalOpen(false);
    setIsChangePrimaryConfirmModalOpen(true);
  };

  const handleConfirmPrimaryLocationChange = async () => {
    if (!selectedPrimaryReplacement || !parsedCompanyId) {
      return;
    }

    try {
      await updateCompanyLocation({
        locationId: selectedPrimaryReplacement.id,
        companyId: parsedCompanyId,
        name: selectedPrimaryReplacement.locationName.trim(),
        code: selectedPrimaryReplacement.code?.trim() || '',
        addressLine1: selectedPrimaryReplacement.addressLine1?.trim() || '',
        addressLine2: selectedPrimaryReplacement.addressLine2?.trim() || '',
        country: selectedPrimaryReplacement.country?.trim() || '',
        state: selectedPrimaryReplacement.state || '',
        city: selectedPrimaryReplacement.city || '',
        zipCode: selectedPrimaryReplacement.zipCode || '',
        countryCode:
          (selectedPrimaryReplacement.phoneNumber || '').trim().length > 0
            ? selectedPrimaryReplacement.countryCode?.trim() || '+1'
            : undefined,
        phoneNumber: selectedPrimaryReplacement.phoneNumber?.trim() || undefined,
        status: Boolean(selectedPrimaryReplacement.status),
        primary: true,
      }).unwrap();

      await refetchLatestCompanyData();

      showToast({
        message: 'Primary location updated successfully',
        type: 'success',
      });
      setIsChangePrimaryConfirmModalOpen(false);
      setLocationPendingDeactivate(null);
      setChangePrimaryForm({ locationId: null });
    } catch {
      showToast({
        message: 'Failed to change primary location',
        type: 'error',
      });
    }
  };

  return (
    <div className="w-full bg-transparent p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Typography as="h2" variant="h4" className="text-xl text-gray-800">
            Locations
          </Typography>
        </div>

        <div className="flex items-center gap-3">
          <div className="border border-[var(--border)] p-1 rounded-3xl w-40 max-h-10 flex items-center">
            <Select
              placeholder="Status"
              prefix={<MdOutlineFilterAlt className="ml-2 text-lg text-primary self-center" />}
              onChange={(value) => {
                setStatusFilter((value as LocationFilterStatus) || 'ALL');
                setCurrentPage(1);
              }}
              allowClear
              className="w-full custom-select"
              popupClassName="rounded-3xl"
              value={statusFilter}
            >
              <Option value="ALL">All</Option>
              <Option value="ACTIVE">Active</Option>
              <Option value="INACTIVE">Inactive</Option>
            </Select>
          </div>
          {!isOwnerRole && (
            <div className="relative inline-block">
              <Button
                className="w-100% text-white bg-button rounded-3xl px-4 py-2 flex items-center space-x-2"
                onClick={handleOpenAddModal}
                disabled={!canManageLocations}
              >
                <PlusOutlined className="text-lg" />
                <Typography as="span" variant="button" color="inherit">
                  ADD LOCATION
                </Typography>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="w-full">
        <Row
          gutter={[0, 0]}
          className="font-bold py-2 px-[18px] bg-[#FAFAFA] border border-[var(--border)] heading-font text-[11px] text-[#1F2937]"
        >
          <Col span={1} className="px-2 py-2"></Col>
          <COL
            sortable
            sortKey="locationName"
            currentSortKey={currentSortKey}
            onSort={() => handleSort('locationName')}
            span={4}
            className="py-2"
          >
            LOCATION NAME
          </COL>
          <Col span={3} className="px-2 py-2">
            ADDRESS
          </Col>
          <Col span={2} className="px-2 py-2">
            CITY
          </Col>
          <Col span={2} className="px-2 py-2">
            STATE
          </Col>
          <Col span={2} className="px-2 py-2">
            ZIP CODE
          </Col>
          <Col span={2} className="px-2 py-2">
            COUNTRY
          </Col>
          <Col span={2} className="px-2 py-2">
            PHONE NUMBER
          </Col>
          <Col span={2} className="px-2 py-2">
            USERS
          </Col>
          <Col span={2} className="px-2 py-2">
            STATUS
          </Col>
          <Col span={2} className="px-2 py-2">
            ACTIONS
          </Col>
        </Row>
      </div>

      <div className="w-full mt-2">
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading locations...</div>
        ) : allLocations.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No locations found</div>
        ) : (
          allLocations.map((location) => (
            <div key={location.id} className="mb-2">
              <CommonCard>
                <Row gutter={[0, 0]} align="middle" className="text-[13px]">
                  <Col span={1} className="px-2 py-1 text-center">
                    {location.primary ? (
                      <Tooltip title="Primary Location">
                        <Typography
                          as="span"
                          variant="body2"
                          className="inline-flex items-center justify-center"
                        >
                          <IoIosStar className="text-[#F59E0B] text-[14px] inline-block" />
                        </Typography>
                      </Tooltip>
                    ) : null}
                  </Col>
                  <Col span={4} className="px-2 py-1 text-[#111827] font-medium truncate">
                    <Typography
                      as="span"
                      variant="body2"
                      className="truncate text-[#111827] font-medium"
                    >
                      {location.locationName}
                    </Typography>
                  </Col>
                  <Col span={3} className="px-2 py-1 text-[#1F2937] text-[12px]">
                    {location.addressLine1 || '-'}
                  </Col>
                  <Col span={2} className="px-2 py-1 text-[#1F2937]">
                    {location.city || '-'}
                  </Col>
                  <Col span={2} className="px-2 py-1 text-[#1F2937]">
                    {location.state || '-'}
                  </Col>
                  <Col span={2} className="px-2 py-1 text-[#1F2937]">
                    {location.zipCode || '-'}
                  </Col>
                  <Col span={2} className="px-2 py-1 text-[#1F2937]">
                    {location.country || '-'}
                  </Col>
                  <Col span={2} className="px-2 py-1 text-[#1F2937]">
                    {location.phoneNumber
                      ? `${location.countryCode || '+1'} ${location.phoneNumber}`
                      : '-'}
                  </Col>
                  <Col span={2} className="px-2 py-1 text-[#1F2937]">
                    {location.usersCount}
                  </Col>
                  <Col span={2} className="px-2 py-1">
                    <Typography
                      as="span"
                      variant="body2"
                      className={`text-[12px] font-semibold ${
                        location.status ? 'text-[#00884A]' : 'text-[#8A8A8A]'
                      }`}
                    >
                      {location.status ? 'Active' : 'Inactive'}
                    </Typography>
                  </Col>
                  <Col span={2} className="px-2 py-1 flex items-center justify-center">
                    <div className="relative inline-flex" data-location-action-area="true">
                      <button
                        type="button"
                        disabled={isLocationActionsDisabled}
                        className="flex items-center justify-center border-0 bg-transparent p-0"
                        style={{
                          cursor: isLocationActionsDisabled ? 'not-allowed' : 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isLocationActionsDisabled) {
                            return;
                          }
                          setOpenActionId((prev) => (prev === location.id ? null : location.id));
                        }}
                      >
                        <BsThreeDotsVertical style={{ fontSize: '20px' }} />
                      </button>
                      {openActionId === location.id && (
                        <div className="absolute left-full top-0 z-20 ml-1 min-w-[100px] rounded-md border border-[#E5E7EB] bg-white py-1 shadow-md">
                          <button
                            type="button"
                            className="block w-full px-4 py-2 text-left text-[13px] text-[#111827] hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleOpenEditModal(location)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(location.primary)}
                            title={
                              location.primary
                                ? 'Primary location cannot be deactivated.'
                                : undefined
                            }
                            className={`block w-full px-4 py-2 text-left text-[13px] ${
                              location.primary
                                ? 'cursor-not-allowed text-gray-400'
                                : 'text-[#111827] cursor-pointer hover:bg-gray-100'
                            }`}
                            onClick={() => {
                              if (location.primary) {
                                return;
                              }
                              handleDeactivateLocation(location);
                            }}
                          >
                            {location.status ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      )}
                    </div>
                  </Col>
                </Row>
              </CommonCard>
            </div>
          ))
        )}
      </div>

      {(locationsResponse?.totalElements || 0) > 0 && (
        <MasterPagination
          current={safeCurrentPage}
          pageSize={DEFAULT_PAGE_SIZE}
          total={locationsResponse?.totalElements || 0}
          itemLabel="Locations"
          onPageChange={(page) => setCurrentPage(page)}
        />
      )}

      <LocationFormModal
        open={isAddLocationModalOpen}
        title="Add Location"
        formState={addLocationForm}
        countryOptions={addCountryOptions}
        stateOptions={addStateOptions}
        cityOptions={addCityOptions}
        onCountryChange={handleAddCountryChange}
        onStateChange={handleAddStateChange}
        onCityChange={handleAddCityChange}
        onFormChange={(updater) => {
          setAddLocationForm((previous) => {
            const next = updater(previous);
            const changedFields = getChangedFields(
              previous,
              next,
              COMPANY_LOCATION_VALIDATION_FIELDS
            );
            if (changedFields.length > 0) {
              setAddTouchedFields((previousTouched) => {
                const updatedTouched = { ...previousTouched };
                changedFields.forEach((field) => {
                  updatedTouched[field as LocationValidationField] = true;
                });
                return updatedTouched;
              });
            }
            return next;
          });
        }}
        onPhoneNumberBlur={() => {
          setAddTouchedFields((previous) => ({
            ...previous,
            phoneNumber: true,
          }));
        }}
        onClose={handleCloseAddModal}
        onSave={handleSaveAddPrimaryLocation}
        isSaving={isAddingPrimaryLocation}
        isSaveDisabled={!hasRequiredLocationFields(addLocationForm)}
        validationErrors={visibleAddValidationErrors}
      />

      <LocationFormModal
        open={isEditLocationModalOpen}
        title={selectedLocation?.primary ? 'Edit Primary Location' : 'Edit Location'}
        formState={editLocationForm}
        countryOptions={editCountryOptions}
        stateOptions={editStateOptions}
        cityOptions={editCityOptions}
        onCountryChange={handleEditCountryChange}
        onStateChange={handleEditStateChange}
        onCityChange={handleEditCityChange}
        onFormChange={(updater) => {
          setEditLocationForm((previous) => {
            const next = updater(previous);
            const changedFields = getChangedFields(
              previous,
              next,
              COMPANY_LOCATION_VALIDATION_FIELDS
            );
            if (changedFields.length > 0) {
              setEditTouchedFields((previousTouched) => {
                const updatedTouched = { ...previousTouched };
                changedFields.forEach((field) => {
                  updatedTouched[field as LocationValidationField] = true;
                });
                return updatedTouched;
              });
            }
            return next;
          });
        }}
        onPhoneNumberBlur={() => {
          setEditTouchedFields((previous) => ({
            ...previous,
            phoneNumber: true,
          }));
        }}
        showPrimaryToggle={!selectedLocation?.primary}
        onPrimaryToggleChange={handleEditPrimaryToggleChange}
        onClose={handleCloseEditModal}
        onSave={handleSaveLocation}
        isSaving={isUpdatingLocation}
        isSaveDisabled={!hasRequiredLocationFields(editLocationForm) || !hasEditLocationChanges}
        validationErrors={visibleEditValidationErrors}
      />

      <AntdCommonModal
        open={isEditMakePrimaryConfirmModalOpen}
        onClose={() => {
          setIsEditMakePrimaryConfirmModalOpen(false);
          setIsEditLocationModalOpen(true);
        }}
        modalProps={{ width: 640, closable: false }}
      >
        <div className="rounded-3xl p-4">
          <div className="text-center mb-6">
            <Typography as="h2" variant="h3" className="text-3xl text-[#2D323A]">
              Change Primary Location
            </Typography>
            <Typography as="p" variant="body2" className="text-sm text-[#5F6368] mt-2">
              Are you sure you want to change Primary Location from{' '}
              <Typography as="span" variant="body2" className="font-semibold text-[#2D323A]">
                {currentPrimaryLocation?.locationName || 'this location'}
              </Typography>{' '}
              to{' '}
              <Typography as="span" variant="body2" className="font-semibold text-[#2D323A]">
                {selectedLocation?.locationName || 'this location'}
              </Typography>
              ?
            </Typography>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-[520px] mx-auto">
            <Button
              className="w-full border border-gray-300 text-[#2D323A] py-2 rounded-3xl"
              onClick={() => {
                setIsEditMakePrimaryConfirmModalOpen(false);
                setIsEditLocationModalOpen(true);
              }}
            >
              CANCEL
            </Button>
            <Button
              className="w-full bg-primary text-white py-2 rounded-3xl"
              onClick={handleConfirmEditMakePrimary}
              disabled={isSettingPrimaryLocation}
            >
              {isSettingPrimaryLocation ? 'CONFIRMING...' : 'CONFIRM'}
            </Button>
          </div>
        </div>
      </AntdCommonModal>

      <AntdCommonModal
        open={isEditPrimaryModalOpen}
        onClose={() => {
          setIsEditPrimaryModalOpen(false);
          setLocationPendingDeactivate(null);
          setChangePrimaryForm({ locationId: null });
        }}
        modalProps={{ width: 720, closable: false }}
      >
        <div className="rounded-3xl p-4">
          <div className="text-center mb-6">
            <Typography as="h2" variant="h3" className="text-3xl text-[#2D323A]">
              Edit Primary Location
            </Typography>
            <Typography as="p" variant="body2" className="text-sm text-[#5F6368] mt-1">
              Please select new primary location
            </Typography>
          </div>

          <div className="mb-8">
            <label className="text-sm text-[#2D323A] font-roboto">
              <Typography
                as="span"
                variant="body2"
                className="text-sm text-[#2D323A]"
                color="inherit"
              >
                New Primary Location
              </Typography>{' '}
              <Typography as="span" variant="body2" className="required-asterisk" color="inherit">
                *
              </Typography>
            </label>
            <ReusableSelect
              appname="company-location"
              options={availablePrimaryReplacementOptions}
              placeholder="Select Location"
              className="w-full mt-1"
              value={changePrimaryForm.locationId ?? undefined}
              onChange={(value) =>
                setChangePrimaryForm({
                  locationId: String(value),
                })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-[520px] mx-auto">
            <Button
              className="w-full border border-gray-300 text-[#2D323A] py-2 rounded-3xl"
              onClick={() => {
                setIsEditPrimaryModalOpen(false);
                setLocationPendingDeactivate(null);
                setChangePrimaryForm({ locationId: null });
              }}
            >
              CANCEL
            </Button>
            <Button
              className="w-full bg-primary text-white py-2 rounded-3xl"
              onClick={handleSaveEditPrimaryLocation}
            >
              SAVE
            </Button>
          </div>
        </div>
      </AntdCommonModal>

      <AntdCommonModal
        open={isChangePrimaryConfirmModalOpen}
        onClose={() => setIsChangePrimaryConfirmModalOpen(false)}
        modalProps={{ width: 640, closable: false }}
      >
        <div className="rounded-3xl p-4">
          <div className="text-center mb-6">
            <Typography as="h2" variant="h3" className="text-3xl text-[#2D323A]">
              Change Primary Location
            </Typography>
            <Typography as="p" variant="body2" className="text-sm text-[#5F6368] mt-2">
              Are you Sure you want to change primary location from{' '}
              <Typography as="span" variant="body2" className="font-semibold text-[#2D323A]">
                {locationPendingDeactivate?.locationName || '-'}
              </Typography>{' '}
              to{' '}
              <Typography as="span" variant="body2" className="font-semibold text-[#2D323A]">
                {selectedPrimaryReplacement?.locationName || '-'}
              </Typography>
              ?
            </Typography>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-[520px] mx-auto">
            <Button
              className="w-full border border-gray-300 text-[#2D323A] py-2 rounded-3xl"
              onClick={() => setIsChangePrimaryConfirmModalOpen(false)}
            >
              CANCEL
            </Button>
            <Button
              className="w-full bg-primary text-white py-2 rounded-3xl"
              onClick={handleConfirmPrimaryLocationChange}
              disabled={isUpdatingLocation}
            >
              {isUpdatingLocation ? 'CONFIRMING...' : 'CONFIRM'}
            </Button>
          </div>
        </div>
      </AntdCommonModal>

      <AntdCommonModal
        open={isDeactivateConfirmModalOpen}
        onClose={() => setIsDeactivateConfirmModalOpen(false)}
        modalProps={{ width: 640, closable: false }}
      >
        <div className="rounded-3xl p-4">
          <div className="text-center mb-6">
            <Typography as="h2" variant="h3" className="text-3xl text-[#2D323A]">
              Deactivate Location
            </Typography>
            <Typography as="p" variant="body2" className="text-sm text-[#2D323A] mt-2">
              Are you sure you want to deactivate location -
              <Typography as="span" variant="body2" className="font-semibold text-[#2D323A]">
                {locationPendingDeactivate?.locationName
                  ? ` ${locationPendingDeactivate.locationName}`
                  : ''}
              </Typography>
              ?
            </Typography>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-[520px] mx-auto">
            <Button
              className="w-full border border-gray-300 text-[#2D323A] py-2 rounded-3xl"
              onClick={() => setIsDeactivateConfirmModalOpen(false)}
            >
              NO
            </Button>
            <Button
              className="w-full bg-primary text-white py-2 rounded-3xl"
              onClick={handleConfirmDeactivateLocation}
              disabled={isUpdatingLocationStatus}
            >
              {isUpdatingLocationStatus ? 'DEACTIVATING...' : 'YES'}
            </Button>
          </div>
        </div>
      </AntdCommonModal>

      <AntdCommonModal
        open={isDeactivateBlockedModalOpen}
        onClose={() => setIsDeactivateBlockedModalOpen(false)}
        modalProps={{ width: 700, closable: false }}
      >
        <div className="rounded-3xl p-6">
          <div className="text-center mb-6">
            <Typography as="h2" variant="h3" className="text-3xl text-[#2D323A]">
              Deactivate Location
            </Typography>
            <Typography as="p" variant="body2" className="text-sm text-[#2D323A] mt-3">
              This location cannot be deactivated because it has active users or jobs associated
              with it.
            </Typography>
          </div>

          <div className="max-w-[300px] mx-auto">
            <Button
              className="w-full bg-primary text-white py-2 rounded-3xl"
              onClick={() => setIsDeactivateBlockedModalOpen(false)}
            >
              OK
            </Button>
          </div>
        </div>
      </AntdCommonModal>
    </div>
  );
};

export default CompanyLocations;
