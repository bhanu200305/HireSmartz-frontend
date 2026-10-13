---
trigger: model_decision
description: Guidelines for creating and structuring reusable shared components in the HireSmartz codebase.
---

# React Modular & Reusable Component Rules

AI coding agents must strictly adhere to these architectural standards and patterns for React components.

---

## 1. Directory Structure & Classification

To maintain clean code separation, classify all components into three distinct layers:

```
src/components/
├── shared/
│   ├── ui/               # Layer 1: Atomic UI Elements (Dumb, presentation-only)
│   │   ├── Button/
│   │   └── Input/
│   └── index.ts          # Barrel export for shared components
│
├── [FeatureName]/        # Layer 3: Feature Components (Domain-specific & Connected)
```

### Layer Rules:

- **Layer 1: Atomic UI (`shared/ui/`)**: Dumb, presentational components. No API, Redux, or routing dependencies. Custom styles only, pure prop interface.
- **Layer 2: Shared Composables (`shared/`)**: Business-agnostic modal/widget layouts formed by combining Layer 1 inputs (e.g. `ConfirmationModal`). Internal UI state allowed. No business APIs.
- **Layer 3: Feature Components**: Domain-specific orchestrators. Can call RTK Query hooks and dispatch Redux actions. Keep under **200 LOC** by exporting sub-views.

---

## 2. Standard Folder Template

Every reusable component must use the single-folder pattern:

```
src/components/shared/ui/MyComponent/
├── index.ts                 # Barrel exports (`export { MyComponent }`)
├── MyComponent.tsx          # Component definition
├── MyComponent.types.ts     # TypeScript props interface
├── MyComponent.test.tsx     # Vitest tests
└── MyComponent.css          # Optional CSS styles
```

---

## 3. Golden Rules for Reusable Components

### Rule 1: Extend Native HTML Attributes

Always extend the native element's HTML attribute interface so consumers retain access to standard attributes (e.g., `disabled`, `required`, `aria-*` tags).

```typescript
import { InputHTMLAttributes } from 'react';
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}
```

### Rule 2: Support Ref Forwarding (`React.forwardRef`)

Wrap input and interactive components in `React.forwardRef` to support focus management and react-hook-form integration.

```typescript
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input ref={ref} className={cn('border rounded', className)} {...props} />
  )
);
Input.displayName = 'Input';
```

### Rule 3: Graceful Class Merging

Always join conditional styles using the `cn` utility wrapper (`tailwind-merge` + `clsx`).

```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: any[]) => twMerge(clsx(inputs));
```

### Rule 4: Prevent Scroll Wheel Alteration on Numeric Inputs

Intercept wheel events on number inputs to prevent accidental values changes when scrolling.

```typescript
const handleOnWheel = (e: React.WheelEvent<HTMLInputElement>) => e.stopPropagation();

<input type="number" onWheel={handleOnWheel} {...props} />
```

---

## 4. Advanced Component Patterns

### 1. Compound Component Pattern

Use Context to share state between a parent controller and child components to avoid prop-drilling:

```typescript
const TabsContext = React.createContext<{ active: string; setActive: (id: string) => void } | null>(null);

export const Tabs = ({ children, defaultVal }) => {
  const [active, setActive] = React.useState(defaultVal);
  const value = React.useMemo(() => ({ active, setActive }), [active]);
  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
};
```

### 2. Polymorphic Components

Use the generic `as` prop pattern to allow components to render as different semantic tags (e.g. `<Button as="a" href="...">`):

```typescript
export type ButtonProps<T extends React.ElementType = 'button'> = {
  as?: T;
  children: React.ReactNode;
} & React.ComponentPropsWithoutRef<T>;

export const Button = <T extends React.ElementType = 'button'>({ as, children, ...props }: ButtonProps<T>) => {
  const Component = as || 'button';
  return <Component {...props}>{children}</Component>;
};
```

---

## 5. Typography Standardization

Do NOT write raw tags (like `<h1>`, `<p>`) with arbitrary font size classes. Always wrap static and dynamic text in the polymorphic `<Typography />` component from `src/components/shared`.

### Font Hierarchy:

- **Sora (`font-sora`)**: Headings (`h1` to `h6`) and subtitles.
- **Roboto (`font-roboto`)**: Body copy, inputs, textareas, tooltips, list rows.
- **DM Sans (`font-dm-sans`)**: Brand accents, counter widgets.

### Variant Mappings:

- `h1`-`h6`: Sora font headers.
- `body1` / `body2`: Roboto body paragraphs and sidebar copy.
- `subtitle1` / `subtitle2`: Sora bold list headers and input labels.
- `caption`: Roboto caption/hint labels.

```typescript
import { Typography } from 'src/components/shared';

<Typography variant="h2">Evaluation Summary</Typography>
<Typography variant="caption" color="error">* Required field</Typography>
```
