import { api } from '../../index';
import {
  PERMISSION_CATALOG,
  PermissionCatalogEntry,
} from '../../../constants/authorities.constant';

export type GetPermissionCatalogResponse = {
  data: PermissionCatalogEntry[];
};

// The permission catalog is fixed and owned by the frontend today (there is
// no GET /v1/permissions backend endpoint yet — see RBAC docs' known gaps).
// This is still exposed as an RTK Query endpoint, via `queryFn` instead of a
// network `query`, so every consumer already goes through the same
// useGetPermissionCatalogQuery() hook — swapping in a real network call
// later is a one-line change (`queryFn` → `query: '/v1/permissions'`) with
// no call-site changes.
const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getPermissionCatalog: build.query<GetPermissionCatalogResponse, void>({
      queryFn: () => ({ data: { data: PERMISSION_CATALOG } }),
    }),
  }),
});

export const { useGetPermissionCatalogQuery } = extendedApi;
