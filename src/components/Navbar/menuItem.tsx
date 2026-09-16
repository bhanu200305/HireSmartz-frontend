import { BsCalendar4Event } from 'react-icons/bs';
import { Authorities } from '../../constants/authorities.constant';
import { TbBriefcase2 } from 'react-icons/tb';
import { LuSquareActivity, LuUsersRound } from 'react-icons/lu';
import { FiSettings } from 'react-icons/fi';
import {
  MdAdminPanelSettings,
  MdApartment,
  MdOutlineAdminPanelSettings,
  MdOutlineDashboard,
  MdOutlineInsights,
} from 'react-icons/md';
import { PiMoneyFill } from 'react-icons/pi';
import { HiOutlineSpeakerphone } from 'react-icons/hi';

// Order matters: Sidebar renders this array as-is (filtered down to
// whatever `requiredAuthority` the signed-in caller holds), so the order
// below IS the nav order for every role, not just the one that happens to
// see every entry. For a Master Super Admin — who holds DASHBOARD_VIEW,
// COMPANY_VIEW, INDUSTRY_VIEW, ROLE_VIEW, USER_ADD, the Admin role-gate,
// FINANCES_VIEW, SUBSCRIPTIONS_VIEW and PLATFORM_VIEW, but neither
// MY_COMPANY_VIEW, JOB_OPENING_VIEW nor ACTIVITY_FEED — filtering this list
// down to what they can see yields, in order: Dashboard, Companies, Company
// Settings, Roles & Permissions, CFP Users, Admin, Finances, Subscriptions,
// Platform Metrics, Audit Log, Book a Demo Leads. The tenant-only entries
// interleaved here (Company/my-company, Job Openings, Activity Feed) sit
// wherever's natural for a tenant caller's own nav, since a Master Super
// Admin never holds their authority and never sees them.
const MenuItems = [
  {
    // DASHBOARD_VIEW is explicitly a frontend-only flag with no real backend
    // permission behind it (see its own "No backend permission" comment in
    // authorities.constant.ts) — the real GET /v1/roles/users/{id}/permissions
    // call can never return it, so this never showed for any real login.
    // The `/` route itself has no permission gate at all (HomePage shows a
    // dashboard to anyone authenticated, platform or tenant), so the nav
    // item shouldn't gate on one either — Sidebar special-cases this entry
    // to always show, same treatment "Admin" already gets.
    name: 'Dashboard',
    icon: <MdOutlineDashboard size={18} />,
    path: '/',
  },
  {
    // MY_COMPANY_VIEW used to gate this — a frontend-only flag the real
    // backend permission-resolution call can never return (see its own "No
    // backend permission" comment in authorities.constant.ts), which meant
    // no real (non-dev-bypass) tenant login ever saw this item. COMPANY_
    // SETTINGS_VIEW ('organization:read') is the actual permission
    // MyCompanyPage's own RequirePermission gate already requires to render
    // the page this links to — using the same one here means the nav item
    // and the page it points at finally agree on who can see it.
    //
    // Tenant-only, same as the page it points to (`/my-company` redirects
    // any caller with no tenant of their own straight back to `/`) — Sidebar
    // additionally requires `tenantId` for this entry, since a platform
    // caller's static permission set happens to include COMPANY_SETTINGS_EDIT
    // too but has nowhere for this link to actually go.
    //
    // COMPANY_SETTINGS_EDIT ('organization:update'), NOT COMPANY_SETTINGS_VIEW
    // ('organization:read') — read is a broad permission Recruiter/Hiring
    // Manager also legitimately hold (organization-service migration 0063,
    // for their job-title dropdown), which let every tenant role see this
    // admin-only nav item once that migration ran. `organization:update` is
    // still admin-exclusive (company_admin/cfp_admin/super_admin only).
    name: 'Company',
    icon: <MdApartment size={18} />,
    path: ['/my-company'],
    requiredAuthority: Authorities.COMPANY_SETTINGS_EDIT,
  },
  {
    // Company Admin's own equivalent of the Super Admin's "Platform
    // Metrics" — same permission as "Company" above (both are this same
    // tenant's own management area), and same Sidebar tenantId guard for
    // the same reason: a platform caller's static permission set happens
    // to include COMPANY_SETTINGS_EDIT too, but this page has nowhere to
    // go for them (CompanyMetrics redirects home with no tenant of its own).
    name: 'Company Metrics',
    icon: <MdOutlineInsights size={18} />,
    path: ['/company-metrics'],
    requiredAuthority: Authorities.COMPANY_SETTINGS_EDIT,
  },
  {
    name: 'Company Settings',
    icon: <FiSettings size={18} />,
    path: ['/company-settings'],
    requiredAuthority: Authorities.INDUSTRY_VIEW,
  },
  {
    name: 'Companies',
    icon: <MdApartment size={18} />,
    path: ['/company', '/add-company', '/view-company'],
    requiredAuthority: Authorities.COMPANY_VIEW,
  },
  {
    name: 'Roles & Permissions',
    icon: <MdOutlineAdminPanelSettings size={18} />,
    path: ['/roles'],
    requiredAuthority: Authorities.ROLE_VIEW,
  },
  {
    // CFP Users (CareerForcePro's own internal team) lives as a section on
    // this same page now, not a separate nav entry — see
    // pages/OrganisationUserPage and components/CfpUsers.
    name: 'CFP Users',
    icon: <LuUsersRound size={18} />,
    path: [
      '/organisation-users',
      '/add-organisation-users',
      '/view-organisation-user',
      '/edit-organisation-user',
    ],
    requiredAuthority: Authorities.USER_ADD,
  },
  {
    name: 'Job Openings',
    icon: <TbBriefcase2 size={18} />,
    path: [
      '/jobs',
      '/add-job-description',
      '/ats-job-id',
      '/jobs/create',
      '/jobs/view',
      '/jobs/edit',
      '/job-details',
      '/job-description',
      '/interview',
      '/ai-questions',
      '/ai-questions/add-ai-question',
      '/ai-questions/edit-ai-question',
      '/candidates',
      '/candidates/add-candidate',
      '/ai-job-description',
      '/interview-setup',
      '/add-new-round',
      '/view-job-description',
      '/view-job-opening',
      '/interviewer-startinterview',
    ],
    requiredAuthority: Authorities.JOB_OPENING_VIEW,
  },
  {
    // Gated on the same 'interview:read' permission interview-service's own
    // GET /bookings endpoint enforces (require_permission("interview:read"))
    // — so the nav item and the API it calls agree on who can see it.
    //
    // Tenant-only, same as "Company"/"Company Metrics"/"Tenant Audit Log"
    // above and for the same reason: a Master Super Admin's "every
    // permission" static fallback (ROLE_AUTHORITIES.owner.masterSuperAdmin)
    // includes INTERVIEW_QUESTIONS_VIEW too (nothing excludes it there),
    // but GET /bookings itself requires a tenant user — a platform caller
    // landing on this tab got nothing but "this endpoint requires a tenant
    // user". See Sidebar's own tenantId guard for this entry.
    name: 'Interviews',
    icon: <BsCalendar4Event size={18} />,
    path: ['/interviews'],
    requiredAuthority: Authorities.INTERVIEW_QUESTIONS_VIEW,
  },
  {
    // ACTIVITY_FEED used to gate this — a frontend-only flag the real
    // backend permission-resolution call can never return (see its own "No
    // dedicated backend permission" comment in authorities.constant.ts),
    // which meant no real (non-dev-bypass) tenant login ever saw this item,
    // same dead-nav-item bug "Company" used to have. COMPANY_SETTINGS_VIEW
    // is the same real permission the identical data already renders under
    // — MyCompany's own "Activity" tab (TenantActivityFeedTab) — and the
    // same one this route's own page (ActivityFeedPage) already reuses that
    // component against, so nav and destination finally agree on who can
    // see it.
    //
    // Displayed as "Audit Log" (see Sidebar's label override) — same GET
    // /v1/tenants/{tenant_id}/activity trail of this tenant's own admin
    // actions (invites, role grants, profile/office/department edits, …)
    // that name describes more plainly, and the label a Company Admin
    // asked for to sit alongside Super Admin's own "Audit Log" entry below.
    //
    // Internal `name` kept as "Tenant Audit Log", NOT "Audit Log" —
    // Sidebar's own gating filter matches by `item.name`, and the two
    // "Audit Log"-displayed entries need genuinely different gates (this
    // one tenant-only, the platform one below tenant-NEVER). A brief
    // version of this file gave both the literal name "Audit Log", which
    // made Sidebar's tenant-only filter (matching by that name) catch BOTH
    // entries — including the platform one, which then always failed its
    // now-incorrectly-applied `Boolean(tenantId)` check and disappeared for
    // every Super Admin. `key={item.name}` in Sidebar's list render also
    // needs these to be unique, independent of the collision above.
    //
    // Tenant-only, same as "Company"/"Company Metrics" above and for the
    // same reason: a platform caller's static permission set happens to
    // include COMPANY_SETTINGS_EDIT too, but `/activityFeed` (ActivityFeedPage)
    // reads `tenantId ?? ''` — a dead fetch for them. See Sidebar's own
    // tenantId guard for this entry.
    //
    // COMPANY_SETTINGS_EDIT, NOT COMPANY_SETTINGS_VIEW — see "Company"
    // above for why: `organization:read` is no longer admin-exclusive since
    // migration 0063, `organization:update` still is.
    name: 'Tenant Audit Log',
    icon: <LuSquareActivity size={18} />,
    path: '/activityFeed',
    requiredAuthority: Authorities.COMPANY_SETTINGS_EDIT,
  },
  {
    // Not authority-gated like the rest of this list — Sidebar filters this
    // one on role directly (isMasterSuperAdminRole), since unlocking an
    // account / rotating the signing key isn't something any Authorities
    // catalog entry could ever grant a tenant. See that helper's comment.
    name: 'Admin',
    icon: <MdAdminPanelSettings size={18} />,
    path: ['/settings/admin'],
  },
  {
    name: 'Finances',
    icon: <PiMoneyFill size={20} />,
    path: '/finances',
    requiredAuthority: Authorities.FINANCES_VIEW,
  },
  {
    name: 'Subscriptions',
    icon: <BsCalendar4Event size={16} />,
    path: '/Subscriptions',
    requiredAuthority: Authorities.SUBSCRIPTIONS_VIEW,
  },
  {
    name: 'Platform Metrics',
    icon: <MdOutlineInsights size={18} />,
    path: ['/platform-metrics'],
    requiredAuthority: Authorities.PLATFORM_VIEW,
  },
  {
    name: 'Audit Log',
    icon: <LuSquareActivity size={18} />,
    path: ['/platform-audit'],
    requiredAuthority: Authorities.PLATFORM_VIEW,
  },
  {
    name: 'Book a Demo Leads',
    icon: <HiOutlineSpeakerphone size={18} />,
    path: ['/guest-organizations'],
    requiredAuthority: Authorities.PLATFORM_VIEW,
  },
];

export default MenuItems;
