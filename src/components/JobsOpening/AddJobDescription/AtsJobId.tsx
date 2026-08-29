import { useNavigate } from 'react-router-dom';
import { MdOutlineArrowBack, MdOutlineCloudSync } from 'react-icons/md';
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
      <div className="flex flex-col items-center px-4 mt-4 w-full">
        <div className="w-full max-w-4xl mb-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg px-2 py-1 -ml-2 cursor-pointer transition-colors"
          >
            <MdOutlineArrowBack size={16} />
            <span>Back</span>
          </button>
        </div>

        <div
          className="bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-neutral-200 w-full max-w-4xl flex flex-col items-center justify-center"
          style={{ height: 'calc(100vh - 200px)' }}
        >
          <div className="bg-white p-6 md:p-10 rounded-2xl border border-neutral-100 w-full max-w-md flex flex-col items-center">
            <span className="bg-primary-50 text-primary-600 p-3 rounded-xl flex items-center justify-center mb-3">
              <MdOutlineCloudSync size={22} />
            </span>
            <h3 className="text-base font-bold text-neutral-900 font-display mb-1">
              Upload from ATS
            </h3>
            <label className="self-start mt-3 mb-2 text-sm font-semibold text-neutral-700">
              Please Select Job ID
            </label>

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
