import { useEffect, useState } from 'react';
import { useGetCandidateResumeDownloadQuery } from '../../../api/candidate-service/Candidates/scoring';

// Shared by ResumeViewerModal and the Candidate Details tab's inline
// preview, so both render the resume the exact same way.
//
// `GET /candidates/{id}/resume` returns a short-lived presigned S3 URL whose
// stored `Content-Disposition` is `attachment` — pointing an <iframe> at it
// directly makes the browser download the file rather than render it. So
// the bytes are fetched and handed back as a `blob:` URL instead.
//
// The file type is sniffed from the bytes themselves (S3 often serves
// resumes as application/octet-stream, so its Content-Type can't be
// trusted):
// - `pdf`  -> `blobUrl`, rendered by the PDF viewer.
// - `docx` -> `docxBlob`, rendered in-browser by docx-preview (DocxRender).
// - `doc`  -> legacy binary Word; no in-browser renderer exists, so callers
//             use Microsoft's Office viewer via `officeViewerUrl` (the same
//             approach the old app's react-doc-viewer used).
// - `unknown` is treated as PDF, exactly as before this sniffing existed.
// `inlineFailed` is set when the fetch itself fails (e.g. bucket CORS), so
// callers can fall back to a download link.

export type ResumeFileKind = 'pdf' | 'docx' | 'doc' | 'unknown';

const startsWith = (bytes: Uint8Array, signature: number[]) =>
  signature.every((byte, i) => bytes[i] === byte);

const sniffKind = (bytes: Uint8Array): ResumeFileKind => {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return 'pdf'; // "%PDF"
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return 'docx'; // ZIP (OOXML)
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'doc'; // OLE2
  return 'unknown';
};

export const officeViewerUrlFor = (downloadUrl: string) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(downloadUrl)}`;

export const useResumeBlobUrl = (candidateId: string, enabled: boolean) => {
  const { data, isFetching, error } = useGetCandidateResumeDownloadQuery(candidateId, {
    skip: !enabled || !candidateId,
  });
  const downloadUrl = data?.download_url ?? null;

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null);
  const [fileKind, setFileKind] = useState<ResumeFileKind | null>(null);
  const [inlineFailed, setInlineFailed] = useState(false);

  useEffect(() => {
    if (!downloadUrl) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setBlobUrl(null);
    setDocxBlob(null);
    setFileKind(null);
    setInlineFailed(false);

    fetch(downloadUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`resume fetch failed: ${res.status}`);
        return res.blob();
      })
      .then(async (blob) => {
        const kind = sniffKind(new Uint8Array(await blob.slice(0, 8).arrayBuffer()));
        if (cancelled) return;
        setFileKind(kind);
        if (kind === 'docx') {
          setDocxBlob(blob);
          return;
        }
        if (kind === 'doc') return; // rendered via officeViewerUrl
        // PDF (or unrecognised, treated as PDF as before). S3 sometimes serves
        // resumes as application/octet-stream, which an <iframe> won't render —
        // retype the blob as PDF so the viewer opens.
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

  const officeViewerUrl =
    fileKind === 'doc' && downloadUrl ? officeViewerUrlFor(downloadUrl) : null;

  return {
    downloadUrl,
    blobUrl,
    docxBlob,
    officeViewerUrl,
    fileKind,
    inlineFailed,
    isFetching,
    error,
  };
};
