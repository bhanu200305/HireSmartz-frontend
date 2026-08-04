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
      // title={title}
      extra={extra}
      className={clsx('shadow-md rounded-2xl', className)}
      styles={{ body: { padding: '18px' } }}
    >
      {children}
    </Card>
  );
};
