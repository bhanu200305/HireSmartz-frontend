import { orgApi } from '../orgApi';

// Super Admin's platform-mounted mirror of GET /v1/tenants/{tenant_id}/designations
// — same read-only shape, tenant bound from the path instead of the caller's
// own token. Same pattern as departmentsBasePath in ./departments.ts.
//
// `organization_designation` rows are only ever created today via a roster
// row naming one by text (see the backend's `get_or_create_by_name`) — this
// listing exists purely to resolve a user's `designation_id` to a name, the
// same way departmentName() already resolves `department_id`.
export type DesignationSummary = {
  designation_id: string;
  name: string;
};

const designationsBasePath = (tenantId: string): string =>
  `/v1/platform/tenants/${tenantId}/designations`;

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listPlatformTenantDesignations: build.query<DesignationSummary[], string>({
      query: (tenantId) => designationsBasePath(tenantId),
      transformResponse: (response: { designations: DesignationSummary[] }) =>
        response.designations,
      providesTags: (_result, _error, tenantId) => [
        { type: 'TenantDesignations', id: `platform-${tenantId}` },
      ],
    }),
  }),
});

export const { useListPlatformTenantDesignationsQuery } = extendedApi;
