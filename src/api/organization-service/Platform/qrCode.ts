import { orgApi } from '../orgApi';
import type { QrCode } from '../Tenants/qrCode';

// Super Admin's platform-mounted mirror of Tenants/qrCode.ts — read-only,
// same as the tenant-side contract (no regenerate endpoint exists there
// either).
const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getPlatformTenantQrCode: build.query<QrCode, string>({
      query: (tenantId) => `/v1/platform/tenants/${tenantId}/qr-code`,
    }),
  }),
});

export const { useGetPlatformTenantQrCodeQuery } = extendedApi;
