import { useNavigate } from 'react-router-dom';
import MainLayout from '../../../layouts/MainLayout';
import { HiOutlineCash } from 'react-icons/hi';
import { MdOutlineArrowBack } from 'react-icons/md';
import ComingSoonTab from '../../shared/ui/ComingSoonTab';

// This page is a "Coming Soon" placeholder — the filtering/pagination logic
// that used to live here was never wired to any rendered UI, so it was
// removed as dead code rather than kept unused. Re-add it alongside the
// real Finances table when that feature is built.
const FinancesPage = () => {
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
            <HiOutlineCash size={18} />
          </span>
          <h2 className="font-display text-xl font-bold text-gray-900">Finances</h2>
        </div>
        <ComingSoonTab label="Finances" />
      </div>
    </MainLayout>
  );
};

export default FinancesPage;
