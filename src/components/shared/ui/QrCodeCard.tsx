import React, { useState } from 'react';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { Button } from './button';

// One QR per tenant (organization-service's own design — see qrCode.ts's
// comment) — no name, no active/inactive toggle, no per-job mapping, no
// embeddable code snippet. A snippet would have to embed either the signed
// image URL (expires) or the careers link (fine on its own, but that isn't
// what a "QR embed" component would be for), so that whole feature from the
// old per-company-id backend has no honest equivalent here and is dropped
// rather than faked.
export type QrCodeCardProps = {
  title?: string;
  subtitle?: string;
  /** Signed URL to the PNG itself — re-fetched by the caller, not cached past expiry. */
  imageUrl?: string | null;
  /** The static page this QR points to — always valid, safe to copy/share on its own. */
  publicUrl: string;
  isLoading?: boolean;
  errorMessage?: string | null;
};

export const QrCodeCard: React.FC<QrCodeCardProps> = ({
  title = 'QR Code for Job Openings',
  subtitle,
  imageUrl,
  publicUrl,
  isLoading = false,
  errorMessage,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const hasQr = Boolean(imageUrl);

  const defaultSubtitle = hasQr
    ? 'Share this code or link. Anyone who scans it or opens it lands on your public job listings, no login required.'
    : 'Create a secure entry point for candidates. Scanning it takes them straight to your open jobs.';

  const handleCopyLink = (): void => {
    void navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = async (): Promise<void> => {
    if (!imageUrl) return;
    setIsDownloading(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'job-openings-qr-code.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    // Styled after the legacy careerforcepro-web QR card: Sora heading,
    // Roboto body, a bordered input-style row and a plain "DOWNLOAD" pill.
    <div
      className="flex items-center justify-center py-2"
      style={{ fontFamily: "'Roboto', sans-serif" }}
    >
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-8 sm:px-10 w-full max-w-md flex flex-col items-center gap-6">
        {/* Header */}
        <div className="text-center">
          <h2
            className="text-xl font-semibold text-gray-800 mb-2"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {title}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">{subtitle ?? defaultSubtitle}</p>
        </div>

        {/* QR Image */}
        <div className="w-48 h-48 flex items-center justify-center">
          {isLoading ? (
            <div className="w-10 h-10 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          ) : hasQr ? (
            <img
              src={imageUrl!}
              alt="QR code linking to your job openings"
              className="w-full h-full object-contain"
            />
          ) : (
            <p className="text-sm text-red-500 text-center px-2">
              {errorMessage ?? 'Failed to load QR code. Please try again.'}
            </p>
          )}
        </div>

        {hasQr && (
          <>
            {/* Public link, always valid — the QR just encodes this same URL */}
            <div className="w-full h-10 flex items-center gap-2 bg-white border border-gray-300 rounded-md pl-3 pr-2 hover:border-[#1B4DFF] transition-colors">
              <span className="flex-1 min-w-0 text-sm text-gray-700 truncate" title={publicUrl}>
                {publicUrl}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="shrink-0 flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Copy link"
                title={copied ? 'Copied!' : 'Copy link'}
              >
                {copied ? <CheckOutlined className="text-green-500" /> : <CopyOutlined />}
              </button>
            </div>

            <Button
              onClick={() => void handleDownload()}
              disabled={isDownloading}
              className="w-full h-11 bg-[#1B4DFF] text-white rounded-full font-bold text-sm tracking-widest flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isDownloading ? 'DOWNLOADING...' : 'DOWNLOAD'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default QrCodeCard;
