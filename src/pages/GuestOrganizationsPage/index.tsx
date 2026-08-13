import GuestOrganizations from '../../components/GuestOrganizations';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';

const GuestOrganizationsPage = () => (
  <RequirePermission permission={Authorities.PLATFORM_VIEW}>
    <GuestOrganizations />
  </RequirePermission>
);

export default GuestOrganizationsPage;
