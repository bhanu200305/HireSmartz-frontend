import { useEffect, useState } from 'react';
import { useGetCandidateResumeDownloadQuery } from '../../../api/candidate-service/Candidates/scoring';

// Shared by ResumeViewerModal and the Candidate Details tab's inline
// preview, so both render the resume the exact same way.
//
// `GET /candidates/{id}/resume` returns a short-lived presigned S3 URL whose
// stored `Content-Disposition` is `attachment` — pointing an <iframe> at it
// directly makes the browser download the file rather than render it. So
// the bytes are fetched and handed back as a `blob:` URL instead, which the
// browser's built-in PDF viewer renders inline. `inlineFailed` is set when
// that fetch fails (bucket CORS not allowing this origin, or a DOC/DOCX the
// viewer can't render) so callers can fall back to a download link.
export const useResumeBlobUrl = (candidateId: string, enabled: boolean) => {
  const { data, isFetching, error } = useGetCandidateResumeDownloadQuery(candidateId, {
    skip: !enabled || !candidateId,
  });
  const downloadUrl = data?.download_url ?? null;

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [inlineFailed, setInlineFailed] = useState(false);

  useEffect(() => {
    if (!downloadUrl) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setBlobUrl(null);
    setInlineFailed(false);

    fetch(downloadUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`resume fetch failed: ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        // S3 sometimes serves resumes as application/octet-stream, which an
        // <iframe> won't render — retype the blob as PDF so the viewer opens.
        const pdfBlob =
          blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
        objectUrl = URL.createObjectURL(pdfBlob);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setInlineFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [downloadUrl]);

  return { downloadUrl, blobUrl, inlineFailed, isFetching, error };
};
