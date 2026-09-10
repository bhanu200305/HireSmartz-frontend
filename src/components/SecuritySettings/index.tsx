import { MdOutlineArrowBack, MdOutlineShield } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import MfaSection from './MfaSection';
import RecoverySection from './RecoverySection';
import SessionsSection from './SessionsSection';

/**
 * Account security home: two-factor methods (/api/v1/mfa) and active
 * sessions (/api/v1/sessions) — the two authenticated, self-service surfaces
 * authentication-service exposes beyond login/password. Reached from
 * UserProfile ("Security" link).
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
        <SessionsSection />
      </div>
    </MainLayout>
  );
};

export default SecuritySettings;
