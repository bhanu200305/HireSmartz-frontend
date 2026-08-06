import { Form } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Input } from '../../shared';
import { useGetJobOpeningByIdQuery } from '../../../api/job-service/JobOpening/GetJobOpeningById';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Loader } from '../../shared/ui/loader';

const ViewJobSkills = () => {
  const { id } = useParams();
  const jobId = Number(id);
  const {
    data: jobData,
    isLoading,
    refetch,
  } = useGetJobOpeningByIdQuery({ jobOpeningId: Number(jobId) });
  useEffect(() => {
    refetch();
  }, [refetch]);
  return (
    <>
      {isLoading && <Loader />}
      <Form layout="vertical" autoComplete="off">
        <div className="grid grid-cols-2 gap-x-4">
          {/* <Form.Item
            label={
              <span>
                Communication Skills <span className="required-asterisk">*</span>
              </span>
            }
          >
            <Input
              type="text"
              className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              value={jobData?.data.communicationSkills || ''}
              disabled
            />
          </Form.Item> */}
          <Form.Item
            label={
              <span>
                Required Skills <span className="required-asterisk">*</span>
              </span>
            }
          >
            <Input
              type="text"
              className="w-full p-2 mt-1 mb-4 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              value={
                jobData?.data.mandatorySkills?.length
                  ? `${jobData.data.mandatorySkills.length} skills selected`
                  : ''
              }
              disabled
            />{' '}
            {jobData?.data.mandatorySkills.length && jobData?.data.mandatorySkills.length > 0 ? (
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-40 overflow-auto pr-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Selected Skills</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {jobData?.data.mandatorySkills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-brand-100 text-brand-800 rounded-full text-sm"
                    >
                      {skill.skillName}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Form.Item>

          <Form.Item label={<span>Optional Skills</span>}>
            <Input
              type="text"
              className="w-full p-2 mt-1 mb-4 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              value={
                jobData?.data.optionalSkills?.length
                  ? `${jobData.data.optionalSkills.length} skills selected`
                  : ''
              }
              disabled
            />{' '}
            {jobData?.data.optionalSkills.length && jobData?.data.optionalSkills.length > 0 ? (
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-40 overflow-auto pr-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Selected Skills</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {jobData?.data.optionalSkills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-brand-100 text-brand-800 rounded-full text-sm"
                    >
                      {skill.skillName}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </Form.Item>
        </div>
        <div className="grid grid-cols-2 gap-x-4 mt-2">
          <Form.Item label={<span>Responsibilities</span>}>
            <TextArea
              // placeholder="Other Requirements"
              rows={4}
              className="w-full px-4 py-2 border text-gray-500 rounded-lg border-[var(--border)]"
              style={{ backgroundColor: '#ffffff', color: '#6b7280' }}
              value={jobData?.data.responsibilities || ''}
              disabled
            />
          </Form.Item>
          <Form.Item
            label={
              <span>
                Education Preference <span className="required-asterisk">*</span>
              </span>
            }
          >
            <Input
              type="text"
              className="w-full p-2 mt-1 bg-white border rounded-3xl focus:ring focus:ring-brand-300 border-[var(--border)]"
              value={
                jobData?.data.educationPreference?.map((item) => item.educationLevel).join(', ') ||
                ''
              }
              disabled
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols gap-4">
          <Form.Item label={<span>Other Requirements</span>}>
            <TextArea
              // placeholder="Other Requirements"
              rows={4}
              className="w-full px-4 py-2 border text-gray-500 rounded-lg border-[var(--border)]"
              style={{ backgroundColor: '#ffffff', color: '#6b7280' }}
              value={jobData?.data.otherRequirements || ''}
              disabled
            />
          </Form.Item>
        </div>
      </Form>
    </>
  );
};

export default ViewJobSkills;
