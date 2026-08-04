# Frontend structure realignment — mapping notes

This repo's `src/api/` layer was reorganized so its folder boundaries mirror the
planned backend microservice boundaries described in
`Microservice_gateway_Approachc.docx` (services/authentication-service,
rbac-service, tenant-service, job-service, candidate-service, interview-service,
ai-service, notification-service, billing-service, audit-service, search-service,
analytics-service).

**Nothing else changed.** Pages, components, redux, hooks, routing, styling, and all
business logic are untouched — only the location of the API-call files moved, and
every import across the whole repo was rewritten to match (verified: `tsc -b` and
`vite build` both pass clean).

## What moved where, and why

| New location                         | Moved from                          | Notes |
|---------------------------------------|--------------------------------------|-------|
| `api/authentication-service/`         | Login, Logout, ForgotPassword, FeatureFlags, Impersonation | `FeatureFlags` hits `/auth/feature-flags`; `Impersonation` is an identity concern |
| `api/rbac-service/`                   | Roles | |
| `api/tenant-service/`                 | Organisation, Company, CompanySettings, MyCompany, UserProfile, User | Org/user management — judgment call, review if your team splits users into rbac-service instead |
| `api/job-service/`                    | JobOpening, AtsJobDetails, AddableDropdown, Batches, Dashboard/JobOpening.ts | `Dashboard/JobOpening.ts` hits `/job-opening/dashboard/...` so it stayed with jobs |
| `api/candidate-service/`              | Candidates, PublicQr | `PublicQr` is the public job-listing/apply flow, candidate-facing |
| `api/interview-service/`              | InterviewFeedback, VideoIntegration, VideoInterviewQuestions, Nylas | `Nylas` is calendar integration for interview scheduling |
| `api/ai-service/`                     | AiQuestion | AI-generated interview questions |
| `api/notification-service/`           | Notifications | |
| `api/audit-service/`                  | Dashboard/ActivityStream.ts | Activity feed ≈ audit trail |
| `api/search-service/`                 | Dashboard/GlobalSearch.ts | |
| `api/analytics-service/`              | Dashboard/CFPDashboard.ts, Dashboard/OwnerDashboard.ts | Cross-domain aggregated dashboard stats |
| `api/billing-service/`                | *(nothing yet)* | No existing frontend API calls found for Subscription/Finances pages — folder is a placeholder for when that's built |

`src/api/index.ts` (the shared RTK Query base client / auth-refresh interceptor) was
**not** moved — it's cross-cutting infrastructure shared by every service, analogous
to the doc's top-level `shared/` folder, and every endpoint file still injects into it.

The old `Dashboard/` folder was **split file-by-file** rather than moved as a unit,
since "Dashboard" isn't itself a backend service — it's a page that pulls from
several services.

**Please review the tenant-service vs rbac-service split for `User`** — that's the
most debatable call here, since user management can reasonably sit in either
depending on how your team defines the rbac-service boundary.

## Dev auth bypass

Since the login endpoint isn't available from the backend team yet, a **dev-only**
bypass was added (off by default):

- Set `VITE_BYPASS_AUTH=true` in `.env.local` to skip real token validation and
  auto-hydrate a fake local session (see `src/shared/utils/auth/devAuthBypass.ts`).
- This only unblocks client-side route/permission gating — it does not mock or
  fake any backend response, so API calls will still fail until the real backend
  is wired up. That's expected for now.
- **Never** set this flag to `true` for a shared/deployed/real-backend environment.
