import ViewCustomer from '../../components/CustomerDashboard/ViewCustomer';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';

const ViewCompanyPage = () => {
  return (
    <RequirePermission permission={Authorities.COMPANY_VIEW}>
      <ViewCustomer />
    </RequirePermission>
  );
};

export default ViewCompanyPage;
