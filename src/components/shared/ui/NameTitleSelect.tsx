import React from 'react';
import { Select } from 'antd';
import { NAME_TITLE_OPTIONS } from '../../../constants/nameTitle.constant';

type NameTitleSelectProps = {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

/**
 * Courtesy-title dropdown (Mr, Mrs, Ms, Dr, ...) for the `title` field
 * everywhere a user's name is collected: Add/Edit (org) User, Super Admin's
 * per-company Add user, and View Platform User's edit section — the same
 * four forms `PhoneNumberField` already unifies for the phone field.
 *
 * The backend stores `title` as free text (max 20 chars, no enum), so an
 * ALREADY-SAVED value outside this preset list (typed before this dropdown
 * existed, or something this list doesn't cover) is appended as its own
 * option rather than silently dropped — the dropdown narrows what's easy to
 * pick going forward without hiding what a user already has on file.
 */
const NameTitleSelect: React.FC<NameTitleSelectProps> = ({
  value,
  onChange,
  placeholder = 'Title',
  disabled,
  className,
  id,
}) => {
  const options =
    value && !NAME_TITLE_OPTIONS.some((opt) => opt.value === value)
      ? [...NAME_TITLE_OPTIONS, { label: value, value }]
      : NAME_TITLE_OPTIONS;

  return (
    <Select
      id={id}
      className={className}
      value={value || undefined}
      onChange={(next) => onChange(next)}
      allowClear
      disabled={disabled}
      placeholder={placeholder}
      options={options}
    />
  );
};

export default NameTitleSelect;
