import PlatformAudit from '../../components/PlatformAudit';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';

const PlatformAuditPage = () => (
  <RequirePermission permission={Authorities.PLATFORM_VIEW}>
    <PlatformAudit />
  </RequirePermission>
);

export default PlatformAuditPage;
