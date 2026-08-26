import CompanyMetrics from '../../components/CompanyMetrics';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';

// COMPANY_SETTINGS_VIEW ('organization:read'), not MY_COMPANY_VIEW — that
// flag has no real backend permission behind it (see its own "No backend
// permission" comment in authorities.constant.ts), so the real
// GET /v1/roles/users/{id}/permissions call can never return it and this
// page would redirect home for every real login. Same fix already applied
// to the "Company" (MyCompany) nav item and MyCompanyPage's own gate — this
// is that same tenant's own management area, just the metrics view of it.
const CompanyMetricsPage = () => (
  <RequirePermission permission={Authorities.COMPANY_SETTINGS_VIEW}>
    <CompanyMetrics />
  </RequirePermission>
);

export default CompanyMetricsPage;
