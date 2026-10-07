import ActivityFeed from '../../components/Dashboard/ActivityFeed';

/**
 * Full Activity Feed page — Hiring Manager/Recruiter's "Activity" nav tab and
 * the target of the dashboard widget's "View all activities". Same component
 * as the dashboard widget (components/Dashboard/ActivityFeed.tsx), backed by
 * audit-service's GET /v1/audit/activity, which scopes the events to the
 * signed-in user's own permissions.
 */
const MyActivityPage = () => <ActivityFeed fullPage />;

export default MyActivityPage;
