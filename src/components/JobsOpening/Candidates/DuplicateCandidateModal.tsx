import { Modal, Button } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';
import { DUPLICATE_CANDIDATE_MODAL } from '../../../constants/app.constants';
import type { DuplicateCandidate } from '../../../types';

type DuplicateCandidateModalProps = {
  duplicates: DuplicateCandidate[];
  onAcknowledge: () => void;
};

const DuplicateCandidateModal = ({ duplicates, onAcknowledge }: DuplicateCandidateModalProps) => {
  const total = duplicates.length;
  const isOpen = total > 0;

  return (
    <Modal
      open={isOpen}
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={null}
      centered
      width={700}
    >
      <div className="flex flex-col gap-5 py-4 px-2">
        {/* Title */}
        <h2 className="text-2xl font-bold heading-font text-center">
          {DUPLICATE_CANDIDATE_MODAL.TITLE}
        </h2>

        {/* Subtitle */}
        <p className="text-sm roboto-font text-gray-700 text-center">
          {DUPLICATE_CANDIDATE_MODAL.SUBTITLE(total)}
        </p>

        {/* Info note */}
        <div className="flex items-start gap-2 justify-center">
          <ExclamationCircleFilled className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-500 roboto-font text-center">
            {DUPLICATE_CANDIDATE_MODAL.INFO_NOTE}
          </p>
        </div>

        {/* Scrollable candidate grid */}
        <div className="border border-gray-200 rounded-xl p-4 max-h-64 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            {duplicates.map((d) => (
              <div key={d.email} className="flex flex-col">
                <span className="text-sm font-medium text-gray-700 roboto-font">
                  {d.candidateName ?? '—'}
                </span>
                <span className="text-sm text-gray-400 roboto-font break-all">{d.email}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Acknowledge button */}
        <Button
          type="primary"
          className="w-full rounded-full font-semibold tracking-widest uppercase mt-1"
          size="large"
          onClick={onAcknowledge}
        >
          {DUPLICATE_CANDIDATE_MODAL.BUTTON_LABEL}
        </Button>
      </div>
    </Modal>
  );
};

export default DuplicateCandidateModal;
