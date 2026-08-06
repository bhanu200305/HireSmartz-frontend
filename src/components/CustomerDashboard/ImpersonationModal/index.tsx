import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import AntdCommonModal from '../../shared/ui/AntdCommonModal';
import ImpersonationForm, { ImpersonationFormData } from '../ImpersonationForm';
import {
  ImpersonateUser,
  useImpersonateMutation,
} from '../../../api/authentication-service/Impersonation/index';
import { loginStore } from '../../../redux/slices/loginSlice';
import { RootState } from '../../../redux/provider/store';
import { setTokens } from '../../../shared/utils/auth/localstorage.helpers';
import { showToast } from '../../shared';
import { get } from 'lodash-es';
import { extractCanManageCompanySettings } from '../../../shared/utils/auth/permission.helpers';

interface ImpersonationModalProps {
  open: boolean;
  onClose: () => void;
  users: ImpersonateUser[];
  usersLoading?: boolean;
  companyName?: string;
}

interface DecodedImpersonationToken {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
  userId: number;
  actorType: string;
  type: string;
  impersonating: boolean;
  orgId: number;
  orgName: string;
  companyName: string;
  roleTypeMappingId: number;
  roles: string[];
  authorities: string[];
  originalRole: string;
  originalRoleTypeMappingId: number;
}

const ImpersonationModal: React.FC<ImpersonationModalProps> = ({
  open,
  onClose,
  users,
  usersLoading = false,
  companyName = '',
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loginToken = useSelector((state: RootState) => state.LoginSlice.loginToken);
  const originalAdminId = useSelector((state: RootState) => state.LoginSlice.userId);
  const originalRole = useSelector((state: RootState) => state.LoginSlice.role);
  const [impersonate, { isLoading }] = useImpersonateMutation();

  const handleImpersonationSubmit = async (data: ImpersonationFormData) => {
    try {
      const payload = {
        userId: Number(data.userId),
        reason: data.reason,
      };
      const response = await impersonate(payload).unwrap();

      if (response.success && response.data) {
        const { impersonationToken, role, roleDisplayName, orgName, roleName, roleType } =
          response.data;

        // Decode the token to get role information
        const decodedToken = jwtDecode<DecodedImpersonationToken>(impersonationToken);

        // Store the impersonation token
        setTokens(impersonationToken, loginToken || '');

        // Store role as object with both name and type
        const roleObject = {
          name: roleName || decodedToken.roles[0] || role,
          type: roleType || decodedToken.roles[0]?.toLowerCase() || role.toLowerCase(),
        };

        sessionStorage.setItem('cfp_impersonating', 'true');
        sessionStorage.setItem('cfp_original_token', loginToken || '');
        sessionStorage.setItem('cfp_original_role', JSON.stringify(originalRole));
        sessionStorage.setItem('cfp_impersonation_org', orgName);
        sessionStorage.setItem('cfp_impersonation_role', JSON.stringify(roleObject));
        sessionStorage.setItem('cfp_impersonated_user_id', decodedToken.userId.toString());
        sessionStorage.setItem('cfp_original_admin_id', (originalAdminId || '').toString());

        localStorage.removeItem('cfp_impersonating');
        localStorage.removeItem('cfp_original_token');
        localStorage.removeItem('cfp_original_role');
        localStorage.removeItem('cfp_impersonation_org');
        localStorage.removeItem('cfp_impersonation_role');
        localStorage.removeItem('cfp_impersonated_user_id');
        localStorage.removeItem('cfp_original_admin_id');

        // Update Redux with new impersonation role
        dispatch(
          loginStore({
            token: impersonationToken,
            authorities: decodedToken.authorities || [role],
            rememberMe: false,
            canManageCompanySettings: extractCanManageCompanySettings(impersonationToken),
            role: roleObject,
            userId: decodedToken.userId.toString(),
            refreshToken: loginToken || '',
          })
        );

        showToast({
          message: `Impersonation started successfully. You are now logged in as ${roleDisplayName} in ${orgName}`,
          type: 'success',
        });

        onClose();

        // Redirect to dashboard with slight delay to ensure state is updated
        setTimeout(() => {
          navigate('/');
        }, 500);
      } else {
        showToast({
          message: get(response, 'message', 'Failed to start impersonation'),
          type: 'error',
        });
      }
    } catch (error: any) {
      const errorMessage =
        get(error, 'data.message') ||
        get(error, 'message') ||
        'Failed to start impersonation. Please try again.';
      showToast({
        message: errorMessage,
        type: 'error',
      });
      console.error('Impersonation error:', error);
    }
  };

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title={`Impersonate User - ${companyName || 'Company'}`}
      subtitle="Select a user and provide reason for impersonation."
      modalProps={{
        width: 500,
        centered: true,
        closable: false,
      }}
    >
      <ImpersonationForm
        onSubmit={handleImpersonationSubmit}
        onCancel={onClose}
        users={users}
        usersLoading={usersLoading}
        isLoading={isLoading}
      />
    </AntdCommonModal>
  );
};

export default ImpersonationModal;
