import { Button } from '../..';
import { useNavigate } from 'react-router-dom';
import { BsCalendar4Event } from 'react-icons/bs';
import MainLayout from '../../../layouts/MainLayout';

const UpdatePackage = () => {
  const navigate = useNavigate();

  return (
    <div>
      <MainLayout>
        <div className="flex flex-col items-center bg-white px-6 mt-6 pt-16 pb-10">
          {/* {isLoading && <Loader />} */}
          <div className="w-full justify-start mb-6">
            <div className="flex items-center space-x-2">
              <span className="bg-gradient-to-br from-primary-600 to-accent-500 text-white p-2 rounded-full flex items-center justify-center shadow-sm">
                <BsCalendar4Event size={18} />
              </span>
              <h2 className="text-xl font-semibold">Subscriptions</h2>
            </div>
          </div>

          <div className="bg-[#FAFAFA] p-8 rounded-2xl shadow-lg w-full max-w-2xl">
            <h2 className="text-center text-2xl font-semibold mb-2">Current Package Details</h2>
            <div className="bg-[#FAFAFA] p-8 rounded-2xl shadow-lg w-full max-w-2xl">
              <p className="text-center  mb-2">Company Name : Netsmartz LLC</p>
              <p className="text-center  mb-2">Current Package : Enterprise</p>
              <p className="text-center  mb-2">Calls Left In Current Package : 1500/10000</p>
              <p className="text-center  mb-2">Plan Start Date : 15-01-2025</p>
              <p className="text-center  mb-2">Plan End Date : 15-06-2025</p>
              <p className="text-center  mb-2">Plan Status : Active</p>

              <Button
                className="w-full text-center text-white bg-button rounded-3xl px-4 py-2  items-center space-x-2"
                onClick={() => navigate('/update-package')}
              >
                {' '}
                <span>Update Package</span>
              </Button>
              <Button
                className="w-full text-center text-black border border-[#fe7725] bg-white rounded-3xl px-4 py-2  items-center space-x-2 mt-2"
                onClick={() => navigate('/update-payment')}
              >
                {' '}
                <span>Update Payment</span>
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    </div>
  );
};

export default UpdatePackage;
