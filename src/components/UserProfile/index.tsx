import {
  MdDelete,
  MdEdit,
  MdOutlineArrowBack,
  MdOutlineFileUpload,
  MdOutlineNotifications,
  MdOutlineSecurity,
} from 'react-icons/md';
import MainLayout from '../../layouts/MainLayout';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Form, Select, Upload } from 'antd';
import { Button, Input, showToast } from '../shared';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UserProfileSchema } from './UserProfileSchema';
import { countryCodes } from '../../constants/countryCode';
import React, { useEffect, useState } from 'react';
import './userProfile.css';
import { RootState } from '../../redux/provider/store';
import {
  useGetOwnUserProfileQuery,
  useUpdateOwnUserProfileMutation,
} from '../../api/organization-service/Users/users';
import {
  useGetOwnPlatformProfileQuery,
  useUpdateOwnPlatformProfileMutation,
} from '../../api/organization-service/Platform/staff';
import { sanitizeInput } from '../../shared/utils/validation/input.helpers';
import { restrictPhoneDigits } from '../../shared/utils/validation/phoneValidation';
import { cleanPhoneNumber, convertFileToBase64 } from '../../shared/utils/methods';
import {
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_FILE_SIZE_BYTES,
  LOGO_FILE_SIZE_ERROR_MESSAGE,
  LOGO_FILE_TYPE_ERROR_MESSAGE,
} from '../../constants/file.constants';
import { get } from 'lodash-es';
import { Loader } from '../shared/ui/loader';
const { Option } = Select;

const UserProfile = () => {
  const navigate = useNavigate();

  // Decided upfront from Redux, not by reacting to a 404 — a platform
  // caller has no `users` row at all (see GetOwnUserProfileUseCase's
  // docstring), so there's no reason to even attempt that query for them.
  const callerKind = useSelector((state: RootState) => state.LoginSlice.callerKind);
  const isPlatformCaller = callerKind === 'platform';

  const {
    data: tenantProfileData,
    isLoading: isTenantLoading,
    isSuccess: isTenantProfileLoaded,
  } = useGetOwnUserProfileQuery(undefined, { skip: isPlatformCaller });
  const {
    data: platformProfileData,
    isLoading: isPlatformLoading,
    isSuccess: isPlatformProfileLoaded,
  } = useGetOwnPlatformProfileQuery(undefined, { skip: !isPlatformCaller });
  const isLoading = isPlatformCaller ? isPlatformLoading : isTenantLoading;
  const profileLoaded = isPlatformCaller ? isPlatformProfileLoaded : isTenantProfileLoaded;

  const [updateTenantProfile, { isLoading: isUpdatingTenant }] = useUpdateOwnUserProfileMutation();
  const [updatePlatformProfile, { isLoading: isUpdatingPlatform }] =
    useUpdateOwnPlatformProfileMutation();
  const isUpdating = isPlatformCaller ? isUpdatingPlatform : isUpdatingTenant;
  const [isHovered, setIsHovered] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [imageChanged, setImageChanged] = useState(false);
  const [isProfileDeleted, setIsProfileDeleted] = useState(false);
  const uploadRef = React.useRef<any>(null);
  const {
    trigger,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(UserProfileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      emailId: '',
      phoneNumber: '',
      country: '',
      countryCode: '+1',
      state: '',
      city: '',
      addressLine1: '',
      addressLine2: '',
      pinCode: '',
      profilePicture: '',
      profilePictureType: '',
      roleName: '',
      companyName: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    // Neither OrgUser (organization-service's `users` table) nor
    // OwnPlatformProfile (`memberships`) has address/profilePicture/
    // companyName fields — those stay blank via the same `|| ''` fallback
    // already used everywhere else in this form.
    if (isPlatformCaller && platformProfileData) {
      reset({
        firstName: platformProfileData.first_name || '',
        lastName: platformProfileData.last_name || '',
        emailId: platformProfileData.email || '',
        phoneNumber: cleanPhoneNumber(platformProfileData.phone_no || ''),
        country: '',
        countryCode: platformProfileData.country_code || '+1',
        state: '',
        city: '',
        addressLine1: '',
        addressLine2: '',
        pinCode: '',
        profilePicture: '',
        profilePictureType: '',
        roleName: platformProfileData.role || '',
        companyName: '',
      });
      setImageChanged(false);
      setIsProfileDeleted(false);
    } else if (!isPlatformCaller && tenantProfileData) {
      reset({
        firstName: tenantProfileData.first_name || '',
        lastName: tenantProfileData.last_name || '',
        emailId: tenantProfileData.email || '',
        phoneNumber: cleanPhoneNumber(tenantProfileData.phone_no || ''),
        country: '',
        countryCode: tenantProfileData.country_code || '+1',
        state: '',
        city: '',
        addressLine1: '',
        addressLine2: '',
        pinCode: '',
        profilePicture: '',
        profilePictureType: '',
        roleName: '',
        companyName: '',
      });
      setImageChanged(false);
      setIsProfileDeleted(false);
    }
  }, [isPlatformCaller, tenantProfileData, platformProfileData, reset]);

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

      const previewURL = URL.createObjectURL(file);
      setImagePreview(previewURL);

      const base64 = await convertFileToBase64(file);
      setValue('profilePicture', base64);
      setValue('profilePictureType', file.name);
      setImageChanged(true);
      setIsProfileDeleted(false);

      showToast({
        message: 'Image uploaded successfully. Save changes to apply.',
        type: 'success',
      });
    } catch (error) {
      showToast({ message: 'Error processing image.', type: 'error' });
    }
    return false;
  };

  const [countrySearch, setCountrySearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');

  // const { data: countries, loading: loadingCountries } = useLocationDropdown(
  //   countrySearch === '' ? profileData?.country?.toLowerCase() || '' : countrySearch
  // );

  // const { states, cities } = useMemo(() => {
  //   const country = selectedCountry ? countries.find((c) => c.name === selectedCountry) : null;

  //   const state =
  //     selectedState && country ? country.states.find((s) => s.name === selectedState) : null;

  //   return {
  //     states: country?.states || [],
  //     cities: state?.cities || [],
  //   };
  // }, [selectedCountry, selectedState, countries]);
  // const handleCountryChange = (countryName: string) => {
  //   setSelectedCountry(countryName);
  //   setSelectedState('');
  //   setValue('country', countryName);
  //   setValue('state', '');
  //   setValue('city', '  ');
  // };

  // const handleStateChange = (stateName: string) => {
  //   setSelectedState(stateName);
  //   setValue('state', stateName);
  //   setValue('city', '  ');
  // };

  // const handleCityChange = (cityName: string) => {
  //   setSelectedCity(cityName);
  //   setValue('city', cityName);
  // };

  const handleUpdateProfile = async (data: any) => {
    try {
      if (isPlatformCaller) {
        // Membership has no email/role fields on this self-service surface
        // — those inputs are disabled below, never sent here.
        await updatePlatformProfile({
          first_name: sanitizeInput(data.firstName),
          last_name: sanitizeInput(data.lastName),
          phone_no: cleanPhoneNumber(data.phoneNumber),
          country_code: data.countryCode,
        }).unwrap();
      } else {
        // Only the fields organization-service's UpdateUserRequest actually
        // accepts (extra="forbid" — an unrecognised field 422s, not a
        // silent no-op). profilePicture/address fields have no backend
        // column to persist to (see the useEffect above), so they're never
        // sent.
        await updateTenantProfile({
          email: sanitizeInput(data.emailId),
          first_name: sanitizeInput(data.firstName),
          last_name: sanitizeInput(data.lastName),
          phone_no: cleanPhoneNumber(data.phoneNumber),
          country_code: data.countryCode,
        }).unwrap();
      }
      showToast({
        message: 'Profile has been updated successfully',
        type: 'success',
      });
      navigate('/');
    } catch (error) {
      showToast({
        message: get(error, 'data.message', 'Failed to update profile. Please try again.'),
        type: 'error',
      });
      console.error('Update error:', error);
    }
  };

  return (
    <>
      {(isLoading || isUpdating) && <Loader />}
      <MainLayout>
        <div className="flex flex-col items-center bg-white px-4 mt-4 relative pt-8">
          <div className="mb-4 self-start px-4 absolute">
            <button
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
            >
              <MdOutlineArrowBack className="mr-2" />
              <span>Back</span>
            </button>
          </div>
          <div className="mb-4 self-end px-4 absolute right-0 flex items-center gap-4">
            <button
              onClick={() => navigate('/settings/notifications')}
              className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
            >
              <MdOutlineNotifications />
              <span>Notifications</span>
            </button>
            <button
              onClick={() => navigate('/settings/security')}
              className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
            >
              <MdOutlineSecurity />
              <span>Security &amp; sessions</span>
            </button>
          </div>
          <div className="bg-[#FAFAFA] p-6 md:p-10 rounded-2xl shadow-lg w-full max-w-4xl flex flex-col">
            <h2 className="text-center text-2xl font-semibold mb-2">User Profile</h2>
            <p className="text-center mb-6">Please enter the following details.</p>
            {profileLoaded && (
              <Form layout="vertical">
                {/* <Form.Item
                name="image"
                className="w-full text-center"
                style={{ marginBottom: '12px' }}
              >
                <Upload.Dragger
                  beforeUpload={(file) => {
                    const allowedFileTypes = ['image/png', 'image/jpeg', 'image/jpg']
                    if (!allowedFileTypes.includes(file.type)) {
                      showToast({
                        message: 'Invalid file type. Please upload a valid image file.',
                        type: 'error'
                      })
                      return Upload.LIST_IGNORE
                    }
                    return handleFileUpload(file)
                  }}
                  listType="picture"
                  maxCount={1}
                  className="border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center"
                >
                  <MdOutlineFileUpload className="text-xl mb-2 text-primary mx-auto" />
                  <p>Upload User&apos;s Image (Optional)</p>
                </Upload.Dragger>
              </Form.Item> */}
                <Form.Item
                  name="image"
                  className="w-full text-center"
                  style={{ marginBottom: '12px' }}
                >
                  {imagePreview ? (
                    <div
                      className="relative w-24 h-24 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden group mx-auto"
                      onMouseEnter={() => setIsHovered(true)}
                      onMouseLeave={() => setIsHovered(false)}
                    >
                      <img
                        src={imagePreview}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                        onError={() => setImagePreview('')}
                      />
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
                  ) : (
                    <Upload.Dragger
                      beforeUpload={handleFileUpload}
                      listType="picture"
                      maxCount={1}
                      accept="image/png, image/jpeg, image/jpg"
                      className="border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center"
                    >
                      <MdOutlineFileUpload className="text-xl mb-2 text-primary mx-auto" />
                      <p>Upload User&apos;s Image (Optional)</p>
                    </Upload.Dragger>
                  )}
                </Form.Item>
                <div className="grid grid-cols-2 gap-x-4">
                  <Form.Item
                    label={
                      <span>
                        First Name <span className="required-asterisk">*</span>
                      </span>
                    }
                    name="firstName"
                    style={{ marginBottom: '10px' }}
                    // validateStatus={errors.firstName ? 'error' : ''}
                    // help={errors.firstName?.message}
                  >
                    <Controller
                      name="firstName"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          maxLength={100}
                          type="text"
                          placeholder="First Name"
                          className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                        />
                      )}
                    />
                    <p className="text-red-500">{errors.firstName?.message}</p>
                  </Form.Item>

                  <Form.Item
                    label={
                      <span>
                        Last Name <span className="required-asterisk">*</span>
                      </span>
                    }
                    name="lastName"
                    style={{ marginBottom: '10px' }}
                  >
                    <Controller
                      name="lastName"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          maxLength={100}
                          placeholder="Last Name"
                          className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                        />
                      )}
                    />
                    <p className="text-red-500">{errors.lastName?.message}</p>
                  </Form.Item>
                  {/* <Form.Item name="Title" style={{ marginBottom: '10px' }}>
                <Input
                  placeholder="Title"
                  className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                  
                />
                <p className="text-red-500">{errors.title?.message}</p>
              </Form.Item> */}
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
                        onChange={(value) =>
                          setValue('countryCode', value, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                        className="border-none focus:ring-0 focus:outline-none bg-transparent"
                        dropdownStyle={{ minWidth: '300px' }}
                        // dropdownMatchSelectWidth={false}
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
                        placeholder="Phone number"
                        value={watch('phoneNumber')}
                        onChange={(e) => {
                          setValue('phoneNumber', restrictPhoneDigits(e.target.value), {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                          trigger('phoneNumber');
                        }}
                        maxLength={15}
                        className="border-none focus:ring-0 focus:outline-none w-full"
                      />
                    </div>
                    <p className="text-red-500 text-sm mt-1">{errors.countryCode?.message}</p>

                    <p className="text-red-500 text-sm mt-1">{errors.phoneNumber?.message}</p>
                  </Form.Item>
                  <Form.Item
                    label={
                      <span>
                        Email Address <span className="required-asterisk">*</span>
                      </span>
                    }
                    name="email"
                    style={{ marginBottom: '10px' }}
                  >
                    <Controller
                      name="emailId"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          // Changing a platform account's login email isn't
                          // part of this self-service surface — Membership
                          // has no writable email field here (see
                          // UpdateOwnPlatformProfileRequest).
                          disabled={isPlatformCaller}
                          placeholder="Email Address"
                          className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                          onChange={(e) => {
                            const value = e.target.value.replace(/\s/g, ''); // Remove all spaces
                            field.onChange(value);
                          }}
                        />
                      )}
                    />
                    {errors.emailId && (
                      <p className="text-red-500 text-sm mt-1">{errors.emailId.message}</p>
                    )}
                  </Form.Item>
                  <Form.Item
                    label={
                      <span>
                        Role <span className="required-asterisk">*</span>
                      </span>
                    }
                    name="roleName"
                    style={{ marginBottom: '10px' }}
                    // validateStatus={errors.firstName ? 'error' : ''}
                    // help={errors.firstName?.message}
                  >
                    <Controller
                      name="roleName"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          disabled
                          placeholder="Role"
                          className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                        />
                      )}
                    />
                  </Form.Item>
                  {/* <Form.Item name="AddressLine1" style={{ marginBottom: '10px' }}>
                  <Input
                    type="text"
                    placeholder="Address Line 1"
                    className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                    value={watch('addressLine1') || ''}
                    onChange={(e) =>
                      setValue('addressLine1', e.target.value, { shouldValidate: true })
                    }
                  />
                  <p className="text-red-500 text-sm mt-1">{errors.addressLine1?.message}</p>
                </Form.Item>
                <Form.Item name="AddressLine2" style={{ marginBottom: '10px' }}>
                  <Input
                    type="text"
                    placeholder="Address Line 2"
                    className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                    value={watch('addressLine2') || ''}
                    onChange={(e) =>
                      setValue('addressLine2', e.target.value, { shouldValidate: true })
                    }
                  />
                  {errors.addressLine2 && (
                    <p className="text-red-500 text-sm mt-1">{errors.addressLine2.message}</p>
                  )}
                </Form.Item>
                <Form.Item name="countryCode" style={{ marginBottom: '10px' }}>
                  <Controller
                    name="country"
                    control={control}
                    render={({ field }) => (
                      <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                        <Select
                          {...field}
                          value={field.value || undefined}
                          showSearch
                          placeholder="Select Country"
                          optionFilterProp="children"
                          loading={loadingCountries}
                          onChange={handleCountryChange}
                          onSearch={setCountrySearch}
                          filterOption={false}
                          className="w-full custom-select placeholder-style"
                          popupClassName="rounded-3xl"
                        >
                          {countries.map((country) => (
                            <Option key={country.id} value={country.name}>
                              {country.name}
                            </Option>
                          ))}
                        </Select>
                      </div>
                    )}
                  />
                  {errors.country && (
                    <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>
                  )}
                </Form.Item>

                <Form.Item name="state" style={{ marginBottom: '10px' }}>
                  <Controller
                    name="state"
                    control={control}
                    render={({ field }) => (
                      <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                        <Select
                          {...field}
                          value={field.value || undefined}
                          showSearch
                          placeholder="Select State"
                          onChange={handleStateChange}
                          disabled={!selectedCountry}
                          className="w-full custom-select placeholder-style"
                          popupClassName="rounded-3xl"
                        >
                          {states.map((state) => (
                            <Option key={state.id} value={state.name}>
                              {state.name}
                            </Option>
                          ))}
                        </Select>
                      </div>
                    )}
                  />
                  {errors.state && (
                    <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>
                  )}
                </Form.Item>

                <Form.Item name="city" style={{ marginBottom: '10px' }}>
                  <Controller
                    name="city"
                    control={control}
                    render={({ field }) => (
                      <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                        <Select
                          {...field}
                          value={selectedCity || undefined}
                          showSearch
                          placeholder="Select City"
                          onChange={handleCityChange}
                          disabled={!selectedState}
                          className="w-full custom-select placeholder-style"
                          popupClassName="rounded-3xl"
                          optionFilterProp="children"
                          optionLabelProp="label"
                        >
                          {cities.map((city) => (
                            <Option key={city.id} value={city.name}>
                              {city.name}
                            </Option>
                          ))}
                        </Select>
                      </div>
                    )}
                  />
                  {errors.city && (
                    <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                  )}
                </Form.Item>
                <Form.Item name="pinCode" style={{ marginBottom: '10px' }}>
                  <Input
                    type="text"
                    placeholder="Zip"
                    className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                    value={watch('pinCode') || ''}
                    onChange={(e) => setValue('pinCode', e.target.value, { shouldValidate: true })}
                  />
                  <p className="text-red-500">{errors.pinCode?.message}</p>
                </Form.Item> */}
                </div>

                <Form.Item className="flex justify-center !mt-2">
                  <Button
                    appname="add user"
                    disabled={(!isDirty && !imageChanged) || isUpdating}
                    className="w-50 text-white bg-button rounded-3xl px-4 py-2 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSubmit(handleUpdateProfile)}
                  >
                    {isUpdating ? 'UPDATING...' : 'UPDATE USER'}
                  </Button>
                </Form.Item>
              </Form>
            )}
          </div>
        </div>
      </MainLayout>
    </>
  );
};

export default UserProfile;
