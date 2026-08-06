import { Modal, Select } from 'antd';
import { Button, showToast, Textarea } from '../../../shared';
import useJobOpeningDropdown from '../../../../hooks/useJobOpeningDropdown';
import { useState } from 'react';
import { useCloseJobMutation } from '../../../../api/job-service/JobOpening/CloseJob';
import { get } from 'lodash-es';
import { Loader } from '../../../shared/ui/loader';

type CloseJobProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  jobOpeningId: number | null;
  interviewCount: {
    selectedCount: number;
    bookingCreatedCount: number;
    inProgressCount: number;
    invitationSentCount: number;
  };
  onSuccess: () => void;
};

const { Option } = Select;

const CloseJobModal: React.FC<CloseJobProps> = ({
  visible,
  onClose,
  title,
  jobOpeningId,
  interviewCount,
  onSuccess,
}) => {
  const [closeJob, { isLoading: isCloseJobLoading }] = useCloseJobMutation();
  const { jobOpeningDropdown: jobClosureOptions, loading: jobClosureLoading } =
    useJobOpeningDropdown('CLOSURE_REASON', 'create', undefined, !visible);
  const [closureReason, setClosureReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');
  const [commentError, setCommentError] = useState<boolean>(false);

  const selectedReason = jobClosureOptions.find((option: any) => option.id === closureReason);
  const isOtherReason = selectedReason?.name === 'Other';

  const handleCloseJob = () => {
    if (isOtherReason && !otherReason.trim()) {
      setCommentError(true);
      return;
    }

    const payload = {
      jobId: Number(jobOpeningId),
      reasonId: Number(closureReason),
      customReason: otherReason ?? '',
    };

    closeJob(payload)
      .unwrap()
      .then((res) => {
        if (res?.success) {
          showToast({
            message: get(res, 'message', 'Job closed successfully.'),
            type: 'success',
          });
          setClosureReason('');
          setOtherReason('');
          onClose();
          onSuccess();
        } else {
          showToast({
            message: get(res, 'message', 'Failed to close job.'),
            type: 'error',
          });
          setClosureReason('');
          setOtherReason('');
        }
      })
      .catch((err) => {
        showToast({
          message: get(err, 'data.message', 'Something went wrong while closing the job.'),
          type: 'error',
        });
        setClosureReason('');
        setOtherReason('');
      });
  };

  const handleModalClose = () => {
    setClosureReason('');
    setOtherReason('');
    onClose();
  };

  return (
    <Modal
      open={visible}
      onCancel={handleModalClose}
      centered
      footer={null}
      maskClosable={false}
      keyboard={false}
      width={600}
      className="custom-modal"
    >
      {isCloseJobLoading && <Loader />}
      <div>
        <h2 className="text-[15px] font-semibold text-center mb-1">{title}</h2>

        <p className="text-center font-bold mb-6">
          Are you sure you want to proceed with closing this Job?
        </p>

        <div className="w-1/2 mx-auto bg-white border border-[var(--border)] rounded-xl p-4 mb-6">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Selected for Offer</span>
            <span className="text-gray-600">{interviewCount.selectedCount ?? 0} Candidates</span>
          </div>

          <div className="flex justify-between text-sm mt-2">
            <span className="font-medium">Invited for Interview</span>
            <span className="text-gray-600">
              {interviewCount.invitationSentCount ?? 0} Candidates
            </span>
          </div>

          <div className="flex justify-between text-sm mt-2">
            <span className="font-medium">Interview Scheduled</span>
            <span className="text-gray-600">
              {interviewCount.bookingCreatedCount ?? 0} candidates
            </span>
          </div>

          <div className="flex justify-between text-sm mt-2">
            <span className="font-medium">Under Process</span>
            <span className="text-gray-600">{interviewCount.inProgressCount ?? 0} candidates</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-sm capitalize">
            Reason <span className="required-asterisk">*</span>
          </label>
          <div className="border-wrapper border border-[var(--border)] p-1 w-full rounded-3xl">
            <Select
              className="w-full custom-select-jobs placeholder-style"
              allowClear
              value={closureReason}
              onChange={(value) => setClosureReason(value)}
              placeholder="Select Reason"
              loading={jobClosureLoading}
            >
              {jobClosureOptions.length > 0 ? (
                jobClosureOptions.map((reason: any) => (
                  <Option key={reason.id} value={reason.id}>
                    {reason.name}
                  </Option>
                ))
              ) : (
                <Option value="no-reason" disabled>
                  No closure reasons found
                </Option>
              )}
            </Select>
          </div>
        </div>

        {isOtherReason && (
          <div className="mb-5">
            <label className="text-sm capitalize">
              Comments <span className="required-asterisk">*</span>
            </label>

            <Textarea
              rows={4}
              className={`w-full p-3 bg-white border rounded-3xl focus:ring focus:ring-brand-300 ${
                commentError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Add comments here..."
              value={otherReason}
              onChange={(e) => {
                if (e.target.value.trim()) {
                  setCommentError(false);
                }
                setOtherReason(e.target.value);
              }}
            />
            {commentError && <p className="text-xs text-red-500 mt-1">Please add comments</p>}
          </div>
        )}

        <div className="flex justify-center items-center space-x-2">
          <Button
            className="font-bold border border-gray-300 w-full rounded-full px-7 py-3"
            onClick={handleModalClose}
            disabled={isCloseJobLoading}
          >
            CANCEL
          </Button>

          <Button
            className="font-bold rounded-full px-7 py-3 w-full text-white bg-brand-600"
            onClick={handleCloseJob}
            loading={isCloseJobLoading}
            disabled={!closureReason || (isOtherReason && !otherReason.trim())}
          >
            CONFIRM
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CloseJobModal;
