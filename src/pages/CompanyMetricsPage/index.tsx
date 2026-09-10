import CompanyMetrics from '../../components/CompanyMetrics';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';

// COMPANY_SETTINGS_EDIT ('organization:update'), not COMPANY_SETTINGS_VIEW
// ('organization:read') — read is a broad permission Recruiter/Hiring
// Manager also legitimately hold (for e.g. their job-title dropdown, see
// organization-service migration 0063), so gating an admin-only page on it
// let every tenant role in. `organization:update` is still admin-exclusive
// today (company_admin/cfp_admin/super_admin only) — see the "Company"
// (MyCompany) nav item and MyCompanyPage's own gate, fixed the same way.
const CompanyMetricsPage = () => (
  <RequirePermission permission={Authorities.COMPANY_SETTINGS_EDIT}>
    <CompanyMetrics />
  </RequirePermission>
);

export default CompanyMetricsPage;
