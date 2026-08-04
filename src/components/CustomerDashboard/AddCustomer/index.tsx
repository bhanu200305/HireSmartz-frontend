import { Form, Switch, Select, Upload, Input as AntInput } from 'antd';
import { Button, Input, showToast, Textarea } from '../..';
import { useNavigate } from 'react-router-dom';
import { MdOutlineArrowBack, MdOutlineFileUpload } from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { countryCodes } from '../../../constants/countryCode';
import { useSelector } from 'react-redux';
import { useAddCompanyMutation } from '../../../api/tenant-service/Company/addCompany';
import {
  useGetMasterDepartmentsQuery,
  useAddMasterDepartmentMutation,
  useUpdateMasterDepartmentMutation,
} from '../../../api/tenant-service/CompanySettings/departments';
import {
  useGetMasterIndustriesQuery,
  useAddMasterIndustryMutation,
  useUpdateMasterIndustryMutation,
} from '../../../api/tenant-service/CompanySettings/industries';
import { get } from 'lodash-es';
import { Loader } from '../../shared/ui/loader';
import { addCustomerSchema } from './addCustomerSchema';
import { useEffect, useMemo, useState } from 'react';
import useLocationDropdown from '../../../hooks/useCountryDropdown';
import {
  cleanPhoneNumber,
  convertFileToBase64,
  makeFirstLetterUpperCase,
} from '../../../shared/utils/methods';
import {
  handlePhoneNumberChange,
  sanitizeInput,
} from '../../../shared/utils/validation/input.helpers';
import {
  ALLOWED_LOGO_TYPES,
  LOGO_FILE_SIZE_ERROR_MESSAGE,
  LOGO_FILE_TYPE_ERROR_MESSAGE,
  MAX_LOGO_FILE_SIZE_BYTES,
} from '../../../constants/file.constants';
import DropdownWithAddOption from '../../shared/ui/DropdownWithAddOption';
import { Role } from '../../../api/rbac-service/Roles/allRoles';
import useFetchOrgRoles from '../../../hooks/useFetchOrgRoles';
import { useSecondaryContact } from '../../../hooks/useSecondaryContact';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';

const { Option } = Select;

const AddCustomer = () => {
  const navigate = useNavigate();
  const [addCustomer, { isLoading }] = useAddCompanyMutation();
  const { loginToken } = useSelector((state: any) => state.LoginSlice);
  const [isLocationManagementEnabled, setIsLocationManagementEnabled] = useState<boolean>(false);
  const isEditSecondaryContactRoleEnabled =
    import.meta.env.VITE_SECONDARY_CONTACT_ROLE_FEATURE === 'true';

  const { roles, loading: rolesLoading } = useFetchOrgRoles();
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCountryId, setSelectedCountryId] = useState<number | undefined>(undefined);
  const [selectedStateId, setSelectedStateId] = useState<number | undefined>(undefined);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState<boolean>(false);
  const [isDepartmentsFocused, setIsDepartmentsFocused] = useState<boolean>(false);
  const [isDepartmentsDropdownOpen, setIsDepartmentsDropdownOpen] = useState<boolean>(false);
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState<string>('');
  const [addMasterDepartment] = useAddMasterDepartmentMutation();
  const [updateMasterDepartment] = useUpdateMasterDepartmentMutation();
  const [addMasterIndustry] = useAddMasterIndustryMutation();
  const [updateMasterIndustry] = useUpdateMasterIndustryMutation();

  const {
    data: industriesData,
    isLoading: loadingIndustries,
    refetch: refetchIndustries,
  } = useGetMasterIndustriesQuery({
    status: 'all',
    page: 0,
    size: 1000,
    sortBy: 'name',
    sortDirection: 'ASC',
  });

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
      return (industriesData as { content: Array<{ id: number; name: string; status: boolean }> })
        .content;
    }

    if (
      industriesData &&
      typeof industriesData === 'object' &&
      'data' in industriesData &&
      Array.isArray((industriesData as { data: unknown }).data)
    ) {
      return (industriesData as { data: Array<{ id: number; name: string; status: boolean }> })
        .data;
    }

    return [] as Array<{ id: number; name: string; status: boolean }>;
  }, [industriesData]);

  const isDepartmentSearchActive = departmentSearchTerm.trim().length > 0;

  const {
    data: departmentsData,
    isLoading: loadingDepartments,
    refetch: refetchDepartments,
  } = useGetMasterDepartmentsQuery({
    status: 'all',
    page: 0,
    size: 1000,
    sortBy: 'name',
    sortDirection: 'ASC',
  });

  const departments = useMemo(() => {
    if (Array.isArray(departmentsData)) {
      return departmentsData;
    }

    if (
      departmentsData &&
      typeof departmentsData === 'object' &&
      'content' in departmentsData &&
      Array.isArray((departmentsData as { content: unknown }).content)
    ) {
      return (departmentsData as { content: Array<{ id: number; name: string; status: boolean }> })
        .content;
    }

    return [] as Array<{ id: number; name: string; status: boolean }>;
  }, [departmentsData]);

  const { countries, states, cities, loadingCountries, loadingStates, loadingCities } =
    useLocationDropdown(selectedCountryId, selectedStateId);

  const { register, trigger, handleSubmit, setValue, watch, formState } = useForm({
    resolver: zodResolver(addCustomerSchema),
    defaultValues: {
      firstNamePrimary: '',
      firstNameSecondary: '',
      lastNamePrimary: '',
      lastNameSecondary: '',
      phonePrimary: '',
      phoneSecondary: '',
      countryCodePrimary:
        countryCodes.find((code) => code.label === 'United States & Canada (+1)')?.value || '+1',
      countryCodeSecondary:
        countryCodes.find((code) => code.label === 'United States & Canada (+1)')?.value || '+1',
      emailPrimary: '',
      emailSecondary: '',
      companyName: '',
      addressLine1: '',
      addressLine2: '',
      locationName: '',
      locationCode: '',
      titlePrimary: '',
      titleSecondary: '',
      city: '',
      state: '',
      zip: '',
      country: 'United States',
      companyLogo: null,
      companyLogoType: null,
      websiteLink: '',
      roleIdPrimary: '',
      roleIdSecondary: '',
      masterIndustryId: '',
      departmentIds: [],
      cultureIntroText: '',
      cultureIntroDefaultEnabled: false,
      isScoringConfigEditable: false,
      candidateIntroEnabled: false,
      candidateEnquiriesEnabled: false,
    },
    mode: 'onChange',
  });

  const initialAddCompanyValues = useMemo(
    () => ({
      firstNamePrimary: '',
      firstNameSecondary: '',
      lastNamePrimary: '',
      lastNameSecondary: '',
      phonePrimary: '',
      phoneSecondary: '',
      countryCodePrimary:
        countryCodes.find((code) => code.label === 'United States & Canada (+1)')?.value || '+1',
      countryCodeSecondary:
        countryCodes.find((code) => code.label === 'United States & Canada (+1)')?.value || '+1',
      emailPrimary: '',
      emailSecondary: '',
      companyName: '',
      addressLine1: '',
      addressLine2: '',
      locationName: '',
      locationCode: '',
      titlePrimary: '',
      titleSecondary: '',
      city: '',
      state: '',
      zip: '',
      country: 'United States',
      companyLogo: null,
      companyLogoType: null,
      websiteLink: '',
      roleIdPrimary: '',
      roleIdSecondary: '',
      masterIndustryId: '',
      departmentIds: [],
      cultureIntroText: '',
      cultureIntroDefaultEnabled: false,
      isScoringConfigEditable: false,
      candidateIntroEnabled: false,
      candidateEnquiriesEnabled: false,
    }),
    []
  );

  const { errors, isValid } = formState;
  const selectedDepartmentIds = (watch('departmentIds') ?? []) as string[];
  const selectedDepartments = useMemo(() => {
    const selectedIds = new Set(selectedDepartmentIds.map((id) => Number(id)));
    return departments.filter((department) => selectedIds.has(department.id));
  }, [departments, selectedDepartmentIds]);
  const activeDepartmentOptionsCount = useMemo(
    () => departments.filter((department) => department.status !== false).length,
    [departments]
  );

  const emailPrimary = watch('emailPrimary');
  const emailSecondary = watch('emailSecondary');

  useEffect(() => {
    if (emailPrimary && emailSecondary && emailPrimary === emailSecondary) {
      trigger('emailPrimary');
      trigger('emailSecondary');
    }
  }, [emailPrimary, emailSecondary, trigger]);

  const { hasSecondaryContact, getSecondaryFieldError, secondaryFields } = useSecondaryContact({
    watch,
    trigger,
    setValue,
    formState,
  });

  useEffect(() => {
    const hasSecondaryFieldValue =
      secondaryFields.firstName?.trim() ||
      secondaryFields.lastName?.trim() ||
      secondaryFields.email?.trim() ||
      watch('phoneSecondary')?.trim() ||
      watch('titleSecondary')?.trim();

    const currentCountryCode = watch('countryCodeSecondary');

    if (hasSecondaryFieldValue && !currentCountryCode) {
      setValue('countryCodeSecondary', '+1', { shouldDirty: true });
    }
  }, [
    secondaryFields.firstName,
    secondaryFields.lastName,
    secondaryFields.email,
    watch('phoneSecondary'),
    watch('titleSecondary'),
    setValue,
    watch,
  ]);

  useEffect(() => {
    if (roles?.data && Array.isArray(roles.data)) {
      const superAdminRole = roles.data.find(
        (role: Role) => role.roleName?.toLowerCase() === 'super admin'
      );
      if (superAdminRole) {
        setValue('roleIdPrimary', String(superAdminRole.id), { shouldValidate: true });
      }
    }
  }, [roles, setValue]);

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

  const handleCountryChange = (countryName: string) => {
    const country = countries.find((c) => c.name === countryName);
    setSelectedCountry(countryName);
    setSelectedCountryId(country?.id);
    setSelectedState('');
    setSelectedStateId(undefined);
    setValue('country', countryName, { shouldDirty: true, shouldValidate: true });
    setValue('state', '', { shouldDirty: true });
    setValue('city', '', { shouldDirty: true });
  };

  const handleStateChange = (stateName: string) => {
    const state = states.find((s) => s.name === stateName);
    setSelectedState(stateName);
    setSelectedStateId(state?.id);
    setValue('state', stateName, { shouldDirty: true, shouldValidate: true });
    setValue('city', '', { shouldDirty: true });
  };

  const handleCityChange = (cityName: string) => {
    setValue('city', cityName, { shouldDirty: true, shouldValidate: true });
  };

  const handleFileUpload = async (file: File) => {
    try {
      if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
        showToast({ message: LOGO_FILE_TYPE_ERROR_MESSAGE, type: 'error' });
        return Upload.LIST_IGNORE;
      }

      if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
        showToast({ message: LOGO_FILE_SIZE_ERROR_MESSAGE, type: 'error' });
        return Upload.LIST_IGNORE;
      }

      const base64 = await convertFileToBase64(file);
      setValue('companyLogo', base64, { shouldDirty: true });
      setValue('companyLogoType', file.name, { shouldDirty: true });

      const previewURL = URL.createObjectURL(file);
      setImagePreview(previewURL);
    } catch (error) {
      showToast({ message: 'Error converting image to Base64.', type: 'error' });
      return Upload.LIST_IGNORE;
    }
    return false;
  };

  const handleIndustryChange = (value: string | number | undefined) => {
    setValue('masterIndustryId', String(value ?? ''), { shouldDirty: true, shouldValidate: true });
  };

  const handleAddDepartmentOption = async (departmentName: string): Promise<void> => {
    const trimmedName = departmentName.trim();
    if (!trimmedName) {
      showToast({ message: 'Department name cannot be empty.', type: 'error' });
      return;
    }

    try {
      const response = await addMasterDepartment({ name: trimmedName, status: true }).unwrap();
      await refetchDepartments();
      const newDepartmentId = response?.data?.id;
      if (newDepartmentId) {
        const idToAdd = String(newDepartmentId);
        const current = (watch('departmentIds') ?? []) as string[];
        const next = current.includes(idToAdd) ? current : [...current, idToAdd];
        setValue('departmentIds', next, { shouldDirty: true, shouldValidate: true });
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

    try {
      await updateMasterDepartment({
        id: Number(departmentId),
        name: trimmedName,
        status: true,
      }).unwrap();
      await refetchDepartments();
      showToast({ message: 'Department updated successfully.', type: 'success' });
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to update department.'),
        type: 'error',
      });
    }
  };

  const handleDeleteDepartmentOption = async (departmentId: string | number): Promise<void> => {
    const existingDepartment = departments.find(
      (department) => department.id === Number(departmentId)
    );
    if (!existingDepartment) {
      showToast({ message: 'Invalid department selected.', type: 'error' });
      return;
    }

    try {
      await updateMasterDepartment({
        id: Number(departmentId),
        name: existingDepartment.name,
        status: false,
      }).unwrap();
      await refetchDepartments();
      const updatedDepartmentIds = selectedDepartmentIds.filter(
        (id) => Number(id) !== Number(departmentId)
      );
      setValue('departmentIds', updatedDepartmentIds, { shouldDirty: true, shouldValidate: true });
      showToast({ message: 'Department deactivated successfully.', type: 'success' });
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to deactivate department.'),
        type: 'error',
      });
    }
  };

  const handleReuseDepartmentOption = async (departmentId: string | number): Promise<void> => {
    const existingDepartment = departments.find(
      (department) => department.id === Number(departmentId)
    );
    if (!existingDepartment) {
      showToast({ message: 'Invalid department selected.', type: 'error' });
      return;
    }

    try {
      await updateMasterDepartment({
        id: Number(departmentId),
        name: existingDepartment.name,
        status: true,
      }).unwrap();
      await refetchDepartments();
      showToast({ message: 'Department reactivated successfully.', type: 'success' });
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to reactivate department.'),
        type: 'error',
      });
    }
  };

  const handleAddIndustryOption = async (industryName: string): Promise<void> => {
    const trimmedName = industryName.trim();
    if (!trimmedName) {
      showToast({ message: 'Industry name cannot be empty.', type: 'error' });
      return;
    }

    try {
      const response = await addMasterIndustry({ name: trimmedName, status: true }).unwrap();
      await refetchIndustries();
      const newIndustryId = response?.data?.id;
      if (newIndustryId) {
        setValue('masterIndustryId', String(newIndustryId), {
          shouldDirty: true,
          shouldValidate: true,
        });
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
    industryId: string | number,
    newName: string
  ): Promise<void> => {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      showToast({ message: 'Industry name cannot be empty.', type: 'error' });
      return;
    }

    try {
      await updateMasterIndustry({
        id: Number(industryId),
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

  const handleDeleteIndustryOption = async (industryId: string | number): Promise<void> => {
    const existingIndustry = industries.find((industry) => industry.id === Number(industryId));
    if (!existingIndustry) {
      showToast({ message: 'Invalid industry selected.', type: 'error' });
      return;
    }

    try {
      await updateMasterIndustry({
        id: Number(industryId),
        name: existingIndustry.name,
        status: false,
      }).unwrap();
      await refetchIndustries();
      if (String(watch('masterIndustryId')) === String(industryId)) {
        setValue('masterIndustryId', '', { shouldDirty: true, shouldValidate: true });
      }
      showToast({ message: 'Industry deactivated successfully.', type: 'success' });
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to deactivate industry.'),
        type: 'error',
      });
    }
  };

  const handleReuseIndustryOption = async (industryId: string | number): Promise<void> => {
    const existingIndustry = industries.find((industry) => industry.id === Number(industryId));
    if (!existingIndustry) {
      showToast({ message: 'Invalid industry selected.', type: 'error' });
      return;
    }

    try {
      await updateMasterIndustry({
        id: Number(industryId),
        name: existingIndustry.name,
        status: true,
      }).unwrap();
      await refetchIndustries();
      setValue('masterIndustryId', String(industryId), {
        shouldDirty: true,
        shouldValidate: true,
      });
      showToast({ message: 'Industry reactivated successfully.', type: 'success' });
    } catch (error: unknown) {
      showToast({
        message: get(error, 'data.message', 'Failed to reactivate industry.'),
        type: 'error',
      });
    }
  };

  const handleAddCustomer = async (data: any) => {
    if (data.emailPrimary && data.emailSecondary && data.emailPrimary === data.emailSecondary) {
      showToast({
        message: 'Primary and secondary emails cannot be the same.',
        type: 'error',
      });
      return;
    }

    if (!loginToken) {
      showToast({
        message: 'Authentication token not found.',
        type: 'error',
      });
      return;
    }
    const cleanedPhonePrimary = cleanPhoneNumber(data.phonePrimary);
    const cleanedPhoneSecondary = cleanPhoneNumber(data.phoneSecondary);
    const secondaryRoleTypeMappingId = Number(data.roleIdSecondary);
    const shouldIncludeSecondaryRoleTypeMappingId =
      hasSecondaryContact &&
      Number.isFinite(secondaryRoleTypeMappingId) &&
      secondaryRoleTypeMappingId > 0;

    const customerDataPayload = {
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
      addressLine1: makeFirstLetterUpperCase(sanitizeInput(data.addressLine1)),
      addressLine2: makeFirstLetterUpperCase(sanitizeInput(data.addressLine2)) || '',
      locationName: makeFirstLetterUpperCase(sanitizeInput(data.locationName)),
      locationCode: makeFirstLetterUpperCase(sanitizeInput(data.locationCode)) || '',
      city: data.city,
      state: data.state,
      zip: data.zip,
      country: data.country,
      websiteUrl: data.websiteLink || null,
      status: true,
      allowedToManageLocation: isLocationManagementEnabled,
      ...(shouldIncludeSecondaryRoleTypeMappingId
        ? { roleTypeMappingId: secondaryRoleTypeMappingId }
        : {}),
      ...(data.masterIndustryId ? { masterIndustryId: Number(data.masterIndustryId) } : {}),
      departmentIds: (data.departmentIds ?? []).map(Number),
      cultureIntroText: data.cultureIntroText || '',
      cultureIntroDefaultEnabled: Boolean(data.cultureIntroDefaultEnabled),
      isScoringConfigEditable: Boolean(data.isScoringConfigEditable),
      candidateIntroEnabled: Boolean(data.candidateIntroEnabled),
      candidateEnquiriesEnabled: Boolean(data.candidateEnquiriesEnabled),
      companyLogoDeleted: true, // as per payload format on save
    };

    addCustomer(customerDataPayload)
      .unwrap()
      .then((res) => {
        if (res) {
          showToast({
            message: get(res, 'message', 'Customer has been added successfully'),
            type: 'success',
          });
          navigate(-1);
        } else {
          showToast({
            message: get(res, 'message', 'Failed to add Customer. Please try again.'),
            type: 'error',
          });
        }
      })
      .catch((err) => {
        showToast({
          message: get(err, 'data.message', 'Failed to add Customer. Please try again.'),
          type: 'error',
        });
      });
  };

  const handleCancel = (): void => {
    const currentValues = watch();
    const { roleIdPrimary: _ignoredCurrentRole, ...currentValuesWithoutAutoRole } = currentValues;
    const { roleIdPrimary: _ignoredInitialRole, ...initialValuesWithoutAutoRole } =
      initialAddCompanyValues;

    const normalizeForComparison = (values: Record<string, unknown>): Record<string, unknown> => ({
      ...values,
      departmentIds: Array.isArray(values.departmentIds)
        ? [...(values.departmentIds as Array<string | number>)].map(String).sort()
        : [],
    });

    const hasFormChanges =
      JSON.stringify(
        normalizeForComparison(currentValuesWithoutAutoRole as Record<string, unknown>)
      ) !==
      JSON.stringify(
        normalizeForComparison(initialValuesWithoutAutoRole as Record<string, unknown>)
      );

    if (hasFormChanges || isLocationManagementEnabled) {
      setShowCancelConfirmation(true);
      return;
    }

    navigate(-1);
  };

  return (
    <div>
      <MainLayout>
        <div className="flex flex-col items-center bg-white px-6 mt-6 pt-16 pb-10 realtive">
          {isLoading && <Loader />}
          <div className=" mb-4 self-start px-4 absolute">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
            >
              <MdOutlineArrowBack className="mr-2" />
              <span>Back</span>
            </button>
          </div>
          <div className="bg-[#FAFAFA] p-8 rounded-2xl shadow-lg w-full max-w-2xl">
            <h2 className="text-center text-2xl font-semibold mb-2">Add Company</h2>
            <p className="text-center text-gray-500 mb-6">Please enter the following details</p>

            <Form layout="vertical">
              <Form.Item name="image" className="w-full text-center">
                <Upload.Dragger
                  beforeUpload={handleFileUpload}
                  listType="picture"
                  maxCount={1}
                  accept="image/png, image/jpeg, image/jpg"
                  className="border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center"
                  onPreview={() => {
                    if (imagePreview) {
                      const link = document.createElement('a');
                      link.href = imagePreview;
                      link.target = '_blank';
                      link.rel = 'noopener noreferrer';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  }}
                >
                  <MdOutlineFileUpload className="text-xl mb-2 text-primary mx-auto" />
                  <p className="text-gray-600 roboto-font">Upload Customer Logo (Optional)</p>
                </Upload.Dragger>
              </Form.Item>
              <h3 className="text-lg font-semibold mt-2 mb-2">COMPANY INFORMATION</h3>

              <div className="grid grid-cols-2 gap-x-4">
                <Form.Item
                  label={
                    <span>
                      Company Name <span className="required-asterisk">*</span>
                    </span>
                  }
                >
                  <Input
                    type="text"
                    {...register('companyName')}
                    placeholder="Company Name"
                    className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                  />
                  <p className="text-red-500">{errors.companyName?.message}</p>
                </Form.Item>

                <Form.Item label="Website Link">
                  <Input
                    {...register('websiteLink')}
                    placeholder="Website Link"
                    className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                  />
                  <p className="text-red-500">{errors.websiteLink?.message}</p>
                </Form.Item>
              </div>
              {/* Industry and Departments */}
              <div className="grid grid-cols-2 gap-x-4">
                <Form.Item label={<span>Industry</span>}>
                  <DropdownWithAddOption
                    className="w-full custom-select-jobs placeholder-style"
                    value={watch('masterIndustryId') || undefined}
                    onChange={handleIndustryChange}
                    options={industries.map((industry) => ({
                      id: String(industry.id),
                      name: industry.name,
                      isDeleted: industry.status === false,
                    }))}
                    loading={loadingIndustries}
                    placeholder="Select Industry"
                    label="Industry"
                    type="industry"
                    onAddOption={handleAddIndustryOption}
                    onEditOption={handleEditIndustryOption}
                    onDeleteOption={handleDeleteIndustryOption}
                    onReuseOption={handleReuseIndustryOption}
                  />
                  {errors.masterIndustryId && (
                    <p className="text-red-500">{errors.masterIndustryId.message as string}</p>
                  )}
                </Form.Item>
                <Form.Item label={<span>Departments</span>}>
                  <div
                    className="relative"
                    onFocus={() => setIsDepartmentsFocused(true)}
                    onBlur={() => setIsDepartmentsFocused(false)}
                  >
                    <DropdownWithAddOption
                      className="w-full custom-select-jobs placeholder-style"
                      mode="multiple"
                      value={selectedDepartmentIds}
                      onChange={(value) => {
                        setValue(
                          'departmentIds',
                          (value ?? []).map((item: string | number) => String(item)),
                          { shouldDirty: true, shouldValidate: true }
                        );
                      }}
                      onSearchChange={setDepartmentSearchTerm}
                      onOpenChange={setIsDepartmentsDropdownOpen}
                      options={departments.map((department) => ({
                        id: String(department.id),
                        name: department.name,
                        isDeleted: department.status === false,
                      }))}
                      loading={loadingDepartments}
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

                  {selectedDepartmentIds.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mt-3 max-h-40 overflow-auto pr-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Selected Departments
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedDepartments.map((department) => (
                          <span
                            key={department.id}
                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                          >
                            {department.name}
                            <Button
                              size="small"
                              onClick={() => {
                                const updatedDepartmentIds = selectedDepartmentIds.filter(
                                  (id) => Number(id) !== department.id
                                );
                                setValue('departmentIds', updatedDepartmentIds, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }}
                              className="ml-1 w-4 h-4 p-0 text-blue-500 hover:text-blue-700"
                            >
                              ×
                            </Button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Form.Item>
              </div>

              {/* Primary Contact */}
              <h3 className="text-lg font-semibold mt-4 mb-2">PRIMARY CONTACT</h3>
              <div>
                <div className="grid grid-cols-2 gap-x-4">
                  <Form.Item
                    label={
                      <span>
                        First Name <span className="required-asterisk">*</span>
                      </span>
                    }
                  >
                    <Input
                      type="text"
                      maxLength={100}
                      {...register('firstNamePrimary')}
                      placeholder="First name"
                      className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                    />
                    <p className="text-red-500">{errors.firstNamePrimary?.message}</p>
                  </Form.Item>
                  <Form.Item
                    label={
                      <span>
                        Last Name <span className="required-asterisk">*</span>
                      </span>
                    }
                  >
                    <Input
                      type="text"
                      maxLength={100}
                      {...register('lastNamePrimary')}
                      placeholder="Last name"
                      className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                    />
                    <p className="text-red-500">{errors.lastNamePrimary?.message}</p>
                  </Form.Item>
                  <Form.Item
                    label={
                      <span>
                        Phone Number <span className="required-asterisk">*</span>
                      </span>
                    }
                    style={{ marginBottom: '10px' }}
                  >
                    <div className="phone-input-wrapper flex items-center bg-white w-full px-4 border rounded-3xl border-[var(--border)]">
                      <Select
                        value={watch('countryCodePrimary')}
                        onChange={(value) =>
                          setValue('countryCodePrimary', value, { shouldDirty: true })
                        }
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
                        placeholder="+1"
                        tabIndex={-1}
                      />
                      <div className="border-l-2 border-gray-300 h-6 mx-2"></div>
                      <Input
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={watch('phonePrimary')}
                        onChange={(e) =>
                          handlePhoneNumberChange(e, setValue, 'phonePrimary', trigger)
                        }
                        maxLength={14}
                        className="border-none focus:ring-0 focus:outline-none w-full"
                      />
                    </div>
                    <p className="text-red-500">{errors.countryCodePrimary?.message}</p>
                    <p className="text-red-500">{errors.phonePrimary?.message}</p>
                  </Form.Item>
                  <Form.Item
                    label={
                      <span>
                        Email <span className="required-asterisk">*</span>
                      </span>
                    }
                  >
                    <Input
                      value={watch('emailPrimary')}
                      onChange={(e) => {
                        const noSpaces = e.target.value.replace(/\s/g, '');
                        setValue('emailPrimary', noSpaces, { shouldDirty: true });
                        trigger('emailPrimary');
                      }}
                      placeholder="Email"
                      className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                    />
                    <p className="text-red-500">
                      {errors.emailPrimary?.message ||
                        (emailPrimary && emailSecondary && emailPrimary === emailSecondary
                          ? 'Primary and secondary emails cannot be the same'
                          : '')}
                    </p>
                  </Form.Item>
                </div>
                <div className="grid grid-cols-2 gap-x-4">
                  <Form.Item label={<span>Title</span>}>
                    <Input
                      type="text"
                      maxLength={100}
                      {...register('titlePrimary')}
                      placeholder="Title"
                      className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                    />
                    <p className="text-red-500">{errors.titlePrimary?.message}</p>
                  </Form.Item>

                  <Form.Item
                    label={
                      <span>
                        Role <span className="required-asterisk">*</span>
                      </span>
                    }
                    style={{ marginBottom: '10px' }}
                  >
                    <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl bg-gray-50">
                      <Select
                        value={watch('roleIdPrimary') || undefined}
                        onChange={(value) => {
                          setValue('roleIdPrimary', String(value), { shouldDirty: true });
                          trigger('roleIdPrimary');
                        }}
                        className="w-full custom-select"
                        placeholder={'Select Role'}
                        popupClassName="rounded-3xl"
                        loading={rolesLoading}
                        disabled
                      >
                        {Array.isArray(roles?.data) &&
                          roles?.data
                            .filter((role: Role) => role.id !== 23 && role.id !== 24)
                            .map((role: Role) => (
                              <Option key={role.id} value={String(role.id)}>
                                {role.roleName}
                              </Option>
                            ))}
                      </Select>
                    </div>
                    <p className="text-red-500">{errors.roleIdPrimary?.message as string}</p>
                  </Form.Item>
                </div>
              </div>

              {/* Secondary Contact */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">SECONDARY CONTACT</h3>
                </div>

                <div className="grid grid-cols-2 gap-x-4">
                  <Form.Item
                    label={
                      <span>
                        First Name{' '}
                        {hasSecondaryContact && <span className="required-asterisk">*</span>}
                      </span>
                    }
                  >
                    <Input
                      type="text"
                      maxLength={100}
                      value={secondaryFields.firstName}
                      onChange={(e) => {
                        setValue('firstNameSecondary', e.target.value, { shouldDirty: true });
                        trigger('firstNameSecondary');
                      }}
                      placeholder="First name"
                      className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                    />
                    <p className="text-red-500">{getSecondaryFieldError('firstNameSecondary')}</p>
                  </Form.Item>

                  <Form.Item
                    label={
                      <span>
                        Last Name{' '}
                        {hasSecondaryContact && <span className="required-asterisk">*</span>}
                      </span>
                    }
                  >
                    <Input
                      type="text"
                      maxLength={100}
                      value={secondaryFields.lastName}
                      onChange={(e) => {
                        setValue('lastNameSecondary', e.target.value, { shouldDirty: true });
                        trigger('lastNameSecondary');
                      }}
                      placeholder="Last name"
                      className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                    />
                    <p className="text-red-500">{getSecondaryFieldError('lastNameSecondary')}</p>
                  </Form.Item>

                  <Form.Item
                    label={
                      <span>
                        Phone Number{' '}
                        {hasSecondaryContact && <span className="required-asterisk">*</span>}
                      </span>
                    }
                    style={{ marginBottom: '10px' }}
                  >
                    <div className="phone-input-wrapper flex items-center bg-white w-full px-4 border rounded-3xl border-[var(--border)]">
                      <Select
                        value={watch('countryCodeSecondary')}
                        onChange={(value) => {
                          setValue('countryCodeSecondary', value, { shouldDirty: true });
                          if (!value) {
                            setTimeout(() => {
                              trigger([
                                'firstNameSecondary',
                                'lastNameSecondary',
                                'phoneSecondary',
                                'emailSecondary',
                              ]);
                            }, 100);
                          }
                          trigger('phoneSecondary');
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
                        placeholder="+1"
                        removeIcon={null}
                        clearIcon={null}
                        tabIndex={-1}
                      />
                      <div className="border-l-2 border-gray-300 h-6 mx-2"></div>
                      <Input
                        type="tel"
                        value={watch('phoneSecondary')}
                        onChange={(e) => {
                          handlePhoneNumberChange(e, setValue, 'phoneSecondary', trigger);
                          const value = e.target.value;
                          if (!value || value.trim() === '') {
                            setTimeout(() => {
                              trigger([
                                'firstNameSecondary',
                                'lastNameSecondary',
                                'emailSecondary',
                                'countryCodeSecondary',
                              ]);
                            }, 100);
                          }
                        }}
                        placeholder="(555) 123-4567"
                        maxLength={14}
                        className="border-none focus:ring-0 focus:outline-none w-full"
                      />
                    </div>
                    <p className="text-red-500">{getSecondaryFieldError('countryCodeSecondary')}</p>
                    <p className="text-red-500">{getSecondaryFieldError('phoneSecondary')}</p>
                  </Form.Item>

                  <Form.Item
                    label={
                      <span>
                        Email {hasSecondaryContact && <span className="required-asterisk">*</span>}
                      </span>
                    }
                  >
                    <Input
                      value={secondaryFields.email}
                      onChange={(e) => {
                        const noSpaces = e.target.value.replace(/\s/g, '');
                        setValue('emailSecondary', noSpaces, { shouldDirty: true });
                        trigger('emailSecondary');
                      }}
                      placeholder="Email"
                      className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                    />
                    <p className="text-red-500">
                      {getSecondaryFieldError('emailSecondary') ||
                        (emailPrimary && emailSecondary && emailPrimary === emailSecondary
                          ? 'Primary and secondary emails cannot be the same'
                          : '')}
                    </p>
                  </Form.Item>
                </div>
                <div className="grid grid-cols-2 gap-x-4">
                  <Form.Item label="Title">
                    <Input
                      type="text"
                      maxLength={100}
                      {...register('titleSecondary')}
                      placeholder="Title"
                      className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                    />
                    <p className="text-red-500">{errors.titleSecondary?.message}</p>
                  </Form.Item>
                  <Form.Item
                    label={
                      <span>
                        Role {hasSecondaryContact && <span className="required-asterisk">*</span>}
                      </span>
                    }
                    style={{ marginBottom: '10px' }}
                  >
                    <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl ">
                      <Select
                        value={watch('roleIdSecondary') || undefined}
                        onChange={(value) => {
                          setValue('roleIdSecondary', String(value), { shouldDirty: true });
                          trigger('roleIdSecondary');
                        }}
                        className="w-full custom-select"
                        placeholder={'Select Role'}
                        popupClassName="rounded-3xl"
                        loading={rolesLoading}
                        disabled={!hasSecondaryContact}
                      >
                        {isEditSecondaryContactRoleEnabled &&
                          Array.isArray(roles?.data) &&
                          roles?.data
                            // .filter((role: Role) => role.id !== 23 && role.id !== 24)
                            .map((role: Role) => (
                              <Option key={role.id} value={String(role.id)}>
                                {role.roleName}
                              </Option>
                            ))}
                        {!isEditSecondaryContactRoleEnabled &&
                          Array.isArray(roles?.data) &&
                          roles?.data
                            .filter((role: Role) => role.id !== 23 && role.id !== 24)
                            .map((role: Role) => (
                              <Option key={role.id} value={String(role.id)}>
                                {role.roleName}
                              </Option>
                            ))}
                      </Select>
                    </div>
                    {hasSecondaryContact && errors.roleIdSecondary && (
                      <p className="text-red-500">{errors.roleIdSecondary.message as string}</p>
                    )}
                  </Form.Item>
                </div>
              </div>

              {/* Address */}
              <h3 className="text-lg font-semibold mt-2 mb-2">LOCATION (PRIMARY)</h3>
              <div className="grid grid-cols-2 gap-x-4">
                <Form.Item
                  label={
                    <span>
                      Location Name <span className="required-asterisk">*</span>
                    </span>
                  }
                >
                  <Input
                    {...register('locationName')}
                    placeholder="Location Name"
                    className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                  />
                  <p className="text-red-500">{errors.locationName?.message}</p>
                </Form.Item>

                <Form.Item label={<span>Location Code</span>}>
                  <Input
                    {...register('locationCode')}
                    placeholder="Location Code"
                    className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                  />
                  <p className="text-red-500">{errors.locationCode?.message}</p>
                </Form.Item>

                <Form.Item
                  label={
                    <span>
                      Address Line 1 <span className="required-asterisk">*</span>
                    </span>
                  }
                >
                  <Input
                    {...register('addressLine1')}
                    placeholder="Address Line 1"
                    className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                  />
                  <p className="text-red-500">{errors.addressLine1?.message}</p>
                </Form.Item>
                <Form.Item label="Address Line 2">
                  <Input
                    {...register('addressLine2')}
                    placeholder="Address Line 2"
                    className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                  />
                  <p className="text-red-500">{errors.addressLine2?.message}</p>
                </Form.Item>
                <Form.Item
                  label={
                    <span>
                      Country <span className="required-asterisk">*</span>
                    </span>
                  }
                >
                  <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl ">
                    <Select
                      showSearch
                      placeholder="Select Country"
                      optionFilterProp="children"
                      loading={loadingCountries}
                      onChange={handleCountryChange}
                      filterOption={(input, option) =>
                        String(option?.children ?? '')
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      className="w-full custom-select-jobs placeholder-style"
                      value={selectedCountry || undefined}
                    >
                      {countries.map((country) => (
                        <Option key={country.id} value={country.name}>
                          {country.name}
                        </Option>
                      ))}
                    </Select>
                  </div>
                  {errors.country && <p className="text-red-500">{errors.country.message}</p>}
                </Form.Item>

                <Form.Item
                  label={
                    <span>
                      State <span className="required-asterisk">*</span>
                    </span>
                  }
                >
                  <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl ">
                    <Select
                      showSearch
                      placeholder="Select State"
                      value={selectedState || undefined}
                      loading={loadingStates}
                      onChange={handleStateChange}
                      disabled={!selectedCountry}
                      filterOption={(input, option) =>
                        String(option?.children ?? '')
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      className="w-full custom-select-jobs placeholder-style"
                    >
                      {states.map((state) => (
                        <Option key={state.id} value={state.name}>
                          {state.name}
                        </Option>
                      ))}
                    </Select>
                  </div>
                  {errors.state && <p className="text-red-500">{errors.state.message}</p>}
                </Form.Item>

                <Form.Item
                  label={
                    <span>
                      City <span className="required-asterisk">*</span>
                    </span>
                  }
                >
                  <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl ">
                    <Select
                      showSearch
                      value={watch('city') || undefined}
                      placeholder="Select City"
                      onChange={handleCityChange}
                      disabled={!selectedState}
                      loading={loadingCities}
                      filterOption={(input, option) =>
                        String(option?.children ?? '')
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      className="w-full custom-select-jobs placeholder-style"
                    >
                      {cities.map((city) => (
                        <Option key={city.id} value={city.name}>
                          {city.name}
                        </Option>
                      ))}
                    </Select>
                  </div>
                  {errors.city && <p className="text-red-500">{errors.city.message}</p>}
                </Form.Item>
                <Form.Item
                  label={
                    <span>
                      Zip Code <span className="required-asterisk">*</span>
                    </span>
                  }
                >
                  <Input
                    {...register('zip')}
                    placeholder="Zip Code"
                    className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                  />
                  <p className="text-red-500">{errors.zip?.message}</p>
                </Form.Item>
              </div>

              <Form.Item className="mt-6">
                <div className="flex items-center  mb-4">
                  <div className="grid w-full mt-2">
                    <label className="text-sm capitalize">Culture Introduction</label>
                    <Textarea
                      rows={7}
                      className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-2xl text-gray-700 leading-7 resize-none"
                      value={watch('cultureIntroText') || ''}
                      onChange={(event) => {
                        setValue('cultureIntroText', event.target.value, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      placeholder="Enter culture introduction text"
                    />
                    <div className="mt-3 flex items-center gap-3">
                      <Switch
                        checked={Boolean(watch('cultureIntroDefaultEnabled'))}
                        onChange={(checked) => {
                          setValue('cultureIntroDefaultEnabled', checked, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                        disabled={!String(watch('cultureIntroText') || '').trim()}
                        style={{
                          backgroundColor: watch('cultureIntroDefaultEnabled')
                            ? 'var(--color-primary)'
                            : undefined,
                          color: 'white',
                        }}
                      />
                      <span className="text-sm text-gray-700 leading-5">
                        Enable Culture Introduction by default for new jobs
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <Switch
                    checked={isLocationManagementEnabled}
                    onChange={(checked) => setIsLocationManagementEnabled(checked)}
                    style={{
                      backgroundColor: isLocationManagementEnabled
                        ? 'var(--color-primary)'
                        : undefined,
                      color: 'white',
                    }}
                  />
                  <span className="text-sm text-[#2D323A]">Allow Company to Manage Locations</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
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
                  <span className="text-sm text-[#2D323A]">
                    Allow company to configure AI Scoring
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-4">
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
                  <span className="text-sm text-[#2D323A]">
                    Enable Candidate Intro in AI Audio Call
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-4">
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
                  <span className="text-sm text-[#2D323A]">
                    Enable General Inquiry in AI Audio Call
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    appname="add customer"
                    className="w-full bg-white border text-black rounded-3xl py-3"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    CANCEL
                  </Button>
                  <Button
                    appname="add customer"
                    disabled={!isValid || isLoading}
                    className="w-full text-white bg-[var(--color-primary)] rounded-3xl py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSubmit(handleAddCustomer)}
                  >
                    {isLoading ? 'ADDING...' : 'ADD COMPANY'}
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </div>
        </div>
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

export default AddCustomer;
