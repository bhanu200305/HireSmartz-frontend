import { orgApi } from '../orgApi';
import type { PlatformJobTitle } from './jobTitles';

// GET/POST/PUT/DELETE /v1/platform/master-departments — the platform's
// department catalogue, same shape/permission-model as Platform/industries.ts
// and Platform/jobTitles.ts (code/name/description, no pagination, no
// status/active concept — DepartmentView on the backend has none). Plus
// department<->job-title assignment, which has no bulk endpoint: only
// per-item assign/remove.
export type MasterDepartment = {
  department_id: string;
  code: string;
  name: string;
  description: string | null;
};

export type CreateDepartmentRequest = {
  code: string;
  name: string;
  description?: string;
};

export type UpdateDepartmentRequest = {
  departmentId: string;
  name?: string;
  description?: string;
};

const extendedApi = orgApi.injectEndpoints({
  endpoints: (build) => ({
    listMasterDepartments: build.query<MasterDepartment[], void>({
      query: () => '/v1/platform/master-departments',
      transformResponse: (response: { departments: MasterDepartment[] }) => response.departments,
      providesTags: ['PlatformDepartments'],
    }),
    createMasterDepartment: build.mutation<MasterDepartment, CreateDepartmentRequest>({
      query: (body) => ({
        url: '/v1/platform/master-departments',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PlatformDepartments'],
    }),
    updateMasterDepartment: build.mutation<MasterDepartment, UpdateDepartmentRequest>({
      query: ({ departmentId, ...body }) => ({
        url: `/v1/platform/master-departments/${departmentId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PlatformDepartments'],
    }),
    // Blocked server-side while an active tenant's department was seeded from it.
    deleteMasterDepartment: build.mutation<void, string>({
      query: (departmentId) => ({
        url: `/v1/platform/master-departments/${departmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PlatformDepartments'],
    }),
    listMasterDepartmentJobTitles: build.query<PlatformJobTitle[], string>({
      query: (departmentId) => `/v1/platform/master-departments/${departmentId}/job-titles`,
      transformResponse: (response: { job_titles: PlatformJobTitle[] }) => response.job_titles,
      providesTags: (_result, _error, departmentId) => [
        { type: 'PlatformDepartments', id: departmentId },
      ],
    }),
    assignJobTitleToDepartment: build.mutation<
      PlatformJobTitle,
      { departmentId: string; jobTitleId: string }
    >({
      query: ({ departmentId, jobTitleId }) => ({
        url: `/v1/platform/master-departments/${departmentId}/job-titles`,
        method: 'POST',
        body: { job_title_id: jobTitleId },
      }),
      invalidatesTags: (_result, _error, { departmentId }) => [
        { type: 'PlatformDepartments', id: departmentId },
      ],
    }),
    removeJobTitleFromDepartment: build.mutation<
      void,
      { departmentId: string; jobTitleId: string }
    >({
      query: ({ departmentId, jobTitleId }) => ({
        url: `/v1/platform/master-departments/${departmentId}/job-titles/${jobTitleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { departmentId }) => [
        { type: 'PlatformDepartments', id: departmentId },
      ],
    }),
  }),
});

export const {
  useListMasterDepartmentsQuery,
  useCreateMasterDepartmentMutation,
  useUpdateMasterDepartmentMutation,
  useDeleteMasterDepartmentMutation,
  useListMasterDepartmentJobTitlesQuery,
  useAssignJobTitleToDepartmentMutation,
  useRemoveJobTitleFromDepartmentMutation,
} = extendedApi;
