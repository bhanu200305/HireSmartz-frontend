import { Navigate, useSearchParams } from 'react-router-dom';

// organization-service has no endpoint letting a Super Admin edit a
// tenant's own profile fields — PATCH /tenants/{id}/profile is
// require_own_tenant-gated, which a platform caller can never satisfy (see
// ViewCustomer/index.tsx's note). Redirects to the view page, which does
// have real platform-side actions (suspend, feature toggles).
const EditCompanyPage = () => {
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('companyId');
  return <Navigate to={companyId ? `/view-company?companyId=${companyId}` : '/company'} replace />;
};

export default EditCompanyPage;
