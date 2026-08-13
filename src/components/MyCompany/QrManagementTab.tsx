import React from 'react';
import { MdOutlineDownload } from 'react-icons/md';
import { Typography, Button } from '../shared';
import { Loader } from '../shared/ui/loader';
import { useGetTenantQrCodeQuery } from '../../api/organization-service/Tenants/qrCode';

/**
 * GET /v1/tenants/{tenant_id}/qr-code — generated once and reused; there is
 * no regenerate/activate/deactivate endpoint in the contract today, so this
 * tab is read-only display + download, not the legacy multi-QR management
 * screen it used to be.
 */
const QrManagementTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
  const { data, isLoading } = useGetTenantQrCodeQuery(tenantId);

  if (isLoading) return <Loader />;

  return (
    <div className="p-4 flex flex-col items-center text-center">
      <Typography variant="h5" className="mb-1 block">
        Your public jobs QR code
      </Typography>
      <Typography variant="body2" className="mb-6 max-w-md">
        Candidates who scan this are taken straight to your public job listing page.
      </Typography>

      {data?.url ? (
        <>
          <img
            src={data.url}
            alt="Company QR code"
            className="w-48 h-48 border rounded-xl p-2 mb-4"
          />
          <a href={data.url} download target="_blank" rel="noopener noreferrer">
            <Button className="rounded-full bg-button text-white px-5 py-2 flex items-center gap-2">
              <MdOutlineDownload /> Download
            </Button>
          </a>
        </>
      ) : (
        <div className="p-6 text-gray-500 border border-dashed rounded-xl">
          QR code isn&apos;t available yet.
        </div>
      )}
    </div>
  );
};

export default QrManagementTab;
