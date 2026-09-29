import AntdCommonModal from '../../../shared/ui/AntdCommonModal';
import { Loader } from '../../../shared/ui/loader';
import { getCandidateErrorMessage } from '../../../../shared/utils/auth/candidateError.helpers';
import { useResumeBlobUrl } from '../useResumeBlobUrl';

// Views the candidate's resume IN PLACE instead of downloading it.
//
// `GET /candidates/{id}/resume` returns a short-lived presigned S3 URL whose
// stored `Content-Disposition` is `attachment` — pointing a link or
// `window.open` at it makes the browser download the file rather than render
// it. So the bytes are fetched (useResumeBlobUrl) and handed to an <iframe>
// as a `blob:` URL, which the browser's built-in PDF viewer renders inline.
//
// The fetch is cross-origin (S3), so it only succeeds if the bucket's CORS
// policy allows this origin for GET. When it doesn't — or the file is a
// DOC/DOCX, which an <iframe> can't render — it falls back to an
// open-in-new-tab link. An inline-disposition URL from the backend would
// drop the fetch hop entirely (see INTERVIEW_INTAKE_FLOW_BACKEND_GAPS.md).

type ResumeViewerModalProps = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
};

const ResumeViewerModal = ({
  open,
  onClose,
  candidateId,
  candidateName,
}: ResumeViewerModalProps) => {
  const { downloadUrl, blobUrl, inlineFailed, isFetching, error } = useResumeBlobUrl(
    candidateId,
    open
  );

  const downloadName = `${candidateName.replace(/[^\w.-]+/g, '_') || 'candidate'}-resume.pdf`;

  return (
    <AntdCommonModal
      open={open}
      onClose={onClose}
      title="Resume"
      subtitle={candidateName}
      modalProps={{ width: 900, maskClosable: true }}
    >
      {isFetching ? (
        <div className="flex justify-center py-10">
          <Loader />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500">
          {getCandidateErrorMessage(error, 'Could not load the resume.')}
        </p>
      ) : !downloadUrl ? (
        <p className="text-sm text-gray-500">No resume on file yet.</p>
      ) : inlineFailed ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-gray-600">
            This resume can&apos;t be previewed here (it may be a Word document). Download it or
            open it in a new tab instead.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href={downloadUrl}
              className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white"
            >
              DOWNLOAD RESUME
            </a>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-primary-200 bg-primary-50 px-6 py-2 text-sm font-semibold text-primary-700"
            >
              OPEN IN NEW TAB
            </a>
          </div>
        </div>
      ) : !blobUrl ? (
        <div className="flex justify-center py-10">
          <Loader />
        </div>
      ) : (
        // Height computed from the SAME --app-header-height/--app-footer-height
        // vars index.css uses for `.ant-modal-content`'s own max-height
        // budget (`calc(100vh - header - footer - 48px)`), minus extra room
        // for this modal's title/subtitle block, the actions row below the
        // iframe, and padding — not a guessed vh percentage. A flat guess
        // can still exceed the modal's real available space once all of
        // that is counted, which leaves `.modal-content`'s own scroll
        // fallback engaged ALONGSIDE the PDF viewer's own — this ties the
        // box to the exact budget so that never happens, and the PDF viewer
        // is the only thing that ever scrolls.
        <div
          className="flex flex-col gap-3 overflow-hidden"
          style={{
            height:
              'calc(100vh - var(--app-header-height, 64px) - var(--app-footer-height, 84px) - 248px)',
          }}
        >
          <iframe
            title={`${candidateName} resume`}
            src={blobUrl}
            className="w-full flex-1 min-h-0 rounded-lg border border-neutral-200"
          />
          <div className="flex items-center justify-end gap-4">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary-600 hover:underline"
            >
              Open in new tab ›
            </a>
            {/* Same-origin blob: URL, so the `download` attribute is honoured
                and the file saves without a round-trip. */}
            <a
              href={blobUrl}
              download={downloadName}
              className="rounded-full bg-primary px-5 py-1.5 text-xs font-semibold text-white"
            >
              DOWNLOAD RESUME
            </a>
          </div>
        </div>
      )}
    </AntdCommonModal>
  );
};

export default ResumeViewerModal;
