import { orgApi } from '../orgApi';

// GET /v1/tenants/{tenant_id}/qr-code — QrCodeView (organization-service's
// generate_tenant_qr_code.py). One QR per tenant, generated on the FIRST
// call and simply re-resolved to a fresh signed URL on every call after —
// there is no separate "create" step and no per-tenant list (the old
// api/tenant-service/MyCompany/qrCode.ts this replaces was built against a
// different, pre-rewrite backend that supported many named/toggleable QR
// codes per company keyed by a numeric companyId; none of that exists here).
//
// `url` is a time-limited SIGNED link to the PNG itself, not the page the QR
// points to — re-fetch this endpoint rather than caching `url` past its
// expiry (see QrCodeView's own docstring). The actual page the QR encodes is
// always `{frontend origin}/careers/{tenantId}` (CareersListingPage's own
// route), which is static and never expires, so callers needing a
// shareable link should build that themselves rather than reuse `url`.
export type TenantQrCode = {
  url: string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getTenantQrCode: build.query<TenantQrCode, string>({
      query: (tenantId) => `/v1/tenants/${tenantId}/qr-code`,
      providesTags: (_result, _error, tenantId) => [{ type: 'TenantQrCode', id: tenantId }],
    }),
  }),
});

export const { useGetTenantQrCodeQuery } = extendedApi;
