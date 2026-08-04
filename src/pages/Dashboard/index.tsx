import { useSelector } from 'react-redux';
import Dashboard from '../../components/Dashboard';
import OwnerDashboard from '../../components/OwnerDashboard';
import NotFoundPage from '../NotFoundPage';

const DashboardPage = () => {
  const { role } = useSelector((state: any) => state.LoginSlice);
  return (
    <>
      {' '}
      {role.type === 'owner' ? (
        <Dashboard />
      ) : role.type === 'organization' ? (
        <OwnerDashboard />
      ) : (
        <NotFoundPage />
      )}
    </>
  );
};

export default DashboardPage;
