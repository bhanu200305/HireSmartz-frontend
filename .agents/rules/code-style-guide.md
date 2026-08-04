---
trigger: always_on
---

# CareerForcePro - Agent Code Style Guide

AI coding agents operating on this repository must strictly adhere to these rules at all times.

---

## 1. Pre-Flight Research Check

- **Check Knowledge Item Summaries**: Always inspect KI summaries and artifact snapshots presented at the start of the session _before_ creating implementation designs or writing code. Do not duplicate patterns.
- **Inspect Current Implementations**: Compare instructions with the active codebase state. Verify paths, symbols, and dependencies before editing.

## 2. Component Size & Directory Strategy

- **Maximum 200 LOC Limit**: Parent orchestrator components must stay under **200 Lines of Code (LOC)** of runtime logic. If a component exceeds 200 LOC, split it into presentational sub-components and custom hooks in the same directory.
- **Component Classification**:
  - **Atomic UI** (`src/components/shared/ui/`): Dumb, presentational, style-driven, extends native HTML attributes, supports `React.forwardRef`.
  - **Shared Composables** (`src/components/shared/`): Business-agnostic, manages internal UI state, reusable across features.
  - **Feature Components** (`src/components/[FeatureName]/`): Domain-specific, connected to RTK Query hooks or Redux slices.
- **Folder Templates**: Custom components must follow the single-folder template:
  ```
  src/components/shared/ui/MyComponent/
  ├── index.ts                 # Re-exports component and types
  ├── MyComponent.tsx          # Component definition
  ├── MyComponent.types.ts     # Props interfaces
  ├── MyComponent.test.tsx     # Vitest tests
  └── MyComponent.css          # Local styles (if any)
  ```

## 3. Reusability & Shared Component Design Patterns

- **Container vs Presentational Pattern**: Keep state, data queries (RTK Query), and side effects in the parent orchestrator component. Presentational sub-components must be pure, receiving data via props and forwarding interaction events through handlers.
- **Extend Native HTML Attributes**: Custom UI components wrapping native inputs, buttons, or elements must extend their respective native React interfaces (e.g. `React.InputHTMLAttributes<HTMLInputElement>`) to preserve native properties (`disabled`, `required`, `aria-*`).
- **Ref Forwarding**: Wrap custom input/interactive elements in `React.forwardRef` to ensure compatibility with form controllers (such as `react-hook-form`'s `register` function) and accessibility focus management.
- **Compound Component Pattern**: Use compound components with React Context when building rich controls (e.g., `Tabs`, `Accordion`, `DropdownSelect`) where children share parent state without prop drilling.
- **Polymorphic Components**: Implement the `as` prop pattern using generic TypeScript definitions to allow components to dynamically render different semantic HTML tags (e.g., rendering `<Button>` as `<a>` or `<span>`).
- **Class Merging**: Join default component styles with incoming custom `className` properties using the `cn` utility (`tailwind-merge` + `clsx`) to avoid styling conflicts.

## 4. Typography Standardization Strategy

- **NO Raw Text Tags**: Do NOT write raw `<h1>`, `<h2>`, `<p>`, or `<span>` tags with arbitrary Tailwind font size classes.
- **Use `<Typography />`**: Always wrap static and dynamic text strings in the polymorphic `<Typography />` component from `src/components/shared`.
- **Font Stack Rules**:
  - **Sora (`font-sora`)**: Headings (`h1` through `h6`) and subtitles.
  - **Roboto (`font-roboto`)**: Body copy, inputs, textareas, tooltips, lists.
  - **DM Sans (`font-dm-sans`)**: Brand accents, stats counters.
- **Polymorphism**: If you need the visual style of a heading but semantic tag of a span for accessibility/layout, use:
  `<Typography variant="h4" as="span">Text</Typography>`

## 5. Performance Optimization Patterns

- **Avoid Anonymous Callbacks in Loops**: Do not pass inline arrow functions inside lists/mapped arrays. Delegate click handlers at the parent level or use custom attributes to identify the item.
- **Context Value Memoization**: Always wrap React Context `value` objects in `useMemo` to prevent redundant re-renders of consuming components on parent updates.
- **Virtualization**: Use virtual lists (e.g., `react-window`) when rendering lists containing hundreds of rows to prevent layout rendering lag.

## 6. Strict Code Quality & Architecture

- **TypeScript Strict Mode**: Zero tolerance for implicit or explicit `any` types. Type parameters, return values, generic definitions, and promise hooks.
- **API Integration**: Use RTK Query mutations and queries exclusively. Do NOT use axios directly.
- **Absolute Imports**: Always use absolute paths (`src/...`) for imports instead of relative paths (`../../`).
- **No Magic Values**: Centralize all timeouts, numbers, sizes, and configurations in `src/constants/`.

## 7. Verification Checklist

Before completing a task, run the following verification pipeline:

1. **Compilation Check**: Run verification builds (`npx tsc -b`) to guarantee 0 TypeScript compiler errors.
2. **Clean Code Check**: Delete all commented-out code blocks; do not leave dead code behind.
3. **No Unused Entities**: Verify there are no unused imports, parameters, or local variables.
