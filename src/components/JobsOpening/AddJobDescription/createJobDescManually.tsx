import { useNavigate } from 'react-router-dom';
import { MdOutlineArrowBack } from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import { showToast } from '../../shared';
import { Loader } from '../../shared/ui/loader';
import { useStartManualJobOpening } from '../../../hooks/useStartManualJobOpening';
import { getJobErrorMessage } from '../../../shared/utils/auth/jobError.helpers';

const CreateJobDescription = () => {
  const navigate = useNavigate();
  const { startManualJobOpening, isStartingManualJob } = useStartManualJobOpening();

  return (
    <>
      {isStartingManualJob && <Loader />}
      <MainLayout>
        <div className="flex flex-col items-center px-4 mt-4 w-full">
          <div className="w-full max-w-4xl mb-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-800 cursor-pointer"
            >
              <MdOutlineArrowBack className="mr-2" />
              <span>Back</span>
            </button>
          </div>

          <div
            className="bg-[#FAFAFA] p-6 md:p-10 rounded-2xl shadow-lg w-full max-w-4xl flex flex-col items-center justify-center h-!calc(100vh-200px)"
            style={{ height: 'calc(100vh - 200px)' }}
          >
            <h2 className="text-center text-2xl font-semibold mb-6">Create Job Description</h2>

            <div className="bg-white p-6 md:p-10 rounded-2xl shadow-md w-full max-w-md flex flex-col items-center">
              <button className="border border-gray-300 px-6 py-3 rounded-full flex items-center justify-center w-full mb-4 hover:bg-gray-100 cursor-pointer">
                Upload from ATS
              </button>
              <span className="text-gray-500 text-sm mb-4">-------- OR --------</span>
              <button
                className="bg-button text-white px-6 py-3 rounded-full flex items-center justify-center w-full mb-4 cursor-pointer disabled:opacity-60"
                disabled={isStartingManualJob}
                onClick={async () => {
                  try {
                    const { jobId } = await startManualJobOpening();
                    navigate(`/job-details?jobOpeningId=${encodeURIComponent(jobId)}`);
                  } catch (error) {
                    showToast({
                      message: getJobErrorMessage(error, 'Failed to start job opening'),
                      type: 'error',
                    });
                  }
                }}
              >
                Create Job Opening Manually
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    </>
  );
};
export default CreateJobDescription;
