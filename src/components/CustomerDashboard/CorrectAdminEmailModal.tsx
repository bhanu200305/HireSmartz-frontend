import React, { useState } from 'react';
import { Button, Input, showToast } from '../shared';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import { useCorrectAdminEmailMutation } from '../../api/organization-service/Tenants/tenants';
import { getOrgErrorCode, getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import { getFormEmailValidationError } from '../../shared/utils/validation/input.helpers';

type CorrectAdminEmailModalProps = {
  tenantId: string;
  companyName: string;
  currentEmail: string;
  onClose: () => void;
};

/**
 * Sales/Ops fix for a mistyped admin_email on a DRAFT/PRE_APPROVED tenant —
 * see organization-service's POST /v1/tenants/{tenant_id}/correct-admin-email.
 * Callers must only render this for tenants in those two statuses; the
 * backend itself refuses once ACTIVE (422 TENANT_ADMIN_EMAIL_NOT_EDITABLE).
 */
const CorrectAdminEmailModal: React.FC<CorrectAdminEmailModalProps> = ({
  tenantId,
  companyName,
  currentEmail,
  onClose,
}) => {
  const [email, setEmail] = useState(currentEmail);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [correctAdminEmail, { isLoading }] = useCorrectAdminEmailMutation();

  const handleSubmit = async () => {
    const trimmed = email.trim();
    const validationError = getFormEmailValidationError(trimmed);
    if (validationError) {
      setFieldError(validationError);
      return;
    }

    try {
      const response = await correctAdminEmail({ tenantId, new_email: trimmed }).unwrap();
      showToast({
        message: response.invitation_resent
          ? `Email updated. Invite resent to ${response.admin_email}.`
          : 'Email updated.',
        type: 'success',
      });
      onClose();
    } catch (err: unknown) {
      const code = getOrgErrorCode(err);
      if (code === 'TENANT_ADMIN_EMAIL_NOT_EDITABLE') {
        showToast({
          message:
            "This organization's admin has already logged in — the email can no longer be corrected this way.",
          type: 'error',
        });
        onClose();
        return;
      }
      // DUPLICATE_ADMIN_EMAIL (409) and TENANT_NOT_FOUND (404) both already
      // carry a plain-English message from the backend — surface it as-is
      // rather than inventing our own, and leave the modal open so a
      // duplicate-email mistake can be corrected in place.
      showToast({
        message: getOrgErrorMessage(err, 'Failed to correct the admin email. Please try again.'),
        type: 'error',
      });
    }
  };

  return (
    <AntdCommonModal
      open
      onClose={onClose}
      title="Correct admin email"
      subtitle={`${companyName} — this fixes the address the invite goes to, it doesn't rename anything else.`}
    >
      <Input
        type="email"
        placeholder="admin@example.com"
        value={email}
        error={fieldError ?? undefined}
        onChange={(e) => {
          setEmail(e.target.value);
          if (fieldError) setFieldError(null);
        }}
      />

      <div className="grid grid-cols-2 gap-4 mt-6">
        <Button
          className="w-full border border-gray-300 rounded-full py-2"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          appname="correct admin email"
          className="w-full bg-button text-white rounded-full py-2"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </AntdCommonModal>
  );
};

export default CorrectAdminEmailModal;
