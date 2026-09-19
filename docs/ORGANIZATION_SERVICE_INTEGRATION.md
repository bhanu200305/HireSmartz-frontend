# Organization Service — Frontend Integration Change Log

**Date**: 2026-08-13
**Scope**: Wiring `CFPro_frontend` completely to the real `organization-service` backend (`CFPro2.0/services/organization-service`), replacing the legacy `tenant-service`/`rbac-service` mock API layer everywhere organization-service now has a real, reachable endpoint.

Companion to organization-service's own `docs/PROGRESS.md` and `docs/FILES_CHANGED.md` — this is the frontend side of the same effort.

---

## Contents

1. [Phase 0 — Session foundation](#phase-0--session-foundation)
2. [Phase 1 — Company Admin: My Company core](#phase-1--company-admin-my-company-core)
3. [Phase 2 — Company Admin: Team, invitations, bulk import, RBAC](#phase-2--company-admin-team-invitations-bulk-import-rbac)
4. [Phase 3 — Company Admin: QR, interview questions, scoring, activity](#phase-3--company-admin-qr-interview-questions-scoring-activity)
5. [Phase 4 — Super Admin: Companies](#phase-4--super-admin-companies)
6. [Phase 5 — Super Admin: Masters, Platform Team, Audit, Metrics, Guest Orgs](#phase-5--super-admin-masters-platform-team-audit-metrics-guest-orgs)
7. [Phase 6 — Cleanup](#phase-6--cleanup)
8. [Post-integration bug fixes (found during live testing)](#post-integration-bug-fixes-found-during-live-testing)
9. [Known backend gaps (confirmed, not frontend bugs)](#known-backend-gaps-confirmed-not-frontend-bugs)
10. [Local environment notes](#local-environment-notes)

---

## Phase 0 — Session foundation

The blocking discovery: a real (non-demo) login never populated `tenant_id` or effective permissions, so nothing built afterward could have worked without this.

- **`src/components/Login/index.tsx`** — `completeRealLogin` now decodes `tenant_id`/`sub` off the real access token and resolves effective permissions via `GET /v1/roles/users/{user_id}/permissions` before storing the session. Previously stored an empty role/authorities set for every real login.
- **`src/redux/slices/loginSlice.ts`** — added `tenantId` and `callerKind` (`'tenant' | 'platform'`) to session state.
- **`src/shared/utils/auth/devAuthBypass.ts`** — dev-bypass/seeded logins updated to populate the same new fields, so demo mode stays consistent with real sessions.
- **`src/constants/authorities.constant.ts`** — every organization-service-backed permission string corrected to match the backend's real `cfp_contracts.permissions.Permission` catalog exactly (e.g. `company:view` → `tenant:read`). Added new entries for departments/locations/invitations/platform/masters/interview-questions. Removed two members that duplicated another member's value (`ESLint` forbids duplicate enum values).
- **New `src/components/RequirePermission.tsx`** — route/section permission guard (defense in depth alongside the backend's own enforcement).
- **New `src/shared/utils/api/platformErrorEnvelope.ts`** — one generic parser for the `{error_code, message, request_id}` envelope every service returns. `src/shared/utils/auth/authError.helpers.ts` (existing) and new `orgError.helpers.ts` are now both thin wrappers over it.
- **New API file**: `src/api/organization-service/Roles/permissions.ts` (`GET /v1/roles/users/{user_id}/permissions`).

---

## Phase 1 — Company Admin: My Company core

- **New/extended API**: `Tenants/profile.ts` (profile, dashboard, activity), `Tenants/offices.ts` (full CRUD, was create-only), `Tenants/departments.ts` (+list), `Tenants/entitlements.ts`.
- **`src/components/MyCompany/`** rebuilt around the real `tenantId` (UUID) instead of a legacy numeric `companyId` decoded from the JWT:
  - `CompanyProfileTab.tsx`, `CompanyLocationsTab.tsx` + `OfficeFormModal.tsx`, `DepartmentsTab.tsx`, `EntitlementsTab.tsx` (all new).
  - `index.tsx` rewritten as the tab orchestrator.
- Removed a duplicate/incorrect `updateTenantProfile` endpoint in `Tenants/tenants.ts` that collided with the new one.
- Team/QR/Scoring tabs stubbed as an honest "not available yet" (`ComingSoonTab`, new shared component) pending their own phases, rather than left silently broken against a numeric id that no longer exists.
- Deferred: a dedicated screen for `GET /tenants/{id}/dashboard` — no natural home found; the existing `Dashboard`/`HomePage` is a different, analytics-service-driven screen out of scope.

---

## Phase 2 — Company Admin: Team, invitations, bulk import, RBAC

- **New API**: `Users/users.ts` (`GET/POST/PATCH/DELETE /v1/users`), `Tenants/teamInvitations.ts` (list/resend/revoke), `Roles/assignments.ts` (grant/revoke).
- **Rebuilt bulk import** (`Tenants/imports.ts`) — the old version posted a file to an endpoint that doesn't exist. Now the real 3-step flow: presigned upload URL → direct browser→S3 upload → parse → per-row review (`BulkImportRows.tsx`, new) → confirm. Added an authenticated template-download helper.
- **`MyCompany/Team/`**: `TeamInvitationsList.tsx` (new), `InviteTeamMemberModal.tsx` and `BulkImport/index.tsx` rewired to real endpoints, `index.tsx` sources departments from organization-service instead of the legacy mock.
- **Fixed a real bug**: `offboardTenantUser` pointed at `/v1/tenants/{id}/users/{userId}`, which doesn't exist — deactivation is `/v1/users/{user_id}` (tenant implicit from the caller's own session). Removed the dead endpoint.
- **Rebuilt `OrganisationDashboard`** (list/add/edit/view) around the real `/v1/users` shape — dropped fields the legacy version assumed but the backend has no concept of (employee ID, a 3-state "archived" status, a role column in the list, multi-location access). Email changes are their own confirmed step (resets verification). View page shows a user's real resolved permissions.
- **RBAC discovery**: organization-service has no "list roles" or "list a user's role assignments" endpoint anywhere — only grant/revoke/resolve. `RolesManagement/Index.tsx` replaced its mock-backed role table with an honest "not available yet" state; `/add-role`, `/edit-role`, `/view-role`, `/invite-user` now redirect there instead of rendering dead forms.

---

## Phase 3 — Company Admin: QR, interview questions, scoring, activity

- **New API**: `Tenants/qrCode.ts`, `Tenants/interviewQuestions.ts` (list/suggest/save), `Tenants/scoringConfig.ts`, `Tenants/jobOpenings.ts` (built, not yet wired into a screen — see below).
- **`QrManagementTab.tsx`** — rebuilt as read-only display + download; no regenerate/activate/deactivate endpoint exists in the real contract (the old multi-QR management UI assumed one).
- **`ScoringCriteriaOwnerTab.tsx`** — rebuilt around the real flat `{category: weight}` map with `available`/`is_locked` flags; the legacy two-stage (resume/interview) slider system with per-category colors/reset-to-default has no backend equivalent.
- **New `InterviewQuestionsTab.tsx`** — AI-suggest as a preview, editable list up to 8, save replaces the whole set.
- **New `TenantActivityFeedTab.tsx`** — real tenant admin activity log (`GET /tenants/{id}/activity`), added as a new tab (built at the user's explicit request in a later message). Humanizes known `ActivityAction` values, falls back gracefully for unrecognized ones.
- Deliberately **not** touched: `src/components/Dashboard/ActivityFeed.tsx` — turned out to be audit-service's real-time candidate/job activity stream, a different, already-correct feature, not an org-service mock.
- `jobOpenings.ts` built but not wired into a screen — the existing job-service-backed `/jobs` page already covers this; wiring org-service's simpler proxy would duplicate it.

---

## Phase 4 — Super Admin: Companies

- **New API**: `Platform/tenants.ts` (list with filters/pagination, get one, get/update entitlements with `locked_flags`), `Platform/scoringConfig.ts` (platform-default weights).
- **`CustomerDashboard/Index.tsx`** rebuilt — real filters only (status, server-side name search, pagination). Dropped interview counts, recruiter/hiring-manager counts, packages, primary-location objects, impersonate-from-this-row — none exist on this contract.
- **`ViewCustomer/index.tsx`** rebuilt — profile summary, suspend action, and a new `EntitlementsPanel.tsx` where Super Admin can toggle _and_ lock each of the 6 feature flags (distinct from the tenant's own read-mostly view in Phase 1).
- **Confirmed backend gap**: no endpoint lets a Super Admin edit a tenant's profile fields (`PATCH /tenants/{id}/profile` is `require_own_tenant`-gated, which a platform caller can never satisfy). `/edit-company` now redirects to the view page instead of rendering a dead form.
- `/add-company` needed no work — already wired to the real `TenantOnboarding` wizard.

---

## Phase 5 — Super Admin: Masters, Platform Team, Audit, Metrics, Guest Orgs

- **New API**: `Platform/industries.ts`, `Platform/jobTitles.ts`, `Platform/staff.ts` (staff + platform departments + both invite flows + offboard), `Platform/audit.ts`, `Platform/metrics.ts` (5 independent endpoints), `Platform/guestOrganizations.ts`.
- **`CompanySettings/IndustriesTab.tsx`, `JobTitlesTab.tsx`** rebuilt as real CRUD against catalogues that return everything in one call (no pagination/search exists on these endpoints, so the heavier paginated `MasterTable` pattern was dropped in favor of a plain list).
- **`CompanySettings/index.tsx`** — dropped the "Departments" / "Department Settings" tabs entirely (not stubbed): they modeled a master-department-catalog-with-job-title-mapping feature with no endpoint anywhere in the contract and not planned. Added a real **Default Scoring Weights** tab. Email/SMS tabs untouched (notification-service's territory).
- **Four new screens + routes + nav entries**, all gated on `PLATFORM_VIEW`:
  - `src/components/PlatformTeam/` (+ `InvitePlatformMemberModal.tsx`) — `/platform-team`
  - `src/components/PlatformAudit/` — `/platform-audit`
  - `src/components/PlatformMetrics/` (+ `MetricTile.tsx`) — `/platform-metrics`
  - `src/components/GuestOrganizations/` — `/guest-organizations`
- New pages: `PlatformTeamPage`, `PlatformAuditPage`, `PlatformMetricsPage`, `GuestOrganizationsPage`. Routes and nav entries added in `src/routes.tsx` and `src/components/Navbar/menuItem.tsx`.

---

## Phase 6 — Cleanup

- Restored two tabs (**Email Templates**, **SMS Templates**) to `MyCompany` as honest placeholders — the Phase 1 rewrite had silently dropped them instead of stubbing them like everything else.
- **Deleted ~30 fully-orphaned files** (components, schemas, CSS) left behind by the phase 1–5 rewires: old `CustomerDashboard` (AddCustomer, EditCustomer, CompanyDetails/Locations/Users, Badge, CustomerTable, Filter, Impersonation\*), the fictional `CompanySettings`/`MyCompany` master-department-catalog tabs and their modals, `RolesManagement`'s AddRole/EditRole/ViewRole/InviteUser/RoleForm, `OrganisationDashboard` schema/CSS leftovers.
- **Retired 12 now-unreferenced `tenant-service`/`rbac-service` API files** (Company CRUD, Organisation users, all of rbac-service's `Roles/*`) — confirmed zero references before removal.
- Redirected `/invite-user` (used the same dead rbac-service role catalog) rather than leave a working link to a broken form.
- Cleaned the RTK Query tag graph in `src/api/organization-service/orgApi.ts` — removed one declared-but-unused tag (`ImportBatch`, a leftover from the old broken bulk-import implementation).
- Updated `STRUCTURE_MAPPING.md` with what's real now vs. what's still legacy and why.
- **Verification discipline throughout**: `npx tsc -b` and `npx eslint` run after every phase and every deletion; one near-miss caught this way — deleting `CustomerDashboard/AddCustomer/` broke an unrelated `Subscriptions` (billing) form reusing its validation schema, caught immediately by the compiler and fixed by restoring just that one file.

---

## Post-integration bug fixes (found during live testing)

Found while walking through the real "add a company" flow against a running backend:

- **`Cannot update a component while rendering...` React warning** — four screens (`CustomerDashboard/Index.tsx`, `OrganisationDashboard/Index.tsx`, `MyCompany/TenantActivityFeedTab.tsx`, `PlatformAudit/index.tsx`) called `showToast()` directly in the render body on a query error instead of in a `useEffect`. Fixed in all four.
- **`TenantOnboarding/StepCompanyDetails.tsx`** — the industry dropdown on "Add Company" was still pulling from the old `tenant-service` mock (`/job-opening/master-admin/industries`, numeric IDs that don't exist in the real catalogue) instead of the real `GET /v1/platform/industries`. Swapped to the real endpoint; removed the inline "add/edit industry" shortcut (that's a Super Admin catalogue action with its own real screen and its own permission — it doesn't belong inside "create a company").

---

## Known backend gaps (confirmed, not frontend bugs)

These were verified by reading the actual backend code, not assumed:

- **No role catalog endpoint** anywhere in organization-service (only grant/revoke/resolve exist). A role browser has nothing to list. See Phase 2.
- **No Super-Admin tenant-profile-edit endpoint** — `PATCH /tenants/{id}/profile` is tenant-self-only. See Phase 4.
- **The AI website-branding scrape has a deliberately _unbounded_ wait** (`timeout_seconds=None` in `ai_scrape_client.py`) for a reply from `ai-service`. If `ai-service` isn't running and a website URL is provided when creating a company, `POST /v1/tenants` hangs forever — this is what caused the "stuck loading screen" during testing. **Workaround: leave Website blank when adding a company.**
- **Email delivery is real, end-to-end, but was running in `dry_run` mode** — organization-service correctly publishes the invite event, notification-service correctly calls back for invitation/branding details and renders the email, but makes no real provider call until `NOTIFICATION_DELIVERY_MODE=live` + real Postmark credentials are set.
- **notification-service's `.env.example` documentation for `SERVICE_TOKEN` is stale** — real service-to-service auth now uses `SERVICE_TOKEN_BOOTSTRAP_SECRET` (`cfp_security.ServiceTokenAuth`, minted via `POST /internal/v1/service-tokens`), already defaulted consistently across services in `docker-compose.yml`.
- **`services/organization-service/.env.example` has two wrong values** relative to the actual local `docker-compose.yml` setup: the database name (`career_force_pro` vs. the real `careerforce`) and passwords (`cfp_app`/`cfp_migrator` vs. the real `cfp_app_local`/`cfp_migrator_local`), and `AUTH_SERVICE_BASE_URL`/`JWKS_URL` point at port 8001 (job-service's port) instead of 8000 (authentication-service's real port).

---

## Local environment notes

**Real local port mapping** (from `docker-compose.yml`):

| Service                | Host port |
| ---------------------- | --------- |
| authentication-service | 8000      |
| job-service            | 8001      |
| organization-service   | 8002      |
| notification-service   | 8003      |

**Creating the first Super Admin** (one-time, only if none exists):

```
cd services/organization-service
$env:DATABASE_DSN = "postgresql+asyncpg://cfp_app:cfp_app_local@localhost:5432/careerforce"
$env:REDIS_DSN = "redis://localhost:6379/0"
python scripts/bootstrap_super_admin.py --email you@company.com
```

(prompts for a password; re-run with `--refresh-permissions-only` to re-seed the Redis permission cache for an existing account instead of creating a new one)

**Dev-bypass login (`VITE_BYPASS_AUTH=true`) is incompatible with a real running backend** — its token is fake/unsigned and every real service correctly rejects it (401 on everything, including token refresh). Use a real login for any testing against live services.
