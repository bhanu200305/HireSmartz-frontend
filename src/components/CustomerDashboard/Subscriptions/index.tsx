import { BsCalendar4Event } from 'react-icons/bs';
import MainLayout from '../../../layouts/MainLayout';
import '../customerPage.css';
import ComingSoonTab from '../../shared/ui/ComingSoonTab';

const SubscriptionPage = () => {
  return (
    <MainLayout>
      <div className="w-full p-8 pt-16">
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
