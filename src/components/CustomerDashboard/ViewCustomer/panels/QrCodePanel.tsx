import React from 'react';
import { MdOutlineDownload, MdOutlineRefresh } from 'react-icons/md';
import { Typography, Button } from '../../../shared';
import { Loader } from '../../../shared/ui/loader';
import { useGetPlatformTenantQrCodeQuery } from '../../../../api/organization-service/Platform/qrCode';

/**
 * Super Admin's mirror of MyCompany/QrManagementTab.tsx — read-only display
 * + download, same as the tenant-side contract (no regenerate endpoint
 * exists there either). Same "Regenerate" caveat as that tab's own comment:
 * it re-resolves this same real endpoint's freshly-signed download URL on
 * demand, it does not produce a different QR image (permanently tied to
 * this tenant's id, nothing to regenerate) — named for what a user expects
 * to click, not literally what happens underneath.
 */
const QrCodePanel: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading, isFetching, refetch } = useGetPlatformTenantQrCodeQuery(tenantId);

  if (isLoading) return <Loader />;

  return (
    <div className="p-4 flex flex-col items-center text-center">
      <Typography variant="h5" className="mb-1 block">
        Public Job Openings QR Code
      </Typography>
      <Typography variant="body2" className="mb-6 max-w-md">
        Candidates who scan this are taken straight to this company&apos;s public job listing page.
      </Typography>

      {data?.url ? (
        <>
          <img
            src={data.url}
            alt="Company QR code"
            className="w-48 h-48 border rounded-xl p-2 mb-4"
          />
          <div className="flex items-center gap-3">
            <a href={data.url} download target="_blank" rel="noopener noreferrer">
              <Button className="rounded-full bg-button text-white px-5 py-2 flex items-center gap-2">
                <MdOutlineDownload /> Download
              </Button>
            </a>
            <Button
              className="rounded-full border border-gray-300 text-gray-700 px-5 py-2 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <MdOutlineRefresh className={isFetching ? 'animate-spin' : ''} />
              {isFetching ? 'Regenerating…' : 'Regenerate'}
            </Button>
          </div>
        </>
      ) : (
        <div className="p-6 text-gray-500 border border-dashed rounded-xl">
          QR code isn&apos;t available yet.
        </div>
      )}
    </div>
  );
};

export default QrCodePanel;
