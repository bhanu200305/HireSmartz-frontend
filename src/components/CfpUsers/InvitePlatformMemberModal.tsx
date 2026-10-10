import React, { useEffect, useState } from 'react';
import { Select } from 'antd';
import { Button, Input, NameTitleSelect, PhoneNumberField, showToast } from '../shared';
import AntdCommonModal from '../shared/ui/AntdCommonModal';
import {
  useInvitePlatformStaffMutation,
  PlatformDepartment,
} from '../../api/organization-service/Platform/staff';
import useHasAccess from '../../hooks/useHasAccess';
import { Authorities } from '../../constants/authorities.constant';
import { FORM_EMAIL_REGEX } from '../../constants/app.constants';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import {
  isPhoneValidForCountry,
  PHONE_VALIDATION_MESSAGE,
} from '../../shared/utils/validation/phoneValidation';
import { cleanPhoneNumber } from '../../shared/utils/methods';
import { useEnterToSubmit } from '../../hooks/useEnterToSubmit';
import { assignableRoles, type PlatformRole } from './staffRows';

type InvitePlatformMemberModalProps = {
  open: boolean;
  departments: PlatformDepartment[];
  onClose: () => void;
  onInvited: () => void;
};

type FieldErrors = Partial<
  Record<'firstName' | 'lastName' | 'title' | 'email' | 'phone' | 'role', string>
>;

const DEFAULT_COUNTRY_CODE = '+1';
const NAME_MAX = 100;

/**
 * Add CFP User: one form for all three platform roles (Superadmin, Admin,
 * Support User), sent to POST /platform/staff/invitations. A Superadmin
 * (platform:write) can pick any role; anyone else only gets Support User,
 * preselected and locked. There is no photo field.
 */
const InvitePlatformMemberModal: React.FC<InvitePlatformMemberModalProps> = ({
  open,
  departments,
  onClose,
  onInvited,
}) => {
  const canAddAnyRole = useHasAccess(Authorities.PLATFORM_INVITE);
  const roleOptions = assignableRoles(canAddAnyRole);
  const lockedRole: PlatformRole | undefined = canAddAnyRole ? undefined : 'cfp_support';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<PlatformRole | undefined>(lockedRole);
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<FieldErrors>({});

  const [inviteStaff, { isLoading }] = useInvitePlatformStaffMutation();

  const reset = () => {
    setFirstName('');
    setLastName('');
    setTitle('');
    setEmail('');
    setCountryCode(DEFAULT_COUNTRY_CODE);
    setPhone('');
    setRole(lockedRole);
    setDepartmentId(undefined);
    setErrors({});
  };

  // The locked role is picked for them as soon as the form opens.
  useEffect(() => {
    if (open && lockedRole) setRole(lockedRole);
  }, [open, lockedRole]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!firstName.trim()) next.firstName = 'First name is required.';
    if (!lastName.trim()) next.lastName = 'Last name is required.';
    if (!title.trim()) next.title = 'Title is required.';
    if (!email.trim()) next.email = 'Email is required.';
    else if (!FORM_EMAIL_REGEX.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!phone.trim()) next.phone = 'Phone number is required.';
    else if (!isPhoneValidForCountry(phone, countryCode)) next.phone = PHONE_VALIDATION_MESSAGE;
    if (!role) next.role = 'Role is required.';
    return next;
  };

  const handleSubmit = async () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0 || !role) return;
    try {
      await inviteStaff({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        title: title.trim(),
        email: email.trim(),
        country_code: countryCode,
        phone_number: cleanPhoneNumber(phone),
        role,
        department_id: departmentId ?? null,
      }).unwrap();
      showToast({ message: `Invite sent to ${email.trim()}.`, type: 'success' });
      reset();
      onInvited();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      showToast({
        message:
          status === 403
            ? "You don't have permission to add a user with that role."
            : getOrgErrorMessage(err, 'Failed to send invite.'),
        type: 'error',
      });
    }
  };

  const { onKeyDown: handleEnterToSubmit } = useEnterToSubmit(handleSubmit, {
    enabled: open && !isLoading,
  });

  const fieldError = (message?: string) =>
    message ? <p className="text-red-500 text-sm px-2 py-1">{message}</p> : null;

  const required = <span className="required-asterisk">*</span>;
  const inputClass =
    'bg-white w-full px-4 py-2 mt-1 border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]';

  return (
    <AntdCommonModal
      open={open}
      onClose={handleClose}
      title="Add CFP User"
      modalProps={{ width: 640 }}
    >
      <div
        className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2"
        onKeyDown={handleEnterToSubmit}
      >
        <div>
          <label htmlFor="cfpFirstName" className="text-sm text-gray-600">
            First Name {required}
          </label>
          <Input
            id="cfpFirstName"
            maxLength={NAME_MAX}
            placeholder="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
          />
          {fieldError(errors.firstName)}
        </div>
        <div>
          <label htmlFor="cfpLastName" className="text-sm text-gray-600">
            Last Name {required}
          </label>
          <Input
            id="cfpLastName"
            maxLength={NAME_MAX}
            placeholder="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
          />
          {fieldError(errors.lastName)}
        </div>

        <div>
          <label htmlFor="cfpTitle" className="text-sm text-gray-600">
            Title {required}
          </label>
          <NameTitleSelect
            id="cfpTitle"
            className="w-full mt-1"
            value={title || undefined}
            onChange={(value) => setTitle(value ?? '')}
          />
          {fieldError(errors.title)}
        </div>
        <div>
          <label htmlFor="cfpEmail" className="text-sm text-gray-600">
            Email {required}
          </label>
          <Input
            id="cfpEmail"
            type="email"
            noAutoCapitalize
            maxLength={320}
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
            className={inputClass}
          />
          {fieldError(errors.email)}
        </div>

        <div>
          <p className="text-sm text-gray-600">Phone Number {required}</p>
          <div className="mt-1">
            <PhoneNumberField
              countryCode={countryCode}
              onCountryCodeChange={setCountryCode}
              phoneNumber={phone}
              onPhoneNumberChange={setPhone}
            />
          </div>
          {fieldError(errors.phone)}
        </div>
        <div>
          <label htmlFor="cfpRole" className="text-sm text-gray-600">
            Role {required}
          </label>
          <Select
            id="cfpRole"
            className="w-full mt-1"
            placeholder="Select Role"
            value={role}
            onChange={(value) => setRole(value)}
            disabled={Boolean(lockedRole)}
            options={roleOptions}
          />
          {fieldError(errors.role)}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="cfpDepartment" className="text-sm text-gray-600">
            Department
          </label>
          <Select
            id="cfpDepartment"
            className="w-full mt-1"
            placeholder="Department (optional)"
            value={departmentId}
            onChange={setDepartmentId}
            allowClear
            showSearch
            optionFilterProp="label"
            options={departments.map((d) => ({ label: d.name, value: d.department_id }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:col-span-2 mt-2">
          <Button
            className="w-full border border-gray-300 rounded-full py-2"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="w-full bg-button text-white rounded-full py-2"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Sending…' : 'Send Invite'}
          </Button>
        </div>
      </div>
    </AntdCommonModal>
  );
};

export default InvitePlatformMemberModal;
