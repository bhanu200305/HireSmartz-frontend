import MainLayout from '../../../layouts/MainLayout';
import { HiOutlineCash } from 'react-icons/hi';
import '../customerPage.css';
import ComingSoon from '../../../assets/svgs/ComingSoon.svg';

// This page is a "Coming Soon" placeholder — the filtering/pagination logic
// that used to live here was never wired to any rendered UI, so it was
// removed as dead code rather than kept unused. Re-add it alongside the
// real Finances table when that feature is built.
const FinancesPage = () => {
  return (
    <div>
      <MainLayout>
        <div className="w-full p-8 justify-start pt-18">
          <div className="flex items-center space-x-2 mb-12">
            <span className="bg-black text-white p-2 rounded-3xl flex items-center justify-center">
              <HiOutlineCash size={18} />
            </span>
            <h2 className="text-xl font-semibold">Finances</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="mb-4">
              <img src={ComingSoon} alt="Coming Soon" className="w-50 h-50" />
            </div>
            <p className="text-lg text-gray-400">COMING SOON</p>
          </div>
        </div>
      </MainLayout>
    </div>
  );
};

export default FinancesPage;
