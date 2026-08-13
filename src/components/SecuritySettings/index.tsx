import { MdOutlineArrowBack } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import MfaSection from './MfaSection';
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
          className="flex w-fit items-center text-gray-600 hover:text-gray-800 cursor-pointer"
        >
          <MdOutlineArrowBack className="mr-2" />
          <span>Back to profile</span>
        </button>

        <h1 className="text-2xl font-semibold text-gray-900">Security</h1>

        <MfaSection />
        <SessionsSection />
      </div>
    </MainLayout>
  );
};

export default SecuritySettings;
