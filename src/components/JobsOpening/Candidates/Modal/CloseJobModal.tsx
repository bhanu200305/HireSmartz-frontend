import { Modal, Select } from 'antd';
import { Button, showToast, Textarea } from '../../../shared';
import useJobOpeningDropdown from '../../../../hooks/useJobOpeningDropdown';
import { useState } from 'react';
import { useCloseJobMutation } from '../../../../api/job-service/JobOpening/CloseJob';
import { getJobErrorMessage } from '../../../../shared/utils/auth/jobError.helpers';
import { Loader } from '../../../shared/ui/loader';

type CloseJobProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  jobOpeningId: string | null;
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
  const [notifyCandidates, setNotifyCandidates] = useState(true);

  const selectedReason = jobClosureOptions.find((option) => option.id === closureReason);
  const isOtherReason = selectedReason?.name === 'Other';

  const handleCloseJob = () => {
    if (!jobOpeningId) return;
    if (isOtherReason && !otherReason.trim()) {
      setCommentError(true);
      return;
    }
    if (!closureReason && !otherReason.trim()) {
      showToast({ message: 'Please select a closure reason.', type: 'error' });
      return;
    }

    closeJob({
      jobId: jobOpeningId,
      reasonId: isOtherReason ? null : closureReason || null,
      customReason: isOtherReason || !closureReason ? otherReason : undefined,
      notifyCandidates,
    })
      .unwrap()
      .then((res) => {
        showToast({
          message: res?.message || 'Job closed successfully.',
          type: 'success',
        });
        setClosureReason('');
        setOtherReason('');
        onClose();
        onSuccess();
      })
      .catch((err) => {
        showToast({
          message: getJobErrorMessage(err, 'Something went wrong while closing the job.'),
          type: 'error',
        });
      });
  };

  return (
    <Modal open={visible} onCancel={onClose} footer={null} centered destroyOnClose>
      {(isCloseJobLoading || jobClosureLoading) && <Loader />}
      <div className="p-2">
        <h3 className="text-lg font-semibold mb-2">Close Job Opening</h3>
        {title && <p className="text-sm text-gray-600 mb-4">{title}</p>}
        {(interviewCount.selectedCount > 0 ||
          interviewCount.bookingCreatedCount > 0 ||
          interviewCount.inProgressCount > 0 ||
          interviewCount.invitationSentCount > 0) && (
          <p className="text-xs text-amber-700 mb-3">
            This job still has active interview activity. Closing will stop new applications.
          </p>
        )}

        <label htmlFor="close-job-reason" className="text-sm text-gray-600">
          Closure reason
        </label>
        <Select
          id="close-job-reason"
          className="w-full mt-1 mb-3"
          placeholder="Select a reason"
          value={closureReason || undefined}
          onChange={(value) => {
            setClosureReason(value);
            setCommentError(false);
          }}
        >
          {jobClosureOptions.map((option) => (
            <Option key={option.id} value={option.id}>
              {option.name}
            </Option>
          ))}
        </Select>

        {(isOtherReason || !closureReason) && (
          <>
            <label htmlFor="close-job-custom-reason" className="text-sm text-gray-600">
              Custom reason
            </label>
            <Textarea
              id="close-job-custom-reason"
              className="mt-1 mb-1"
              value={otherReason}
              onChange={(e) => {
                setOtherReason(e.target.value);
                setCommentError(false);
              }}
              placeholder="Tell us why this job is closing"
            />
            {commentError && (
              <p className="text-xs text-red-500 mb-2">Please provide a custom reason.</p>
            )}
          </>
        )}

        <label className="flex items-center gap-2 text-sm text-gray-700 mt-2 mb-4">
          <input
            type="checkbox"
            checked={notifyCandidates}
            onChange={(e) => setNotifyCandidates(e.target.checked)}
          />
          Notify candidates
        </label>

        <div className="flex justify-end gap-2">
          <Button className="border rounded-3xl px-4 py-2" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="text-white bg-button rounded-3xl px-4 py-2"
            onClick={handleCloseJob}
            disabled={isCloseJobLoading}
          >
            Close Job
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CloseJobModal;
