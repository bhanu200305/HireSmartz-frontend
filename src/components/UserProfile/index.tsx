import {
  MdBadge,
  MdCameraAlt,
  MdClose,
  MdDelete,
  MdEdit,
  MdMailOutline,
  MdOutlineArrowBack,
  MdOutlineCalendarMonth,
  MdOutlineDevices,
  MdOutlineFileUpload,
  MdOutlineNotifications,
  MdOutlineSecurity,
  MdOutlineVerified,
  MdPersonOutline,
  MdPhoneIphone,
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
  useUploadOwnAvatarMutation,
  useClearOwnAvatarMutation,
  useListUsersQuery,
} from '../../api/organization-service/Users/users';
import {
  useGetOwnPlatformProfileQuery,
  useUpdateOwnPlatformProfileMutation,
  useUploadOwnPlatformAvatarMutation,
  useClearOwnPlatformAvatarMutation,
} from '../../api/organization-service/Platform/staff';
import { sanitizeInput } from '../../shared/utils/validation/input.helpers';
import { restrictPhoneDigitsForCountry } from '../../shared/utils/validation/phoneValidation';
import { cleanPhoneNumber } from '../../shared/utils/methods';
import {
  ALLOWED_LOGO_TYPES,
  MAX_LOGO_FILE_SIZE_BYTES,
  LOGO_FILE_SIZE_ERROR_MESSAGE,
  LOGO_FILE_TYPE_ERROR_MESSAGE,
} from '../../constants/file.constants';
import { get } from 'lodash-es';
import { Loader } from '../shared/ui/loader';
import ProfilePictureCropModal from './ProfilePictureCropModal';

const UserProfile = () => {
  const navigate = useNavigate();

  // Decided upfront from Redux, not by reacting to a 404 — a platform
  // caller has no `users` row at all (see GetOwnUserProfileUseCase's
  // docstring), so there's no reason to even attempt that query for them.
  const callerKind = useSelector((state: RootState) => state.LoginSlice.callerKind);
  const isPlatformCaller = callerKind === 'platform';
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);

  // Self-service calendar connection — every organization user, any role
  // (interview-service's `/calendar/*` routes are identity-scoped). A
  // platform caller has no tenant for a grant to belong to. Mirrors the
  // same gate in Header and CalendarSettingsPage.
  const isCalendarSettingsAvailable =
    import.meta.env.VITE_NYLAS_FEATURE === 'true' && !isPlatformCaller;

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

  // GET /v1/users/me never populates `role` (see OrgUser's own docstring —
  // only the list endpoint does), so the signed-in tenant user's real role
  // name has to be resolved the same way ViewOrganisationUser and
  // EditOrganisationUser already resolve any other user's role: pull the
  // tenant's user list and find this user's own row in it.
  const { data: tenantUsersList } = useListUsersQuery(
    { includeInactive: true, limit: 200 },
    { skip: isPlatformCaller || !tenantId }
  );
  const ownRoleName = tenantUsersList?.items.find(
    (u) => u.user_id === tenantProfileData?.user_id
  )?.role;

  const [updateTenantProfile, { isLoading: isUpdatingTenant }] = useUpdateOwnUserProfileMutation();
  const [updatePlatformProfile, { isLoading: isUpdatingPlatform }] =
    useUpdateOwnPlatformProfileMutation();
  const [uploadTenantAvatar, { isLoading: isUploadingTenantAvatar }] = useUploadOwnAvatarMutation();
  const [uploadPlatformAvatar, { isLoading: isUploadingPlatformAvatar }] =
    useUploadOwnPlatformAvatarMutation();
  const [clearTenantAvatar, { isLoading: isClearingTenantAvatar }] = useClearOwnAvatarMutation();
  const [clearPlatformAvatar, { isLoading: isClearingPlatformAvatar }] =
    useClearOwnPlatformAvatarMutation();
  const uploadAvatar = isPlatformCaller ? uploadPlatformAvatar : uploadTenantAvatar;
  const clearAvatar = isPlatformCaller ? clearPlatformAvatar : clearTenantAvatar;
  const isUploadingAvatar = isPlatformCaller ? isUploadingPlatformAvatar : isUploadingTenantAvatar;
  const isClearingAvatar = isPlatformCaller ? isClearingPlatformAvatar : isClearingTenantAvatar;
  const isUpdating =
    (isPlatformCaller ? isUpdatingPlatform : isUpdatingTenant) ||
    isUploadingAvatar ||
    isClearingAvatar;
  const [isHovered, setIsHovered] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [imageChanged, setImageChanged] = useState(false);
  const [isProfileDeleted, setIsProfileDeleted] = useState(false);
  // Fields start locked/read-only; the corner pencil unlocks them. Email and
  // Role stay locked regardless — they're not covered by this form at all
  // (email is identity-bound, see its Form.Item below; role has no self-
  // service edit path either).
  const [isEditing, setIsEditing] = useState(false);
  const uploadRef = React.useRef<any>(null);

  // The crop step sits between "file picked" and "uploaded" — cropSrc/
  // pendingFileMeta hold the freshly-picked file just long enough for the
  // modal to produce a cropped blob; nothing here survives past confirm/
  // cancel, so it doesn't need to be part of the form state.
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [pendingFileName, setPendingFileName] = useState('');
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
    // OwnPlatformProfile (`memberships`) has address/companyName fields —
    // those stay blank via the same `|| ''` fallback already used everywhere
    // else in this form. Both DO carry a real `avatar_url` now, so
    // imagePreview seeds from it instead of always starting blank —
    // otherwise a previously-saved avatar would look gone every time this
    // page loads.
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
      setImagePreview(platformProfileData.avatar_url || '');
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
        roleName: ownRoleName || '',
        companyName: '',
      });
      setImagePreview(tenantProfileData.avatar_url || '');
      setImageChanged(false);
      setIsProfileDeleted(false);
    }
  }, [isPlatformCaller, tenantProfileData, platformProfileData, ownRoleName, reset]);

  // Whichever profile actually loaded — used instead of picking
  // tenantProfileData/platformProfileData ad hoc at each call site below.
  const savedAvatarUrl = isPlatformCaller
    ? platformProfileData?.avatar_url
    : tenantProfileData?.avatar_url;

  // Two different things this button can be undoing, and they don't share a
  // code path: a pick made THIS session (never reached the server — nothing
  // to persist, just reset local state) vs. an already-SAVED avatar
  // (savedAvatarUrl), which the PATCH `avatar` field can only ever SET,
  // never clear (PATCH-omission semantics — see UpdateUserRequest's own
  // docstring on the backend), so clearing one for real means calling
  // DELETE .../avatar directly rather than deferring to "Save changes" like
  // every other field here.
  const handleDeleteProfilePicture = async () => {
    const hadSavedAvatar = Boolean(savedAvatarUrl);
    setImagePreview('');
    setValue('profilePicture', '');
    setValue('profilePictureType', '');
    setImageChanged(true);
    setIsProfileDeleted(true);

    if (!hadSavedAvatar) {
      showToast({ message: 'Profile picture removed. Save changes to apply.', type: 'success' });
      return;
    }

    try {
      await clearAvatar().unwrap();
      showToast({ message: 'Profile picture removed.', type: 'success' });
    } catch (error) {
      setImagePreview(savedAvatarUrl || '');
      setIsProfileDeleted(false);
      showToast({
        message: get(error, 'data.message', 'Failed to remove profile picture.'),
        type: 'error',
      });
    }
  };
  // Discards any unsaved text-field edits and relocks the form. `reset()`
  // with no args reverts to the values from the last explicit reset() call
  // (the load effect above), not the form's original static defaultValues —
  // exactly the "back to what's actually saved" behavior wanted here.
  const handleCancelEdit = () => {
    reset();
    setIsEditing(false);
  };

  // Picking a file no longer uploads it straight away — it opens the crop
  // modal first (handleCropConfirm below does the actual upload once the
  // user applies their adjustment), so this only ever needs to validate and
  // hand off to that modal. Always returns LIST_IGNORE: antd's own upload
  // list/behavior is never used, cropping owns the rest of the flow.
  const handleFileUpload = (file: File) => {
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      showToast({ message: LOGO_FILE_TYPE_ERROR_MESSAGE, type: 'error' });
      return Upload.LIST_IGNORE;
    }

    if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
      showToast({ message: LOGO_FILE_SIZE_ERROR_MESSAGE, type: 'error' });
      return Upload.LIST_IGNORE;
    }

    setCropImageSrc(URL.createObjectURL(file));
    setPendingFileName(file.name);
    setIsCropModalOpen(true);
    return Upload.LIST_IGNORE;
  };

  const handleCropCancel = () => {
    if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
    setCropImageSrc('');
    setPendingFileName('');
    setIsCropModalOpen(false);
  };

  const handleCropConfirm = async (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], pendingFileName || 'profile-picture.jpg', {
      type: croppedBlob.type,
    });
    const previewURL = URL.createObjectURL(croppedFile);
    setImagePreview(previewURL);

    try {
      // Uploaded immediately (not deferred to Save, unlike every other
      // field on this form) so the storage_key exists before the PATCH
      // below needs it — organization-service has no single
      // "multipart profile update" endpoint, upload and persist are two
      // separate calls, same two-step shape every other file upload in this
      // app already uses (see Tenants/imports.ts's uploadRosterFile). Only
      // the resulting `avatar` field actually lands on the profile once
      // "Update user" is pressed, same "Save changes to apply" contract the
      // rest of this form already promises.
      const { storage_key } = await uploadAvatar(croppedFile).unwrap();
      setValue('profilePicture', storage_key);
      setValue('profilePictureType', croppedFile.name);
      setImageChanged(true);
      setIsProfileDeleted(false);

      showToast({
        message: 'Image uploaded successfully. Save changes to apply.',
        type: 'success',
      });
    } catch (error) {
      setImagePreview(savedAvatarUrl || '');
      showToast({
        message: get(error, 'data.message', 'Error uploading image.'),
        type: 'error',
      });
    } finally {
      if (cropImageSrc) URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc('');
      setPendingFileName('');
      setIsCropModalOpen(false);
    }
  };

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
        // — those inputs are disabled below, never sent here. `avatar` DOES
        // have a column now — same "only when a new key exists this
        // session" condition as the tenant branch below.
        await updatePlatformProfile({
          first_name: sanitizeInput(data.firstName),
          last_name: sanitizeInput(data.lastName),
          phone_no: cleanPhoneNumber(data.phoneNumber),
          country_code: data.countryCode,
          ...(imageChanged && !isProfileDeleted && data.profilePicture
            ? { avatar: data.profilePicture }
            : {}),
        }).unwrap();
      } else {
        // Only the fields organization-service's UpdateUserRequest actually
        // accepts (extra="forbid" — an unrecognised field 422s, not a
        // silent no-op). Address fields have no backend column to persist
        // to, so they're never sent. `avatar` DOES have one — sent only
        // when handleFileUpload actually produced a new storage_key this
        // session (never on every save, and never as an explicit `null`:
        // PATCH semantics can't clear it — see handleDeleteProfilePicture's
        // own comment). `email` is deliberately never sent — it's a PATCH,
        // so omitting it just leaves the saved address alone, matching the
        // field now being locked in the UI (see its Form.Item below).
        await updateTenantProfile({
          first_name: sanitizeInput(data.firstName),
          last_name: sanitizeInput(data.lastName),
          phone_no: cleanPhoneNumber(data.phoneNumber),
          country_code: data.countryCode,
          ...(imageChanged && !isProfileDeleted && data.profilePicture
            ? { avatar: data.profilePicture }
            : {}),
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

  const displayName = [watch('firstName'), watch('lastName')].filter(Boolean).join(' ');
  const roleLabel = watch('roleName') || (isPlatformCaller ? 'Platform Admin' : 'Team Member');

  return (
    <>
      {(isLoading || isUpdating) && <Loader />}
      <MainLayout>
        <div
          className="min-h-full pb-8 overflow-x-hidden"
          style={{
            background:
              'linear-gradient(180deg, var(--surface-indigo) 0%, var(--surface-gray) 320px, var(--surface-gray) 100%)',
          }}
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--gray-600)] hover:text-[var(--gray-900)] transition-colors cursor-pointer"
              >
                <MdOutlineArrowBack className="text-base" />
                <span>Back</span>
              </button>
              <div className="flex items-center gap-2">
                {isCalendarSettingsAvailable && (
                  <button
                    onClick={() => navigate('/settings/calendar')}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--gray-700)] bg-white border border-[var(--border)] rounded-full px-3.5 py-1.5 shadow-[var(--elevation-xs)] hover:border-[var(--primary-300)] hover:text-[var(--primary)] transition-colors cursor-pointer"
                  >
                    <MdOutlineCalendarMonth className="text-base" />
                    <span>Calendar</span>
                  </button>
                )}
                <button
                  onClick={() => navigate('/settings/notifications')}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--gray-700)] bg-white border border-[var(--border)] rounded-full px-3.5 py-1.5 shadow-[var(--elevation-xs)] hover:border-[var(--primary-300)] hover:text-[var(--primary)] transition-colors cursor-pointer"
                >
                  <MdOutlineNotifications className="text-base" />
                  <span>Notification settings</span>
                </button>
                <button
                  onClick={() => navigate('/settings/security')}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--gray-700)] bg-white border border-[var(--border)] rounded-full px-3.5 py-1.5 shadow-[var(--elevation-xs)] hover:border-[var(--primary-300)] hover:text-[var(--primary)] transition-colors cursor-pointer"
                >
                  <MdOutlineSecurity className="text-base" />
                  <span>Security</span>
                </button>
                <button
                  onClick={() => navigate('/settings/sessions')}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--gray-700)] bg-white border border-[var(--border)] rounded-full px-3.5 py-1.5 shadow-[var(--elevation-xs)] hover:border-[var(--primary-300)] hover:text-[var(--primary)] transition-colors cursor-pointer"
                >
                  <MdOutlineDevices className="text-base" />
                  <span>Active sessions</span>
                </button>
              </div>
            </div>

            {profileLoaded && (
              <Form layout="vertical">
                <div
                  className="relative mt-4 bg-white rounded-3xl border border-[var(--border)] overflow-hidden"
                  style={{ boxShadow: 'var(--elevation-md)' }}
                >
                  <button
                    type="button"
                    onClick={isEditing ? handleCancelEdit : () => setIsEditing(true)}
                    className="absolute top-4 right-4 z-10 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--gray-700)] bg-white border border-[var(--border)] rounded-full px-3.5 py-1.5 shadow-[var(--elevation-xs)] hover:border-[var(--primary-300)] hover:text-[var(--primary)] transition-colors cursor-pointer"
                  >
                    {isEditing ? (
                      <>
                        <MdClose className="text-base" />
                        <span>Cancel</span>
                      </>
                    ) : (
                      <>
                        <MdEdit className="text-base" />
                        <span>Edit</span>
                      </>
                    )}
                  </button>
                  {/* Hero header — avatar, name, role chip */}
                  <div
                    className="relative flex flex-col items-center text-center px-6 pt-8 pb-6"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--surface-indigo) 0%, #ffffff 55%, var(--surface-cyan) 100%)',
                    }}
                  >
                    <Form.Item name="image" className="!mb-0">
                      {imagePreview ? (
                        <div
                          className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full overflow-hidden group ring-4 ring-white"
                          style={{ boxShadow: 'var(--elevation-md)' }}
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
                            <button ref={uploadRef} className="hidden cursor-pointer"></button>
                          </Upload>
                          <div
                            className={`absolute inset-0 flex items-center justify-center gap-3 bg-[var(--gray-900)]/45 backdrop-blur-[1px] transition-opacity duration-200 ${
                              isHovered ? 'opacity-100' : 'opacity-0'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => uploadRef.current?.click()}
                              className="bg-white rounded-full p-2.5 cursor-pointer shadow-sm hover:scale-105 transition-transform"
                            >
                              <MdEdit className="text-[var(--primary)] text-lg" />
                            </button>
                            <button
                              type="button"
                              className="bg-white rounded-full p-2.5 cursor-pointer shadow-sm hover:scale-105 transition-transform"
                              onClick={handleDeleteProfilePicture}
                            >
                              <MdDelete className="text-[var(--danger-solid)] text-lg" />
                            </button>
                          </div>
                          {/* Always-visible camera badge — discoverable on touch, where hover never fires */}
                          <button
                            type="button"
                            onClick={() => uploadRef.current?.click()}
                            className={`absolute bottom-1 right-1 bg-[var(--primary)] rounded-full p-1.5 shadow-sm cursor-pointer transition-opacity ${
                              isHovered ? 'opacity-0' : 'opacity-100'
                            }`}
                          >
                            <MdCameraAlt className="text-white text-sm" />
                          </button>
                        </div>
                      ) : (
                        <Upload.Dragger
                          beforeUpload={handleFileUpload}
                          listType="picture"
                          maxCount={1}
                          accept="image/png, image/jpeg, image/jpg"
                          className="!w-24 !h-24 sm:!w-28 sm:!h-28 !rounded-full !border-2 !border-dashed !border-[var(--primary-300)] !bg-white/70 flex flex-col items-center justify-center mx-auto hover:!border-[var(--primary)] transition-colors"
                        >
                          <MdOutlineFileUpload className="text-2xl text-[var(--primary)] mx-auto" />
                          <p className="text-[11px] leading-tight px-3 mt-1 text-[var(--gray-600)]">
                            Upload photo
                          </p>
                        </Upload.Dragger>
                      )}
                    </Form.Item>

                    <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--gray-900)] mt-3">
                      {displayName || 'Your Profile'}
                    </h2>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[var(--border)] text-xs font-semibold text-[var(--primary)] uppercase tracking-wide">
                        <MdOutlineVerified className="text-sm" />
                        {roleLabel}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--gray-500)] mt-1.5 max-w-sm">
                      Keep your details up to date, since this is what your team sees across
                      Careerforce&nbsp;Pro.
                    </p>
                  </div>

                  {/* Editable fields */}
                  <div className="px-6 sm:px-8 py-5 border-t border-[var(--border)]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-0">
                      <Form.Item
                        label={
                          <span className="text-sm font-semibold text-[var(--gray-700)]">
                            First Name <span className="required-asterisk">*</span>
                          </span>
                        }
                        name="firstName"
                        style={{ marginBottom: '12px' }}
                      >
                        <div
                          className={`flex items-center gap-2.5 w-full px-4 border rounded-2xl border-[var(--border)] transition-colors ${
                            isEditing
                              ? 'bg-[var(--surface-gray)] focus-within:border-[var(--primary-300)] focus-within:bg-white focus-within:shadow-[0_0_0_3px_var(--focus-ring)]'
                              : 'bg-[var(--gray-100)]'
                          }`}
                        >
                          <MdPersonOutline className="text-[var(--gray-400)] text-lg shrink-0" />
                          <Controller
                            name="firstName"
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                disabled={!isEditing}
                                maxLength={100}
                                type="text"
                                placeholder="First Name"
                                className="!bg-transparent w-full !border-0 !shadow-none !px-0 py-2.5 focus:!ring-0 disabled:!text-[var(--gray-500)]"
                              />
                            )}
                          />
                        </div>
                        <p className="text-red-500 text-xs mt-1">{errors.firstName?.message}</p>
                      </Form.Item>

                      <Form.Item
                        label={
                          <span className="text-sm font-semibold text-[var(--gray-700)]">
                            Last Name <span className="required-asterisk">*</span>
                          </span>
                        }
                        name="lastName"
                        style={{ marginBottom: '12px' }}
                      >
                        <div
                          className={`flex items-center gap-2.5 w-full px-4 border rounded-2xl border-[var(--border)] transition-colors ${
                            isEditing
                              ? 'bg-[var(--surface-gray)] focus-within:border-[var(--primary-300)] focus-within:bg-white focus-within:shadow-[0_0_0_3px_var(--focus-ring)]'
                              : 'bg-[var(--gray-100)]'
                          }`}
                        >
                          <MdPersonOutline className="text-[var(--gray-400)] text-lg shrink-0" />
                          <Controller
                            name="lastName"
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                disabled={!isEditing}
                                type="text"
                                maxLength={100}
                                placeholder="Last Name"
                                className="!bg-transparent w-full !border-0 !shadow-none !px-0 py-2.5 focus:!ring-0 disabled:!text-[var(--gray-500)]"
                              />
                            )}
                          />
                        </div>
                        <p className="text-red-500 text-xs mt-1">{errors.lastName?.message}</p>
                      </Form.Item>

                      <Form.Item
                        label={
                          <span className="text-sm font-semibold text-[var(--gray-700)]">
                            Phone Number <span className="required-asterisk">*</span>
                          </span>
                        }
                        name="phone"
                        style={{ marginBottom: '12px' }}
                      >
                        <div
                          className={`phone-input-wrapper flex items-center gap-1.5 w-full pl-4 pr-2 border rounded-2xl border-[var(--border)] transition-colors ${
                            isEditing
                              ? 'bg-[var(--surface-gray)] focus-within:border-[var(--primary-300)] focus-within:bg-white focus-within:shadow-[0_0_0_3px_var(--focus-ring)]'
                              : 'bg-[var(--gray-100)]'
                          }`}
                        >
                          <MdPhoneIphone className="text-[var(--gray-400)] text-lg shrink-0" />
                          <Select
                            value={watch('countryCode')}
                            disabled={!isEditing}
                            onChange={(value) => {
                              setValue('countryCode', value, {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                              setValue(
                                'phoneNumber',
                                restrictPhoneDigitsForCountry(watch('phoneNumber') ?? '', value),
                                { shouldValidate: true, shouldDirty: true }
                              );
                            }}
                            className="border-none focus:ring-0 focus:outline-none bg-transparent"
                            dropdownStyle={{ minWidth: 'min(300px, 92vw)' }}
                            variant="borderless"
                            style={{ width: '76px', fontSize: '14px' }}
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
                          <div className="border-l-2 border-[var(--border)] h-6"></div>
                          <Input
                            type="tel"
                            disabled={!isEditing}
                            placeholder="Phone number"
                            value={watch('phoneNumber')}
                            onChange={(e) => {
                              setValue(
                                'phoneNumber',
                                restrictPhoneDigitsForCountry(
                                  e.target.value,
                                  watch('countryCode') ?? ''
                                ),
                                { shouldValidate: true, shouldDirty: true }
                              );
                              trigger('phoneNumber');
                            }}
                            maxLength={15}
                            className="!bg-transparent border-none focus:ring-0 focus:outline-none w-full !shadow-none py-2.5 disabled:!text-[var(--gray-500)]"
                          />
                        </div>
                        <p className="text-red-500 text-xs mt-1">{errors.countryCode?.message}</p>
                        <p className="text-red-500 text-xs mt-1">{errors.phoneNumber?.message}</p>
                      </Form.Item>

                      <Form.Item
                        label={
                          <span className="text-sm font-semibold text-[var(--gray-700)]">
                            Email Address <span className="required-asterisk">*</span>
                          </span>
                        }
                        name="email"
                        style={{ marginBottom: '12px' }}
                      >
                        <div className="flex items-center gap-2.5 w-full px-4 border rounded-2xl border-[var(--border)] bg-[var(--gray-100)]">
                          <MdMailOutline className="text-[var(--gray-400)] text-lg shrink-0" />
                          <Controller
                            name="emailId"
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                // Email is identity-bound and never editable from
                                // this self-service surface, for either caller
                                // kind — always locked, even while isEditing,
                                // same as Role below. (Platform's Membership row
                                // has no writable email field at all; a tenant
                                // user's email is technically writable on the
                                // backend, but changing your own login identity
                                // isn't something this form should let you do
                                // silently — see handleUpdateProfile, which no
                                // longer sends this field either.)
                                disabled
                                placeholder="Email Address"
                                className="!bg-transparent w-full !border-0 !shadow-none !px-0 py-2.5 focus:!ring-0 disabled:!text-[var(--gray-500)]"
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\s/g, ''); // Remove all spaces
                                  field.onChange(value);
                                }}
                              />
                            )}
                          />
                        </div>
                        {errors.emailId && (
                          <p className="text-red-500 text-xs mt-1">{errors.emailId.message}</p>
                        )}
                      </Form.Item>

                      <Form.Item
                        label={
                          <span className="text-sm font-semibold text-[var(--gray-700)]">
                            Role <span className="required-asterisk">*</span>
                          </span>
                        }
                        name="roleName"
                        style={{ marginBottom: '12px' }}
                      >
                        <div className="flex items-center gap-2.5 bg-[var(--gray-100)] w-full px-4 border rounded-2xl border-[var(--border)]">
                          <MdBadge className="text-[var(--gray-400)] text-lg shrink-0" />
                          <Controller
                            name="roleName"
                            control={control}
                            render={({ field }) => (
                              <Input
                                {...field}
                                type="text"
                                disabled
                                placeholder="Role"
                                className="!bg-transparent w-full !border-0 !shadow-none !px-0 py-2.5 focus:!ring-0 disabled:!text-[var(--gray-500)]"
                              />
                            )}
                          />
                        </div>
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

                    <Form.Item className="flex justify-center !mb-0 !mt-4">
                      <Button
                        appname="add user"
                        disabled={(!isDirty && !imageChanged) || isUpdating}
                        className="min-w-[220px] text-white bg-button rounded-full px-8 py-3 flex items-center justify-center gap-2 font-semibold tracking-wide transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                        style={{ boxShadow: 'var(--elevation-sm)' }}
                        onClick={handleSubmit(handleUpdateProfile)}
                      >
                        {isUpdating ? 'SAVING…' : 'SAVE CHANGES'}
                      </Button>
                    </Form.Item>
                  </div>
                </div>
              </Form>
            )}
          </div>
        </div>
      </MainLayout>
      <ProfilePictureCropModal
        open={isCropModalOpen}
        imageSrc={cropImageSrc}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
        isSaving={isUploadingAvatar}
      />
    </>
  );
};

export default UserProfile;
