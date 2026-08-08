'use client';

import { ReactNode } from 'react';
import { Card } from 'antd';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  extra?: ReactNode;
}

export const CommonCard = ({ children, className, extra }: CardProps) => {
  return (
    <Card
      extra={extra}
      // Flat + bordered by default (a hairline border does the separating),
      // with only a barely-there resting shadow — heavier shadows are
      // reserved for floating/overlay elements (dropdowns, modals).
      className={clsx('rounded-xl border border-neutral-200 shadow-xs', className)}
      styles={{ body: { padding: '24px' } }}
    >
      {children}
    </Card>
  );
};
