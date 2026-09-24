import { MdOutlineArrowBack, MdOutlineShield } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import MfaSection from './MfaSection';
import RecoverySection from './RecoverySection';

/**
 * Account security home: two-factor methods and the recovery email
 * (/api/v1/mfa) — the authenticated, self-service identity surfaces
 * authentication-service exposes beyond login/password. Reached from
 * UserProfile ("Security" link). Active sessions used to render here too;
 * split into its own page/route (see components/ActiveSessions) so it reads
 * as a separate concern rather than a third section on this one.
 */
const SecuritySettings = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <button
          onClick={() => navigate('/profile')}
          className="flex w-fit items-center text-gray-600 hover:text-primary-600 transition-colors cursor-pointer"
        >
          <MdOutlineArrowBack className="mr-2" />
          <span>Back to profile</span>
        </button>

        <div className="flex items-center gap-2.5">
          <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
            <MdOutlineShield size={18} />
          </span>
          <h1 className="font-display text-xl font-bold text-gray-900">Security</h1>
        </div>

        <MfaSection />
        <RecoverySection />
      </div>
    </MainLayout>
  );
};

export default SecuritySettings;
