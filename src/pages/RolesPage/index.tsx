import { RolesManagement } from '../../components';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';

const RolesPage = () => (
  <RequirePermission permission={Authorities.ROLE_VIEW}>
    <RolesManagement />
  </RequirePermission>
);

export default RolesPage;
