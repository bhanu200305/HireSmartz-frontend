# CareerForcePro Web - Comprehensive Developer Guide

**Version**: Phase 2 | **Last Updated**: January 27, 2026  
**Purpose**: Strict architectural patterns and conventions for consistent, maintainable code

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Architecture](#project-architecture)
3. [Strict Code Patterns](#strict-code-patterns)
4. [Directory Structure & Naming Conventions](#directory-structure--naming-conventions)
5. [API Integration (RTK Query)](#api-integration-rtk-query)
6. [Component Architecture](#component-architecture)
7. [Form Patterns (Phase 2)](#form-patterns-phase-2)
8. [State Management (Redux)](#state-management-redux)
9. [Testing Strategy (Phase 2)](#testing-strategy-phase-2)
10. [Code Quality Standards](#code-quality-standards)
11. [Typography Standardization Strategy](#typography-standardization-strategy)
12. [AI Agent Workplace Rules & Workflows](#ai-agent-workplace-rules--workflows)
13. [Common Workflows](#common-workflows)
14. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- VS Code with extensions: ESLint, Prettier, Thunder Client (or Postman)

### Installation & Setup

```bash
# Clone and install
git clone <repo>
cd careerforcepro-web
npm install

# Create environment file
cp .env.example .env
# Edit .env with your backend URL

# Start development server
npm run dev  # http://localhost:5173

# Build for production
npm run build

# Run linter
npm run lint
npm run lint -- --fix  # Auto-fix issues

# Run tests (Phase 2+)
npm test
npm test -- --coverage
```

### Verify Setup

```bash
# Should return 0 TypeScript errors
npm run build

# Should have <50 linting warnings
npm run lint | grep "error\|warning"
```

---

## Project Architecture

### Core Technology Stack

| Technology    | Version | Purpose          | Notes                                 |
| ------------- | ------- | ---------------- | ------------------------------------- |
| React         | 19+     | UI Framework     | Strict mode enabled                   |
| TypeScript    | 5.0+    | Type Safety      | Strict mode: all `any` forbidden      |
| Vite          | 6.3.6+  | Build Tool       | Fast dev server, optimized builds     |
| Redux Toolkit | Latest  | State Management | Only `LoginSlice` persisted           |
| RTK Query     | Latest  | Data Fetching    | Auto-caching, automatic hooks         |
| Tailwind CSS  | 4.0+    | Styling          | Utility-first, responsive             |
| Ant Design    | 5.0+    | UI Components    | Integrated with Tailwind theme        |
| Vitest        | Latest  | Testing          | Jest-compatible, fast                 |
| React Router  | 7.0+    | Routing          | Lazy-loaded pages, protected routes   |
| Agora SDK     | Latest  | Real-time Video  | RTC for interviews, RTM for messaging |

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                   BROWSER (React 19)                │
├─────────────────────────────────────────────────────┤
│  Pages (lazy-loaded)  │  Components (feature-based) │
│  src/pages/           │  src/components/            │
├─────────────────────────────────────────────────────┤
│                Redux Toolkit Store                  │
│  ├── LoginSlice (persisted)                         │
│  ├── JobOpeningFilterSlice                          │
│  ├── CandidateFilterSlice                           │
│  └── Feature-specific slices                        │
├─────────────────────────────────────────────────────┤
│         RTK Query (Data Fetching Layer)             │
│  ├── Auto token refresh (401 handling)              │
│  ├── Automatic caching & invalidation               │
│  ├── Hooks: useGetJobOpeningsQuery(), etc.          │
│  └── Mutations: createJobOpening(), etc.            │
├─────────────────────────────────────────────────────┤
│           Custom Hooks & Services                   │
│  ├── useAgora() → Video/RTM management              │
│  ├── useHasAccess() → Role-based rendering          │
│  ├── AuthService → Token refresh logic              │
│  └── Utility helpers → src/shared/utils/            │
├─────────────────────────────────────────────────────┤
│                    Backend API                      │
│  BASE_URL: ${VITE_BACKEND_ENDPOINT}/api/v1          │
│  ├── GET /jobs, /candidates, /interviews, etc.     │
│  ├── POST /auth/login, /jobs (with token)          │
│  └── Bearer token in Authorization header           │
└─────────────────────────────────────────────────────┘
```

### Build Pipeline

```
Source Code (TypeScript + React)
  ↓
  ├→ ESLint (code quality)
  ├→ TypeScript Compiler (strict mode)
  ├→ Vite (SWC compilation)
  └→ Tailwind CSS (PostCSS)
  ↓
Optimized Bundle (dist/)
  ├── index.html (entry point)
  ├── assets/
  │   ├── js/ (code-split chunks)
  │   ├── css/ (optimized styles)
  │   └── fonts/ (custom fonts)
  └── (Optimized for production)
```

---

## Strict Code Patterns

### 1. TypeScript Strict Mode - NON-NEGOTIABLE

**Rule**: Zero implicit `any` types. All types must be explicit.

✅ **Correct**:

```typescript
// Explicit parameter types
function handleClick(event: React.MouseEvent<HTMLButtonElement>): void {
  console.log('Clicked');
}

// Explicit return types
const getUserName = (user: User): string => user.name;

// Explicit generic types
const items: Array<JobOpening> = [];
const config: Record<string, string> = {};

// Explicit state types
const [count, setCount] = useState<number>(0);
const [data, setData] = useState<JobOpening | null>(null);
```

❌ **Wrong**:

```typescript
// No type for event parameter
function handleClick(event) {}

// No return type
const getUserName = (user) => user.name;

// Implicit any
const items = []; // Implicit unknown[]
const config = {}; // Implicit any

// No state type
const [count, setCount] = useState(0); // Inferred ok, but be explicit in complex cases
```

### 2. No Magic Strings/Numbers

**Rule**: All constants must be in `src/constants/`.

✅ **Correct**:

```typescript
// src/constants/app.constants.ts
export const NOTIFICATION_DURATION = 3000;
export const MAX_FILE_SIZE_MB = 10;
export const DEBOUNCE_DELAY_MS = 300;

// In component
import { NOTIFICATION_DURATION } from 'src/constants/app.constants';
toast.success('Job created', { autoClose: NOTIFICATION_DURATION });
```

❌ **Wrong**:

```typescript
// Hardcoded values scattered in code
toast.success('Job created', { autoClose: 3000 });
if (file.size > 10485760) {
} // 10MB without context
setTimeout(() => {}, 300); // Random delay value
```

### 3. Absolute Imports (No Relative Paths)

**Rule**: Always import from `src/` root using absolute paths.

✅ **Correct**:

```typescript
// In any file, anywhere in the project
import { useHasAccess } from 'src/hooks/useHasAccess';
import { AuthService } from 'src/services/AuthService';
import { AUTHORITIES } from 'src/constants/authorities.constant';
import { MainLayout } from 'src/layouts/MainLayout';
```

❌ **Wrong**:

```typescript
// Relative paths (fragile, breaks when files move)
import { useHasAccess } from '../../../hooks/useHasAccess';
import { AuthService } from '../../../../services/AuthService';
```

**Setup** (in `tsconfig.json`):

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "src/*": ["src/*"]
    }
  }
}
```

### 4. No Commented Code

**Rule**: Delete commented code; use git history if needed.

✅ **Correct**:

```typescript
// Single-line comment explaining logic
const isValid = email.match(EMAIL_REGEX);

// TODO: Implement email verification (GitHub issue #123)
```

❌ **Wrong**:

```typescript
// Old code we might need later
// const isValid = email.includes('@');
// const email = validateEmail(user.email);
// // handleSubmit(); // Not sure if this is still used
```

### 5. Explicit Error Handling

**Rule**: Never silently fail. Always handle/log errors.

✅ **Correct**:

```typescript
const handleSubmit = async (data: LoginForm) => {
  try {
    const response = await loginMutation(data).unwrap();
    redirect('/dashboard');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Login failed';
    toast.error(errorMsg);
    console.error('Login error:', error); // Log for debugging
  }
};
```

❌ **Wrong**:

```typescript
const handleSubmit = async (data: LoginForm) => {
  const response = await loginMutation(data).unwrap(); // No try/catch
  redirect('/dashboard');
};

// Or swallowing errors
try {
  doSomething();
} catch (error) {
  // Silently fail - no logging
}
```

### 6. Component Size Limit: 200 LOC (Lines of Code)

**Rule**: Components >200 LOC must be split into smaller units.

✅ **Correct** (Split Large Component):

```
JobsOpening/
├── index.tsx (100 LOC - orchestrator)
├── JobOpeningsList.tsx (120 LOC - list display)
├── JobOpeningFilters.tsx (80 LOC - filter UI)
└── JobOpeningActions.tsx (60 LOC - bulk actions)
```

❌ **Wrong**:

```
JobsOpening/
└── index.tsx (450 LOC - everything mixed together)
```

**How to refactor**:

1. Identify functional blocks (filters, list, actions)
2. Extract each block into separate component
3. Keep parent as orchestrator (state + layout)
4. Use custom hooks for shared logic

---

## Directory Structure & Naming Conventions

### Phase 2 Structure (After Refactoring)

```
careerforcepro-web/
├── public/                          # Static assets (favicon, etc.)
├── src/
│   ├── api/                         # RTK Query endpoints by feature
│   │   ├── index.ts                 # RTK Query setup
│   │   ├── Login/
│   │   │   └── index.ts             # login, logout, forgotPassword mutations
│   │   ├── JobOpening/
│   │   │   └── index.ts             # CRUD operations for jobs
│   │   ├── Candidates/
│   │   ├── Company/
│   │   ├── User/
│   │   └── [Feature]/
│   │
│   ├── components/                  # Reusable & feature components
│   │   ├── index.ts                 # Barrel export for convenience
│   │   ├── shared/                  # Globally reusable UI
│   │   │   ├── Header.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── MasterPagination.tsx
│   │   │   └── PrivateRoute.tsx
│   │   ├── AiCallBooking/           # Feature components (smart + dumb)
│   │   ├── JobsOpening/
│   │   │   ├── index.tsx            # Container/Orchestrator
│   │   │   ├── JobOpeningsList.tsx  # Presentational
│   │   │   ├── JobOpeningFilters.tsx
│   │   │   └── JobOpeningActions.tsx
│   │   ├── Dashboard/               # Split into DashboardCharts, DashboardWidgets, etc.
│   │   └── [Feature]/
│   │
│   ├── constants/                   # Application-wide constants
│   │   ├── app.constants.ts         # Magic numbers, timeouts, sizes (Phase 1)
│   │   ├── authorities.constant.ts  # Role definitions
│   │   ├── statusConstant.ts        # Job, candidate, interview statuses
│   │   ├── webAPI.ts                # API endpoint paths
│   │   ├── candidateFilterStatus.ts
│   │   ├── hiringManager.ts
│   │   ├── jobOpenings.ts
│   │   └── file.constants.ts
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── useAgora.tsx             # Video RTC management
│   │   ├── useAgoraRTM.tsx          # Real-time messaging
│   │   ├── useHasAccess.tsx         # Role-based rendering
│   │   ├── useActivityFilters.tsx
│   │   ├── useCandidateFilter.tsx
│   │   ├── useDebouncedEffect.tsx
│   │   ├── useDebouncedQuery.tsx
│   │   ├── useAPI.tsx               # Generic API hook
│   │   └── [CustomHook]/
│   │
│   ├── layouts/                     # Layout components (Phase 1)
│   │   ├── MainLayout.tsx           # Primary app layout
│   │   ├── AuthLayout.tsx           # Login/signup layout
│   │   ├── JobDetailsLayout.tsx     # Job detail page layout
│   │   └── AddUserLayout.tsx        # User creation layout
│   │
│   ├── pages/                       # Route pages (lazy-loaded)
│   │   ├── index.ts                 # Barrel export with all pages
│   │   ├── AddCustomerPage/
│   │   ├── AddInterviewRound/
│   │   ├── AddJobDescription/
│   │   ├── AddOrganisationUserPage/
│   │   ├── AddUserPage/
│   │   ├── CandidateUser/
│   │   └── [FeaturePage]/
│   │
│   ├── redux/                       # State management
│   │   ├── provider/
│   │   │   ├── store.ts             # Store config + redux-persist
│   │   │   └── index.ts
│   │   ├── slices/
│   │   │   ├── LoginSlice.ts        # Persisted auth state
│   │   │   ├── JobOpeningFilterSlice.ts
│   │   │   ├── CandidateFilterSlice.ts
│   │   │   └── [Feature]Slice.ts
│   │   └── reducers/
│   │       └── index.ts             # Root reducer
│   │
│   ├── services/                    # Business logic services
│   │   ├── AuthService.ts           # Token refresh, login logic
│   │   ├── SessionService.ts        # Session management
│   │   ├── WebsocketService.ts      # Real-time updates (optional)
│   │   └── [Service].ts
│   │
│   ├── shared/                      # Shared utilities (Phase 1)
│   │   └── utils/
│   │       ├── auth/
│   │       │   ├── localstorage.helpers.ts
│   │       │   └── getAccess.ts
│   │       ├── api/
│   │       │   └── axios.client.ts
│   │       ├── validation/
│   │       │   └── input.helpers.ts
│   │       ├── formatting/
│   │       │   └── agora.client.ts
│   │       ├── video/
│   │       │   └── calculateLayout.ts
│   │       ├── business-logic/
│   │       │   ├── feedback.helpers.ts
│   │       │   └── index.ts
│   │       ├── filters/
│   │       │   ├── filterService.ts
│   │       │   └── activityFilterService.ts
│   │       ├── forms/                 # Phase 2: Form infrastructure
│   │       │   ├── formBuilder.ts     # Form factory functions
│   │       │   ├── validationSchemas.ts  # Centralized Zod schemas
│   │       │   ├── formHelpers.ts     # Form utility functions
│   │       │   └── formConstants.ts   # Field-level rules
│   │       ├── methods.ts
│   │       └── enums.ts
│   │
│   ├── types/                       # TypeScript type definitions
│   │   ├── index.ts                 # Barrel export of all types
│   │   ├── User.ts
│   │   ├── JobOpening.ts
│   │   ├── Candidate.ts
│   │   └── [Type].ts
│   │
│   ├── assets/                      # Images, SVGs, fonts
│   │   ├── svgs/
│   │   ├── images/
│   │   └── fonts/
│   │
│   ├── config/                      # App configuration
│   │   └── index.ts
│   │
│   ├── theme/                       # Theme configuration
│   │   └── index.ts
│   │
│   ├── App.tsx                      # Root component
│   ├── App.css
│   ├── main.tsx                     # Entry point
│   ├── index.css                    # Global styles
│   ├── vite-env.d.ts               # Vite type definitions
│   ├── declarations.d.ts            # Global type declarations
│   └── routes.tsx                   # Route definitions
│
├── tests/                           # Test suite (Phase 2)
│   ├── setup.ts                     # Vitest setup
│   ├── fixtures/
│   │   ├── users.fixture.ts         # User factory
│   │   ├── jobs.fixture.ts          # Job factory
│   │   └── mockData.json
│   ├── mocks/
│   │   ├── server.ts                # MSW setup
│   │   └── handlers.ts              # Request handlers
│   ├── utils/
│   │   ├── render.tsx               # Custom render with Redux
│   │   └── testHelpers.ts
│   ├── utils/                       # Unit tests for utilities
│   │   └── [utility].test.ts
│   ├── components/                  # Component tests
│   │   └── [Component].test.tsx
│   ├── integration/                 # Integration tests
│   │   └── [flow].test.ts
│   └── index.test.ts                # Placeholder
│
├── .github/
│   ├── copilot-instructions.md      # This file (updated Phase 2)
│   └── prompts/
│       ├── plan-phase1FoundationReadability.prompt.md
│       ├── plan-phase2-MockDataRemovalAndOptimization.prompt.md
│       └── TEST-CHECKLIST-PHASE1.md
│
├── public/
├── .env.example
├── .gitignore
├── commitlint.config.js
├── eslint.config.js
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── tailwind.config.ts
├── postcss.config.mjs
├── vite.config.ts
├── Dockerfile
├── Dockerfile.dev
├── vercel.json
├── README.md
├── DEVELOPER_GUIDE.md               # ← This file (NEW - Phase 2)
└── CONTRIBUTING.md                  # ← Recommended addition
```

### Naming Conventions (STRICT)

#### 1. File Names

- **Components**: PascalCase (e.g., `JobOpeningsList.tsx`, `UserProfile.tsx`)
- **Utilities/Helpers**: camelCase (e.g., `formBuilder.ts`, `filterService.ts`)
- **Type definitions**: PascalCase (e.g., `User.ts`, `JobOpening.ts`)
- **Constants**: camelCase or UPPER_SNAKE_CASE for files (e.g., `app.constants.ts`, `authorities.constant.ts`)
- **Tests**: Same as source + `.test.ts` suffix (e.g., `UserProfile.test.tsx`, `filterService.test.ts`)
- **API files**: camelCase folder + `index.ts` (e.g., `src/api/JobOpening/index.ts`)

✅ **Correct**:

```
src/
├── components/UserProfile.tsx
├── hooks/useCandidateFilter.tsx
├── services/AuthService.ts
├── shared/utils/forms/formBuilder.ts
├── types/JobOpening.ts
├── constants/app.constants.ts
└── api/JobOpening/index.ts

tests/
├── components/UserProfile.test.tsx
├── utils/formBuilder.test.ts
└── fixtures/users.fixture.ts
```

❌ **Wrong**:

```
src/
├── components/user-profile.tsx (kebab-case)
├── hooks/use_candidate_filter.tsx (snake_case)
├── services/auth_service.ts (snake_case)
├── components/userprofile.tsx (no camelCase)
├── GetJobOpeingById.ts (typo: "Opeing" instead of "Opening")  ← Phase 1 fixed this
├── archieveCompany.ts (typo: "archieve" instead of "archive")  ← Phase 1 fixed this
```

#### 2. Variable & Function Names

- **Constants**: UPPER_SNAKE_CASE (e.g., `NOTIFICATION_DURATION`, `MAX_FILE_SIZE_MB`)
- **Variables**: camelCase (e.g., `jobOpenings`, `isLoading`, `userData`)
- **Functions**: camelCase (e.g., `handleSubmit`, `validateEmail`, `fetchJobOpenings`)
- **React Components**: PascalCase (e.g., `<JobOpeningsList />`, `<UserProfile />`)
- **Custom Hooks**: camelCase starting with `use` (e.g., `useCandidateFilter`, `useHasAccess`)

✅ **Correct**:

```typescript
const DEBOUNCE_DELAY = 300;
let isLoading = false;
const handleClick = () => {};
const UserProfile: React.FC = () => {};
const useCustomHook = () => {};
```

❌ **Wrong**:

```typescript
const debounce_delay = 300; // snake_case
const IsLoading = false; // PascalCase for variable
const HandleClick = () => {}; // PascalCase for function
const getUserProfile = () => {}; // lowercase for component
```

#### 3. Type Names

- **Interfaces**: PascalCase, no `I` prefix (e.g., `User`, `JobOpening`, not `IUser`)
- **Type aliases**: PascalCase (e.g., `LoginFormData`, `JobStatusType`)
- **Enums**: PascalCase (e.g., `JobStatus`, `UserRole`)

✅ **Correct**:

```typescript
interface User {
  id: string;
  name: string;
}

type LoginFormData = {
  email: string;
  password: string;
};

enum JobStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  DRAFT = 'DRAFT',
}
```

❌ **Wrong**:

```typescript
interface IUser {} // No I prefix
type login_form = {}; // snake_case
enum job_status {} // snake_case
```

---

## API Integration (RTK Query)

### RTK Query Setup Pattern

All API endpoints follow this pattern:

```typescript
// src/api/JobOpening/index.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { JobOpening, CreateJobOpeningRequest } from 'src/types';
import { BASE_URL } from 'src/constants/webAPI';

export const jobOpeningApi = createApi({
  reducerPath: 'jobOpeningApi',
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).login.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['JobOpening'],
  endpoints: (builder) => ({
    // Query: GET request (cached by default)
    getJobOpenings: builder.query<JobOpening[], void>({
      query: () => '/jobs',
      providesTags: ['JobOpening'],
    }),

    getJobOpeningById: builder.query<JobOpening, string>({
      query: (id) => `/jobs/${id}`,
      providesTags: (result, error, id) => [{ type: 'JobOpening', id }],
    }),

    // Mutation: POST/PUT/DELETE request
    createJobOpening: builder.mutation<JobOpening, CreateJobOpeningRequest>({
      query: (body) => ({
        url: '/jobs',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['JobOpening'],
    }),

    updateJobOpening: builder.mutation<JobOpening, { id: string; data: Partial<JobOpening> }>({
      query: ({ id, data }) => ({
        url: `/jobs/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'JobOpening', id }, 'JobOpening'],
    }),

    deleteJobOpening: builder.mutation<void, string>({
      query: (id) => ({
        url: `/jobs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['JobOpening'],
    }),
  }),
});

// Auto-generated hooks (naming convention: use{Query/Mutation}Name)
export const {
  useGetJobOpeningsQuery,
  useGetJobOpeningByIdQuery,
  useCreateJobOpeningMutation,
  useUpdateJobOpeningMutation,
  useDeleteJobOpeningMutation,
} = jobOpeningApi;
```

### Usage in Components

✅ **Correct**:

```typescript
import { useGetJobOpeningsQuery, useCreateJobOpeningMutation } from 'src/api/JobOpening';

export const JobsPage: React.FC = () => {
  // Query: Automatic caching, refetch on component mount
  const { data: jobs, isLoading, error } = useGetJobOpeningsQuery();

  // Mutation: Manual control with unwrap for error handling
  const [createJob, { isLoading: isCreating }] = useCreateJobOpeningMutation();

  const handleCreateJob = async (jobData: CreateJobOpeningRequest) => {
    try {
      const newJob = await createJob(jobData).unwrap();
      toast.success('Job created successfully');
    } catch (error) {
      toast.error('Failed to create job');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {jobs?.map(job => <JobCard key={job.id} job={job} />)}
    </div>
  );
};
```

❌ **Wrong**:

```typescript
// Don't mix axios with RTK Query
const response = await axios.get('/jobs');

// Don't call API in component root
useEffect(() => {
  fetchJobs();
}, []);

// Don't ignore loading/error states
const { data } = useGetJobOpeningsQuery();
return <JobsList jobs={data} />;  // Crashes if data is undefined
```

### Error Handling Pattern

```typescript
// api/index.ts - Global error handler for 401s
const baseQueryWithReauth: BaseQueryFn<...> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    // Attempt refresh
    const refreshResult = await rawBaseQuery(
      { url: '/auth/refresh', method: 'POST' },
      api,
      extraOptions
    );

    if (refreshResult.data) {
      // Retry original request
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      // Refresh failed, logout
      api.dispatch(logoutAction());
      window.location.href = '/login';
    }
  }

  return result;
};
```

---

## Component Architecture

### Container vs Presentational Pattern

Each feature folder should have:

- **Container (Smart) Component**: Manages state, data fetching, business logic
- **Presentational (Dumb) Components**: Pure display, no business logic

```typescript
// JobsOpening/index.tsx (Container)
export const JobsOpening: React.FC = () => {
  const { filters, setFilters } = useJobOpeningFilters();
  const { data, isLoading, error } = useGetJobOpeningsQuery(filters);
  const [selectedJob, setSelectedJob] = useState<JobOpening | null>(null);

  return (
    <>
      <JobOpeningFilters filters={filters} onChange={setFilters} />
      <JobOpeningsList data={data} isLoading={isLoading} onSelect={setSelectedJob} />
      {selectedJob && <JobOpeningModal job={selectedJob} />}
    </>
  );
};

// JobOpeningsList.tsx (Presentational)
interface JobOpeningsListProps {
  data?: JobOpening[];
  isLoading: boolean;
  onSelect: (job: JobOpening) => void;
}

export const JobOpeningsList: React.FC<JobOpeningsListProps> = ({
  data,
  isLoading,
  onSelect
}) => {
  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      {data?.map(job => (
        <JobCard key={job.id} job={job} onClick={() => onSelect(job)} />
      ))}
    </div>
  );
};
```

### Component Composition Example

```
JobsOpening/
├── index.tsx                    # Orchestrator
│   ├── imports JobOpeningsList
│   ├── imports JobOpeningFilters
│   ├── imports JobOpeningActions
│   └── manages: state, data, side effects
├── JobOpeningsList.tsx          # Display component
│   └── props: data, isLoading, onSelect
├── JobOpeningFilters.tsx        # Filter component
│   └── props: filters, onChange
├── JobOpeningActions.tsx        # Actions toolbar
│   └── props: selectedIds, onArchive, onDelete
└── hooks/
    ├── useJobOpeningFilters.ts  # Filter state logic
    └── useJobOpeningActions.ts  # Bulk action logic
```

### Component Props Pattern

✅ **Correct**:

```typescript
interface JobOpeningListProps {
  jobs: JobOpening[];
  isLoading: boolean;
  error?: Error;
  onSelect: (job: JobOpening) => void;
  onDelete?: (id: string) => Promise<void>;
}

export const JobOpeningList: React.FC<JobOpeningListProps> = ({
  jobs,
  isLoading,
  error,
  onSelect,
  onDelete,
}) => {
  // Implementation
};
```

❌ **Wrong**:

```typescript
// No prop interface
export const JobOpeningList = (props: any) => { };

// Unclear prop names
interface Props {
  data: JobOpening[];
  func: (job: JobOpening) => void;
}

// Callback hell - too many props
export const JobOpeningList: React.FC<{
  data: JobOpening[];
  onSelect: Function;
  onDelete: Function;
  onUpdate: Function;
  onArchive: Function;
  // ... 10 more callbacks
}> = ({ ... }) => { };
```

### Advanced Component Guidelines

To ensure components remain highly modular, robust, and clean, developers must follow these guidelines:

#### 1. Extend Native HTML Attributes

When building a custom wrapper around native HTML elements (e.g., custom buttons, inputs), always extend the native element's HTML attribute interface so the consumer doesn't lose standard properties (e.g., `autofocus`, `disabled`, `aria-*` tags).

```typescript
import { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  className?: string;
  error?: string;
  prefix?: ReactNode;
}
```

#### 2. Support Ref Forwarding (`React.forwardRef`)

To integrate cleanly with form libraries (like React Hook Form or Ant Design wrappers) and handle focus transitions, always wrap input and interactive elements in `React.forwardRef`.

```typescript
import React, { forwardRef } from 'react';
import clsx from 'clsx';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, prefix, ...restProps }, ref) => {
    return (
      <div className="relative w-full">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2">{prefix}</span>}
        <input
          ref={ref}
          className={clsx('w-full border px-3 py-2 focus:outline-none focus:ring-2 rounded-3xl', prefix && 'pl-10', error && 'border-red-500', className)}
          {...restProps}
        />
      </div>
    );
  }
);
Input.displayName = 'Input';
```

#### 3. Graceful Class Merging

Avoid style collision by merging default component classes with incoming `className` props using utility libraries like `clsx` and `tailwind-merge` (`twMerge`).

```typescript
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: any[]) => {
  return twMerge(clsx(inputs));
};
```

#### 4. Standardize Input Sanitization & Wheel Behavior

For numeric inputs, intercept wheel/scroll events to prevent accidental value alterations while scrolling.

```typescript
const handleOnWheel = (e: React.WheelEvent<HTMLInputElement>) => {
  e.stopPropagation();
};

<input
  type="number"
  onWheel={handleOnWheel}
  {...restProps}
/>
```

---

## Form Patterns (Phase 2)

### Centralized Validation Schemas

All form validation lives in `src/shared/utils/forms/validationSchemas.ts`:

```typescript
// src/shared/utils/forms/validationSchemas.ts
import { z } from 'zod';

// Form validation schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const userProfileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  role: z.enum(['CANDIDATE', 'HIRING_MANAGER', 'OWNER', 'ORGANIZATION_ADMIN']),
  company: z.string().optional(),
});

export const jobOpeningSchema = z.object({
  title: z.string().min(5, 'Title too short'),
  description: z.string().min(50, 'Description too short'),
  location: z.string().min(2, 'Location required'),
  salary: z.number().positive('Salary must be positive'),
  yearsRequired: z.number().min(0).max(50),
});

// Type inference from schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type UserProfileFormData = z.infer<typeof userProfileSchema>;
export type JobOpeningFormData = z.infer<typeof jobOpeningSchema>;
```

### Form Builder Pattern

```typescript
// src/shared/utils/forms/formBuilder.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

export const createLoginForm = (onSuccess?: () => void) => {
  return useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });
};

export const createUserProfileForm = (initialData?: User) => {
  return useForm<UserProfileFormData>({
    resolver: zodResolver(userProfileSchema),
    mode: 'onBlur',
    defaultValues: initialData
      ? {
          fullName: initialData.name,
          email: initialData.email,
          phone: initialData.phone,
          role: initialData.role,
          company: initialData.company,
        }
      : undefined,
  });
};

export const createJobOpeningForm = (initialData?: JobOpening) => {
  return useForm<JobOpeningFormData>({
    resolver: zodResolver(jobOpeningSchema),
    mode: 'onBlur',
    defaultValues: initialData,
  });
};
```

### Form Component Usage

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from 'src/shared/utils/forms/validationSchemas';
import { getErrorMessage } from 'src/shared/utils/forms/formHelpers';

export const LoginForm: React.FC = () => {
  const [loginMutation, { isLoading }] = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange'
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginMutation(data).unwrap();
      toast.success('Logged in successfully');
      reset();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('email')}
        placeholder="Email"
        type="email"
      />
      {errors.email && <span>{errors.email.message}</span>}

      <input
        {...register('password')}
        placeholder="Password"
        type="password"
      />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit" disabled={isSubmitting || isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

---

## State Management (Redux)

### Slice Pattern (Redux Toolkit)

```typescript
// src/redux/slices/JobOpeningFilterSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface JobOpeningFilterState {
  searchTerm: string;
  status: 'OPEN' | 'CLOSED' | 'DRAFT' | '';
  sortBy: 'date' | 'salary' | 'relevance';
  limit: number;
  offset: number;
}

const initialState: JobOpeningFilterState = {
  searchTerm: '',
  status: '',
  sortBy: 'date',
  limit: 10,
  offset: 0,
};

export const JobOpeningFilterSlice = createSlice({
  name: 'jobOpeningFilter',
  initialState,
  reducers: {
    setSearchTerm: (state, action: PayloadAction<string>) => {
      state.searchTerm = action.payload;
      state.offset = 0; // Reset pagination on new search
    },
    setStatus: (state, action: PayloadAction<string>) => {
      state.status = action.payload as any;
      state.offset = 0;
    },
    setSortBy: (state, action: PayloadAction<'date' | 'salary' | 'relevance'>) => {
      state.sortBy = action.payload;
    },
    setOffset: (state, action: PayloadAction<number>) => {
      state.offset = action.payload;
    },
  },
});

export const { setSearchTerm, setStatus, setSortBy, setOffset } = JobOpeningFilterSlice.actions;
export default JobOpeningFilterSlice.reducer;
```

### Usage in Components

```typescript
import { useSelector, useDispatch } from 'react-redux';
import { setSearchTerm, setStatus } from 'src/redux/slices/JobOpeningFilterSlice';
import type { RootState } from 'src/redux/provider/store';

export const JobOpeningFilter: React.FC = () => {
  const dispatch = useDispatch();
  const filters = useSelector((state: RootState) => state.jobOpeningFilter);

  return (
    <div>
      <input
        value={filters.searchTerm}
        onChange={(e) => dispatch(setSearchTerm(e.target.value))}
        placeholder="Search jobs..."
      />
      <select
        value={filters.status}
        onChange={(e) => dispatch(setStatus(e.target.value))}
      >
        <option value="">All Status</option>
        <option value="OPEN">Open</option>
        <option value="CLOSED">Closed</option>
        <option value="DRAFT">Draft</option>
      </select>
    </div>
  );
};
```

### Persistence Pattern

Only `LoginSlice` is persisted:

```typescript
// src/redux/provider/store.ts
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import LoginSlice from '../slices/LoginSlice';

const persistConfig = {
  key: 'cfp-root',
  storage,
  whitelist: ['login'], // Only persist LoginSlice
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  // ...
});

export const persistor = persistStore(store);
```

---

## Testing Strategy (Phase 2)

### Test File Organization

```
tests/
├── setup.ts                 # Vitest + MSW configuration
├── fixtures/
│   ├── users.fixture.ts    # Factory: createMockUser()
│   └── jobs.fixture.ts     # Factory: createMockJobOpening()
├── utils/
│   ├── render.tsx          # Custom render with Redux + Router
│   └── testHelpers.ts      # Common test utilities
├── utils/                  # Unit tests
│   ├── auth.utils.test.ts
│   ├── validators.test.ts
│   └── formatters.test.ts
├── hooks/                  # Hook tests
│   ├── useHasAccess.test.ts
│   └── useCandidateFilter.test.ts
├── components/             # Component tests
│   ├── PrivateRoute.test.tsx
│   └── [Component].test.tsx
└── integration/            # Full flow tests
    ├── loginFlow.test.ts
    └── jobCreationFlow.test.ts
```

### Unit Test Example

```typescript
// tests/utils/validators.test.ts
import { describe, it, expect } from 'vitest';
import { isValidEmail, isValidPhone } from 'src/shared/utils/validation/validators';

describe('Email validation', () => {
  it('should accept valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user+tag@domain.co.uk')).toBe(true);
  });

  it('should reject invalid emails', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('Phone validation', () => {
  it('should accept 10-digit phone numbers', () => {
    expect(isValidPhone('9876543210')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('abc')).toBe(false);
  });
});
```

### Component Test Example

```typescript
// tests/components/PrivateRoute.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrivateRoute } from 'src/components/PrivateRoute';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from 'src/redux/provider/store';

describe('PrivateRoute', () => {
  it('should render component when authenticated', () => {
    render(
      <Provider store={store}>
        <BrowserRouter>
          <PrivateRoute>
            <div>Protected Content</div>
          </PrivateRoute>
        </BrowserRouter>
      </Provider>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
```

### MSW Mock Setup

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('*/api/v1/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string };

    return HttpResponse.json({
      token: 'mock-token',
      user: {
        id: '1',
        email: body.email,
        role: 'CANDIDATE',
      },
    });
  }),

  http.get('*/api/v1/jobs', () => {
    return HttpResponse.json({
      data: [createMockJobOpening(), createMockJobOpening({ title: 'Senior Dev' })],
    });
  }),
];
```

---

## Code Quality Standards

### Linting Rules (ESLint)

Run before commit:

```bash
npm run lint                # Check for issues
npm run lint -- --fix      # Auto-fix issues
```

**Key rules**:

- ❌ No `any` types (strict mode)
- ❌ No commented code blocks
- ❌ No unused imports
- ❌ No unused variables
- ❌ All components need key prop in loops
- ❌ Form inputs must have associated labels
- ❌ Images must have alt attributes
- ✅ Function parameters typed
- ✅ Function return types specified
- ✅ 80 character line length (soft limit)

### TypeScript Compilation

```bash
npm run build  # Checks for TypeScript errors
```

**Must pass with 0 errors** before committing. If build fails:

```bash
# Check specific file
npx tsc --noEmit src/components/MyComponent.tsx
```

### Testing Coverage

Target: **40%+ code coverage** for Phase 2+

```bash
npm test -- --coverage

# Coverage report breakdown:
# - Statements: 40%+
# - Branches: 30%+
# - Functions: 40%+
# - Lines: 40%+
```

### Commit Message Standards

Follow conventional commits:

```
feat(jobs): add job listing filter by location
fix(auth): handle expired token refresh properly
refactor(components): split JobsOpening into subcomponents
test(auth): add login flow integration test
docs(README): update installation instructions
style(css): align button spacing

[no-ci]
BREAKING CHANGE: Changed JobOpening API response structure
```

---

## Typography Standardization Strategy

To ensure a premium and uniform aesthetic, CareerForcePro enforces a strict typographic hierarchy. Standardizing typography prevents the usage of arbitrary font sizes, line heights, and styles scattered across codebases.

### 1. Unified Fonts Stack

We utilize three primary font families declared within our `@theme` Tailwind config:

- **Sora (`font-sora`)**: Applied exclusively for headings (`h1` through `h6`) and prominent subtitles. Sora features an expressive geometric structure that enhances headings.
- **Roboto (`font-roboto`)**: Applied for body copy, textareas, inputs, tooltips, and dense informational layouts. Roboto is selected for legibility in dense text.
- **DM Sans (`font-dm-sans`)**: Reserved for specific brand accents, stats counters, or alternative component-specific tags.

### 2. The `<Typography />` Component

Instead of writing raw `<p>`, `<span>`, or `<h1>` tags with hardcoded class names, developers must use the polymorphic `<Typography />` component from `src/components/shared`.

#### Typography Variants Mapping

| Variant Name | Default Tag | Font Family | Tailwind Classes Applied                                                | Usage                           |
| :----------- | :---------- | :---------- | :---------------------------------------------------------------------- | :------------------------------ |
| `h1`         | `<h1>`      | Sora        | `font-sora font-bold text-4xl md:text-5xl tracking-tight leading-tight` | Landing hero headings           |
| `h2`         | `<h2>`      | Sora        | `font-sora font-bold text-3xl md:text-4xl tracking-tight leading-snug`  | Major section headings          |
| `h3`         | `<h3>`      | Sora        | `font-sora font-semibold text-2xl md:text-3xl leading-snug`             | Sub-sections / Card headings    |
| `h4`         | `<h4>`      | Sora        | `font-sora font-semibold text-xl md:text-2xl leading-normal`            | Form groups / Modals headers    |
| `h5`         | `<h5>`      | Sora        | `font-sora font-medium text-lg md:text-xl leading-normal`               | Small headers / Widget titles   |
| `h6`         | `<h6>`      | Sora        | `font-sora font-medium text-base md:text-lg leading-normal`             | Micro-headers / Metadata groups |
| `body1`      | `<p>`       | Roboto      | `font-roboto font-normal text-base leading-relaxed`                     | Main paragraphs, descriptions   |
| `body2`      | `<p>`       | Roboto      | `font-roboto font-normal text-sm leading-relaxed`                       | Sidebar copy, dense table cells |
| `subtitle1`  | `<span>`    | Sora        | `font-sora font-medium text-base leading-normal`                        | Bold list headers / callouts    |
| `subtitle2`  | `<span>`    | Sora        | `font-sora font-medium text-sm leading-normal`                          | Input labels, action triggers   |
| `caption`    | `<span>`    | Roboto      | `font-roboto font-normal text-xs leading-normal text-gray-500`          | Hint texts, date stamps         |
| `button`     | `<span>`    | Roboto      | `font-roboto font-semibold text-sm tracking-wider uppercase`            | Buttons, badge labels           |
| `overline`   | `<span>`    | Roboto      | `font-roboto font-medium text-[10px] tracking-widest uppercase`         | Category flags, eye-brows       |

#### Code Examples

```typescript
import { Typography } from 'src/components/shared';

// Renders <h2> with Sora font
<Typography variant="h2">Candidate Evaluation Profile</Typography>

// Overriding the Semantic HTML Tag (using the "as" prop)
<Typography variant="h4" as="span" color="primary">
  Action Required
</Typography>
```

---

## AI Agent Workplace Rules & Workflows

To ensure seamless pairing, AI agents operating on this repository must adhere to the following rules:

### 1. Mandatory Pre-Flight Research Check

- **Check Knowledge Item Summaries**: Always read the KI summaries and artifact snapshots presented at the start of the session _before_ creating implementation designs or writing source code. Do not duplicate patterns.
- **Inspect Current Implementations**: Trace related files before performing code writes. Do not rely entirely on summaries; compare with active codebase state.

### 2. Implementation Planning Workflow

- **Plan Prior to Execution**: Create or update `implementation_plan.md` outlining functional architecture, new file templates, and test verification targets.
- **Component Size Check**: Strict component size rules require parent files to stay below **200 LOC**. When designing files, split sub-components (such as list item rows, buttons, inputs, form components) into separate files in the same directory.
- **Obtain Authorization**: Never perform write modifications to source files before receiving user confirmation/approval of the implementation plan.

### 3. Execution & Verification Quality Checks

- **TypeScript Validation**: Always run verification builds (`npx tsc -b`) to guarantee that no compiler or type safety issues remain.
- **Zero Swallowed Errors**: Ensure promise catches and errors are explicitly handled and mapped to display toast notifications.
- **Absolute Imports**: Always use absolute paths (`src/...`) for imports instead of relative paths (`../../`).

---

## Common Workflows

### 1. Adding a New Feature (Complete Flow)

#### Step 1: Create API Endpoint

```typescript
// src/api/NewFeature/index.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { NewFeatureItem } from 'src/types';
import { BASE_URL } from 'src/constants/webAPI';

export const newFeatureApi = createApi({
  reducerPath: 'newFeatureApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL }),
  tagTypes: ['NewFeature'],
  endpoints: (builder) => ({
    getItems: builder.query<NewFeatureItem[], void>({
      query: () => '/new-feature',
      providesTags: ['NewFeature'],
    }),
  }),
});

export const { useGetItemsQuery } = newFeatureApi;
```

#### Step 2: Add Redux Slice (if needed)

```typescript
// src/redux/slices/NewFeatureSlice.ts
import { createSlice } from '@reduxjs/toolkit';

export const NewFeatureSlice = createSlice({
  name: 'newFeature',
  initialState: {
    /* state */
  },
  reducers: {
    /* actions */
  },
});
```

#### Step 3: Create Page Component

```typescript
// src/pages/NewFeaturePage/index.tsx
import { useGetItemsQuery } from 'src/api/NewFeature';

export const NewFeaturePage: React.FC = () => {
  const { data, isLoading, error } = useGetItemsQuery();
  // Implementation
};
```

#### Step 4: Add Route

```typescript
// src/routes.tsx
import { lazy } from 'react';

const NewFeaturePage = lazy(() => import('src/pages/NewFeaturePage'));

export const routes: RouteObject[] = [
  {
    path: '/new-feature',
    element: <PrivateRoute><NewFeaturePage /></PrivateRoute>,
    errorElement: <ErrorPage />
  }
];
```

#### Step 5: Write Tests

```typescript
// tests/components/NewFeaturePage.test.tsx
describe('NewFeaturePage', () => {
  it('should display items', async () => {
    // Setup MSW handler
    // Render component
    // Assert display
  });
});
```

### 2. Refactoring Large Components

**Target**: 200 LOC max per component

```typescript
// Before: JobsOpening/index.tsx (450+ LOC)
export const JobsOpening = () => {
  // Filters logic (100 LOC)
  // List rendering (150 LOC)
  // Actions (80 LOC)
  // Modals (120 LOC)
};

// After: Split into:
JobsOpening/
├── index.tsx (100 LOC - orchestrator)
├── JobOpeningsList.tsx (150 LOC)
├── JobOpeningFilters.tsx (80 LOC)
├── JobOpeningActions.tsx (80 LOC)
└── hooks/
    └── useJobOpeningFilters.ts (30 LOC)
```

### 3. Adding Form Validation

1. Add schema to `validationSchemas.ts`
2. Create form builder in `formBuilder.ts` (optional)
3. Use in component with `useForm + zodResolver`
4. Test with Vitest

---

## Troubleshooting

### Build Fails with TypeScript Errors

```bash
# Check all errors
npm run build 2>&1 | head -50

# Check specific file
npx tsc --noEmit src/components/MyComponent.tsx

# Fix common issues
# - Add explicit types to function parameters
# - Add return types to functions
# - Import types explicitly (import type { User })
```

### Linting Errors Won't Fix

```bash
# Auto-fix what's possible
npm run lint -- --fix

# Check remaining issues
npm run lint | grep "error"

# Common manual fixes:
# - Add missing alt attributes to images
# - Add labels to form inputs
# - Remove commented code blocks
# - Remove unused variables
```

### RTK Query Not Caching Results

**Issue**: useGetItemsQuery() calls API every time

**Solution**: Check tag invalidation

```typescript
// ✅ Correct: Mutation invalidates tag
createJobOpening: builder.mutation({
  // ...
  invalidatesTags: ['JobOpening'], // ← This is required
});

// ❌ Wrong: No invalidation
createJobOpening: builder.mutation({
  // ...
});
```

### Form Validation Not Working

**Issue**: Form errors not showing

**Solution**:

```typescript
// ✅ Correct
const {
  formState: { errors },
} = useForm({
  resolver: zodResolver(schema), // ← resolver required
});

// ❌ Wrong
const {
  formState: { errors },
} = useForm(); // No resolver
```

### 401 Errors After Token Refresh

**Issue**: Still getting 401 after refresh

**Solution**: Check token refresh logic

```typescript
// In api/index.ts, ensure:
// 1. Token stored in localStorage under correct key
// 2. Refresh endpoint returns new token
// 3. Base query prepareHeaders uses fresh token
// 4. 401 triggers refresh before retrying
```

---

## Resources & References

### Essential Documentation

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Redux Toolkit Docs](https://redux-toolkit.js.org/)
- [RTK Query Docs](https://redux-toolkit.js.org/rtk-query/overview)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Ant Design](https://ant.design/)

### Key Architecture Files

- **Router**: [src/routes.tsx](../src/routes.tsx)
- **Redux Store**: [src/redux/provider/store.ts](../src/redux/provider/store.ts)
- **API Setup**: [src/api/index.ts](../src/api/index.ts)
- **Auth Service**: [src/services/AuthService.ts](../src/services/AuthService.ts)
- **App Entry**: [src/App.tsx](../src/App.tsx)

---

## Contributing

### Before Submitting a PR:

- [ ] Code follows naming conventions (this guide)
- [ ] TypeScript strict mode: `npm run build` passes with 0 errors
- [ ] Linting: `npm run lint` has <50 warnings
- [ ] Tests added: `npm test` passes with 40%+ coverage
- [ ] Commit message follows conventional commits
- [ ] No hardcoded values (all in constants)
- [ ] Components <200 LOC (split if needed)
- [ ] All imports use absolute paths (`src/...`)
- [ ] API calls use RTK Query (not axios directly)
- [ ] Error handling added (try/catch, error states)

---

**Maintained By**: CareerForcePro Dev Team  
**Last Updated**: January 27, 2026  
**Phase**: 2 (Form Patterns, Testing, Consolidation)

For questions or updates, contact the development team or create a GitHub issue.
