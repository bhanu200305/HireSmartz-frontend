import MainLayout from '../../layouts/MainLayout';
import ActivityCard from '../ActivityFeed';

/**
 * Activity Feed — backed by audit-service's GET /v1/audit/activity (see
 * components/ActivityFeed). The widget form (Company Admin's dashboard) shows
 * the latest 5 plus "View all activities"; `fullPage` is the filterable feed
 * behind /my-activity. Which events show follows the signed-in user's own
 * permissions server-side.
 */
const ActivityFeed = ({ fullPage = false }: { fullPage?: boolean }) => {
  if (fullPage) {
    return (
      <MainLayout>
        <ActivityCard fullPage />
      </MainLayout>
    );
  }
  return <ActivityCard fullPage={false} />;
};

export default ActivityFeed;
