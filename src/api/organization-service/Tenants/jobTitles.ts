import { orgApi } from '../orgApi';
import type { PlatformJobTitle } from '../Platform/jobTitles';

/**
 * Tenant job-title APIs.
 *
 * Super Admin's catalogue is GET/POST/PUT/DELETE `/v1/platform/job-titles`
 * (see `Platform/jobTitles.ts`). Tenant users cannot call those — they 403
 * without platform `job_title:*`. The same list is exposed to a company as
 * GET `/v1/tenants/{tenant_id}/job-titles/catalogue` (same `ListJobTitlesView`
 * / platform `job_title_id`s that job-service stores on a job opening).
 *
 * The company's own rows (`organization_job_title`) live under
 * `/v1/tenants/{tenant_id}/job-titles` and department mappings under
 * `/v1/tenants/{tenant_id}/departments/{department_id}/job-titles`.
 *
 * A Super Admin token has no `tenant_id`, so the tenant-mounted paths 403
 * with "this endpoint requires a tenant user". Pass `isMaster: true` to use
 * the platform mirrors under `/v1/platform/tenants/{tenant_id}/...`.
 */
export type TenantJobTitle = {
  org_job_title_id: string;
  name: string;
  description: string | null;
  source_job_title_id: string | null;
  department_id?: string | null;
};

export type ListTenantJobTitlesArgs = {
  tenantId: string;
  isMaster?: boolean;
};

type ListTenantJobTitlesQueryArg = string | ListTenantJobTitlesArgs;

export type CreateTenantJobTitleRequest = {
  tenantId: string;
  name: string;
  department_id: string;
  description?: string;
  isMaster?: boolean;
};

export type ImportMasterJobTitleRequest = {
  tenantId: string;
  master_job_title_id: string;
  department_id: string;
  isMaster?: boolean;
};

export type UpdateTenantJobTitleRequest = {
  tenantId: string;
  jobTitleId: string;
  name?: string;
  description?: string;
  isMaster?: boolean;
};

export const idsMatch = (a: unknown, b: unknown): boolean =>
  a != null && b != null && String(a) === String(b);

/** Prefer the platform id when a tenant title was imported, so job-service can resolve the name. */
export const tenantJobTitleFormId = (title: TenantJobTitle): string =>
  title.source_job_title_id || title.org_job_title_id;

const toJobTitleArgs = (arg: ListTenantJobTitlesQueryArg): ListTenantJobTitlesArgs =>
  typeof arg === 'string' ? { tenantId: arg } : arg;

const tenantJobTitlesBasePath = ({ tenantId, isMaster }: ListTenantJobTitlesArgs): string =>
  isMaster ? `/v1/platform/tenants/${tenantId}/job-titles` : `/v1/tenants/${tenantId}/job-titles`;

const jobTitleCataloguePath = ({ tenantId, isMaster }: ListTenantJobTitlesArgs): string =>
  isMaster
    ? `/v1/platform/tenants/${tenantId}/job-titles/catalogue`
    : `/v1/tenants/${tenantId}/job-titles/catalogue`;

const departmentJobTitlesPath = ({
  tenantId,
  departmentId,
  isMaster,
}: {
  tenantId: string;
  departmentId: string;
  isMaster?: boolean;
}): string =>
  isMaster
    ? `/v1/platform/tenants/${tenantId}/departments/${departmentId}/job-titles`
    : `/v1/tenants/${tenantId}/departments/${departmentId}/job-titles`;

const tenantJobTitlesTag = (tenantId: string, departmentId?: string) =>
  departmentId
    ? ([
        { type: 'TenantJobTitles' as const, id: tenantId },
        { type: 'TenantJobTitles' as const, id: departmentId },
      ] as const)
    : ([{ type: 'TenantJobTitles' as const, id: tenantId }] as const);

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listTenantJobTitles: build.query<TenantJobTitle[], ListTenantJobTitlesQueryArg>({
      query: (arg) => tenantJobTitlesBasePath(toJobTitleArgs(arg)),
      transformResponse: (response: { job_titles: TenantJobTitle[] }) => response.job_titles ?? [],
      providesTags: (_result, _error, arg) => [...tenantJobTitlesTag(toJobTitleArgs(arg).tenantId)],
    }),
    // Same payload as GET /v1/platform/job-titles, callable with tenant_job_title:read.
    listTenantJobTitleCatalogue: build.query<PlatformJobTitle[], ListTenantJobTitlesQueryArg>({
      query: (arg) => jobTitleCataloguePath(toJobTitleArgs(arg)),
      transformResponse: (response: { job_titles: PlatformJobTitle[] }) =>
        response.job_titles ?? [],
      providesTags: ['JobTitles'],
    }),
    listTenantDepartmentJobTitles: build.query<
      TenantJobTitle[],
      { tenantId: string; departmentId: string; isMaster?: boolean }
    >({
      query: ({ tenantId, departmentId, isMaster }) =>
        departmentJobTitlesPath({ tenantId, departmentId, isMaster }),
      transformResponse: (response: { job_titles: TenantJobTitle[] }) => response.job_titles ?? [],
      providesTags: (_result, _error, { tenantId, departmentId }) => [
        ...tenantJobTitlesTag(tenantId, departmentId),
      ],
    }),
    createTenantJobTitle: build.mutation<TenantJobTitle, CreateTenantJobTitleRequest>({
      query: ({ tenantId, isMaster, ...body }) => ({
        url: tenantJobTitlesBasePath({ tenantId, isMaster }),
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId, department_id }) => [
        ...tenantJobTitlesTag(tenantId, department_id),
      ],
    }),
    importMasterJobTitle: build.mutation<TenantJobTitle, ImportMasterJobTitleRequest>({
      query: ({ tenantId, isMaster, ...body }) => ({
        url: `${tenantJobTitlesBasePath({ tenantId, isMaster })}/import`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId, department_id }) => [
        ...tenantJobTitlesTag(tenantId, department_id),
      ],
    }),
    updateTenantJobTitle: build.mutation<TenantJobTitle, UpdateTenantJobTitleRequest>({
      query: ({ tenantId, jobTitleId, isMaster, ...body }) => ({
        url: `${tenantJobTitlesBasePath({ tenantId, isMaster })}/${jobTitleId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [...tenantJobTitlesTag(tenantId)],
    }),
    deleteTenantJobTitle: build.mutation<
      void,
      { tenantId: string; jobTitleId: string; isMaster?: boolean }
    >({
      query: ({ tenantId, jobTitleId, isMaster }) => ({
        url: `${tenantJobTitlesBasePath({ tenantId, isMaster })}/${jobTitleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { tenantId }) => [...tenantJobTitlesTag(tenantId)],
    }),
    assignTenantJobTitleToDepartment: build.mutation<
      TenantJobTitle,
      { tenantId: string; departmentId: string; job_title_id: string; isMaster?: boolean }
    >({
      query: ({ tenantId, departmentId, job_title_id, isMaster }) => ({
        url: departmentJobTitlesPath({ tenantId, departmentId, isMaster }),
        method: 'POST',
        body: { job_title_id },
      }),
      invalidatesTags: (_result, _error, { tenantId, departmentId }) => [
        ...tenantJobTitlesTag(tenantId, departmentId),
      ],
    }),
  }),
});

export const {
  useListTenantJobTitlesQuery,
  useListTenantJobTitleCatalogueQuery,
  useListTenantDepartmentJobTitlesQuery,
  useCreateTenantJobTitleMutation,
  useImportMasterJobTitleMutation,
  useUpdateTenantJobTitleMutation,
  useDeleteTenantJobTitleMutation,
  useAssignTenantJobTitleToDepartmentMutation,
} = extendedApi;
