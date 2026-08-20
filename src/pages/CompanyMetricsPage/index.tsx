import CompanyMetrics from '../../components/CompanyMetrics';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';

// Same frontend-only visibility flag as the "Company" (MyCompany) nav item —
// this is that same tenant's own management area, just the metrics view of
// it, not a new backend-checked permission.
const CompanyMetricsPage = () => (
  <RequirePermission permission={Authorities.MY_COMPANY_VIEW}>
    <CompanyMetrics />
  </RequirePermission>
);

export default CompanyMetricsPage;
