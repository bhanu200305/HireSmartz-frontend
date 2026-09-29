import ActivityFeed from '../../components/Dashboard/ActivityFeed';

/**
 * Hiring Manager/Recruiter's "Activity" nav tab — reuses the same
 * ActivityFeed widget (components/Dashboard/ActivityFeed.tsx) Company
 * Admin's dashboard already renders behind Authorities.ACTIVITY_FEED (a
 * frontend-only flag no real login ever holds, per its own "No backend
 * permission" comment in authorities.constant.ts). Same component, same
 * `/dashboard/activities/search` data source — it'll show "no recent
 * activity found" until that endpoint returns real data; see the backend
 * requirements noted where this tab was added.
 */
const MyActivityPage = () => <ActivityFeed fullPage />;

export default MyActivityPage;
