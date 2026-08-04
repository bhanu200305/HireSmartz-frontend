import { Form, Upload, Select } from 'antd';
import { Button, Input, showToast } from '../..';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MdOutlineFileUpload } from 'react-icons/md';
import { AiFillStar } from 'react-icons/ai';
import MainLayout from '../../../layouts/MainLayout';
import { countryCodes } from '../../../constants/countryCode';

import { useEffect, useState } from 'react';
import '../../styles/user.css';
import { Loader } from '../../shared/ui/loader';
import { get } from 'lodash-es';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import useFetchRoles from '../../../hooks/useRoles';
import { Role } from '../../../api/rbac-service/Roles/roles';
import AddUserLayout from '../../../layouts/AddUserLayout';
import addOrgUserSchema from './AddOrganisationUserSchema';
import { useAddOrgUserMutation } from '../../../api/tenant-service/Organisation/AddOrganisationUser';
import {
  handlePhoneNumberChange,
  sanitizeInput,
} from '../../../shared/utils/validation/input.helpers';
import {
  cleanPhoneNumber,
  convertFileToBase64,
  makeFirstLetterUpperCase,
  safeDecodeToken,
} from '../../../shared/utils/methods';
import {
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_FILE_SIZE_BYTES,
  LOGO_FILE_SIZE_ERROR_MESSAGE,
  LOGO_FILE_TYPE_ERROR_MESSAGE,
} from '../../../constants/file.constants';
import { RootState } from '../../../redux/provider/store';
import { useGetLocationsQuery } from '../../../api/job-service/JobOpening/getLocations';
import { isHMOrRecruiter } from '../../../shared/utils/business-logic';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import { useGetCompanyDetailsQuery } from '../../../api/tenant-service/Company/viewCompany';

const { Option } = Select;
type AddOrganisationUserFormValues = {
  profilePicture?: string | null;
  profilePictureType?: string | null;
  firstName: string;
  lastName: string;
  emailId: string;
  phoneNumber: string;
  employeeId: string;
  countryCode: string;
  roleTypeMappingId: number;
  allowMultiLocationAccess?: boolean;
  canManageCompanySettings?: boolean;
  baseLocationId: number;
  selectedLocations?: number[];
  accessibleLocationIds?: number[];
};
type LocationOption = {
  id: number;
  name: string;
  status?: boolean;
  primary?: boolean;
};

const AddOrganisationUser = () => {
  const { roles, loading: rolesLoading } = useFetchRoles();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [addOrgUser, { isLoading }] = useAddOrgUserMutation();
  const { loginToken } = useSelector((state: RootState) => state.LoginSlice);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState<boolean>(false);
  const [previousBaseLocationId, setPreviousBaseLocationId] = useState<number | undefined>(
    undefined
  );
  const decodedTokenData = safeDecodeToken<{ companyId: number; companyName: string }>(loginToken);
  const companyIdFromParams = Number(searchParams.get('companyId') || 0);
  const returnTo = searchParams.get('returnTo');
  const companyId = companyIdFromParams || decodedTokenData?.companyId;
  const { data: companyDetails } = useGetCompanyDetailsQuery(
    { companyId: companyIdFromParams },
    { skip: !companyIdFromParams }
  );
  const companyName = companyDetails?.companyName || decodedTokenData?.companyName;
  const navigateBack = () => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }

    navigate(-1);
  };
  const roleOptionsRaw =
    (Array.isArray(roles?.data?.data) && roles.data.data) ||
    (Array.isArray((roles as unknown as { data?: Role[] })?.data) &&
      (roles as unknown as { data?: Role[] }).data) ||
    [];
  const roleOptions: Role[] = roleOptionsRaw
    .map((role) => ({
      id: Number(role.id),
      roleName: role.roleName,
    }))
    .filter((role) => Number.isFinite(role.id) && role.id > 0 && Boolean(role.roleName));

  const generateEmployeeId = () => {
    let prefix = 'CFP';

    if (companyName) {
      if (companyName.length >= 3) {
        prefix = companyName.slice(0, 3).toUpperCase();
      } else if (companyName.length === 2) {
        prefix = companyName.slice(0, 2).toUpperCase();
      } else if (companyName.length === 1) {
        prefix = companyName.slice(0, 1).toUpperCase();
      }
    }

    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}-${randomPart}`;
  };
  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors, isDirty, isValid },
  } = useForm<AddOrganisationUserFormValues>({
    resolver: zodResolver(addOrgUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      emailId: '',
      phoneNumber: '',
      employeeId: generateEmployeeId(),
      countryCode:
        countryCodes.find((code) => code.label === 'United States & Canada (+1)')?.value || '+1',
      roleTypeMappingId: undefined,
      profilePicture: null,
      profilePictureType: null,
      allowMultiLocationAccess: false,
      canManageCompanySettings: false,
      selectedLocations: [],
      baseLocationId: undefined,
    },
    mode: 'onChange',
  });

  const selectedRoleId = watch('roleTypeMappingId');
  const allowMultiLocationAccess = watch('allowMultiLocationAccess');
  const selectedLocations = watch('selectedLocations') || [];
  const baseLocationId = watch('baseLocationId');

  const selectedRole = roleOptions.find((role: Role) => role.id === selectedRoleId);

  const isRecruiterOrHiringManager = isHMOrRecruiter(selectedRole?.roleName);

  useEffect(() => {
    if (!baseLocationId) {
      setPreviousBaseLocationId(undefined);
      return;
    }

    const normalizedBaseLocationId = Number(baseLocationId);
    const normalizedPreviousBaseLocationId = Number(previousBaseLocationId);
    const currentSelected = (Array.isArray(selectedLocations) ? selectedLocations : [])
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id) && id > 0);
    const isNewBaseAlreadySelected = currentSelected.includes(normalizedBaseLocationId);

    let updatedSelectedLocations = [...currentSelected];

    // Keep all selected locations if the newly chosen base is already in the list.
    // Only replace previous base when the newly chosen base is not already selected.
    if (!isNewBaseAlreadySelected) {
      const withoutPreviousBase = normalizedPreviousBaseLocationId
        ? currentSelected.filter((id) => id !== normalizedPreviousBaseLocationId)
        : currentSelected;

      updatedSelectedLocations = Array.from(
        new Set([normalizedBaseLocationId, ...withoutPreviousBase])
      );
    }

    const hasChanged =
      updatedSelectedLocations.length !== currentSelected.length ||
      updatedSelectedLocations.some((id, index) => id !== currentSelected[index]);

    if (hasChanged) {
      setValue('selectedLocations', updatedSelectedLocations, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    if (normalizedPreviousBaseLocationId !== normalizedBaseLocationId) {
      setPreviousBaseLocationId(normalizedBaseLocationId);
    }
  }, [baseLocationId, previousBaseLocationId, selectedLocations, setValue]);

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

      const base64 = await convertFileToBase64(file);
      setValue('profilePicture', base64, { shouldDirty: true });
      setValue('profilePictureType', file.name, { shouldDirty: true });

      const previewURL = URL.createObjectURL(file);
      setImagePreview(previewURL);
      showToast({ message: 'Image uploaded successfully.', type: 'success' });
    } catch (error) {
      console.error('Error converting file to Base64:', error);
      showToast({ message: 'Error converting image to Base64.', type: 'error' });
    }
    return false;
  };

  const handleAddOrgUser = async (data: AddOrganisationUserFormValues) => {
    if (!loginToken) {
      showToast({
        message: 'Authentication token not found.',
        type: 'error',
      });
      return;
    }

    if (!data.baseLocationId) {
      showToast({
        message: 'Location is required.',
        type: 'error',
      });
      return;
    }

    const cleanedPhone = cleanPhoneNumber(data.phoneNumber);

    const selectedRoleData = roleOptions.find((role: Role) => role.id === data.roleTypeMappingId);
    const isMultiLocationRole = isHMOrRecruiter(selectedRoleData?.roleName);

    const normalizedSelectedLocations = (
      Array.isArray(data.selectedLocations)
        ? data.selectedLocations
        : watch('selectedLocations') || []
    )
      .map((id: number | string) => Number(id))
      .filter((id: number) => Number.isFinite(id) && id > 0);

    let accessibleLocations: number[] = [];

    if (data.baseLocationId) {
      accessibleLocations.push(data.baseLocationId);
    }

    if (
      isMultiLocationRole &&
      data.allowMultiLocationAccess &&
      normalizedSelectedLocations.length > 0
    ) {
      accessibleLocations = Array.from(
        new Set([Number(data.baseLocationId), ...normalizedSelectedLocations])
      );
    }
    const orgUserPayload = {
      firstName: makeFirstLetterUpperCase(sanitizeInput(data?.firstName)),
      lastName: makeFirstLetterUpperCase(sanitizeInput(data?.lastName)),
      emailId: data.emailId,
      phoneNumber: cleanedPhone,
      countryCode: data.countryCode,
      employeeId: data.employeeId,
      roleTypeMappingId: Number(data.roleTypeMappingId),
      profilePicture: data.profilePicture || '',
      profilePictureType: data.profilePictureType || '',
      status: true,
      archived: false,
      allowMultiLocationAccess: isMultiLocationRole
        ? Boolean(data.allowMultiLocationAccess)
        : false,
      canManageCompanySettings: isMultiLocationRole
        ? Boolean(data.canManageCompanySettings)
        : false,
      primaryLocationId: data.baseLocationId,
      accessibleLocationIds: accessibleLocations,
      companyId: companyIdFromParams || undefined,
    };

    addOrgUser(orgUserPayload)
      .unwrap()
      .then((res) => {
        if (res) {
          showToast({
            message: get(res, 'message', 'User has been added successfully'),
            type: 'success',
          });
          navigateBack();
        } else {
          showToast({
            message: get(res, 'message', 'Failed to add user. Please try again.'),
            type: 'error',
          });
        }
      })
      .catch((err) => {
        showToast({
          message: get(err, 'data.message', 'Failed to add user. Please try again.'),
          type: 'error',
        });
      });
  };

  const { data: locationsResponse = [], isLoading: locationsLoading } = useGetLocationsQuery(
    {
      companyId: companyId || 0,
      activeOnly: false,
    },
    {
      skip: !companyId,
    }
  );

  const locations: LocationOption[] = locationsResponse.map((location) => ({
    id: location.id,
    name: location.name || location.locationName || `Location ${location.id}`,
    status: location.status,
    primary: location.primary,
  }));

  const handleCancel = (): void => {
    if (isDirty) {
      setShowCancelConfirmation(true);
      return;
    }

    navigateBack();
  };

  return (
    <>
      <MainLayout>
        {isLoading && <Loader />}
        <AddUserLayout
          companyName={companyName}
          title="Add User"
          button={
            <div className="flex items-center gap-2">
              <Button
                appname="add user"
                className="w-full bg-white border text-black rounded-3xl px-4 py-2"
                onClick={handleCancel}
                disabled={isLoading}
              >
                CANCEL
              </Button>
              <Button
                appname="add user"
                disabled={!isValid || isLoading || !baseLocationId}
                className="w-full text-white bg-button rounded-3xl px-4 py-2 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmit(handleAddOrgUser)}
              >
                {isLoading ? 'ADDING...' : 'ADD USER'}
              </Button>
            </div>
          }
        >
          <Form layout="vertical">
            {isLoading && <Loader />}

            {/* Image Upload Section */}
            <Form.Item name="image" className="w-full text-center" style={{ marginBottom: '12px' }}>
              <Upload.Dragger
                beforeUpload={(file) => {
                  const allowedFileTypes = ['image/png', 'image/jpeg', 'image/jpg'];
                  if (!allowedFileTypes.includes(file.type)) {
                    showToast({
                      message: 'Invalid file type. Please upload a valid image file.',
                      type: 'error',
                    });
                    return Upload.LIST_IGNORE;
                  }
                  return handleFileUpload(file);
                }}
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
                <p className="roboto-font">Upload User's Image (Optional)</p>
              </Upload.Dragger>
              <p className="text-red-500">{errors.profilePicture?.message}</p>
              <p className="text-red-500">{errors.profilePictureType?.message}</p>
            </Form.Item>

            {/* First Name */}
            <Form.Item
              label={
                <span>
                  First Name <span className="required-asterisk">*</span>
                </span>
              }
              name="firstName"
              style={{ marginBottom: '10px' }}
            >
              <Input
                type="text"
                placeholder="First Name"
                maxLength={100}
                className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                {...register('firstName')}
              />
              <p className="text-red-500">{errors.firstName?.message}</p>
            </Form.Item>

            {/* Last Name */}
            <Form.Item
              label={
                <span>
                  Last Name <span className="required-asterisk">*</span>
                </span>
              }
              name="lastName"
              style={{ marginBottom: '10px' }}
            >
              <Input
                type="text"
                placeholder="Last Name"
                maxLength={100}
                className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                {...register('lastName')}
              />
              <p className="text-red-500">{errors.lastName?.message}</p>
            </Form.Item>

            {/* Email */}
            <Form.Item
              label={
                <span>
                  Email <span className="required-asterisk">*</span>
                </span>
              }
              name="email"
              style={{ marginBottom: '10px' }}
            >
              <Input
                placeholder="Email Address"
                className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                value={watch('emailId')}
                onChange={(e) => {
                  const noSpaces = e.target.value.replace(/\s/g, '');
                  setValue('emailId', noSpaces, { shouldDirty: true });
                  trigger('emailId');
                }}
              />
              <p className="text-red-500">{errors.emailId?.message}</p>
            </Form.Item>

            {/* Employee ID */}
            <Form.Item
              label={
                <span>
                  Employee ID <span className="required-asterisk">*</span>
                </span>
              }
              name="Employee ID"
              style={{ marginBottom: '10px' }}
            >
              <Input
                placeholder="Employee ID"
                className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                {...register('employeeId')}
                disabled
                value={watch('employeeId') || generateEmployeeId()}
              />
              <p className="text-red-500">{errors.employeeId?.message}</p>
            </Form.Item>

            {/* Phone Number */}
            <Form.Item
              label={
                <span>
                  Phone Number <span className="required-asterisk">*</span>
                </span>
              }
              name="phone"
              style={{ marginBottom: '10px' }}
            >
              <div className="phone-input-wrapper flex items-center bg-white w-full px-4 border rounded-3xl border-[var(--border)]">
                <Select
                  value={watch('countryCode')}
                  onChange={(value) => setValue('countryCode', value, { shouldDirty: true })}
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
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={watch('phoneNumber')}
                  onChange={(e) => handlePhoneNumberChange(e, setValue, 'phoneNumber', trigger)}
                  maxLength={14}
                  className="border-none focus:ring-0 focus:outline-none w-full"
                />
              </div>
              <p className="text-red-500">{errors.countryCode?.message}</p>
              <p className="text-red-500">{errors.phoneNumber?.message}</p>
            </Form.Item>

            {/* Base Location */}
            <Form.Item
              label={
                <span>
                  Location <span className="required-asterisk">*</span>
                </span>
              }
              style={{ marginBottom: '10px' }}
            >
              <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                <Select
                  value={watch('baseLocationId') || undefined}
                  onChange={(value) => {
                    setValue('baseLocationId', value, { shouldDirty: true });
                    trigger('baseLocationId');
                  }}
                  className="w-full custom-select-jobs placeholder-style"
                  placeholder="Select Location"
                  popupClassName="rounded-3xl"
                  loading={locationsLoading}
                  variant="borderless"
                  showSearch
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    String(option?.label ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  {locations.map((location) => (
                    <Option
                      key={location.id}
                      value={location.id}
                      label={location.name}
                      disabled={location.status === false}
                    >
                      <span className={location.status === false ? 'text-gray-400' : ''}>
                        {location.name}
                        {location.primary && (
                          <AiFillStar
                            className="ml-1 inline-block flex-shrink-0 text-amber-400"
                            title="Primary Location"
                          />
                        )}
                        {location.status === false && (
                          <span className="ml-2 text-xs italic flex-shrink-0">(Deactivated)</span>
                        )}
                      </span>
                    </Option>
                  ))}
                </Select>
              </div>
              <p className="text-red-500">{errors.baseLocationId?.message}</p>
            </Form.Item>

            {/* Role Selection */}
            <Form.Item
              label={
                <span>
                  Role <span className="required-asterisk">*</span>
                </span>
              }
              style={{ marginBottom: '10px' }}
            >
              <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                <Select
                  value={watch('roleTypeMappingId') || undefined}
                  onChange={(value) => {
                    setValue('roleTypeMappingId', value, { shouldDirty: true });
                    trigger('roleTypeMappingId');
                  }}
                  className="w-full custom-select-jobs placeholder-style"
                  placeholder="Select Role"
                  popupClassName="rounded-3xl"
                  loading={rolesLoading}
                  variant="borderless"
                >
                  {roleOptions.map((role: Role) => (
                    <Option key={role.id} value={role.id}>
                      {role.roleName}
                    </Option>
                  ))}
                </Select>
              </div>
              <p className="text-red-500">{errors.roleTypeMappingId?.message}</p>
            </Form.Item>

            {/* Multi-location access checkbox */}
            {isRecruiterOrHiringManager && (
              <Form.Item style={{ marginBottom: '10px' }}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowMultiLocationAccess}
                    onChange={(e) => {
                      setValue('allowMultiLocationAccess', e.target.checked, { shouldDirty: true });
                      if (!e.target.checked) {
                        const baseId = watch('baseLocationId');
                        setValue('selectedLocations', baseId ? [baseId] : [], {
                          shouldDirty: true,
                        });
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span>Allow access to jobs across multiple locations</span>
                </div>
              </Form.Item>
            )}

            {isRecruiterOrHiringManager && (
              <Form.Item style={{ marginBottom: '10px' }}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={watch('canManageCompanySettings')}
                    onChange={(e) => {
                      setValue('canManageCompanySettings', e.target.checked, {
                        shouldDirty: true,
                      });
                    }}
                    className="w-4 h-4"
                  />
                  <span>Allow access to manage Company Settings</span>
                </div>
              </Form.Item>
            )}

            {/* Multiple Locations Selection */}
            {isRecruiterOrHiringManager && allowMultiLocationAccess && (
              <Form.Item
                label={
                  <span>
                    Choose Locations <span className="required-asterisk">*</span>
                  </span>
                }
              >
                <div className="space-y-3">
                  <div className="relative">
                    <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                      <Select
                        mode="multiple"
                        value={selectedLocations}
                        onChange={(value) => {
                          const baseLocationId = watch('baseLocationId');
                          const updatedValues = baseLocationId
                            ? Array.from(new Set([baseLocationId, ...value]))
                            : value;

                          setValue('selectedLocations', updatedValues, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                        className="w-full custom-select-jobs placeholder-style [&_.ant-select-selector]:min-h-auto [&_.ant-select-selector]:h-auto [&_.ant-select-selection-item]:!flex [&_.ant-select-selection-item]:!flex-wrap [&_.ant-select-selection-item]:!word-break"
                        placeholder="Select Locations"
                        loading={locationsLoading}
                        popupClassName="rounded-3xl"
                        showSearch
                        allowClear
                        optionFilterProp="label"
                        filterOption={(input, option) =>
                          String(option?.label ?? '')
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                        variant="borderless"
                        maxTagCount={0}
                        maxTagPlaceholder={() => (
                          <span className="text-sm text-gray-700 truncate max-w-xs">
                            {selectedLocations.length} of {locations.length} locations selected
                          </span>
                        )}
                      >
                        {locations.map((loc) => {
                          const isBase = loc.id === watch('baseLocationId');
                          const isDeactivated = loc.status === false;
                          return (
                            <Option
                              key={loc.id}
                              value={loc.id}
                              label={loc.name}
                              disabled={isBase || isDeactivated}
                            >
                              <div className="flex items-center justify-between">
                                <span className={isDeactivated ? 'text-gray-400' : ''}>
                                  {loc.name}
                                  {loc.primary && (
                                    <AiFillStar
                                      className="ml-1 inline-block flex-shrink-0 text-amber-400"
                                      title="Primary Location"
                                    />
                                  )}
                                  {isDeactivated && (
                                    <span className="ml-2 text-xs italic flex-shrink-0">
                                      (Deactivated)
                                    </span>
                                  )}
                                </span>
                              </div>
                            </Option>
                          );
                        })}
                      </Select>
                    </div>
                  </div>

                  {/* Selected Locations Display */}
                  {selectedLocations.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-40 overflow-auto pr-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Selected Locations
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {locations
                          .filter((loc) => selectedLocations?.includes(loc.id))
                          .map((loc) => {
                            const isBase = loc.id === watch('baseLocationId');

                            return (
                              <span
                                key={loc.id}
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                                  isBase
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-blue-100 text-blue-800 border-blue-200'
                                }`}
                              >
                                {loc.name}
                                {!isBase && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = selectedLocations?.filter(
                                        (id: number) => id !== loc.id
                                      );
                                      setValue('selectedLocations', updated, {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                      });
                                    }}
                                    className="ml-1 w-4 h-4 flex items-center justify-center text-blue-500 hover:text-blue-700 hover:bg-blue-200 rounded-full"
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <p className="text-red-500">{errors?.selectedLocations?.message}</p>
                </div>
              </Form.Item>
            )}
          </Form>
        </AddUserLayout>
      </MainLayout>
      {showCancelConfirmation && (
        <ConfirmationModal
          onClose={() => setShowCancelConfirmation(false)}
          onConfirm={() => {
            setShowCancelConfirmation(false);
            navigateBack();
          }}
          title="Are you sure you want to leave? Unsaved changes will be lost."
          confirmText="LEAVE PAGE"
        />
      )}
    </>
  );
};

export default AddOrganisationUser;
