import { jobApi } from '../jobApi';

// This organization's own configured job types — what `job_type_id` on
// Job Details references. Distinct from Master/master.ts's suggestion list.
export type OrganizationJobType = {
  id: string;
  job_type_name: string;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getOrganizationJobTypes: build.query<{ job_types: OrganizationJobType[] }, void>({
      query: () => '/job-types',
      providesTags: ['OrgJobTypes'],
    }),
    createOrganizationJobType: build.mutation<OrganizationJobType, { job_type_name: string }>({
      query: (body) => ({ url: '/job-types', method: 'POST', body }),
      invalidatesTags: ['OrgJobTypes'],
    }),
    updateOrganizationJobType: build.mutation<
      OrganizationJobType,
      { jobTypeId: string; job_type_name: string }
    >({
      query: ({ jobTypeId, job_type_name }) => ({
        url: `/job-types/${jobTypeId}`,
        method: 'PUT',
        body: { job_type_name },
      }),
      invalidatesTags: ['OrgJobTypes'],
    }),
    deleteOrganizationJobType: build.mutation<void, string>({
      query: (jobTypeId) => ({ url: `/job-types/${jobTypeId}`, method: 'DELETE' }),
      invalidatesTags: ['OrgJobTypes'],
    }),
  }),
});

export const {
  useGetOrganizationJobTypesQuery,
  useCreateOrganizationJobTypeMutation,
  useUpdateOrganizationJobTypeMutation,
  useDeleteOrganizationJobTypeMutation,
} = extendedApi;
