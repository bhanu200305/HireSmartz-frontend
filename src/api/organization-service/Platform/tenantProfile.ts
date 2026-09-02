import { orgApi } from '../orgApi';
import type {
  TenantAssetUploadResponse,
  TenantProfile,
  TenantStatusResponse,
  UploadTenantLogoArgs,
} from '../Tenants/profile';

// Super Admin's platform-mounted mirror of Tenants/profile.ts's GET/PATCH
// .../profile — same TenantProfileView/UpdateTenantProfileRequest shapes,
// tenant bound from the path instead of the caller's own token (a platform
// caller has no tenant_id of their own to match `require_own_tenant`).
// `culture_intro` is deliberately NOT a field here — same reasoning as
// Tenants/profile.ts's `UpdateTenantProfileRequest`: it is its own separate
// resource (`GET/PUT /v1/platform/tenants/{tenant_id}/culture-intro`, see
// Platform/cultureIntro.ts), and this request model is `extra="forbid"`
// server-side too.
export type UpdatePlatformTenantProfileRequest = {
  tenantId: string;
  name?: string;
  logo?: string;
  description?: string;
  website_url?: string;
  industry_id?: string;
  admin_contact?: string;
  company_size?: number;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getPlatformTenantProfile: build.query<TenantProfile, string>({
      query: (tenantId) => `/v1/platform/tenants/${tenantId}/profile`,
      providesTags: (_result, _error, tenantId) => [{ type: 'PlatformTenants', id: tenantId }],
    }),
    updatePlatformTenantProfile: build.mutation<
      TenantStatusResponse,
      UpdatePlatformTenantProfileRequest
    >({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/platform/tenants/${tenantId}/profile`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'PlatformTenants', id: tenantId },
      ],
    }),
    // POST /v1/platform/tenants/{tenant_id}/logo/upload — platform mirror of
    // Tenants/profile.ts's uploadTenantLogo, same server-mediated contract;
    // only the guard differs (TENANT_UPDATE instead of require_own_tenant,
    // which a platform caller can never satisfy).
    uploadPlatformTenantLogo: build.mutation<TenantAssetUploadResponse, UploadTenantLogoArgs>({
      query: ({ tenantId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/v1/platform/tenants/${tenantId}/logo/upload`,
          method: 'POST',
          body: formData,
        };
      },
    }),
  }),
});

export const {
  useGetPlatformTenantProfileQuery,
  useUpdatePlatformTenantProfileMutation,
  useUploadPlatformTenantLogoMutation,
} = extendedApi;
