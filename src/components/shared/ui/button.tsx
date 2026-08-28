'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
  appname?: string;
  disabled?: boolean;
  onClick?: () => void;
  [key: string]: any;
}

export const Button = ({
  children,
  className,
  onClick,
  disabled = false,
  type,
  loading,
  ...props
}: ButtonProps & { loading?: boolean }) => {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      className={clsx(
        disabled ? 'cursor-not-allowed pointer-events-none opacity-50' : 'cursor-pointer',
        'roboto-font',
        className
      )}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  );
};
