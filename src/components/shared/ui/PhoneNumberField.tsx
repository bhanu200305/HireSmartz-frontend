import React from 'react';
import { Select } from 'antd';
import clsx from 'clsx';
import { countryCodes } from '../../../constants/countryCode';
import { restrictPhoneDigits } from '../../../shared/utils/validation/phoneValidation';

type PhoneNumberFieldProps = {
  countryCode: string | undefined;
  onCountryCodeChange: (value: string) => void;
  phoneNumber: string;
  onPhoneNumberChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * Country code + number, in one bordered field — same "Select | divider |
 * Input" shape locationFormModal.tsx and EditCandidate.tsx already use for
 * their phone fields, pulled out so every OTHER phone field (Add/Edit User,
 * Super Admin's per-company Add user) can have the same country picker
 * instead of a bare number-only Input silently dropping it.
 */
const PhoneNumberField: React.FC<PhoneNumberFieldProps> = ({
  countryCode,
  onCountryCodeChange,
  phoneNumber,
  onPhoneNumberChange,
  placeholder = 'Phone number',
  disabled,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex w-full items-center rounded-3xl border bg-white px-3 py-2 border-[var(--border)]',
        disabled && 'cursor-not-allowed bg-gray-50',
        className
      )}
    >
      <Select
        value={countryCode}
        onChange={onCountryCodeChange}
        disabled={disabled}
        variant="borderless"
        style={{ width: 78, fontSize: 14 }}
        popupMatchSelectWidth={300}
        options={countryCodes.map(({ label, value, short }) => ({
          label: `${short} - ${label}`,
          value,
        }))}
        optionLabelProp="value"
        showSearch
        filterOption={(input, option) =>
          String(option?.label ?? '')
            .toLowerCase()
            .includes(input.toLowerCase())
        }
        placeholder="Code"
      />
      <div className="mx-2 h-5 w-px shrink-0 bg-gray-300" />
      <input
        type="tel"
        className="w-full min-w-0 border-none bg-transparent roboto-font focus:outline-none disabled:cursor-not-allowed"
        placeholder={placeholder}
        value={phoneNumber}
        disabled={disabled}
        maxLength={15}
        onChange={(e) => onPhoneNumberChange(restrictPhoneDigits(e.target.value))}
      />
    </div>
  );
};

export default PhoneNumberField;
