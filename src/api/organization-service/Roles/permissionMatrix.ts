import { orgApi } from '../orgApi';

// GET /v1/roles/permission-matrix — filterable "who has access" view, backing
// the Permission Usage, Who Has Access, and Person Lookup screens. Every
// param is optional; sending none reproduces today's plain matrix response.
// Super Admin sessions must send tenantId (the backend has no ambient tenant
// for a platform token); a Company Admin session must NOT — the backend
// reads their company off their own token.
export type OfficeRef = { location_id: string; label: string };

export type PermissionDetail = {
  code: string;
  label: string;
  description: string;
  resource: string;
  resource_label: string;
  category: string;
  action: string;
  sensitive: boolean;
  enforced: boolean;
  all_locations: boolean;
  locations: OfficeRef[];
  via_roles: string[];
  direct_grant: boolean;
};

export type PermissionUsage = {
  code: string;
  resource: string;
  action: string;
  label: string;
  sensitive: boolean;
  enforced: boolean;
  holder_count: number;
  direct_grant_count: number;
  roles: { role_id: string; name: string; is_system_role: boolean; holder_count: number }[];
};

export type MatrixLocationPermission = {
  /** A real office id, or the literal 'ALL_LOCATIONS'. */
  Location_Id: string;
  Location_Name: string | null;
  Roles: string[];
  Permissions: Record<string, string[]>;
};

export type MatrixUser = {
  User_Id: string;
  User_Name: string;
  Is_Active: boolean;
  Location_Permission: MatrixLocationPermission[];
  Email?: string;
  Matched_Permissions?: string[];
  Permission_Details?: PermissionDetail[];
  Denied_Permissions?: string[];
};

export type PermissionMatrixResponse = {
  Organization_User_Permissions: {
    Organization_Id: string;
    Organization_Name: string;
    Users_Permission: MatrixUser[];
  }[];
  total_users: number;
  limit: number;
  offset: number;
  location?: OfficeRef;
  permission_counts?: Record<string, number>;
  permission_usage?: PermissionUsage[];
};

export type PermissionMatrixArgs = {
  /** Super Admin only — required for them, omitted for a tenant session. */
  tenantId?: string;
  codes?: string[];
  match?: 'all' | 'any';
  q?: string;
  userId?: string;
  locationId?: string;
  includeUsage?: boolean;
  explain?: boolean;
  /** Default true server-side; pass false to exclude deactivated users. */
  includeInactive?: boolean;
  limit?: number;
  offset?: number;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getPermissionMatrix: build.query<PermissionMatrixResponse, PermissionMatrixArgs>({
      query: (args) => ({
        url: '/v1/roles/permission-matrix',
        method: 'GET',
        params: {
          ...(args.tenantId ? { tenant_id: args.tenantId } : {}),
          ...(args.codes?.length ? { code: args.codes.join(',') } : {}),
          ...(args.match ? { match: args.match } : {}),
          ...(args.q ? { q: args.q } : {}),
          ...(args.userId ? { user_id: args.userId } : {}),
          ...(args.locationId ? { location_id: args.locationId } : {}),
          ...(args.includeUsage ? { include_usage: true } : {}),
          ...(args.explain ? { explain: true } : {}),
          ...(args.includeInactive === false ? { include_inactive: false } : {}),
          limit: args.limit ?? 50,
          offset: args.offset ?? 0,
        },
      }),
      providesTags: ['PermissionMatrix'],
    }),
  }),
});

export const { useGetPermissionMatrixQuery, useLazyGetPermissionMatrixQuery } = extendedApi;
