import { useNavigate } from 'react-router-dom';
import { BsCalendar4Event } from 'react-icons/bs';
import { MdOutlineArrowBack } from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import '../customerPage.css';
import ComingSoonTab from '../../shared/ui/ComingSoonTab';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  return (
    <MainLayout>
      <div className="w-full p-8 pt-16">
        <button
          onClick={() => navigate('/')}
          className="mb-4 flex w-fit items-center text-gray-600 hover:text-gray-800 cursor-pointer"
        >
          <MdOutlineArrowBack className="mr-2" />
          <span>Back</span>
        </button>
        <div className="flex items-center space-x-2 mb-6">
          <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
            <BsCalendar4Event size={18} />
          </span>
          <h2 className="font-display text-xl font-bold text-gray-900">Subscriptions</h2>
        </div>
        <ComingSoonTab label="Subscriptions" />
      </div>
    </MainLayout>
  );
};

export default SubscriptionPage;
