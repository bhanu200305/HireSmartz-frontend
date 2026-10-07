import { orgApi } from '../orgApi';

export type AddTenantOfficeRequest = {
  tenantId: string;
  address: string;
  city: string;
  country: string;
  address_line_2?: string;
  state?: string;
  zip_code?: string;
  // Free text, no format constraint — purely what the user types (e.g.
  // "BLR-01"), never auto-generated. Uniqueness within the tenant is
  // validated server-side (case-insensitive).
  location_code?: string;
};

export type AddTenantOfficeResponse = {
  office_id: string;
};

// OfficeSummaryView — GET /v1/tenants/{tenant_id}/offices row shape. Wider
// than AddTenantOfficeResponse (which only confirms an id): a list/edit view
// needs the full address.
export type TenantOffice = {
  office_id: string;
  location_code: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string | null;
  country: string;
  zip_code: string | null;
  is_active: boolean;
};

/** Label for job/role location dropdowns — offices have no separate name
 * field. Always appends the location code (or, failing that, the street
 * address) so two branches in the same city/state don't render as
 * identical rows. */
export const officeDisplayName = (office: TenantOffice): string => {
  const cityState = [office.city, office.state].filter(Boolean).join(', ');
  const distinguisher = office.location_code || office.address_line_1;
  if (!cityState) return distinguisher;
  return distinguisher ? `${cityState} (${distinguisher})` : cityState;
};

export type UpdateTenantOfficeRequest = {
  tenantId: string;
  officeId: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  zip_code?: string;
  address_type_id?: string;
  location_code?: string;
};

export type DeleteTenantOfficeResponse = {
  status: string;
};

export type ListTenantOfficesArgs = {
  tenantId: string;
  /**
   * True when a Master Super Admin is viewing another company's offices
   * from the platform side (RolesManagement's RoleContextSwitcher, e.g.) —
   * their token carries no ambient tenant_id, so `GET /v1/tenants/{id}/offices`
   * (which requires one) 403s with PERMISSION_DENIED/"this endpoint requires
   * a tenant user" even for a Master Super Admin holding location:read.
   * `GET /v1/platform/tenants/{id}/offices` is the platform-mounted
   * equivalent — same data, guarded by require_platform_permission instead,
   * with tenantId taken from the path rather than the token. Mirrors
   * `rolesBasePath` in `../Roles/roles.ts` exactly. Defaults to false: every
   * other caller (MyCompany's own tabs, InviteTeamMemberModal) is a real
   * tenant session listing its own offices.
   */
  isMaster?: boolean;
  /** `false` lists active offices only, for pickers. Omitted lists every office. */
  includeInactive?: boolean;
};

const officesBasePath = ({ tenantId, isMaster }: ListTenantOfficesArgs): string =>
  isMaster ? `/v1/platform/tenants/${tenantId}/offices` : `/v1/tenants/${tenantId}/offices`;

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listTenantOffices: build.query<TenantOffice[], ListTenantOfficesArgs>({
      query: ({ includeInactive, ...args }) => ({
        url: officesBasePath(args),
        params: includeInactive === false ? { include_inactive: false } : undefined,
      }),
      providesTags: (_result, _error, { tenantId }) => [{ type: 'TenantOffices', id: tenantId }],
    }),
    addTenantOffice: build.mutation<AddTenantOfficeResponse, AddTenantOfficeRequest>({
      query: ({ tenantId, ...body }) => ({
        url: `/v1/tenants/${tenantId}/offices`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantOffices', id: tenantId },
        { type: 'Tenant', id: tenantId },
      ],
    }),
    updateTenantOffice: build.mutation<TenantOffice, UpdateTenantOfficeRequest>({
      query: ({ tenantId, officeId, ...body }) => ({
        url: `/v1/tenants/${tenantId}/offices/${officeId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [{ type: 'TenantOffices', id: tenantId }],
    }),
    // No confirmation-worthy warning needed here per docs/frontend_guide.txt —
    // "Delete -- No warning needed if a department is linked to it, it just
    // gets unlinked automatically." Callers may still ask a light confirm,
    // but nothing here requires the stronger prompt DeleteTenantDepartment does.
    deleteTenantOffice: build.mutation<
      DeleteTenantOfficeResponse,
      { tenantId: string; officeId: string }
    >({
      query: ({ tenantId, officeId }) => ({
        url: `/v1/tenants/${tenantId}/offices/${officeId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [
        { type: 'TenantOffices', id: tenantId },
        { type: 'TenantDepartments', id: tenantId },
      ],
    }),
    deactivateTenantOffice: build.mutation<void, { tenantId: string; officeId: string }>({
      query: ({ tenantId, officeId }) => ({
        url: `/v1/tenants/${tenantId}/offices/${officeId}/deactivate`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [{ type: 'TenantOffices', id: tenantId }],
    }),
    // No confirmation needed by convention — restoring visibility is the
    // low-risk direction.
    activateTenantOffice: build.mutation<void, { tenantId: string; officeId: string }>({
      query: ({ tenantId, officeId }) => ({
        url: `/v1/tenants/${tenantId}/offices/${officeId}/activate`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [{ type: 'TenantOffices', id: tenantId }],
    }),
  }),
});

export const {
  useListTenantOfficesQuery,
  useAddTenantOfficeMutation,
  useUpdateTenantOfficeMutation,
  useDeleteTenantOfficeMutation,
  useDeactivateTenantOfficeMutation,
  useActivateTenantOfficeMutation,
} = extendedApi;
