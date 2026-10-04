import BackButton from '../shared/ui/BackButton';
import { MdAdminPanelSettings } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import UnlockUserSection from './UnlockUserSection';
import RotateSigningKeysSection from './RotateSigningKeysSection';

/**
 * The two /api/v1/admin/* actions authentication-service exposes
 * (docs/API_CONTRACT.md §8) — unlocking a locked account and rotating the
 * signing key. Both are permission-checked SERVER-SIDE (`auth:update` /
 * `auth:approve`) and a non-admin calling either just gets PERMISSION_DENIED
 * back from the API.
 *
 * The Sidebar's "Admin" entry (the only link to this route — see
 * menuItem.tsx) is gated on isMasterSuperAdminRole, so this is not
 * *undiscoverable* to a signed-in user who knows the URL — this page itself
 * carries no client-side check of its own, same reasoning as before: the
 * app has no way to know a real (non-dev-bypass) user's effective
 * permissions today (no `permissions` claim on the token by design, §2.1;
 * no `GET /me`, §12.2), so any check here could only mean "hide it from
 * someone who'd get a 403 anyway", never "prevent" anything. The guard that
 * actually matters is, and remains, server-side.
 */
const AdminTools = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <BackButton onClick={() => navigate('/profile')} />

        <div className="flex items-center gap-2.5">
          <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
            <MdAdminPanelSettings size={18} />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-gray-900">Admin tools</h1>
            <p className="text-sm text-gray-500">
              Account recovery and platform-level authentication controls.
            </p>
          </div>
        </div>

        <UnlockUserSection />
        <RotateSigningKeysSection />
      </div>
    </MainLayout>
  );
};

export default AdminTools;
