# CareerForcePro Web - AI Coding Instructions

## Project Overview

CareerForcePro is a React 19 + TypeScript hiring platform with real-time video interviews, candidate management, job openings, and AI-powered question generation. Built with Vite, Redux Toolkit, and React Router v7.

## Architecture

### Core Stack

- **Frontend Framework**: React 19, TypeScript (strict mode, no implicit `any`)
- **Build Tool**: Vite 6.3.6+ with React SWC compiler
- **State Management**: Redux Toolkit with `redux-persist` (persists only `LoginSlice`)
- **Data Fetching**: RTK Query (`@reduxjs/toolkit/query/react`) with auto token refresh (401 handling)
- **Routing**: React Router v7 with lazy-loaded pages via Suspense + `PrivateRoute` protection
- **Styling**: Tailwind CSS v4 with PostCSS; Ant Design v5 components (integrated)
- **UI Components**: Ant Design v5 (form controls, modals, tables, etc.)
- **Form Handling**: react-hook-form + Zod validation with centralized schemas
- **Testing**: Vitest (jest-compatible) with React Testing Library + MSW mocking

### Directory Structure

```
src/
├── api/                         # RTK Query endpoints (one per feature)
│   ├── index.ts                 # Base query config, auto auth headers, 401 refresh
│   └── [Feature]/index.ts       # Feature endpoints (queries + mutations)
├── components/                  # Reusable & feature-specific components
│   ├── index.ts                 # Barrel export for convenience
│   ├── shared/                  # Global UI components (Header, Footer, PrivateRoute, etc.)
│   └── [Feature]/               # Feature components (split into container + presentational)
├── constants/                   # Centralized constants (NO hardcoded values in code)
│   ├── app.constants.ts         # Magic numbers, timeouts, sizes
│   ├── authorities.constant.ts  # Role definitions
│   ├── statusConstant.ts        # Status enums
│   ├── webAPI.ts                # API endpoint paths
│   └── [Feature].ts             # Feature-specific constants
├── hooks/                       # Custom React hooks
│   ├── useHasAccess.tsx         # Role-based rendering
│   └── [Custom]Hook.tsx         # Feature-specific hooks
├── layouts/                     # Layout components
│   ├── MainLayout.tsx
│   ├── AuthLayout.tsx
│   ├── JobDetailsLayout.tsx
│   └── AddUserLayout.tsx
├── pages/                       # Page components (lazy-loaded in routes.tsx)
│   ├── index.ts                 # Barrel export
│   └── [Page]/
├── redux/                       # State management
│   ├── provider/store.ts        # Redux store + redux-persist config
│   ├── slices/                  # Feature slices (only LoginSlice persisted)
│   └── reducers/index.ts        # Root reducer
├── services/                    # Business logic (non-React)
│   ├── AuthService.ts           # Token refresh, login logic
│   ├── SessionService.ts
│   └── [Service].ts
├── shared/                      # Shared utilities
│   └── utils/
│       ├── auth/                # Auth helpers
│       ├── api/                 # API utilities (axios client)
│       ├── validation/          # Input validation
│       ├── formatting/          # Text/data formatters
│       ├── video/               # Video-related helpers
│       ├── business-logic/      # Reusable biz logic
│       ├── filters/             # Filter services
│       ├── forms/               # Form infrastructure
│       │   ├── formBuilder.ts   # Form factory functions
│       │   ├── validationSchemas.ts  # Centralized Zod schemas
│       │   ├── formHelpers.ts   # Form utilities
│       │   └── formConstants.ts # Field rules
│       ├── methods.ts
│       └── enums.ts
├── types/                       # TypeScript definitions
│   ├── index.ts                 # Barrel export
│   └── [Type].ts                # Feature types
├── assets/                      # Static assets (SVGs, images)
├── config/                      # Configuration
├── theme/                       # Theme config
├── App.tsx                      # Root component
├── routes.tsx                   # Route definitions
└── main.tsx                     # Entry point
```

## Key Patterns & Conventions

### 1. Absolute Imports Only (NO Relative Paths)

- **Rule**: Always use `src/` absolute paths, NEVER relative paths
- **Config**: Configured in `tsconfig.json` with `"baseUrl": "."` and `"paths": { "src/*": ["src/*"] }`
- **Benefits**: Refactoring safe, files can move without breaking imports

✅ **Correct**:

```typescript
import { useHasAccess } from 'src/hooks/useHasAccess';
import { DEBOUNCE_DELAY } from 'src/constants/app.constants';
import { MainLayout } from 'src/layouts/MainLayout';
```

❌ **Wrong**:

```typescript
import { useHasAccess } from '../../../hooks/useHasAccess'; // Relative paths
```

### 2. TypeScript Strict Mode - ZERO TOLERANCE for `any`

- **Rule**: All variables, parameters, return types must be explicit (no implicit `any`)
- **Config**: `tsconfig.json` has `"noImplicitAny": true`, `"strictNullChecks": true`
- **Enforcement**: Build fails if violated

✅ **Correct**:

```typescript
const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {};
const users: User[] = [];
const config: Record<string, unknown> = {};
const [count, setCount] = useState<number>(0);
```

❌ **Wrong**:

```typescript
const handleClick = (event) => {}; // Implicit any for event
const users = []; // Implicit any[]
const config = {}; // Implicit any
```

### 3. NO Magic Strings/Numbers - Use Constants

- **Rule**: All constants in `src/constants/` (app.constants.ts for universal values)
- **Exception**: Bare string literals are allowed only for obvious single-use enum comparisons (e.g., `status === 'OPEN'`). This exception applies strictly to enum string comparisons — never to numeric values, timeouts, sizes, or other configuration values.

✅ **Correct**:

```typescript
import { NOTIFICATION_DURATION, DEBOUNCE_DELAY } from 'src/constants/app.constants';
toast.success('Saved', { autoClose: NOTIFICATION_DURATION });
```

❌ **Wrong**:

```typescript
toast.success('Saved', { autoClose: 3000 }); // Magic number
```

### 4. API Integration (RTK Query)

- Base URL: `${VITE_BACKEND_ENDPOINT}${VITE_BACKEND_PREFIX}` (from `.env`)
- Auto-authentication: All endpoints (except `login`, `forgot-password`) include `Authorization: Bearer ${token}` header
- Token refresh: 401 errors trigger `handleRefreshToken()` from `AuthService`
- Tokens stored in localStorage with keys: `cfp_atoken`, `cfp_rtoken`, `cfp_itoken`, `cfp_user`
- **Pattern**: Create API endpoints in `/api/{feature}/index.ts` using `createApi` with `fetchBaseQuery`

Example:

```typescript
// src/api/JobOpening/index.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const jobOpeningApi = createApi({
  reducerPath: 'jobOpeningApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL, prepareHeaders: ... }),
  endpoints: (builder) => ({
    getJobOpenings: builder.query({ ... }),
    createJobOpening: builder.mutation({ ... })
  })
})
```

### 5. Component Architecture

- **Feature-based structure**: Components grouped by feature (`AiCallBooking/`, `JobsOpening/`, etc.)
- **Container vs Presentational**: Split logic (smart) from display (dumb) components
- **Component size limit**: 200 lines of runtime logic — excluding blank lines, comments, import statements, and type/interface declarations. If a component's runtime logic exceeds 200 lines, split it into container and presentational sub-components.
- **Lazy loading**: Pages imported with `lazy()` and custom `lazyImport()` helper in `routes.tsx`
- **PrivateRoute wrapper**: Protected routes use `<PrivateRoute>` component with `verifyAuthToken()`
- **Layout wrapping**: Major sections use layout components (`MainLayout`, `AuthLayout`, `JobDetailsLayout`)
- **Error boundaries**: Wrap each lazy-loaded route with a React `ErrorBoundary` (e.g., `react-error-boundary`). Create a dedicated `ErrorBoundaryPage` component in `src/pages/ErrorBoundaryPage/`. The fallback must display a user-readable message and a reload/retry button. Always wrap each Suspense boundary in a parent ErrorBoundary — i.e., `<ErrorBoundary fallback={...}><Suspense fallback={...}>...</Suspense></ErrorBoundary>`. Never render a Suspense without an enclosing ErrorBoundary ancestor.

### 6. State Management

- **Redux slices**: Feature-scoped state (e.g., `JobOpeningFilterSlice`, `CandidateFilterSlice`)
- **Persistence**: Only `LoginSlice` is persisted via `redux-persist`
- **Dispatch pattern**: Use `useAppDispatch` hook and import slices from `redux/slices/`
- **Selectors**: Extract state with `useSelector` or create feature-specific selectors

### 7. Authentication & Authorization

- **Token verification**: `verifyAuthToken()` checks JWT expiry and localStorage
- **localStorage access**: Always use helpers in `shared/utils/auth/localstorage.helpers.ts` — never access `localStorage` directly. If localStorage is unavailable (e.g., private browsing, quota exceeded, restricted iframes), treat the session as unauthenticated and redirect to login. If a localStorage write operation throws (e.g., `QuotaExceededError`), catch the error in the localStorage helper, log a warning, clear all CFP-prefixed keys to prevent a partially-written state, and redirect to `/login` as if the session is unauthenticated.
- **Login flow**:
  1. User submits credentials → API returns tokens + role data
  2. `handleRefreshToken()` auto-refreshes before expiry
  3. `PrivateRoute` protects admin/hiring manager pages
- **Authorization checks**: Use `useHasAccess()` hook (accepts authorities array)
- **Role-based UI**: Different dashboards for `CANDIDATE`, `HIRING_MANAGER`, `OWNER`, `ORGANIZATION_ADMIN`

### 8. Form Handling

- **Library**: `react-hook-form` with `@hookform/resolvers` for validation
- **Centralized schemas**: All Zod schemas in `src/shared/utils/forms/validationSchemas.ts`
- **Form builder pattern**: Use factories like `createLoginForm()` for consistent configuration
- **Form helpers**: Use `src/shared/utils/forms/formHelpers.ts` for error messages and field utilities
- **Pattern**: Use `useForm()` hook, connect inputs with `register()`, display errors from `formState.errors`
- **Validation**: Zod schemas passed via `resolver: zodResolver(schema)`
- **Schema location**: All Zod schemas must be defined in `src/shared/utils/forms/validationSchemas.ts`. Local inline schemas are not permitted. When adding a new form, add the corresponding schema to `validationSchemas.ts` and export it with a name matching the form (e.g., `loginFormSchema`, `createJobOpeningSchema`).

### 9. Data Fetching Best Practices

- **RTK Query hooks**: e.g., `const { data, isLoading, error } = useGetJobOpeningsQuery()`
- **Invalidation**: Mutations auto-invalidate related cache tags
- **Polling**: Use `pollingInterval` option for real-time updates
- **Dependent queries**: Skip queries conditionally with `skip: !id` option
- **File Uploads**: Use RTK Query mutations with `fetchBaseQuery` and `FormData` for all file uploads (resumes, video recordings). Do NOT use the axios client for uploads. For file uploads requiring progress tracking (e.g., video recordings), use the XMLHttpRequest-based pattern via a custom baseQuery that reports upload progress events, or use RTK Query with an `onQueryStarted` callback to update a local progress slice. Do not use axios for this purpose.

### 10. Constants & Enums

- **Centralized**: Import constants from `src/constants/` (e.g., `LOCALSTORAGE_KEYS`, `authorities.constant`)
- **Status constants**: Use `statusConstant.ts` for job/candidate/interview statuses
- **Avoid magic strings**: Define reusable constants for API endpoints, roles, and status values. Bare string literals are allowed only for obvious single-use enum comparisons (e.g., `status === 'OPEN'`). This exception applies strictly to enum string comparisons — never to numeric values, timeouts, sizes, or other configuration values.

### 11. Helper Functions & Shared Utils

- **Token/Auth**: `verifyAuthToken()`, `handleRefreshToken()` in `services/AuthService` and `shared/utils/auth/`
- **Local storage**: Helpers in `shared/utils/auth/localstorage.helpers.ts` for token management
- **Axios**: Pre-configured client in `shared/utils/api/axios.client.ts`. The axios client exists for legacy compatibility only and should not be used in new code. All new API interactions must use RTK Query. If you encounter existing code using axios, migrate it to RTK Query when touching that file.
- **Organized structure**: Utilities split into categorical subfolders: `auth/`, `api/`, `validation/`, `formatting/`, `video/`, `business-logic/`, `filters/`
- **Reusable logic**: Archive, resend invite, and feedback helpers in `shared/utils/business-logic/`

### 12. Styling & Typography Conventions

- **Utility-first**: Tailwind CSS classes (e.g., `className="flex items-center gap-4"`).
- **Responsive**: Use Tailwind breakpoints (`sm:`, `md:`, `lg:`).
- **Custom theme**: Check `tailwind-theme.css` for color/spacing overrides.
- **Typography Standardization**: Always use the polymorphic `<Typography />` component from `src/components/shared` instead of writing raw `<p>`, `<span>`, or `<h1>` elements. Sora (`font-sora`) is for headings and subtitles; Roboto (`font-roboto`) is for body text, tooltips, list items, and form inputs.

### 13. Naming Conventions

- **Files**: PascalCase for components (`UserProfile.tsx`), camelCase for utilities (`formBuilder.ts`).
- **Variables**: camelCase (e.g., `jobOpenings`, `isLoading`, `userData`).
- **Functions**: camelCase (e.g., `handleSubmit`, `validateEmail`).
- **Constants**: UPPER_SNAKE_CASE (e.g., `NOTIFICATION_DURATION`, `MAX_FILE_SIZE_MB`).
- **React Components**: PascalCase (e.g., `<JobOpeningsList />`, `<UserProfile />`).
- **Custom Hooks**: camelCase starting with `use` (e.g., `useCandidateFilter`, `useHasAccess`).
- **Types/Interfaces**: PascalCase, no `I` prefix (e.g., `User`, not `IUser`).

## AI Agent Workplace Rules & Workflows

To ensure seamless pairing, AI agents operating on this repository must adhere to the following rules:

1. **Mandatory Pre-Flight Research Check**: Always read the KI summaries and artifact snapshots presented at the start of the session _before_ creating implementation designs or writing source code. Do not duplicate patterns. Compare with active codebase state.
2. **Implementation Planning Workflow**: Create or update `implementation_plan.md` outlining functional architecture, new file templates, and test verification targets.
3. **Component Size Check**: Strict component size rules require parent files to stay below **200 LOC**. Split sub-components (such as list item rows, buttons, inputs, form components) into separate files in the same directory.
4. **Obtain Authorization**: Never perform write modifications to source files before receiving user confirmation/approval of the implementation plan.
5. **TypeScript Validation**: Always run verification builds (`npx tsc -b`) to guarantee that no compiler or type safety issues remain.
6. **Zero Swallowed Errors**: Ensure promise catches and errors are explicitly handled and mapped to display toast notifications.
7. **Absolute Imports**: Always use absolute paths (`src/...`) for imports instead of relative paths (`../../`).

## Testing

- **Framework**: Vitest (jest-compatible) with React Testing Library
- **Mocking**: MSW (Mock Service Worker) for API calls
- **Organization**: Tests in `tests/` folder matching `src/` structure; test files must use `.test.ts` or `.test.tsx` suffix
- **Coverage target**: 40%+ aggregate line coverage across the entire project as reported by Vitest (`pnpm test --coverage`). New utility functions and hooks should have individual test coverage; UI components are lower priority.
- **Test types**: Unit tests for utilities/hooks, integration tests for features
- **Pattern**: Use custom render function with Redux store + Router setup

### Scripts

- `pnpm dev` - Start Vite dev server (default: `http://localhost:5173`)
- `pnpm build` - TypeScript check + Vite build (output: `dist/`)
- `pnpm lint` - Run ESLint with Prettier integration
- `pnpm preview` - Preview production build locally

### Environment Variables

Create `.env` file with:

```
VITE_BACKEND_ENDPOINT=http://localhost:3000
VITE_BACKEND_PREFIX=/api/v1
VITE_ENV=development
```

### Type Safety

- **Strict mode enabled**: All `any` types forbidden (enforce explicit types)
- **No unused locals**: Keep code clean, use `noUnusedParameters: true`
- **Type definitions**: Add `.d.ts` files in `src/types/` for external libraries

## Common Workflows

### Adding a New API Endpoint

1. Create/edit file in `src/api/{Feature}/index.ts`
2. Define builder endpoint (query/mutation) with proper types
3. Export hook automatically generated by RTK Query
4. Use hook in component: `const { data, isLoading } = useGetXQuery()`

### Creating a New Page

1. Create page component in `src/pages/{PageName}/`
2. Add lazy import in `routes.tsx` using `lazy()` or custom `lazyImport()`
3. Define route in `routes.tsx` array with path, element, and layout wrapper
4. Wrap with `<PrivateRoute>` if protected

### Adding Protected Routes by Role

1. Define authorities array in `src/constants/authorities.constant.ts`
2. Apply the appropriate protection layer using this decision table:
   - **(1) Does the route require authentication?** If no, no wrapper needed. If yes, always add `<PrivateRoute>`.
   - **(2) Does the route also require a specific role?** If yes, additionally add a `useHasAccess()` check inside the page component body (not as a replacement for `PrivateRoute`).
   - **Conditional UI within an authorized page**: Use `useHasAccess()` inside the component for rendering specific UI elements only.
   - **`useHasAccess()` must NEVER be the only guard on a page route** — always pair it with `<PrivateRoute>` for route-level protection.

### Handling Authentication Errors

- **401 error handling order**:
  1. Check the error body — if it contains `ACCOUNT_INACTIVE`, skip refresh, clear tokens, logout, redirect to `/login`.
  2. Otherwise, attempt `handleRefreshToken()`.
  3. If refresh succeeds, retry the original request once.
  4. If refresh fails for any reason, clear all CFP tokens from localStorage, dispatch the logout action, and redirect to `/login`. Do not retry the original request.
- **Network errors** (RTK Query `FetchBaseQueryError` with status `FETCH_ERROR` or `PARSING_ERROR`) should NOT trigger a token refresh. Display a user-facing toast message: "Network error — please check your connection" and do not modify auth state.
- Other errors: Show toast via `react-toastify`

## Critical Files to Understand

- [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md) - Comprehensive developer patterns and conventions
- [src/routes.tsx](../src/routes.tsx) - Route definitions and lazy loading strategy
- [src/redux/provider/store.ts](../src/redux/provider/store.ts) - Redux store with persistence
- [src/services/AuthService.ts](../src/services/AuthService.ts) - Token refresh logic
- [src/api/index.ts](../src/api/index.ts) - RTK Query configuration and auth headers
- [src/shared/utils/auth/localstorage.helpers.ts](../src/shared/utils/auth/localstorage.helpers.ts) - Token storage
- [src/constants/webAPI.ts](../src/constants/webAPI.ts) - API constants and localStorage keys

## Dos and Don'ts

✅ **DO:**

- Use RTK Query for all API calls — never use axios directly for any purpose in new code
- Import constants from `constants/` folder
- Wrap components in Suspense when lazy-loading
- Check authentication via `verifyAuthToken()` before redirecting
- Use Tailwind utilities; avoid inline styles
- Keep slices focused on single features
- Add proper TypeScript types (no implicit `any`)

❌ **DON'T:**

- Store sensitive tokens in sessionStorage (use localStorage with CFP key prefix)
- Hardcode API URLs or endpoints
- Mutate Redux state directly (use immer in RTK)
- Import pages directly; use lazy loading
- Make API calls in component root (use RTK Query hooks or useEffect)
- Mix Ant Design and custom styling arbitrarily
- Forget token expiry checks when making API requests

## Integration Points & External Dependencies

- **Draft.js**: Rich text editing for job descriptions and feedback
- **FFmpeg.wasm**: Client-side video processing for video uploads. FFmpeg.wasm integration must run in a Web Worker to avoid blocking the main thread. Wrap FFmpeg operations in helpers located in `src/shared/utils/video/`. Errors from FFmpeg processing should be caught and displayed via `react-toastify` using the standard error toast pattern.
- **React Query/Tanstack**: NOT used in this project; use RTK Query exclusively for all data fetching.
- **PDF Viewer**: PDF document viewing/parsing

---

**Last updated**: June 14, 2026 | Maintain this file as architecture evolves.

For comprehensive developer patterns, coding standards, and detailed examples, refer to [DEVELOPER_GUIDE.md](../DEVELOPER_GUIDE.md).
