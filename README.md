# CareerForcePro Web

A modern hiring platform built with React 19 and TypeScript, enabling real-time video interviews, AI-powered candidate screening, and comprehensive job management.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Project Structure](#project-structure)
- [Key Concepts](#key-concepts)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## 📱 Project Overview

**CareerForcePro** is a comprehensive hiring and recruitment platform designed to streamline the interview process for organizations, hiring managers, recruiters, and candidates. The frontend talks to a backend microservices monorepo — each domain (auth, org, jobs, candidates, interviews, notifications, AI) is its own service, and `src/api/` mirrors that boundary (see [Project Structure](#project-structure)).

### 🎯 Target Users

- **Organization Owners** - Manage hiring managers, recruiters, and platform settings
- **Hiring Managers** - Create job openings, manage candidates, conduct interviews
- **Recruiters** - Source candidates, manage pipelines, coordinate with hiring managers
- **Candidates** - Apply for jobs, participate in interviews, track application status

### ✨ Key Features

- **AI-Powered Questions** - Automatically generate interview questions based on job descriptions
- **Real-Time Video Interviews** - Conduct live interviews with video, audio, and screen sharing via LiveKit
- **ATS Integration** - Sync job openings with external ATS systems
- **Bulk Candidate Management** - Import, filter, and manage large candidate databases
- **Smart Candidate Filtering** - Search and filter candidates by multiple criteria
- **Interview Scheduling** - Calendar integration for interview scheduling
- **Feedback & Analytics** - Collect interview feedback and view hiring metrics
- **Rich Text Descriptions** - Create detailed job descriptions with rich text editor
- **Multi-Role Dashboards** - Role-specific dashboards with relevant data and actions

---

## 🛠 Tech Stack

### Frontend Framework

- **React 19** - Latest React with concurrent features
- **TypeScript** - Full type safety with strict mode enabled
- **Vite 6** - Fast build tool with React SWC compiler
- **React Router v7** - Client-side routing with lazy loading and Suspense

### State Management & Data

- **Redux Toolkit** - State management with Immer for immutable updates
- **RTK Query** - Built-in data fetching and caching on top of Redux
- **redux-persist** - Selective state persistence (`LoginSlice`, `JobSlice`, `EditJobSlice` persisted)

### Styling & UI

- **Tailwind CSS v4** - Utility-first CSS framework with PostCSS
- **Ant Design v5** - Enterprise-grade UI component library
- **PostCSS** - CSS transformation and optimization

### Real-Time Communication

- **LiveKit** (`livekit-client`, `@livekit/components-react`) - Video/audio interviews and screen sharing. The earlier Agora implementation has been fully retired — see `useLiveKit` under [Key Concepts](#key-concepts).

### Content & Validation

- **Draft.js** - Rich text editor for job descriptions and feedback
- **Zod** - TypeScript-first schema validation
- **react-hook-form** - Performant form handling with validation

### Additional Libraries

- **Axios** - HTTP client for API requests
- **dayjs** - Date manipulation and formatting
- **lodash-es** - Utility functions for common operations
- **React Icons** - Icon library
- **React Toastify** - Toast notifications
- **Recharts** - Data visualization and charts
- **React PDF Viewer** - PDF document viewing
- **FFmpeg.wasm** - Client-side video processing (optional)
- **Crypto-JS** - Client-side encryption utilities

### Tooling

- **ESLint 9 + Prettier** - Linting and formatting (`npm run lint`, `npm run format`)
- **Husky** - Git hooks (installed automatically via the `prepare` script)
- **Vitest** - Unit/component testing, jsdom environment, coverage via `@vitest/coverage-v8`

---

## 📋 Prerequisites

### Required

- **Node.js** - v18.x or higher (check your installed version with `node --version`)
- **npm** - v9.x or higher (or yarn v3.x+)
- **Git** - For version control

### External Services (Optional for Development)

- **Backend services** - The relevant microservices running locally (see [Environment Variables](#environment-variables)) or a shared dev environment
- **LiveKit Server** - For video interview functionality (connection details are issued per-interview by `interview-service`, not configured statically here)
- **ATS Provider** - For ATS integration (Workable, iCIMS, etc.)

### Development Environment

- Code editor (VS Code recommended)
- Modern browser (Chrome, Firefox, Safari, or Edge)
- Terminal/Command line access

---

## 🚀 Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/Netsmartz-IT-Solutions/CFPro_frontend.git
cd CFPro_frontend
```

### 2. Install Dependencies

```bash
npm install
```

This also runs `husky` (via the `prepare` script) to install git hooks.

### 3. Environment Configuration

Create a `.env.local` file in the root directory (Vite reads `.env.local` at dev-server startup only — restart `npm run dev` after changing it):

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration — see [Environment Variables](#environment-variables) for the full list; at minimum you'll want the per-service endpoint URLs pointed at whichever backend services you're running locally.

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

---

## 🔐 Environment Variables

The backend is a microservices monorepo, so the frontend targets each service by its own base URL rather than one shared backend endpoint. See `.env.example` for the authoritative, up-to-date list.

### Backend service endpoints

| Variable                            | Description                          |
| ------------------------------------ | ------------------------------------- |
| `VITE_BACKEND_ENDPOINT`             | Fallback/shared backend base URL      |
| `VITE_BACKEND_PREFIX`               | API path prefix (e.g. `/api/v1`)      |
| `VITE_AUTH_SERVICE_ENDPOINT`        | authentication-service base URL       |
| `VITE_ORG_SERVICE_ENDPOINT`         | organization-service base URL         |
| `VITE_JOB_SERVICE_ENDPOINT`         | job-service base URL                  |
| `VITE_CANDIDATE_SERVICE_ENDPOINT`   | candidate-service base URL            |
| `VITE_INTERVIEW_SERVICE_ENDPOINT`   | interview-service base URL            |
| `VITE_NOTIFICATION_SERVICE_ENDPOINT`| notification-service base URL         |
| `VITE_AI_SERVICE_ENDPOINT`          | ai-service base URL                   |

Each API module under `src/api/` is wired to its own service's endpoint — see [Project Structure](#project-structure). Pointing the wrong var at the wrong port is a common source of confusing 401s (see [Troubleshooting](#troubleshooting)).

### Other variables

| Variable                       | Description                                            |
| ------------------------------- | -------------------------------------------------------- |
| `VITE_NYLAS_CLIENT_ID`          | Nylas calendar integration client id                     |
| `VITE_RECAPTCHA_SITE_KEY`       | reCAPTCHA site key                                        |
| `VITE_INTERVIEW_FEEDBACK_FEATURE` | Feature flag                                            |
| `VITE_VIDEO_CONSENT_FEATURE`    | Feature flag                                              |
| `VITE_NYLAS_FEATURE`            | Feature flag                                               |
| `VITE_BYPASS_AUTH`              | Dev-only auth bypass — never set this outside local dev   |

`VITE_AGORA_APP_ID`/`VITE_TEMP_TOKEN`/`VITE_CHANNEL_NAME` still appear in `.env.example` but are dead — no Agora SDK code remains in `src/` (LiveKit fully replaced it). LiveKit connection details come from `interview-service` per interview, not from a static `VITE_LIVEKIT_*` var.

### Development Tips

- Use `.env.local` for personal overrides (not committed to git)
- Vite only reads `.env.local` at dev-server **startup** — changing it requires a restart, not just a save
- Reference `.env.example` for the full, current variable list

---

## 👨‍💻 Development

### Available Scripts

| Script | Command | What it does |
| --- | --- | --- |
| `npm run dev` | `vite` | Starts the Vite dev server with HMR at `http://localhost:5173` |
| `npm run build` | `tsc -b && vite build` | Type-checks, then builds to `dist/` |
| `npm run preview` | `vite preview` | Serves the production build locally |
| `npm run lint` | `eslint .` | Lints the whole project |
| `npm test` | `vitest run` | Runs the test suite once |
| `npm run test:watch` | `vitest` | Runs tests in watch mode |
| `npm run test:coverage` | `vitest run --coverage` | Runs tests with coverage (v8 provider) |
| `npm run format` | `prettier --write .` | Formats the whole project |
| `npm run format:check` | `prettier --check .` | Checks formatting without writing |
| `npm run format:src` | `prettier --write src/` | Formats only `src/` |
| `npm run format:fix-all` | `prettier --write . && eslint . --fix` | Formats, then auto-fixes lint issues |

### Development Workflow

Branches flow `feature/* → dev → staging → production` (there is no `main` branch).

1. Create feature branch from `dev`

   ```bash
   git checkout dev
   git checkout -b feature/your-feature-name
   ```

2. Make changes and commit regularly

   ```bash
   git add .
   git commit -m "feat: add awesome feature"
   ```

3. Run linter and formatter before pushing

   ```bash
   npm run lint
   npm run format:check
   ```

4. Push and open a pull request against `dev`
   ```bash
   git push origin feature/your-feature-name
   ```

---

## 📁 Project Structure

```
CFPro_frontend/
├── src/
│   ├── api/                 # RTK Query endpoints, organized by BACKEND MICROSERVICE
│   │   ├── authentication-service/
│   │   ├── organization-service/
│   │   ├── job-service/
│   │   ├── candidate-service/
│   │   ├── interview-service/
│   │   ├── notification-service/
│   │   ├── ai-service/
│   │   ├── ...                    # remaining service folders
│   │   └── index.ts         # Base query configuration with auth
│   │
│   ├── components/          # Reusable React components (feature-based)
│   │   ├── Dashboard/
│   │   ├── JobsOpening/
│   │   ├── Candidates/
│   │   ├── Interview/       # LiveKit interview UI (InterviewLiveKit.tsx, VideoGridLiveKit.tsx)
│   │   ├── InterviewUser/
│   │   └── ...
│   │
│   ├── pages/                # Page components (lazy-loaded in routes.tsx)
│   ├── layouts/               # Layout wrappers for page sections
│   ├── redux/                 # Redux store, slices, and reducers
│   │   ├── provider/          # Store configuration with redux-persist
│   │   ├── slices/            # Feature-specific state slices
│   │   └── reducers/          # Root reducer
│   │
│   ├── services/              # Business logic and external integrations
│   │   ├── AuthService.ts     # Token refresh, login verification
│   │   ├── SessionService.ts
│   │   └── WebsocketService.ts
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── useLiveKit.tsx     # Video interview state (replaces the old useAgora)
│   │   ├── useHasAccess.tsx   # Role-based access control
│   │   └── ...
│   │
│   ├── helpers/                # Utility functions and helpers
│   ├── constants/               # Application constants and enums
│   ├── types/                    # TypeScript type definitions
│   ├── shared/                    # Shared components/utilities (top-level, distinct from components/shared)
│   ├── data/                       # Static/reference data
│   ├── assets/                      # Static assets (images, SVGs, etc.)
│   ├── config/                       # Configuration files
│   ├── theme/                         # Theme configuration
│   ├── routes.tsx                      # Route definitions with lazy loading
│   ├── App.tsx                          # Root app component
│   └── main.tsx                          # Entry point
│
├── public/                  # Static files served as-is
├── tests/                   # Test files (Vitest, jsdom) — components/, helpers/, redux/, shared/, setup.ts
├── docs/                    # Architecture, design system, and integration docs — see Documentation below
├── .github/                 # GitHub configuration (copilot-instructions.md, prompts/)
│
├── vite.config.ts           # Vite + Vitest configuration
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── eslint.config.js         # ESLint configuration
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

### Key Directories Explained

#### `/api`

Contains RTK Query endpoint definitions, one folder per backend microservice (`job-service/`, `candidate-service/`, etc. — see [STRUCTURE_MAPPING.md](docs/STRUCTURE_MAPPING.md) for the full rationale). Each folder has an `index.ts` (or per-feature files) exporting auto-generated hooks, base-querying that service's own `VITE_*_SERVICE_ENDPOINT`.

```typescript
// src/api/job-service/jobOpeningApi.ts (illustrative)
const jobOpeningApi = createApi({
  reducerPath: 'jobOpeningApi',
  baseQuery: fetchBaseQuery({ baseUrl: JOB_SERVICE_BASE_URL, prepareHeaders: ... }),
  endpoints: (builder) => ({
    getJobOpenings: builder.query(...),
    createJobOpening: builder.mutation(...)
  })
})
export const { useGetJobOpeningsQuery, useCreateJobOpeningMutation } = jobOpeningApi
```

#### `/redux`

Redux Toolkit slices for state management. `redux-persist`'s whitelist currently covers `LoginSlice`, `JobSlice`, and `EditJobSlice`.

```typescript
// Usage in components
import { useDispatch } from 'react-redux';

const dispatch = useDispatch();
dispatch(loginStore({ token, authorities, role, rememberMe }));
```

#### `/services`

Business logic services separate from components.

```typescript
// src/services/AuthService.ts
export const handleRefreshToken = async () => { ... } // 401 -> silent refresh + retry
// src/api/authentication-service/Login/login.ts
export const { useLoginMutation } = extendedApi;
```

---

## 🔑 Key Concepts

### Authentication & Authorization

**Token Flow:**

1. User logs in → `authentication-service` returns `accessToken` + `refreshToken`
2. Tokens stored in localStorage with keys: `cfp_atoken`, `cfp_rtoken`, `cfp_itoken`, `cfp_user`
3. All API requests include `Authorization: Bearer ${token}` header (except login/forgot-password)
4. When 401 error occurs → `handleRefreshToken()` auto-refreshes and retries request
5. Special handling for `ACCOUNT_INACTIVE` status → Force logout and redirect

```typescript
// Example: Token verification
import { verifyAuthToken } from './helpers';

if (!verifyAuthToken()) {
  navigate('/login');
}
```

### State Management with Redux Toolkit

**Store Structure:**

```typescript
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['LoginSlice', 'JobSlice', 'EditJobSlice'], // ← only these persist
};
```

**Using State:**

```typescript
import { useDispatch, useSelector } from 'react-redux';

const MyComponent = () => {
  const dispatch = useDispatch();
  const { token, authorities } = useSelector((state) => state.LoginSlice);

  // Dispatch action
  dispatch(jobOpeningFilterSlice.actions.setJobOpeningFilters(filterData));
};
```

### Data Fetching with RTK Query

**Create API Endpoint:**

```typescript
// src/api/job-service/jobOpeningApi.ts
const jobOpeningApi = createApi({
  reducerPath: 'jobOpeningApi',
  baseQuery: fetchBaseQuery({ baseUrl: JOB_SERVICE_BASE_URL, prepareHeaders: ... }),
  tagTypes: ['JobOpening'],
  endpoints: (builder) => ({
    getJobOpenings: builder.query({
      query: (params) => ({ url: '/job-openings', params })
    }),
    createJobOpening: builder.mutation({
      query: (data) => ({
        url: '/job-openings',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['JobOpening']
    })
  })
})

export const { useGetJobOpeningsQuery, useCreateJobOpeningMutation } = jobOpeningApi
```

**Use in Component:**

```typescript
const MyComponent = () => {
  const { data, isLoading, error } = useGetJobOpeningsQuery({ page: 1, size: 10 });
  const [createJobOpening] = useCreateJobOpeningMutation();

  const handleCreate = async (jobData) => {
    try {
      const result = await createJobOpening(jobData).unwrap();
      // Handle success
    } catch (error) {
      // Handle error
    }
  };
};
```

### Lazy Loading & Suspense

Pages are lazy-loaded for better initial load time:

```typescript
// src/routes.tsx
const DashboardPage = lazy(() => import('./pages/Dashboard'))

// In Routes:
{
  path: '/dashboard',
  element: (
    <Suspense fallback={<Loader />}>
      <DashboardPage />
    </Suspense>
  )
}
```

### Form Handling

Use `react-hook-form` with Zod validation:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { jobDetailsSchema } from './components/JobsOpening/AddJobDescription/AddJobSchema'

const MyForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(jobDetailsSchema)
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('jobProfileCode')} />
      {errors.jobProfileCode && <span>{errors.jobProfileCode.message}</span>}
    </form>
  )
}
```

### Role-Based Access Control

```typescript
import useHasAccess from '../../hooks/useHasAccess'
import { Authorities } from '../../constants/authorities.constant'

const AdminFeature = () => {
  const hasAccess = useHasAccess(Authorities.ROLE_CREATE)

  if (!hasAccess) {
    return <div>Access Denied</div>
  }

  return <div>Admin Content</div>
}
```

### Video Interview Integration (LiveKit)

The Agora implementation has been fully retired — `useLiveKit` is the only video-interview hook now:

```typescript
import { useLiveKit } from './hooks/useLiveKit';

const InterviewComponent = () => {
  const {
    localParticipant,
    remoteParticipants,
    connectionState,
    mediaState,
    isConnected,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    error,
  } = useLiveKit();

  // Rendered inside a LiveKit <LiveKitRoom> context (see InterviewLiveKit.tsx)
  return (
    <div>
      {/* Video UI */}
    </div>
  )
}
```

---

## 🧪 Testing

### Test Framework

- **Vitest** (jsdom environment) - configured directly in `vite.config.ts`'s `test` block, no separate `vitest.config.ts`
- **Tests Location** - top-level `tests/` directory (`components/`, `helpers/`, `redux/`, `shared/`, `setup.ts`), not colocated with source
- **Coverage** - `@vitest/coverage-v8`, text + HTML reporters

### Run Tests

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

### Write Tests

```typescript
// tests/helpers/validatePhoneNumber.test.ts
import { describe, it, expect } from 'vitest';
import { validatePhoneNumber } from '../../src/helpers';

describe('validatePhoneNumber', () => {
  it('should validate correct phone formats', () => {
    expect(validatePhoneNumber('(123) 456-7890')).toBe(true);
    expect(validatePhoneNumber('123-456-7890')).toBe(true);
    expect(validatePhoneNumber('1234567890')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(validatePhoneNumber('invalid')).toBe(false);
  });
});
```

---

## 🐛 Troubleshooting

### Token & Authentication Issues

#### "Unauthorized" or 401 Errors

1. Check that tokens are stored in localStorage
   ```javascript
   console.log(localStorage.getItem('cfp_atoken'));
   ```
2. Verify token hasn't expired
3. Check the relevant `VITE_*_SERVICE_ENDPOINT` is correct in `.env.local`, and that you restarted `npm run dev` after changing it
4. Verify `Authorization` header is sent with requests

#### "Account Inactive" Error

1. Contact admin to reactivate your account
2. Check if login credentials are correct
3. Verify you're using correct environment (dev/staging/production)

#### CORS Errors / Every auth-service Call Fails, No Useful Error

authentication-service's CORS allowlist only names `http://localhost:5173`, not
`http://127.0.0.1:5173` — the browser treats those as different origins even
though they reach the same dev server. If you opened the app at
`http://127.0.0.1:5173`, every request to auth-service is blocked by the
browser before it even shows up as a normal 401/network error. Use the
`http://localhost:5173` URL from `npm run dev`'s output instead.

### Build & Development Issues

#### Build Fails with "Type Error"

```bash
npm run build
```

Fix any TypeScript errors shown. Strict mode enabled - all types must be explicit.

#### Module Not Found Errors

- Check import paths are correct (relative to `src/`)
- Verify files weren't accidentally deleted
- Run `npm install` if dependencies issue

#### Port Already in Use (5173)

```bash
# Kill process on port 5173
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5173 | xargs kill -9
```

### Video Interview Issues

#### Video Connection Fails

1. Check internet connection
2. Confirm `interview-service` (which issues LiveKit connection details per interview) is reachable at `VITE_INTERVIEW_SERVICE_ENDPOINT`
3. Check browser permissions for camera/microphone
4. Try a different browser (Chrome, Firefox recommended)

#### Screen Share Not Working

1. Some browsers require HTTPS for screen share
2. Check if app is running over HTTPS in production
3. Verify user has appropriate role to start screen share

### API Connection Issues

#### "Cannot reach backend" Error

1. Verify the relevant backend service is running
2. Check the matching `VITE_*_SERVICE_ENDPOINT` in `.env.local`
3. Check network connectivity
4. Try with ngrok if behind a proxy (add header: `ngrok-skip-browser-warning: true`)

#### CORS Errors

1. Backend should include proper CORS headers
2. Verify backend allows requests from the frontend's actual origin (`http://localhost:5173`)

### Performance Issues

#### Slow Page Load

1. Check Network tab in DevTools
2. Look for slow API requests
3. Verify no large bundle size (run `npm run build`)
4. Check localStorage isn't too large

#### Memory Leaks

1. Check DevTools Memory tab
2. Verify LiveKit/WebSocket connections are closed on unmount
3. Ensure event listeners are cleaned up
4. Check no circular references in Redux

---

## 📚 Documentation

Deeper docs live in [`docs/`](docs/):

| File | What it covers |
| --- | --- |
| [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) | Architecture, strict code patterns, naming conventions, API/Redux/form patterns, testing strategy, and common workflows. |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Color, typography, spacing, and component design tokens reverse-engineered from the Figma redesign reference. |
| [STRUCTURE_MAPPING.md](docs/STRUCTURE_MAPPING.md) | Why `src/api/` is organized by backend microservice boundary, and what moved where. |
| [ORGANIZATION_SERVICE_INTEGRATION.md](docs/ORGANIZATION_SERVICE_INTEGRATION.md) | Change log of wiring the frontend to the real `organization-service` backend (phases, bug fixes, known backend gaps). |
| [CANDIDATE_SERVICE_INTEGRATION.md](docs/CANDIDATE_SERVICE_INTEGRATION.md) | Change log of wiring the frontend to the real `candidate-service` backend (phases, bug fixes, known backend gaps). |

Not in `docs/`, on purpose — moving these would break tooling that reads them from a fixed location:

- [`.github/copilot-instructions.md`](.github/copilot-instructions.md) — read directly by GitHub Copilot.
- [`.agents/rules/`](.agents/rules/) — read directly by AI agent tooling.
- [`public/data/geo/SOURCE.md`](public/data/geo/SOURCE.md) — license/source notes kept next to the geo data files it documents.

---

## 🤝 Contributing

### Code Style

- **TypeScript** - All code must be typed (no `any` unless unavoidable)
- **ESLint + Prettier** - Run `npm run lint` and `npm run format:check` before committing
- **Naming Conventions:**
  - Components: PascalCase (`UserProfile.tsx`)
  - Utilities: camelCase (`validatePhoneNumber.ts`)
  - Constants: UPPER_SNAKE_CASE (`INACTIVITY_TIMEOUT_MS`)
  - Hooks: Start with `use` prefix (`useHasAccess.tsx`)

### Branch Naming

Base new branches off `dev`, not `main` (this repo has no `main` branch — see [Development Workflow](#development-workflow)).

- Feature: `feature/description`
- Bug fix: `fix/description`
- Refactor: `refactor/description`
- Release: `release/version`

Example: `feature/video-interview-ui`

### Commit Messages

Follow conventional commits:

```
feat: add video interview recording
fix: resolve token refresh timeout issue
docs: update README with setup instructions
refactor: consolidate utility functions
test: add tests for phone validation
```

### Pull Request Process

1. Create feature branch from `dev`
2. Make changes and commit regularly
3. Run `npm run lint` and `npm run format:check`, fix any issues
4. Run `npm run build` to verify the production build
5. Push to GitHub and open a Pull Request against `dev`
6. Describe changes clearly in the PR description
7. Reference related issues (#123)
8. Request review from the team
9. Address review feedback
10. Merge once approved

### Code Review Checklist

- [ ] TypeScript types are correct
- [ ] No unused imports or variables
- [ ] ESLint passes without warnings
- [ ] New functions have JSDoc comments
- [ ] Relevant tests are written/updated
- [ ] No hardcoded values (use constants)
- [ ] Error handling implemented
- [ ] Works with Redux DevTools if state changes
- [ ] Performance optimized (memoization if needed)

---

## 📞 Support & Questions

For issues or questions:

1. Check existing GitHub issues
2. Review this README, [`docs/`](#documentation), and code comments
3. Check `.github/copilot-instructions.md` for architecture details
4. Contact team lead or maintainer

---

## 📄 License

Not yet decided — no license file exists in this repository.

---

**Maintained By:** CareerForcePro Team
