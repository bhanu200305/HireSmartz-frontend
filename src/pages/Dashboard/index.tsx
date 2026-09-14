import { useSelector } from 'react-redux';
import Dashboard from '../../components/Dashboard';
import OwnerDashboard from '../../components/OwnerDashboard';
import RecruiterDashboard from '../../components/RecruiterDashboard';
import HiringManagerDashboard from '../../components/HiringManagerDashboard';
import NotFoundPage from '../NotFoundPage';

// A real login's `role.name` is the raw backend role slug (e.g.
// 'recruiter', 'hiring_manager' — see Login/index.tsx's `completeRealLogin`),
// but the dev-bypass role switcher stores a humanized label instead
// ('Recruiter', 'Hiring Manager' — see DevRoleSwitcher's `humanize`).
// Normalizing both to the same snake_case shape lets this check work
// against either session without caring which one is live.
const normalizeRoleName = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const DashboardPage = () => {
  const { role } = useSelector((state: any) => state.LoginSlice);
  const roleName = normalizeRoleName(role?.name || '');

  if (role.type === 'owner') return <Dashboard />;
  if (role.type === 'organization') {
    // Recruiter and Hiring Manager each get their own KPI dashboard (the
    // "Recruiter KPIs"/"Hiring Manager KPIs" additions) — every other
    // organization role (company_admin, interviewer, viewer, ...) keeps the
    // existing OwnerDashboard, unchanged.
    if (roleName === 'recruiter') return <RecruiterDashboard />;
    if (roleName === 'hiring_manager') return <HiringManagerDashboard />;
    return <OwnerDashboard />;
  }
  return <NotFoundPage />;
};

export default DashboardPage;
