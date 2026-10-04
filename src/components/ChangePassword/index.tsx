import BackButton from '../shared/ui/BackButton';
import MainLayout from '../../layouts/MainLayout';
import { MdLockOutline } from 'react-icons/md';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, PasswordInput, PasswordRequirementsChecklist, showToast } from '../shared';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { passwordSchema } from './ChangePasswordSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from 'antd';
import { useChangePasswordMutation } from '../../api/authentication-service/ChangePassword/changePassword';
import { Loader } from '../shared/ui/loader';
import { useDispatch } from 'react-redux';
import { persistor } from '../../redux/provider/store';
import { resetState } from '../../redux/slices/loginSlice';
import {
  clearLocalStorage,
  getLocalStorageItem,
  isImpersonationActive,
} from '../../shared/utils/auth/localstorage.helpers';
import { getAuthErrorMessage } from '../../shared/utils/auth/authError.helpers';
import { jwtDecode } from 'jwt-decode';
import { LOCALSTORAGE_KEYS } from '../../constants/webAPI';
import { TbLockCheck } from 'react-icons/tb';

const ChangePassword = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const autoLogin = location?.state?.autoLogin;

  const {
    handleSubmit,
    control,
    trigger,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(passwordSchema(!!autoLogin)),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
    mode: 'onChange',
  });
  const newPassword = useWatch({ control, name: 'newPassword' }) ?? '';
  const getCompanyNameFromToken = () => {
    const token = getLocalStorageItem(LOCALSTORAGE_KEYS.ACCESS);
    if (!token) return null;
    const decoded = jwtDecode<{ companyName: string }>(token);
    return decoded.companyName;
  };
  const companyName = getCompanyNameFromToken();

  const handlePasswordChange = (data: any) => {
    // authentication-service's contract field names, exactly
    // (docs/API_CONTRACT.md §5 "POST /change-password") — the endpoint
    // itself signs out every OTHER device already, so this never needs to
    // pass along a session id.
    const payload = {
      current_password: data.currentPassword,
      new_password: data.newPassword,
    };

    changePassword(payload)
      .unwrap()
      .then(() => {
        // 204 No Content — success is "the promise resolved", there is no
        // body to read a message or a flag off.
        showToast({ message: 'Password changed successfully.', type: 'success' });

        if (isImpersonationActive()) {
          return;
        }

        // Only the temporary-password / first-login path forces a fresh
        // sign-in — the backend deliberately keeps THIS session valid after
        // an ordinary change (it only revokes every other device), so a
        // change made from account settings should not log the user out of
        // the session they're sitting in.
        if (autoLogin) {
          clearLocalStorage();
          persistor.purge();
          dispatch(resetState());
          navigate('/login');
        } else {
          navigate(-1);
        }
      })
      .catch((err) => {
        showToast({
          message: getAuthErrorMessage(err, 'An error occurred while changing password.'),
          type: 'error',
        });
      });
  };

  return (
    <>
      {isLoading && <Loader />}
      <MainLayout>
        <div className="flex flex-col items-center bg-white px-4 mt-4 relative pt-8">
          {!autoLogin && (
            <div className="mb-4 self-start px-4 absolute">
              <BackButton onClick={() => navigate('/')} className="mb-4" />
            </div>
          )}
          <div className="bg-[#FAFAFA] p-6 md:p-14 rounded-2xl shadow-lg w-full max-w-xl flex flex-col">
            {companyName && (
              <p className="text-center font-semibold text-black mb-2">{companyName}</p>
            )}
            <h2 className="text-center text-2xl font-semibold mb-2">Change Password</h2>
            {autoLogin ? (
              <p className="text-center mb-6">
                Please change your temporary password for security reasons.
              </p>
            ) : (
              <p className="text-center mb-6">Please enter the following details</p>
            )}
            <Form onFinish={handleSubmit(handlePasswordChange)} layout="vertical" colon={false}>
              {/* <Form.Item
                label={
                  <span>
                    Current Password <span className="required-asterisk">*</span>
                  </span>
                }
              > */}
              <div className="grid grid-rows-2 gap-4">
                <div className="relative">
                  <Controller
                    name="currentPassword"
                    control={control}
                    render={({ field }) => (
                      <PasswordInput
                        {...field}
                        autoComplete="current-password"
                        noAutoCapitalize
                        placeholder={autoLogin ? 'Temporary Password*' : 'Current Password*'}
                        prefix={
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 mr-1">
                            <MdLockOutline className="text-brand-900 text-sm" />
                          </div>
                        }
                        className="w-full !normal-case px-4 py-2 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                        onChange={(e) => {
                          field.onChange(e);
                          trigger('newPassword');
                        }}
                      />
                    )}
                  />
                </div>
                {errors.currentPassword && (
                  <p className="text-red-500 text-sm px-2 py-1 whitespace-pre-line">
                    {errors.currentPassword.message}
                  </p>
                )}
                {/* </Form.Item> */}

                {/* <Form.Item
                label={
                  <span>
                    New Password <span className="required-asterisk">*</span>
                  </span>
                }
              > */}
                <div className="relative">
                  <Controller
                    name="newPassword"
                    control={control}
                    render={({ field }) => (
                      <PasswordInput
                        {...field}
                        autoComplete="new-password"
                        noAutoCapitalize
                        placeholder="New Password*"
                        prefix={
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 mr-1">
                            <TbLockCheck className="text-brand-900 text-sm" />
                          </div>
                        }
                        className="w-full !normal-case px-4 py-2 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                        onChange={(e) => {
                          field.onChange(e);
                          // Re-validate confirmNewPassword and currentPassword when newPassword changes
                          trigger(['confirmNewPassword', 'currentPassword']);
                        }}
                      />
                    )}
                  />
                </div>
                {errors.newPassword && (
                  <p className="text-red-500 text-sm px-2 py-1 whitespace-pre-line">
                    {errors.newPassword.message}
                  </p>
                )}
                {newPassword.length > 0 && (
                  <div className="px-2">
                    <PasswordRequirementsChecklist password={newPassword} />
                  </div>
                )}
                {/* </Form.Item> */}

                {/* <Form.Item
                label={
                  <span>
                    Confirm New Password <span className="required-asterisk">*</span>
                  </span>
                }
              > */}
                <div className="relative">
                  <Controller
                    name="confirmNewPassword"
                    control={control}
                    render={({ field }) => (
                      <PasswordInput
                        {...field}
                        autoComplete="new-password"
                        noAutoCapitalize
                        placeholder="Confirm New Password*"
                        prefix={
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-100 mr-1">
                            <TbLockCheck className="text-brand-900 text-sm" />
                          </div>
                        }
                        className="w-full !normal-case px-4 py-2 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
                        onChange={(e) => {
                          field.onChange(e);
                          // Re-validate newPassword when confirmNewPassword changes
                          trigger('newPassword');
                        }}
                      />
                    )}
                  />
                </div>
                {errors.confirmNewPassword && (
                  <p className="text-red-500 text-sm px-2 py-1 whitespace-pre-line">
                    {errors.confirmNewPassword.message}
                  </p>
                )}
                {/* </Form.Item> */}

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    htmlType="submit"
                    disabled={!isValid || isLoading}
                    className="w-full text-white bg-button rounded-3xl px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Changing Password...' : 'Change Password'}
                  </Button>
                </Form.Item>
              </div>
            </Form>
            {/* </form> */}
          </div>
        </div>
      </MainLayout>
    </>
  );
};

export default ChangePassword;
