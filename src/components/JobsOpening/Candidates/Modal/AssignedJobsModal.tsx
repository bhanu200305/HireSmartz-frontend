import React from 'react';
import { Modal } from 'antd';
import type { CandidateJobAssignment } from '../../../../api/candidate-service/Candidates/AssignJobOpening';

type AssignedJobsModalProps = {
  open: boolean;
  onClose: () => void;
  assignedJobs?: CandidateJobAssignment[];
  selectedJobId?: number | null;
  onJobSelect?: (jobId: number) => void;
};

const AssignedJobsModal: React.FC<AssignedJobsModalProps> = ({
  open,
  onClose,
  assignedJobs = [],
  selectedJobId,
  // onJobSelect,
}) => {
  const formatStatusLabel = (status: string): string =>
    status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={600}
      centered
      closable={false}
      footer={[
        <button
          key="ok"
          onClick={onClose}
          className="h-11 min-w-[100px] px-8 bg-brand-900 text-white rounded-full font-semibold hover:opacity-90 cursor-pointer transition-opacity"
        >
          OK
        </button>,
      ]}
      styles={{
        content: {
          borderRadius: '20px',
          backgroundColor: '#f3f3f3',
          padding: '28px 28px 22px',
        },
        body: {
          padding: 0,
        },
        footer: {
          borderTop: 'none',
          paddingTop: '26px',
          textAlign: 'center',
        },
      }}
    >
      <h2 className="text-[24px] leading-none text-[#1f1f1f] font-semibold text-center m-8 p-4">
        Job Applications ({assignedJobs.length})
      </h2>

      {assignedJobs.length === 0 ? (
        <div className="rounded-2xl bg-[#e8edf8] py-10 px-6 text-center">
          <p className="text-gray-500">No assigned jobs found</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#e8edf8] px-4 m-8 py-3">
          <div className="grid grid-cols-[1fr_auto] text-[#232323] font-semibold text-[18px] px-2 pb-1">
            <span>Job Title</span>
            <span className="text-right">Status</span>
          </div>

          <div className="space-y-1 pt-1">
            {assignedJobs.map((job) => {
              // TODO: isSelected is computed but the onClick/selection wiring
              // below is commented out and className never branches on it —
              // looks like an in-progress "select a job" interaction. Left
              // as-is (not guessing at intended behavior) during the lint
              // cleanup pass.
              // eslint-disable-next-line unused-imports/no-unused-vars
              const isSelected = selectedJobId === job.jobOpeningId;

              return (
                <button
                  key={job.jobOpeningId}
                  type="button"
                  // onClick={() => onJobSelect?.(job.jobOpeningId)}
                  className={`w-full grid grid-cols-[1fr_auto] items-center px-2 py-1 rounded-md text-left transition-colors ${'hover:bg-white/40'}`}
                >
                  <span className="text-[17px] text-[#2b2b2b]">{job.jobTitle}</span>
                  <span className="text-[17px] font-semibold text-brand-900 text-right">
                    {formatStatusLabel(job.externalStatus)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AssignedJobsModal;
