import ActivityFeed from '../../components/Dashboard/ActivityFeed';
import RequirePermission from '../../components/RequirePermission';
import { Authorities } from '../../constants/authorities.constant';

/**
 * Super Admin's platform Activity Feed — the same component as the tenant
 * feed; audit-service's GET /v1/audit/activity answers a platform login that
 * holds audit:read with `scope: "platform"` (companies onboarded, status
 * changes, admin/staff invites, key rotations). cfp_support has no
 * audit:read, so Sidebar hides the entry for that role (the API would 403).
 */
const PlatformActivityPage = () => (
  <RequirePermission permission={Authorities.PLATFORM_VIEW}>
    <ActivityFeed fullPage />
  </RequirePermission>
);

export default PlatformActivityPage;
