import { orgApi } from '../orgApi';

// GET /v1/roles/permissions — the live permission catalog (176 codes today,
// vs. the 114 hard-coded in authorities.constant.ts's PERMISSION_CATALOG).
// No params; same response for Company Admin and Super Admin sessions. This
// is the "what does each permission do" reference (Permission Reference
// screen), and also the source of real label/description/sensitive/enforced
// metadata layered onto the existing static role-editor checkboxes — see
// PermissionMatrix.tsx.
export type PermissionCatalogAction = {
  code: string;
  action: string;
  label: string;
  description: string;
  /** false = granting this currently changes nothing server-side. */
  enforced: boolean;
  /** true = a delete/export/role-change/invite-type action — flagged with a warning icon. */
  sensitive: boolean;
};

export type PermissionCatalogResource = {
  resource: string;
  label: string;
  description: string;
  /** Display-grouping heading, already in display order across the response. */
  category: string;
  /** 'platform' entries are never grantable to any company role. */
  audience: 'tenant' | 'platform';
  actions: PermissionCatalogAction[];
};

export type PermissionCatalogResponse = {
  resources: PermissionCatalogResource[];
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    getPermissionCatalog: build.query<PermissionCatalogResponse, void>({
      query: () => ({
        url: '/v1/roles/permissions',
        method: 'GET',
      }),
      providesTags: ['PermissionCatalog'],
    }),
  }),
});

export const { useGetPermissionCatalogQuery } = extendedApi;
