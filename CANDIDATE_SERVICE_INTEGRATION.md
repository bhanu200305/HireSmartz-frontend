# Candidate Service — Frontend Integration Change Log

**Date**: 2026-09-01
**Scope**: Wiring `CFPro_frontend` completely to the real `candidate-service` backend (`CFPro2.0/services/candidate-service`), replacing the pre-microservices mock/legacy API layer everywhere candidate-service now has a real, reachable endpoint.

Companion to candidate-service's own `docs/{API_CONTRACT,FRONTEND_INTEGRATION_DETAILS,EVENTS,PROJECT_UNDERSTANDING}.md` — this is the frontend side of the same effort, same format as `ORGANIZATION_SERVICE_INTEGRATION.md`.

---

## Contents

1. [Starting state](#starting-state)
2. [Phase 0 — Foundation](#phase-0--foundation)
3. [Phase 1 — Recruiter/admin API client](#phase-1--recruiteradmin-api-client)
4. [Phase 2 — Candidates listing (within a job)](#phase-2--candidates-listing-within-a-job)
5. [Phase 3 — Candidate Details workspace](#phase-3--candidate-details-workspace)
6. [Phase 4 — Public apply funnel](#phase-4--public-apply-funnel)
7. [Phase 5 — Stats wiring](#phase-5--stats-wiring)
8. [Phase 6 — Cleanup](#phase-6--cleanup)
9. [Known backend gaps (confirmed, not frontend bugs)](#known-backend-gaps-confirmed-not-frontend-bugs)
10. [Explicitly out of scope](#explicitly-out-of-scope)

---

## Starting state

Unlike organization-service/job-service (which had no real frontend to speak of), candidate-related frontend code already existed in three different vintages:

1. **Fully legacy** — built against a pre-microservices monolith (`/candidate/*`, `/interview/*` Spring-style routes, numeric ids) that candidate-service doesn't implement at all.
2. **Half-migrated** — correct backend URLs, wrong HTTP client (rode the legacy shared `api` instance instead of a candidate-service-specific one).
3. **Already real and correct** — `publicApplyApi`'s `POST /public/v1/apply`, and the `/careers/:organizationId/...` route tree (job-service's real public board + candidate-service's real apply).

Every phase below sorted a screen into one of these three buckets before touching it, rather than assuming the whole surface needed a ground-up rebuild.

## Phase 0 — Foundation

- `constants/authorities.constant.ts` — candidate-service's real permission catalog (`shared/cfp-contracts/permissions.py`) has exactly `CANDIDATE_READ`/`CANDIDATE_WRITE`, confirmed by reading the catalog directly. Dropped 4 fictional permissions (`CANDIDATE_EDIT`/`DELETE`/`APPROVE`/`EXPORT`) the frontend had invented, fixed a stale "organization-service: candidates" comment, fixed every role's permission list.
- New `api/candidate-service/candidateApi.ts` — dedicated RTK Query client, same envelope-unwrap + 401-refresh pattern as `jobApi.ts`/`orgApi.ts`.
- New `shared/utils/auth/candidateError.helpers.ts` — **not** a copy of the sibling helpers. candidate-service's error envelope (`{status,status_code,message,data}`) is genuinely different from `cfp_platform`'s shared flat shape every other service uses — no `error_code` in the body except on the one 401 case.
- Extended the already-real `publicApplyApi` with the rest of the public apply surface (instant-call, resume-upload-link, intake-call slots, verification callback) — and fixed a real bug: the apply response was missing `intake_call_booking_token` entirely, silently blocking the whole Intake Call scheduling flow.
- `.env.example` — documented the previously-undocumented `VITE_CANDIDATE_SERVICE_ENDPOINT`.

## Phase 1 — Recruiter/admin API client

Full coverage of `API_CONTRACT.md`'s authenticated surface, one file per concern: `Candidates/CandidateLifecycle.ts` (apply, list/get/update, bulk-resume + batch polling), `Candidates/status.ts`, `Candidates/interviewRounds.ts`, `Candidates/scoring.ts`, `Candidates/notes.ts`, `Candidates/messaging.ts`, `Master/master.ts`, `Stats/stats.ts` (rewritten onto the real client; added the 2 endpoints it was missing).

**Sharp edge hit and fixed**: a same-named-different-case file (`candidates.ts` vs. the legacy `Candidates.ts`) silently clobbered the legacy file's on-disk content on Windows' case-insensitive filesystem. Restored from git, renamed to `CandidateLifecycle.ts`.

## Phase 2 — Candidates listing (within a job)

`CandidatesListing.tsx` (was 2348 LOC, legacy numeric-id API) rewritten in place — same page anatomy (job-summary header, search+filters+notes/upload actions, expandable checkbox rows, floating bulk-action bar), sourced from real data. Dropped, no real-backend equivalent: manual AI/VIDEO/IN_PERSON interview-invite scheduling (interview-service books automatically post-advance), resume-extraction-in-progress state, the "New" candidate badge (no seen-tracking exists), ATS-candidates fetch.

Rewired in place (confirmed sole consumer via grep first): `FilterMenu.tsx`, `Modal/UploadCvModal.tsx`, `Modal/BulkSendSmsModal.tsx`. Built new, distinctly-named siblings instead of touching shared files still used by `CandidateDetails.tsx`: `Modal/BulkEmailCandidatesModal.tsx`, `Modal/ChangeCandidateStatusModal.tsx`, `Notes/CandidateRecruiterNotesPanel.tsx` (reuses the existing generic `Notes/NotesSidePanel.tsx` shell with a new data adapter).

## Phase 3 — Candidate Details workspace

`CandidateDetails.tsx` (was ~2054 LOC) rewritten in place. Kept the header-card + tab-strip visual shell, changed the tab taxonomy from the legacy 4 tabs (which assumed AI/Video/In-person evaluation dashboards with no backend equivalent) to Pipeline / Assessment / Resume / Interview Summary / SMS Communication — mapping directly onto the 5 separate real calls `FRONTEND_INTEGRATION_DETAILS.md` §4.4 documents.

Reused 4 of Phase 2's new modals directly (`ChangeCandidateStatusModal`, `BulkEmailCandidatesModal`, `BulkSendSmsModal`, `CandidateRecruiterNotesPanel` — all just take a 1-item array). Built two new small modals: `Modal/ResumeReviewModal.tsx`, `Modal/RecruiterRoundScoreModal.tsx`.

Dropped, flagged in the file's own header comment: multi-job "assigned jobs" switching (a candidate has one immutable `job_opening_id`), previous/next-candidate navigation (no adjacent-candidate ids in the response), SMS as a conversation thread (candidate-service can only send, not list prior messages).

## Phase 4 — Public apply funnel

Reconciled the wireframe's UX framing against real API mechanics first: the wireframe shows "Apply with Resume" and "Schedule a Call" as parallel choices, but the real slot-booking flow only works with a token that's part of a resume-apply response — there's no resume-less scheduling endpoint. Built the honest version: Apply Method Choice offers resume vs. "Talk to Us Now" (instant call); a resume apply that gets a real booking token routes into the slot picker as a natural next step.

New pages: `CareersApplyChoicePage`, `CareersInstantCallPage`, `CareersIntakeCallSchedulePage`, `CareersApplySuccessPage`, `VerificationCallbackPage`.

**Deliberately not built**: a "Selfie Capture"/"Redirect Handoff" screen for ID.me — there is no frontend-callable "start verification" endpoint (it's internal, service-token-gated, called by interview-service mid-call). Only the real half — the callback landing page ID.me itself redirects to — was buildable.

## Phase 5 — Stats wiring

Small — 5 of 7 stats endpoints were already wired into `CompanyMetrics` before this integration (their client was just wrong, fixed in Phase 1). Filled the 2 real remaining gaps, both already marked with an explicit "coming soon, no endpoint yet" placeholder:

- `HiringOverviewCharts.tsx`'s "AI score distribution" (org-wide) — real `resume-score-distribution`.
- `JobDetailModal.tsx`'s "Avg AI score" stat + its own per-job "AI score distribution" chart — real `average-resume-score` + `resume-score-distribution`, job-scoped.

Its "Audio / AI / Panel interviews" placeholder stays a placeholder — interview-service's own gap, not candidate-service's.

**Confirmed out of scope**: the global `/candidates` search page (`SearchCandidateListing.tsx`) is search-service's territory, not candidate-service's — it renders results passed in by the app's Global Search feature, a separate, unintegrated service. Even if it were candidate-service's screen, the real contract has no cross-job candidate list endpoint at all (`GET /candidates` always requires `job_opening_id`). Left untouched.

## Phase 6 — Cleanup

Deleted ~45 fully-orphaned files, each verified via anchored grep (`from '...ExactPath'`) for zero real consumers before deletion — not just "not used by the files I was rewriting," but re-checked across the *whole* `src/` tree, since several files that looked dead from inside the Candidates folder turned out to still be reachable from elsewhere:

- The legacy `Candidates/{Candidates,FollowUpNotes,AssignJobOpening}.ts` island's dependents: `CandidateStatus.tsx`, `EditCandidate.tsx`, `ResumeScore.tsx`, `VideoInterview.tsx` + its whole `InterviewDetails/` subtree (14 files), the whole `InterviewSummary/` subtree (6 files), `SmsCommunication/SmsCommunicationTab.tsx`, `CandidateApplications.tsx`, `Modal/{AssignJobModal,AssignedJobsModal,ScheduleInterviewModal,SendEmailToCandidateModal,SendSmsToCandidateModal,NotifyCandidateModal,CommonModal}.tsx`, `Notes/CandidateNotesPanel.tsx`.
- `api/candidate-service/Candidates/{AssignJobOpening,FollowUpNotes}.ts`.
- The confirmed-fictional `/public/q/:qrCode/...` route tree: `api/candidate-service/PublicQr/index.ts`, `hooks/usePublicBranding.tsx`, `components/shared/ApplyLaterModal/`, `pages/PublicJob{Listing,Detail,Apply,Success}Page/` — hit `${VITE_BACKEND_ENDPOINT}/v1/public/q/...`, a route on no real service; the `/careers/...` tree is the genuine replacement. Removed their route entries, lazy imports, and `publicQrApi`'s redux registration.
- `redux/slices/{CandidateFilterSlice,DuplicateCandidateSlice}.ts`, `hooks/useCandidateFilter.tsx`.

**Deliberately kept, not deleted**: `api/candidate-service/Candidates/Candidates.ts` (the main legacy API file) — still backs `components/Interview/InterviewSmsPanel.tsx`, which is genuinely used by the live in-call interview screen (`InterviewLiveKit.tsx`), a feature outside this integration's scope. Also kept `pages/PublicInterviewConsentPage` — its "call-me-now" endpoint may still be a real interview-service route unrelated to candidate-service; less certain than the confirmed-fictional `/public/q/...` tree, left alone rather than guessed at.

Verification discipline throughout: `npx tsc -b --noEmit` and `npx eslint` after every phase and every deletion batch — held at the same 13 pre-existing (unrelated) errors across the entire integration, 0 new.

---

## Known backend gaps (confirmed, not frontend bugs)

Verified by reading the real backend code/docs, not assumed:

- **No cross-job candidate list** — `GET /candidates` always requires `job_opening_id`. A "search candidates across every job" screen has no endpoint to call.
- **No per-recruiter "seen" tracking**, **no manual interview-round add/edit/reorder**, **no bulk-advance endpoint** (advance is per-candidate only), **no "list prior sent messages" endpoint** (messaging is send-only), **no booking-retry endpoint** (a degraded Intake Call booking at apply time has no way to retry later) — all documented in `API_CONTRACT.md`'s own "Known gaps" section.
- **No frontend-callable ID.me verification start** — only the callback/redirect-landing half of that flow is real from a browser's perspective.
- **Resume author display names aren't resolvable** — `RecruiterNoteView.author_id` is a bare UUID with no name-lookup endpoint; the notes panel shows "You" for the signed-in user's own notes and "Team member" for everyone else's rather than fabricating a name.
- **Job title/department/type display names are never resolved server-side** on job-service's own `GET /job-openings/{id}` response (`jobTypeName` always `''`) — a pre-existing gap this integration worked around (using `job_profile_code` instead) rather than caused.

## Explicitly out of scope

- **search-service** — the global cross-entity search feature (`GlobalSearch/index.tsx`, `api/search-service/**`) is a separate, unintegrated service. `SearchCandidateListing.tsx` was left exactly as found.
- **interview-service's own gaps** — round-type interview breakdowns (Audio/AI/Panel), transcripts, and per-round Q&A content are interview-service's data, not surfaced through candidate-service. Round-detail views render an honest "not available yet" rather than fake it.
