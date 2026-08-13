import { useListPlatformTenantsQuery } from '../../organization-service/Platform/tenants';

export interface CompanyDropdownItem {
  id: string;
  companyName: string;
  owner: boolean;
  scoringConfigEditable: boolean;
}

/**
 * Company Settings' "select a company" dropdowns (SMS/Push/Email templates)
 * used to call `/orguserservice/companies/dropdown` — a route that no longer
 * exists on any backend service (it predates the organization-service split
 * documented in API_CONTRACT.md). The real source for "every company on the
 * platform" is organization-service's `GET /v1/platform/tenants`
 * (`useListPlatformTenantsQuery`, see Platform/tenants.ts), so this hook now
 * wraps that instead. `owner`/`scoringConfigEditable` have no equivalent on
 * `TenantSummaryView` — organization-service has no such concepts for a
 * tenant-list row — so they're fixed to `false`/`true`, which reproduces the
 * old "no companies filtered out, scoring editable for all" behavior every
 * consumer already assumed.
 */
export const useGetCompaniesDropdownQuery = (
  _args?: void,
  options?: { skip?: boolean }
): {
  data: CompanyDropdownItem[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
} => {
  const { data, isLoading, isFetching, isError } = useListPlatformTenantsQuery(
    { limit: 200, offset: 0 },
    { skip: options?.skip }
  );

  return {
    data: data?.tenants.map((tenant) => ({
      id: tenant.tenant_id,
      companyName: tenant.company_name,
      owner: false,
      scoringConfigEditable: true,
    })),
    isLoading,
    isFetching,
    isError,
  };
};
