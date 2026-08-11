import { lazy, Suspense } from 'react';
import { verifyAuthToken } from '../../shared/utils/business-logic';
import { Loader } from '../../components/shared/ui/loader';

const DashboardPage = lazy(() => import('../Dashboard'));
const LandingPage = lazy(() => import('../../components/LandingPage'));

// Public root: signed-in visitors see their dashboard, everyone else sees the
// marketing landing page — same "/" for both, no redirect either way.
const HomePage = () => {
  const isAuthenticated = verifyAuthToken();

  return (
    <Suspense fallback={<Loader />}>
      {isAuthenticated ? <DashboardPage /> : <LandingPage />}
    </Suspense>
  );
};

export default HomePage;
