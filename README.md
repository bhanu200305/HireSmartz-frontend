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
- [Contributing](#contributing)

---

## 📱 Project Overview

**CareerForcePro** is a comprehensive hiring and recruitment platform designed to streamline the interview process for organizations, hiring managers, recruiters, and candidates.

### 🎯 Target Users

- **Organization Owners** - Manage hiring managers, recruiters, and platform settings
- **Hiring Managers** - Create job openings, manage candidates, conduct interviews
- **Recruiters** - Source candidates, manage pipelines, coordinate with hiring managers
- **Candidates** - Apply for jobs, participate in interviews, track application status

### ✨ Key Features

- **AI-Powered Questions** - Automatically generate interview questions based on job descriptions
- **Real-Time Video Interviews** - Conduct live interviews with video, audio, and screen sharing
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
- **Vite** - Fast build tool with React SWC compiler
- **React Router v7** - Client-side routing with lazy loading and Suspense

### State Management & Data

- **Redux Toolkit** - State management with Immer for immutable updates
- **RTK Query** - Built-in data fetching and caching on top of Redux
- **redux-persist** - Selective state persistence (LoginSlice persisted)

### Styling & UI

- **Tailwind CSS v4** - Utility-first CSS framework with PostCSS
- **Ant Design v5** - Enterprise-grade UI component library
- **PostCSS** - CSS transformation and optimization

### Real-Time Communication

- **LiveKit SDK** - Video/audio communication and real-time features (migration in progress)
- **WebSocket** - Real-time interview state synchronization

### Content & Validation

- **Draft.js** - Rich text editor for job descriptions and feedback
- **Zod** - TypeScript-first schema validation
- **react-hook-form** - Performant form handling with validation

### Additional Libraries

- **Axios** - HTTP client for API requests
- **dayjs** - Date manipulation and formatting
- **Lodash** - Utility functions for common operations
- **React Icons** - Icon library
- **React Toastify** - Toast notifications
- **Recharts** - Data visualization and charts
- **React PDF Viewer** - PDF document viewing
- **FFmpeg.wasm** - Client-side video processing (optional)
- **Crypto-JS** - Client-side encryption utilities

---

## 📋 Prerequisites

### Required

- **Node.js** - v18.x or higher (check your installed version with `node --version`)
- **npm** - v9.x or higher (or yarn v3.x+)
- **Git** - For version control

### External Services (Optional for Development)

- **Backend API** - Running CareerForcePro backend service
- **LiveKit Server** - For video interview functionality
- **ATS Provider** - For ATS integration (Workable, iCIMS, etc.)

### Development Environment

- Code editor (VS Code recommended)
- Modern browser (Chrome, Firefox, Safari, or Edge)
- Terminal/Command line access

---

## 🚀 Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/netsmartz/careerforcepro-web.git
cd careerforcepro-web
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Backend API Configuration
VITE_BACKEND_ENDPOINT=http://localhost:3000
VITE_BACKEND_PREFIX=/api/v1
VITE_ENV=development

# Optional: LiveKit Configuration (for video interviews)
VITE_LIVEKIT_URL=https://your-livekit-server.com
VITE_LIVEKIT_API_KEY=your-api-key
VITE_LIVEKIT_API_SECRET=your-api-secret

# Optional: Analytics or Monitoring
# VITE_SENTRY_DSN=your-sentry-dsn
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

---

## 🔐 Environment Variables

### Required Variables

| Variable                | Description          | Example                                |
| ----------------------- | -------------------- | -------------------------------------- |
| `VITE_BACKEND_ENDPOINT` | Backend API base URL | `http://localhost:3000`                |
| `VITE_BACKEND_PREFIX`   | API path prefix      | `/api/v1`                              |
| `VITE_ENV`              | Environment name     | `development`, `staging`, `production` |

### Optional Variables

| Variable                  | Description        | Required For     |
| ------------------------- | ------------------ | ---------------- |
| `VITE_LIVEKIT_URL`        | LiveKit server URL | Video interviews |
| `VITE_LIVEKIT_API_KEY`    | LiveKit API key    | Token generation |
| `VITE_LIVEKIT_API_SECRET` | LiveKit API secret | Token generation |

### Development Tips

- Use `.env.local` for personal overrides (not committed to git)
- Never commit `.env` with production credentials
- Reference `.env.example` for all available variables

---

## 👨‍💻 Development

### Available Scripts

#### Start Development Server

```bash
npm run dev
```

Starts Vite dev server with hot module replacement.  
Access at: `http://localhost:5173`

#### Build for Production

```bash
npm run build
```

TypeScript type check + Vite build.  
Output: `dist/` directory ready for deployment.

#### Preview Production Build

```bash
npm run preview
```

Serve production build locally to verify before deployment.

#### Lint Code

```bash
npm run lint
```

Run ESLint with Prettier integration to check code quality.

### Development Workflow

1. Create feature branch from `main`

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make changes and commit regularly

   ```bash
   git add .
   git commit -m "feat: add awesome feature"
   ```

3. Run linter before pushing

   ```bash
   npm run lint
   ```

4. Push and create pull request
   ```bash
   git push origin feature/your-feature-name
   ```

---

## 📁 Project Structure

```
careerforcepro-web/
├── src/
│   ├── api/                 # RTK Query endpoints organized by feature
│   │   ├── Login/
│   │   ├── JobOpening/
│   │   ├── Candidates/
│   │   ├── User/
│   │   └── index.ts         # Base query configuration with auth
│   │
│   ├── components/          # Reusable React components (feature-based)
│   │   ├── Dashboard/
│   │   ├── JobsOpening/
│   │   ├── Candidates/
│   │   ├── Interview/
│   │   ├── shared/          # Shared components and UI utilities
│   │   └── ...
│   │
│   ├── pages/               # Page components (lazy-loaded in routes.tsx)
│   │   ├── LoginPage/
│   │   ├── Dashboard/
│   │   ├── JobsOpening/
│   │   └── ...
│   │
│   ├── layouts/             # Layout wrappers for page sections
│   │   ├── MainLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   ├── AddUserLayout.tsx
│   │   └── JobDetailsLayout.tsx
│   │
│   ├── redux/               # Redux store, slices, and reducers
│   │   ├── provider/        # Store configuration with redux-persist
│   │   ├── slices/          # Feature-specific state slices
│   │   └── reducers/        # Root reducer
│   │
│   ├── services/            # Business logic and external integrations
│   │   ├── AuthService.ts   # Token refresh, login verification
│   │   ├── SessionService.ts
│   │   └── WebsocketService.ts
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useAgora.tsx     # Video interview management (being migrated)
│   │   ├── useAPI.tsx       # Deprecated - use RTK Query instead
│   │   ├── useHasAccess.tsx # Role-based access control
│   │   └── ...
│   │
│   ├── helpers/             # Utility functions and helpers
│   │   ├── localstorage.helpers.ts
│   │   ├── axios.client.ts
│   │   ├── agora.client.ts
│   │   ├── feedback.helpers.ts
│   │   └── index.ts         # Business logic helpers
│   │
│   ├── constants/           # Application constants and enums
│   │   ├── authorities.constant.ts
│   │   ├── statusConstant.ts
│   │   ├── webAPI.ts        # API paths and localStorage keys
│   │   └── ...
│   │
│   ├── types/               # TypeScript type definitions
│   │   └── *.d.ts
│   │
│   ├── assets/              # Static assets (images, SVGs, etc.)
│   ├── config/              # Configuration files
│   ├── theme/               # Theme configuration
│   ├── routes.tsx           # Route definitions with lazy loading
│   ├── App.tsx              # Root app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
│
├── public/                  # Static files served as-is
├── tests/                   # Test files (Vitest)
├── .github/                 # GitHub configuration
│   ├── copilot-instructions.md
│   ├── prompts/
│   └── TEST-CHECKLIST-PHASE1.md
│
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── eslint.config.js         # ESLint configuration
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

### Key Directories Explained

#### `/api`

Contains RTK Query endpoint definitions organized by feature. Each API folder has an `index.ts` that exports auto-generated hooks.

```typescript
// src/api/JobOpening/index.ts
const jobOpeningApi = createApi({
  reducerPath: 'jobOpeningApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL, prepareHeaders: ... }),
  endpoints: (builder) => ({
    getJobOpenings: builder.query(...),
    createJobOpening: builder.mutation(...)
  })
})
export const { useGetJobOpeningsQuery, useCreateJobOpeningMutation } = jobOpeningApi
```

#### `/redux`

Redux Toolkit slices for state management. Only `LoginSlice` is persisted via redux-persist.

```typescript
// Usage in components
const dispatch = useAppDispatch();
dispatch(loginStore({ token, authorities, role }));
```

#### `/services`

Business logic services separate from components.

```typescript
// src/services/AuthService.ts
export const handleRefreshToken = async () => { ... }
export const verifyTokenLogin = async (token, dispatch) => { ... }
```

#### `/helpers` & `/utils`

Utility functions grouped by purpose. Being consolidated in Phase 1.

---

## 🔑 Key Concepts

### Authentication & Authorization

**Token Flow:**

1. User logs in → Backend returns `accessToken` + `refreshToken`
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
// Only LoginSlice is persisted to localStorage
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['LoginSlice'], // ← Only this slice persists
};
```

**Using State:**

```typescript
import { useSelector } from 'react-redux';
import { useAppDispatch } from './hooks';

const MyComponent = () => {
  const dispatch = useAppDispatch();
  const { token, authorities } = useSelector((state) => state.LoginSlice);

  // Dispatch action
  dispatch(jobOpeningFilterSlice.actions.setFilter(filterData));
};
```

### Data Fetching with RTK Query

**Create API Endpoint:**

```typescript
// src/api/JobOpening/index.ts
const jobOpeningApi = createApi({
  reducerPath: 'jobOpeningApi',
  baseQuery: fetchBaseQuery({ baseUrl: BASE_URL, prepareHeaders: ... }),
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
import { jobCreationSchema } from './schemas'

const MyForm = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(jobCreationSchema)
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
      {errors.title && <span>{errors.title.message}</span>}
    </form>
  )
}
```

### Role-Based Access Control

```typescript
import { useHasAccess } from './hooks'
import { AUTHORITIES } from './constants/authorities.constant'

const AdminFeature = () => {
  const hasAccess = useHasAccess([AUTHORITIES.OWNER, AUTHORITIES.ORGANIZATION_ADMIN])

  if (!hasAccess) {
    return <div>Access Denied</div>
  }

  return <div>Admin Content</div>
}
```

### Video Interview Integration

**Note:** Being migrated from Agora to LiveKit. Current implementation uses Agora SDK.

```typescript
import { useAgora } from './hooks'

const InterviewComponent = () => {
  const {
    localTracks,
    remoteUsers,
    join,
    leave,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare
  } = useAgora(client, {
    appId: process.env.VITE_AGORA_APP_ID,
    channel: 'interview-123',
    token: agoraToken,
    rtmToken: agoraRtmToken,
    uid: userId,
    role: 'interviewer',
    name: userName,
    joined: false
  })

  // Cleanup on unmount
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

- **Vitest** - Fast unit test framework compatible with Jest API
- **Tests Location** - `tests/` directory with `.test.ts` suffix

### Run Tests

```bash
npm test
```

### Write Tests

```typescript
// tests/utils.test.ts
import { describe, it, expect } from 'vitest';
import { validatePhoneNumber } from '../src/helpers';

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
3. Check backend endpoint is correct in `.env`
4. Verify `Authorization` header is sent with requests

#### "Account Inactive" Error

1. Contact admin to reactivate your account
2. Check if login credentials are correct
3. Verify you're using correct environment (dev/staging/production)

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
2. Verify Agora/LiveKit credentials in `.env`
3. Check browser permissions for camera/microphone
4. Try different browser (Chrome, Firefox recommended)

#### Screen Share Not Working

1. Some browsers require HTTPS for screen share
2. Check if app is running over HTTPS in production
3. Verify user has appropriate role to start screen share

### API Connection Issues

#### "Cannot reach backend" Error

1. Verify backend service is running
2. Check `VITE_BACKEND_ENDPOINT` in `.env`
3. Check network connectivity
4. Try with ngrok if behind proxy (add header: `ngrok-skip-browser-warning: true`)

#### CORS Errors

1. Backend should include proper CORS headers
2. Verify backend allows requests from frontend URL
3. Check `VITE_ENV` matches backend configuration

### Performance Issues

#### Slow Page Load

1. Check Network tab in DevTools
2. Look for slow API requests
3. Verify no large bundle size (run `npm run build`)
4. Check localStorage isn't too large

#### Memory Leaks

1. Check DevTools Memory tab
2. Verify WebSocket connections are closed on unmount
3. Ensure event listeners are cleaned up
4. Check no circular references in Redux

---

## 🤝 Contributing

### Code Style

- **TypeScript** - All code must be typed (no `any` unless unavoidable)
- **ESLint + Prettier** - Run `npm run lint` before committing
- **Naming Conventions:**
  - Components: PascalCase (`UserProfile.tsx`)
  - Utilities: camelCase (`validatePhoneNumber.ts`)
  - Constants: UPPER_SNAKE_CASE (`INACTIVITY_TIMEOUT_MS`)
  - Hooks: Start with `use` prefix (`useHasAccess.tsx`)

### Branch Naming

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

1. Create feature branch from `main`
2. Make changes and commit regularly
3. Run `npm run lint` and fix any issues
4. Run `npm run build` to verify production build
5. Push to GitHub and create Pull Request
6. Describe changes clearly in PR description
7. Reference related issues (#123)
8. Request review from team
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
2. Review this README and code comments
3. Check `.github/copilot-instructions.md` for architecture details
4. Contact team lead or maintainer

---

## 📄 License

[Add license information if applicable]

---

**Last Updated:** January 27, 2026  
**Version:** 0.1.0 (Pre-Release)  
**Maintained By:** CareerForcePro Team
