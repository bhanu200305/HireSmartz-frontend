import { customers as CustomerTable } from '../../components';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';

const CustomerPage = () => (
  <RequirePermission permission={Authorities.COMPANY_VIEW}>
    <CustomerTable />
  </RequirePermission>
);

export default CustomerPage;
