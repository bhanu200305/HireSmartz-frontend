import PlatformMetrics from '../../components/PlatformMetrics';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';

const PlatformMetricsPage = () => (
  <RequirePermission permission={Authorities.PLATFORM_VIEW}>
    <PlatformMetrics />
  </RequirePermission>
);

export default PlatformMetricsPage;
