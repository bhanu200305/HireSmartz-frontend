import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import BulkResumeUploadPanel from './BulkResumeUploadPanel';

// The listing page's one entry point for getting candidates onto this job:
// resume upload only (one or many files, up to BulkResumeUploadPanel's own
// limit), each parsed into a candidate by the backend — no manual entry.
// The single-candidate "Resume Upload" form (resume + hand-typed name /
// email / phone) and the tab switcher between the two were removed
// 2026-10-01; this modal is now just a frame around BulkResumeUploadPanel,
// which is unchanged.

type AddCandidateModalProps = {
  open: boolean;
  onClose: () => void;
  /** Fired when the bulk import finishes parsing — see BulkResumeUploadPanel's
   * own docstring for why this can't just rely on the mutation's cache-tag
   * invalidation. Optional so a caller that doesn't care doesn't have to
   * pass a no-op. */
  onBulkImportCompleted?: () => void;
};

const AddCandidateModal = ({ open, onClose, onBulkImportCompleted }: AddCandidateModalProps) => (
  <AntdCommonModal
    open={open}
    onClose={onClose}
    title="Upload Resume"
    subtitle="Upload one or more resumes to this job"
    modalProps={{ width: 560 }}
  >
    {/* Mounted only while open, so every opening starts with an empty
        file list (the old tab version reset its own state on close). */}
    {open && (
      <BulkResumeUploadPanel onCompleted={() => onBulkImportCompleted?.()} onDone={onClose} />
    )}
  </AntdCommonModal>
);

export default AddCandidateModal;
