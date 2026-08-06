import { Form, Upload, Select } from 'antd';
import { Button, Input, showToast } from '../..';
import { useNavigate } from 'react-router-dom';
import { MdOutlineArrowBack, MdOutlineFileUpload } from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import { countryCodes } from '../../../constants/countryCode';
import { useState } from 'react';
import '../../styles/user.css';
import { useAddUserMutation } from '../../../api/tenant-service/User/addUser';
import { Loader } from '../../shared/ui/loader';
import { get } from 'lodash-es';
import { useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import useFetchRoles from '../../../hooks/useRoles';
import { Role } from '../../../api/rbac-service/Roles/roles';
import { addUserSchema } from './AddUserSchema';
import ConfirmationModal from '../../shared/ui/ConfirmationModal';
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

const { Option } = Select;

const AddUser = () => {
  const { roles, loading: rolesLoading } = useFetchRoles();
  const navigate = useNavigate();
  const [addUser, { isLoading }] = useAddUserMutation();
  const { loginToken } = useSelector((state: RootState) => state.LoginSlice);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState<boolean>(false);
  const decodedToken = safeDecodeToken<{ companyName: string }>(loginToken);
  const companyName = decodedToken?.companyName || undefined;
  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors, isDirty, isValid },
  } = useForm({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      emailId: '',
      phoneNumber: '',
      title: '',
      countryCode:
        countryCodes.find((code) => code.label === 'United States & Canada (+1)')?.value || '+1',
      roleId: '',
      profilePicture: null,
      profilePictureType: null,
    },
    mode: 'onChange',
  });

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
      showToast({ message: 'Error converting image to Base64.', type: 'error' });
    }
    return false;
  };

  const handleAddUser = async (data: any) => {
    if (!loginToken) {
      showToast({
        message: 'Authentication token not found.',
        type: 'error',
      });
      return;
    }
    const cleanedPhone = cleanPhoneNumber(data.phoneNumber);

    const userDataPayload = {
      ...data,
      firstName: makeFirstLetterUpperCase(sanitizeInput(data?.firstName)),
      lastName: makeFirstLetterUpperCase(sanitizeInput(data?.lastName)),
      title: makeFirstLetterUpperCase(sanitizeInput(data?.title)),
      emailId: sanitizeInput(data?.emailId),
      phoneNumber: cleanedPhone,
      roleTypeMappingId: String(data.roleId),
      status: true,
      isArchived: false,
    };

    addUser(userDataPayload)
      .unwrap()
      .then((res) => {
        if (res) {
          showToast({
            message: get(res, 'message', 'User has been added successfully'),
            type: 'success',
          });
          navigate(-1);
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

  const handleCancel = (): void => {
    if (isDirty) {
      setShowCancelConfirmation(true);
      return;
    }

    navigate(-1);
  };

  return (
    <>
      <MainLayout>
        <div className="flex flex-col items-center bg-white px-4 mt-4 relative pt-16">
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
          <div className="bg-[#FAFAFA] p-6 md:p-10 rounded-2xl shadow-lg w-full max-w-md">
            <p className="text-xl text-center font-semibold text-black mb-2">{companyName}</p>
            <h2 className="text-center text-2xl font-semibold mb-2">Add CFP User</h2>
            <p className="text-center mb-4">Please enter the following details</p>

            <Form layout="vertical">
              <Form.Item
                name="image"
                className="w-full text-center"
                style={{ marginBottom: '12px' }}
              >
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
                  <p className="roboto-font">Upload User&apos;s Image (Optional)</p>
                </Upload.Dragger>
              </Form.Item>

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
                  maxLength={100}
                  placeholder="First Name"
                  className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                  {...register('firstName')}
                  // value={firstName}
                  // onChange={onHandleChange}
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
                <Input
                  type="text"
                  maxLength={100}
                  placeholder="Last Name"
                  className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                  {...register('lastName')}
                />
                <p className="text-red-500">{errors.lastName?.message}</p>
              </Form.Item>
              <Form.Item
                label={
                  <span>
                    Title <span className="required-asterisk">*</span>
                  </span>
                }
                name="Title"
                style={{ marginBottom: '10px' }}
              >
                <Input
                  type="text"
                  maxLength={100}
                  placeholder="Title"
                  className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                  {...register('title')}
                />
                <p className="text-red-500">{errors.title?.message}</p>
              </Form.Item>

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
                  className="bg-white w-full px-4 py-2 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                  value={watch('emailId')}
                  onChange={(e) => {
                    const noSpaces = e.target.value.replace(/\s/g, '');
                    setValue('emailId', noSpaces, { shouldDirty: true });
                    trigger('emailId');
                  }}
                />
                <p className="text-red-500">{errors.emailId?.message}</p>
              </Form.Item>

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
                    value={watch('phoneNumber')}
                    onChange={(e) => handlePhoneNumberChange(e, setValue, 'phoneNumber', trigger)}
                    maxLength={14}
                    placeholder="(555) 123-4567"
                    // {...register('phoneNumber')}
                    className="border-none focus:ring-0 focus:outline-none w-full"
                  />
                </div>
                <p className="text-red-500">{errors.countryCode?.message}</p>
                <p className="text-red-500">{errors.phoneNumber?.message}</p>
              </Form.Item>

              <Form.Item
                label={
                  <span>
                    Role <span className="required-asterisk">*</span>
                  </span>
                }
                style={{ marginBottom: '10px' }}
              >
                <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl ">
                  <Select
                    value={watch('roleId') || undefined}
                    onChange={(value) => {
                      setValue('roleId', String(value), { shouldDirty: true });
                      trigger('roleId');
                    }}
                    className="w-full custom-select"
                    placeholder="Select Role"
                    popupClassName="rounded-3xl"
                    loading={rolesLoading}
                  >
                    {Array.isArray(roles?.data) &&
                      roles?.data.map((role: Role) => (
                        <Option key={role.id} value={String(role.id)}>
                          {role.roleName}
                        </Option>
                      ))}
                  </Select>
                </div>
                <p className="text-red-500">{errors.roleId?.message}</p>
              </Form.Item>

              <Form.Item style={{ marginBottom: '10px' }}>
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
                    className="w-full text-white bg-button rounded-3xl px-4 py-2 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSubmit(handleAddUser)}
                    disabled={!isValid || isLoading}
                  >
                    {isLoading ? 'ADDING...' : 'ADD USER'}
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
    </>
  );
};
export default AddUser;
