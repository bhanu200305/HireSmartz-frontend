import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { customers as CustomerTable } from '../../components';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';
import { RootState } from '../../redux/provider/store';

const CustomerPage = () => {
  // Platform-only screen (lists every tenant) — gated on principal type, not
  // just a permission code, because `Authorities.COMPANY_VIEW` ('tenant:read')
  // is also a real permission a company_admin's own role holds for reading
  // THEIR tenant, so `RequirePermission` alone lets a tenant caller's session
  // render this page even though the backend requires `require_platform_permission`
  // and 403s every query on it. Same inverse-of-MyCompany pattern as that
  // screen's own `if (!tenantId)` guard.
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);
  if (tenantId) {
    return <Navigate to="/" replace />;
  }

  return (
    <RequirePermission permission={Authorities.COMPANY_VIEW}>
      <CustomerTable />
    </RequirePermission>
  );
};

export default CustomerPage;
