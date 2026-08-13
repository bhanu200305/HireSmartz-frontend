import PlatformTeam from '../../components/PlatformTeam';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';

const PlatformTeamPage = () => (
  <RequirePermission permission={Authorities.PLATFORM_VIEW}>
    <PlatformTeam />
  </RequirePermission>
);

export default PlatformTeamPage;
