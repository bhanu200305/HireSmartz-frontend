import React, { useEffect, useMemo, useState } from 'react';
import {
  MdDelete,
  MdEdit,
  MdOutlineArrowBack,
  MdOutlineEmail,
  MdOutlineLocalPhone,
} from 'react-icons/md';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';
import { RiUserCommunityLine } from 'react-icons/ri';
import { AiFillStar } from 'react-icons/ai';
import MainLayout from '../../../layouts/MainLayout';
import { Button, Input, showToast } from '../../shared';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
import DropdownWithAddOption from '../../shared/ui/DropdownWithAddOption';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Select, Switch, Upload } from 'antd';
import { countryCodes } from '../../../constants/countryCode';
import '../../styles/user.css';
import { z } from 'zod';
import useFetchRoles from '../../../hooks/useRoles';
import { get } from 'lodash-es';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import './editOrgUser.css';
import { Role } from '../../../api/rbac-service/Roles/roles';
import { Loader } from '../../shared/ui/loader';
import editOrgUserSchema from './EditOrganisationUserSchema';
import { useSelector } from 'react-redux';
import {
  useGetViewOrgUserDetailsQuery,
  useUpdateOrgUserMutation,
} from '../../../api/tenant-service/Organisation/AddOrganisationUser';
import { useGetLocationsQuery } from '../../../api/job-service/JobOpening/getLocations';
import {
  cleanPhoneNumber,
  convertFileToBase64,
  formatPhoneNumber,
  makeFirstLetterUpperCase,
  safeDecodeToken,
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
import { isHMOrRecruiter, sanitizeImagePreview } from '../../../shared/utils/business-logic';
import { RootState } from '../../../redux/provider/store';

const { Option } = Select;
type EditOrgUserFormValues = z.infer<typeof editOrgUserSchema>;

const EditOrgUser = () => {
  const [searchParams] = useSearchParams();
  const orgUserId = searchParams.get('orgUserId');
  const companyIdFromParams = Number(searchParams.get('companyId') || 0);
  const returnTo = searchParams.get('returnTo');
  const navigate = useNavigate();
  const navigateBack = () => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }

    navigate(-1);
  };
  const [isHovered, setIsHovered] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [imageChanged, setImageChanged] = useState(false);
  const [isProfileDeleted, setIsProfileDeleted] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [showRemoveMultiLocationModal, setShowRemoveMultiLocationModal] = useState(false);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const uploadRef = React.useRef<any>(null);
  const { loginToken } = useSelector((state: RootState) => state.LoginSlice);
  const decodedTokenData = safeDecodeToken<{ companyId: number }>(loginToken);
  const { data, isLoading, refetch } = useGetViewOrgUserDetailsQuery(
    { userId: Number(orgUserId), companyId: companyIdFromParams || undefined },
    { refetchOnMountOrArgChange: true }
  );
  const userData = data || ({} as any);
  const companyId = Number(
    companyIdFromParams || userData?.companyId || decodedTokenData?.companyId || 0
  );
  const [updateOrgUser, { isLoading: updateLoading }] = useUpdateOrgUserMutation();
  const { roles, loading: rolesLoading } = useFetchRoles();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<EditOrgUserFormValues>({
    resolver: zodResolver(editOrgUserSchema),
    defaultValues: {
      profilePicture: '',
      firstName: '',
      lastName: '',
      emailId: '',
      phoneNumber: '',
      employeeId: '',
      countryCode:
        countryCodes.find((code) => code.label === 'United States & Canada (+1)')?.value || '+1',
      role: undefined,
      baseLocationId: undefined,
      allowMultiLocationAccess: false,
      canManageCompanySettings: false,
      selectedLocations: [],
      status: false,
    },
  });

  const selectedLocationIds = watch('selectedLocations') || [];
  const selectedBaseLocationId = watch('baseLocationId');
  const allowMultiLocationAccess = watch('allowMultiLocationAccess');

  const { data: locationsResponse = [], isLoading: locationsLoading } = useGetLocationsQuery(
    {
      companyId,
      activeOnly: false,
    },
    {
      skip: !companyId,
    }
  );

  const locationOptions = useMemo(
    () =>
      locationsResponse
        .map((location) => ({
          id: Number(location.id),
          name: location.locationName || location.name || `Location ${location.id}`,
          status: location.status,
          primary: location.primary,
          isDeleted: location.status === false,
          isPrimary: Boolean(location.primary),
        }))
        .filter((location) => Number.isFinite(location.id) && location.id > 0),
    [locationsResponse]
  );

  const selectedLocations = useMemo(() => {
    const selectedIds = new Set(selectedLocationIds.map((id) => Number(id)));
    return locationOptions.filter((location) => selectedIds.has(location.id));
  }, [locationOptions, selectedLocationIds]);

  useEffect(() => {
    if (userData && roles?.data) {
      const matchedRole = Array.isArray(roles.data)
        ? roles.data.find((role: Role) => role.roleName === userData.role)
        : null;

      const primaryLocationIdFromResponse = Number(
        userData?.primaryLocation?.id ||
          userData?.primaryLocationId ||
          userData?.baseLocationId ||
          0
      );

      const accessibleLocationIdsFromResponse = Array.isArray(userData?.accessibleLocations)
        ? userData.accessibleLocations
            .map((location: { id?: number | string }) => Number(location?.id || 0))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        : Array.isArray(userData?.accessibleLocationIds)
          ? userData.accessibleLocationIds
              .map((id: number | string) => Number(id))
              .filter((id: number) => Number.isFinite(id) && id > 0)
          : [];

      const normalizedSelectedLocations =
        accessibleLocationIdsFromResponse.length > 0
          ? accessibleLocationIdsFromResponse
          : primaryLocationIdFromResponse
            ? [primaryLocationIdFromResponse]
            : [];

      reset({
        profilePicture: userData.profilePicture || '',
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        emailId: userData.emailId || '',
        phoneNumber: formatPhoneNumber(userData.phoneNumber || ''),
        employeeId: userData.employeeId || '',
        countryCode:
          userData.countryCode ||
          countryCodes.find((code) => code.label === 'United States & Canada (+1)')?.value ||
          '+1',
        role: matchedRole?.id || userData.role || null,
        baseLocationId: primaryLocationIdFromResponse || undefined,
        allowMultiLocationAccess: accessibleLocationIdsFromResponse.length > 1,
        canManageCompanySettings:
          userData.canManageCompanySettings === true ||
          String(userData.canManageCompanySettings).toLowerCase() === 'true',
        selectedLocations: normalizedSelectedLocations,
        status: userData.status || false,
      });

      if (userData.profilePicture) {
        setImagePreview(userData.profilePicture);
      }
      setImageChanged(false);
      setIsProfileDeleted(false);
    }
  }, [userData, reset, roles?.data]);

  const selectedRoleName = Array.isArray(roles?.data)
    ? (roles.data.find((role: Role) => String(role.id) === String(watch('role')))?.roleName ?? '')
    : '';
  const selectedRole = selectedRoleName || watch('role');

  const isRecruiterOrHiringManager = isHMOrRecruiter(selectedRoleName);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValue(name as keyof EditOrgUserFormValues, value, { shouldDirty: true });
    trigger(name as keyof EditOrgUserFormValues);
  };

  const handleSwitchChange = (checked: boolean) => {
    setValue('status', checked, { shouldDirty: true });
    trigger('status');
  };
  const handleDeleteProfilePicture = () => {
    setImagePreview('');
    setValue('profilePicture', '');
    setValue('profilePictureType', '');
    setImageChanged(true);
    setIsProfileDeleted(true);
    showToast({ message: 'Profile picture removed. Save changes to apply.', type: 'success' });
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

      let fileToUse = file;

      if (file.size / 1024 / 1024 > 5) {
        fileToUse = file;
        if (fileToUse.size / 1024 / 1024 > 5) {
          showToast({
            message: 'Could not compress the image below 5 MB. Please choose a smaller file.',
            type: 'error',
          });
          return Upload.LIST_IGNORE;
        }
      }

      const base64 = await convertFileToBase64(file);
      setValue('profilePicture', base64);
      setValue('profilePictureType', file.name);
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

  const handleUpdateUser = async (data: any) => {
    const cleanedPhoneNumber = cleanPhoneNumber(data.phoneNumber);
    const normalizedSelectedLocations = (
      Array.isArray(data.selectedLocations) ? data.selectedLocations : selectedLocationIds
    )
      .map((id: number | string) => Number(id))
      .filter((id: number) => Number.isFinite(id) && id > 0);

    const accessibleLocationIds = Array.from(
      new Set([Number(data.baseLocationId), ...normalizedSelectedLocations])
    ).filter((id) => Number.isFinite(id) && id > 0);

    const updatedUserData = {
      userId: orgUserId,
      companyId: companyIdFromParams || undefined,
      ...data,
      firstName: makeFirstLetterUpperCase(sanitizeInput(data?.firstName)),
      lastName: makeFirstLetterUpperCase(sanitizeInput(data?.lastName)),
      phoneNumber: cleanedPhoneNumber,
      roleTypeMappingId: Number(data.role),
      allowMultiLocationAccess: accessibleLocationIds.length > 1,
      canManageCompanySettings: Boolean(data.canManageCompanySettings),
      primaryLocationId: Number(data.baseLocationId),
      accessibleLocationIds,
      profileDeleted: isProfileDeleted,
    };
    if (imageChanged) {
      updatedUserData.profilePicture = isProfileDeleted ? null : data.profilePicture;
      updatedUserData.profilePictureType = isProfileDeleted ? null : data.profilePictureType;
    } else {
      updatedUserData.profilePicture = null;
      updatedUserData.profilePictureType = null;
    }

    updateOrgUser(updatedUserData)
      .unwrap()
      .then((res) => {
        if (res) {
          showToast({
            message: get(res, 'message', 'User has been updated successfully'),
            type: 'success',
          });
          navigateBack();
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

  const handleCancel = (): void => {
    if (isDirty || imageChanged) {
      setShowCancelConfirmation(true);
      return;
    }

    navigateBack();
  };
  return (
    <div>
      <MainLayout>
        <div className="p-4 pt-16 relative">
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
            {isLoading && <Loader />}
            <div className="flex gap-4 bg-[#FAFAFA] rounded-3xl p-4">
              <div
                className="relative w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden group"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {imagePreview ? (
                  <img
                    src={sanitizeImagePreview(imagePreview)}
                    alt={`${watch('firstName')} ${watch('lastName')}`}
                    className="w-full h-full object-cover"
                    onError={() => {
                      setImageLoadFailed(true);
                      setImagePreview('');
                    }}
                  />
                ) : (
                  <span className="text-xl font-semibold text-white">
                    {(watch('firstName')?.[0] || '').toUpperCase()}
                    {(watch('lastName')?.[0] || '').toUpperCase()}
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
                <h2 className="text-xl font-semibold">
                  {watch('firstName')} {watch('lastName')}
                </h2>
                <div className="flex items-center text-sm gap-2">
                  <MdOutlineEmail size={16} />
                  <a href={`mailto:${watch('emailId')}`} className="underline">
                    {watch('emailId')}
                  </a>
                </div>
                <div className="flex items-center text-sm gap-2">
                  <MdOutlineLocalPhone size={16} />
                  <a
                    href={`tel:${watch('countryCode')}${watch('phoneNumber')}`}
                    className="underline"
                  >
                    {watch('countryCode')}
                    {formatPhoneNumber(watch('phoneNumber'))}
                  </a>
                </div>
                <div className="flex items-center text-sm gap-2">
                  <RiUserCommunityLine size={16} />
                  <span>
                    <span>
                      <span>{selectedRole}</span>
                    </span>
                  </span>
                </div>
                <div className="flex items-center text-sm gap-2">
                  <HiOutlineBuildingOffice2 size={16} />
                  <span>
                    <span>
                      <span>{userData.companyName || 'N/A'}</span>
                    </span>
                  </span>
                </div>
              </div>
              <div className="items-start flex gap-1">
                <div className={`p-1 text-sm`}>
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
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {/* First Name */}
              <div>
                <label className="text-sm capitalize">
                  First Name <span className="required-asterisk">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="First Name"
                  maxLength={100}
                  className=" w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                  {...register('firstName')}
                  onChange={handleInputChange}
                />
                <p className="text-red-500">{errors.firstName?.message}</p>
              </div>

              {/* Last Name */}
              <div>
                <label className="text-sm capitalize">
                  Last Name <span className="required-asterisk">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Last Name"
                  maxLength={100}
                  className=" w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                  {...register('lastName')}
                  onChange={handleInputChange}
                />
                <p className="text-red-500">{errors.lastName?.message}</p>
              </div>
              {/* Employee ID */}
              <div>
                <label className="text-sm capitalize">
                  Employee ID <span className="required-asterisk">*</span>
                </label>
                <Input
                  type="text"
                  className=" w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)] !text-black"
                  {...register('employeeId')}
                  onChange={handleInputChange}
                  disabled
                />
                <p className="text-red-500">{errors.employeeId?.message}</p>
              </div>

              {/* Email */}
              <div>
                <label className="text-sm capitalize">
                  Email <span className="required-asterisk">*</span>
                </label>
                <Input
                  className=" w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-blue-300 border-[var(--border)]"
                  value={watch('emailId')}
                  placeholder="Email"
                  onChange={(e) => {
                    const noSpaces = e.target.value.replace(/\s/g, '');
                    setValue('emailId', noSpaces, { shouldDirty: true });
                    trigger('emailId');
                  }}
                />
                <p className="text-red-500">{errors.emailId?.message}</p>
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-sm capitalize">
                  Phone Number <span className="required-asterisk">*</span>
                </label>
                <div className="phone-input-wrapper flex items-center bg-white w-full px-4 mt-1 border rounded-3xl border-[var(--border)]">
                  {/* Country Code Select */}
                  <Select
                    value={watch('countryCode')}
                    onChange={(value) => {
                      setValue('countryCode', value, { shouldDirty: true });
                      trigger('countryCode');
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
                    placeholder="(555) 123-4567"
                    // {...register('phoneNumber')}
                    className="border-none focus:ring-0 focus:outline-none w-full"
                    value={watch('phoneNumber')}
                    onChange={(e) => handlePhoneNumberChange(e, setValue, 'phoneNumber', trigger)}
                    maxLength={14}
                  />
                </div>
                <p className="text-red-500">{errors.countryCode?.message}</p>
                <p className="text-red-500">{errors.phoneNumber?.message}</p>
              </div>

              {/* Role */}
              <div>
                <label className="text-sm capitalize">
                  Role <span className="required-asterisk">*</span>
                </label>
                <div className="border-wrapper border border-[var(--border)] p-1 mt-1 w-full rounded-3xl ">
                  <Select
                    value={watch('role') || undefined}
                    onChange={(value) => {
                      setValue('role', value, { shouldDirty: true });
                      trigger('role');
                      const newRoleName = Array.isArray(roles?.data)
                        ? roles.data.find((r: Role) => r.id === value)?.roleName
                        : undefined;
                      if (!isHMOrRecruiter(newRoleName)) {
                        setValue('allowMultiLocationAccess', false, { shouldDirty: true });
                        const base = watch('baseLocationId');
                        setValue('selectedLocations', base ? [base] : [], { shouldDirty: true });
                      }
                    }}
                    placeholder="Select Role"
                    className="w-full p-2 custom-select-org"
                    loading={rolesLoading}
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      String(option?.children ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  >
                    {Array.isArray(roles?.data) &&
                      roles?.data.map((role: Role) => (
                        <Option key={role.id} value={role.id}>
                          {role.roleName}
                        </Option>
                      ))}
                  </Select>
                </div>
                <p className="text-red-500">{errors.role?.message}</p>
                {isRecruiterOrHiringManager && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="canManageCompanySettings"
                      checked={!!watch('canManageCompanySettings')}
                      onChange={(e) => {
                        setValue('canManageCompanySettings', e.target.checked, {
                          shouldDirty: true,
                        });
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="canManageCompanySettings" className="text-sm cursor-pointer">
                      Allow access to manage Company Settings
                    </label>
                  </div>
                )}
              </div>

              <div className="col-span-1">
                <label className="text-sm capitalize">
                  Location <span className="required-asterisk">*</span>
                </label>
                <div className="border-wrapper border border-[var(--border)] p-1 mt-1 w-full rounded-3xl">
                  <Select
                    showSearch
                    value={selectedBaseLocationId || undefined}
                    onChange={(value) => {
                      const oldBaseLocationId = Number(selectedBaseLocationId);
                      const newBaseLocationId = Number(value);
                      setValue('baseLocationId', value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      trigger('baseLocationId');
                      const current = (watch('selectedLocations') || []).map((id: number) =>
                        Number(id)
                      );

                      // If the new base is already selected, keep current selections unchanged.
                      // If not, replace previous base with the new one.
                      let updated = [...current];
                      if (!current.includes(newBaseLocationId)) {
                        updated = current.filter((id: number) => id !== oldBaseLocationId);
                        updated = [newBaseLocationId, ...updated];
                      }

                      setValue('selectedLocations', updated, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    placeholder="Select Location"
                    className="w-full p-2 custom-select-org"
                    loading={locationsLoading}
                    optionFilterProp="label"
                    filterOption={(input, option) =>
                      String(option?.label ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  >
                    {locationOptions.map((location) => (
                      <Option
                        key={location.id}
                        value={location.id}
                        label={location.name}
                        disabled={location.status === false}
                      >
                        <span>
                          {location.name}
                          {location.primary && (
                            <AiFillStar
                              className="ml-1 inline-block flex-shrink-0 text-amber-400"
                              title="Primary Location"
                            />
                          )}
                          {location.status === false && (
                            <span className="ml-2 text-xs italic">(Deactivated)</span>
                          )}
                        </span>
                      </Option>
                    ))}
                  </Select>
                </div>
                <p className="text-red-500">{errors.baseLocationId?.message}</p>
                {/* Multi-location access checkbox — recruiter / hiring manager only */}
                {isRecruiterOrHiringManager && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="allowMultiLocation"
                      checked={!!allowMultiLocationAccess}
                      onChange={(e) => {
                        if (!e.target.checked) {
                          // Show confirmation before removing multi-location access
                          setShowRemoveMultiLocationModal(true);
                        } else {
                          setValue('allowMultiLocationAccess', true, { shouldDirty: true });
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor="allowMultiLocation" className="text-sm cursor-pointer">
                      Allow access to jobs across multiple locations
                    </label>
                  </div>
                )}

                {showRemoveMultiLocationModal && (
                  <ConfirmationModal
                    title="Are you sure you want to remove access to multiple locations for this user?"
                    confirmText="YES"
                    cancelText="NO"
                    onConfirm={() => {
                      setValue('allowMultiLocationAccess', false, { shouldDirty: true });
                      const base = watch('baseLocationId');
                      setValue('selectedLocations', base ? [base] : [], {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setShowRemoveMultiLocationModal(false);
                    }}
                    onClose={() => setShowRemoveMultiLocationModal(false)}
                  />
                )}
              </div>

              {/* Choose Locations — only for recruiter/hiring manager with checkbox ticked */}
              {isRecruiterOrHiringManager && allowMultiLocationAccess && (
                <div className="col-span-1">
                  <label className="text-sm capitalize">
                    Choose Locations <span className="required-asterisk">*</span>
                  </label>
                  <div className="space-y-3 mt-1">
                    <div className="relative">
                      <DropdownWithAddOption
                        className="w-full custom-select-org placeholder-style hide-rest-item-while-open"
                        value={selectedLocationIds}
                        onChange={(value) => {
                          const baseLocationValue = watch('baseLocationId');
                          const updatedValues = baseLocationValue
                            ? Array.from(new Set([baseLocationValue, ...value]))
                            : value;
                          setValue('selectedLocations', updatedValues, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                        onOpenChange={(open) => {
                          setIsLocationDropdownOpen(open);
                        }}
                        options={locationOptions}
                        loading={locationsLoading}
                        placeholder="Select Locations"
                        type="locations"
                        mode="multiple"
                        enableEditDelete={false}
                        maxTagCount={0}
                        maxTagPlaceholder={
                          !isLocationDropdownOpen
                            ? (omittedValues: any) => (
                                <span>
                                  {omittedValues.length} of {locationOptions.length} locations
                                  selected
                                </span>
                              )
                            : null
                        }
                      />
                    </div>

                    {selectedLocationIds.length > 0 && !isLocationDropdownOpen && (
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-40 overflow-auto pr-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Selected Locations
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedLocations.map((location) => {
                            const isBase = location.id === selectedBaseLocationId;
                            return (
                              <span
                                key={location.id}
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                                  isBase
                                    ? 'bg-primary text-white border-primary'
                                    : location.status === false
                                      ? 'bg-gray-100 text-gray-600 border-gray-300'
                                      : 'bg-blue-100 text-blue-800 border-blue-200'
                                }`}
                              >
                                {location.name}
                                {location.status === false && (
                                  <span className="ml-2 text-xs italic">(Deactivated)</span>
                                )}
                                {!isBase && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedValues = selectedLocationIds.filter(
                                        (id: number) => id !== location.id
                                      );
                                      setValue('selectedLocations', updatedValues, {
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
                    <p className="text-red-500">{errors.selectedLocations?.message as string}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex w-full gap-2 p-8 pt-26 justify-end">
          {updateLoading && <Loader />}
          <Button
            appname=""
            className="w-40 bg-white border text-black p-2 rounded-3xl "
            onClick={handleCancel}
          >
            CANCEL
          </Button>
          <Button
            disabled={(!isDirty && !imageChanged) || updateLoading || !isValid}
            className="w-40 p-2 bg-primary text-white rounded-3xl disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSubmit(handleUpdateUser)}
          >
            {updateLoading ? 'UPDATING...' : 'SAVE CHANGES'}
          </Button>
        </div>
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
    </div>
  );
};

export default EditOrgUser;
