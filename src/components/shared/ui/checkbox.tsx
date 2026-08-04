import React from 'react';
import { Checkbox } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';

type CustomCheckboxProps = {
  label: string;
  checked: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange: (e: CheckboxChangeEvent) => void;
  className?: string;
};

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  label,
  checked,
  defaultChecked,
  disabled,
  onChange,
  className = '',
}) => {
  return (
    <Checkbox
      className={className}
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={disabled}
      onChange={onChange}
    >
      {label}
    </Checkbox>
  );
};
