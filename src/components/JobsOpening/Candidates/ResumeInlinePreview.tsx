import { BsFullscreen } from 'react-icons/bs';
import { SpecialZoomLevel, Viewer, Worker } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
// Bundled with the app (same pdfjs-dist version @react-pdf-viewer 3.12
// pairs with) rather than fetched from a CDN the way the old app did.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { Loader } from '../../shared/ui/loader';
import { getCandidateErrorMessage } from '../../../shared/utils/auth/candidateError.helpers';
import { useResumeBlobUrl } from './useResumeBlobUrl';

type ResumeInlinePreviewProps = {
  candidateId: string;
  candidateName: string;
  /** Opens the full-size ResumeViewerModal. */
  onExpand: () => void;
  /** Tailwind height class for the preview box. */
  heightClassName?: string;
};

// Small, always-visible resume thumbnail for the Candidate Details tab — the
// old app's right-hand preview: the whole page rendered scaled-down with
// @react-pdf-viewer (no browser PDF toolbar), a fullscreen icon centered on
// top, and a click anywhere opening the full viewer (ResumeViewerModal).
// Same blob-URL loading as that modal (useResumeBlobUrl).
const ResumeInlinePreview = ({
  candidateId,
  candidateName,
  onExpand,
  heightClassName = 'h-[380px]',
}: ResumeInlinePreviewProps) => {
  const { downloadUrl, blobUrl, inlineFailed, isFetching, error } = useResumeBlobUrl(
    candidateId,
    true
  );

  const cannotPreview = (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-neutral-200 p-6 text-center">
      <p className="text-sm text-gray-600">
        This resume can&apos;t be previewed here (it may be a Word document).
      </p>
      {downloadUrl && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-primary-600 hover:underline"
        >
          Open in new tab ›
        </a>
      )}
    </div>
  );

  if (isFetching || (downloadUrl && !blobUrl && !inlineFailed)) {
    return (
      <div
        className={`flex ${heightClassName} items-center justify-center rounded-lg border border-neutral-200`}
      >
        <Loader />
      </div>
    );
  }

  if (error || !downloadUrl) {
    return (
      <p className="rounded-lg border border-neutral-200 p-4 text-center text-sm text-gray-500">
        {error
          ? getCandidateErrorMessage(error, 'Could not load the resume.')
          : 'No resume on file yet.'}
      </p>
    );
  }

  if (inlineFailed || !blobUrl) return cannotPreview;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open ${candidateName} resume`}
      title="Open resume"
      onClick={onExpand}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onExpand();
        }
      }}
      className={`group relative ${heightClassName} cursor-pointer overflow-hidden rounded-lg border border-neutral-200 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30`}
    >
      {/* Whole page fitted into the box, read-only: pointer events off so
          the click always reaches the wrapper (opens the full viewer). */}
      <div className="pointer-events-none h-full w-full">
        <Worker workerUrl={pdfWorkerUrl}>
          <Viewer
            fileUrl={blobUrl}
            defaultScale={SpecialZoomLevel.PageFit}
            renderError={() => cannotPreview}
          />
        </Worker>
      </div>
      <span className="absolute left-1/2 top-1/2 inline-flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-sm transition-transform group-hover:scale-110">
        <BsFullscreen size={18} aria-hidden />
      </span>
    </div>
  );
};

export default ResumeInlinePreview;
