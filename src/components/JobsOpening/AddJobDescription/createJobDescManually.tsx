import { useNavigate } from 'react-router-dom';
import { MdOutlineArrowBack } from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import { useDispatch } from 'react-redux';
import { resetJobState } from '../../../redux/slices/jobOpeningSlice';

const CreateJobDescription = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  return (
    <>
      <MainLayout>
        <div className="flex flex-col items-center bg-white px-4 mt-4 relative pt-16">
          {/* Back Button */}
          <div className="mb-4 self-start px-4 absolute">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
            >
              <MdOutlineArrowBack className="mr-2" />
              <span>Back</span>
            </button>
          </div>

          {/* Main Container */}
          <div
            className="bg-[#FAFAFA] p-6 md:p-10 rounded-2xl shadow-lg w-full max-w-4xl flex flex-col items-center justify-center h-!calc(100vh-200px)"
            style={{ height: 'calc(100vh - 200px)' }}
          >
            <h2 className="text-center text-2xl font-semibold mb-6">Create Job Description</h2>

            {/* Card Section */}
            <div className="bg-white p-6 md:p-10 rounded-2xl shadow-md w-full max-w-md flex flex-col items-center">
              <button className="border border-gray-300 px-6 py-3 rounded-full flex items-center justify-center w-full mb-4 hover:bg-gray-100 cursor-pointer">
                UPLOAD FROM ATS
              </button>
              <span className="text-gray-500 text-sm mb-4">-------- OR --------</span>
              <button
                className="bg-button text-white px-6 py-3 rounded-full flex items-center justify-center w-full mb-4 cursor-pointer"
                onClick={() => {
                  dispatch(resetJobState());
                  navigate('/job-details');
                }}
              >
                CREATE JOB OPENING MANUALLY
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    </>
  );
};
export default CreateJobDescription;
