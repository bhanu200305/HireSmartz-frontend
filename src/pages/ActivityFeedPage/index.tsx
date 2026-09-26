import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { MdOutlineArrowBack } from 'react-icons/md';
import { RootState } from '../../redux/provider/store';
import MainLayout from '../../layouts/MainLayout';
import TenantActivityFeedTab from '../../components/MyCompany/TenantActivityFeedTab';

// This route used to render components/Dashboard/ActivityFeed, which calls
// audit-service's dashboard activity-search endpoint — an empty, unimplemented
// scaffold that never returns real data. organization-service already has a
// real, working tenant-activity log (GET /v1/tenants/{tenant_id}/activity),
// consumed correctly elsewhere via TenantActivityFeedTab (MyCompany's own
// Activity tab). This page reuses that same component full-page instead of
// pointing at the dead audit-service client.
const ActivityFeedPage = () => {
  const navigate = useNavigate();
  const tenantId = useSelector((state: RootState) => state.LoginSlice.tenantId);

  return (
    <MainLayout>
      <div className="pt-16">
        <button
          onClick={() => navigate('/')}
          className="ml-4 mb-2 flex w-fit items-center text-gray-600 hover:text-gray-800 cursor-pointer"
        >
          <MdOutlineArrowBack className="mr-2" />
          <span>Back</span>
        </button>
        <TenantActivityFeedTab tenantId={tenantId ?? ''} />
      </div>
    </MainLayout>
  );
};

export default ActivityFeedPage;
