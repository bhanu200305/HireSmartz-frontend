import { ElementType, ReactNode, ComponentPropsWithoutRef } from 'react';

export type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'body1'
  | 'body2'
  | 'subtitle1'
  | 'subtitle2'
  | 'caption'
  | 'button'
  | 'overline';

export type TypographyColor =
  | 'primary'
  | 'secondary'
  | 'text-main'
  | 'text-muted'
  | 'error'
  | 'success'
  | 'warning'
  | 'inherit';

export type TypographyProps<T extends ElementType = 'p'> = {
  /**
   * The variant determines the visual style (size, weight, line-height, font-family).
   */
  variant?: TypographyVariant;
  /**
   * Override the semantic HTML tag. E.g. render a `h1` variant as a `span`.
   */
  as?: T;
  /**
   * Color theme class helper.
   */
  color?: TypographyColor;
  /**
   * Children nodes to render.
   */
  children?: ReactNode;
  /**
   * Custom Tailwind classes to extend styling.
   */
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'color'>;
