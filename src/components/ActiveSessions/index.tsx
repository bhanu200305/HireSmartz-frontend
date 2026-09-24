import { MdOutlineArrowBack, MdOutlineDevices } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../layouts/MainLayout';
import SessionsSection from '../SecuritySettings/SessionsSection';

/**
 * Every device currently signed in (/api/v1/auth/sessions) — split out of
 * SecuritySettings into its own page/route so it reads as a separate concern
 * from the 2FA/recovery-email settings, rather than a third section at the
 * bottom of the same page. Reached from UserProfile's "Active sessions" link.
 */
const ActiveSessions = () => {
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
            <MdOutlineDevices size={18} />
          </span>
          <h1 className="font-display text-xl font-bold text-gray-900">Active sessions</h1>
        </div>

        <SessionsSection />
      </div>
    </MainLayout>
  );
};

export default ActiveSessions;
