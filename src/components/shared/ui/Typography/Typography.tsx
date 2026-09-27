import { ElementType } from 'react';
import clsx from 'clsx';
import { TypographyProps, TypographyVariant, TypographyColor } from './Typography.types';

const defaultTags: Record<TypographyVariant, ElementType> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body1: 'p',
  body2: 'p',
  subtitle1: 'span',
  subtitle2: 'span',
  caption: 'span',
  button: 'span',
  overline: 'span',
};

const variantClasses: Record<TypographyVariant, string> = {
  h1: 'font-display font-bold text-4xl md:text-5xl tracking-tight leading-tight',
  h2: 'font-display font-bold text-3xl md:text-4xl tracking-tight leading-snug',
  h3: 'font-display font-semibold text-2xl md:text-3xl leading-snug',
  h4: 'font-display font-semibold text-xl md:text-2xl leading-normal',
  h5: 'font-display font-medium text-lg md:text-xl leading-normal',
  h6: 'font-display font-medium text-base md:text-lg leading-normal',
  body1: 'font-sans font-normal text-base leading-relaxed',
  body2: 'font-sans font-normal text-sm leading-relaxed',
  subtitle1: 'font-display font-medium text-base leading-normal',
  subtitle2: 'font-display font-medium text-sm leading-normal',
  caption: 'font-sans font-normal text-xs leading-normal text-neutral-500',
  button: 'font-sans font-semibold text-sm tracking-wider uppercase',
  overline: 'font-sans font-medium text-xs tracking-widest uppercase',
};

const colorClasses: Record<TypographyColor, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  'text-main': 'text-text',
  'text-muted': 'text-gray-500',
  error: 'text-danger',
  success: 'text-success',
  warning: 'text-warning',
  inherit: 'text-inherit',
};

export const Typography = <T extends ElementType = 'p'>({
  variant = 'body1',
  as,
  color = 'text-main',
  className,
  children,
  ...props
}: TypographyProps<T>) => {
  const Component = as || defaultTags[variant] || 'p';

  return (
    <Component className={clsx(variantClasses[variant], colorClasses[color], className)} {...props}>
      {children}
    </Component>
  );
};
