import { orgApi } from '../orgApi';

// GET /v1/tenants/{tenant_id}/qr-code — QrCodeView. The QR code (pointing at
// the tenant's public jobs page) is generated once and reused; `url` is a
// time-limited signed URL resolved fresh on every read, so this should be
// re-fetched rather than cached past its expiry — no client-side caching
// beyond RTK Query's own.
export type QrCode = {
  url: string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getTenantQrCode: build.query<QrCode, string>({
      query: (tenantId) => `/v1/tenants/${tenantId}/qr-code`,
    }),
  }),
});

export const { useGetTenantQrCodeQuery } = extendedApi;
