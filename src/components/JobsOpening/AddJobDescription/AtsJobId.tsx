import { useNavigate } from 'react-router-dom';
import { MdOutlineArrowBack } from 'react-icons/md';
import MainLayout from '../../../layouts/MainLayout';
import { useState } from 'react';
import { Form, Select } from 'antd';
import {
  useGetAtsDropdownsValuesQuery,
  useLazyGetAtsJobByIdQuery,
} from '../../../api/job-service/AtsJobDetails/AtsJobDetails';
import { Loader } from '../../shared/ui/loader';
import { showToast } from '../../shared';
import { get } from 'lodash-es';

const { Option } = Select;

const AtsJobId = () => {
  const navigate = useNavigate();

  const [selectedJobId, setSelectedJobId] = useState('');

  const { data: atsData, isLoading } = useGetAtsDropdownsValuesQuery();
  const [triggerGetJob, { isLoading: isJobLoading }] = useLazyGetAtsJobByIdQuery();

  const handleSubmit = async () => {
    if (!selectedJobId) return;
    try {
      const response = await triggerGetJob({ atsJobOpeningId: String(selectedJobId) }).unwrap();

      if (response?.success) {
        showToast({
          message: get(response, 'message', 'Job details has been fetched successfully'),
          type: 'success',
        });
        navigate('/job-details', {
          state: {
            jobData: response.data,
            refresh: true,
            atsJobOpeningId: selectedJobId,
          },
        });
      } else {
        showToast({
          message: get(response, 'message', 'Failed to fetch job details.'),
          type: 'error',
        });
      }
    } catch (err) {
      showToast({
        message: get(err, 'data.message', 'Something went wrong while fetching job details.'),
        type: 'error',
      });
    }
  };

  return (
    <MainLayout>
      {isJobLoading && <Loader />}
      <div className="flex flex-col items-center bg-white px-4 mt-4 relative pt-16">
        <div className="mb-4 self-start px-4 absolute">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 cursor-pointer"
          >
            <MdOutlineArrowBack className="mr-2" />
            <span>Back</span>
          </button>
        </div>

        <div
          className="bg-[#FAFAFA] p-6 md:p-10 rounded-2xl shadow-lg w-full max-w-4xl flex flex-col items-center justify-center"
          style={{ height: 'calc(100vh - 200px)' }}
        >
          <div className="bg-white p-6 md:p-10 rounded-2xl shadow-md w-full max-w-md flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-4">Upload from ATS</h3>
            <label className="self-start mb-2 text-sm text-gray-600">Please Select Job ID</label>

            <Form.Item className="w-full">
              <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
                <Select
                  showSearch
                  placeholder="Select Job ID"
                  value={selectedJobId || undefined}
                  optionFilterProp="children"
                  loading={isLoading}
                  onChange={(value) => setSelectedJobId(value)}
                  filterOption={(input, option) =>
                    (option?.children?.toString().toLowerCase() ?? '').includes(input.toLowerCase())
                  }
                  className="w-full custom-select-jobs placeholder-style"
                >
                  {atsData?.data?.map((ats) => (
                    <Option key={ats.id} value={ats.id}>
                      {ats.combinedName}
                    </Option>
                  ))}
                </Select>
              </div>
            </Form.Item>

            <div className="relative w-full">
              <button
                className={`bg-button text-white px-6 py-3 rounded-full flex items-center justify-center w-full mb-4 relative ${
                  !selectedJobId ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
                onClick={handleSubmit}
                disabled={!selectedJobId}
              >
                SAVE & NEXT
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AtsJobId;
