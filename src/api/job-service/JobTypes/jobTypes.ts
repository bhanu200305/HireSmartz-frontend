import { jobApi } from '../jobApi';

// This organization's own configured job type instances — what `job_type_id`
// on Job Details references. Distinct from Master/master.ts's fixed job-type
// suggestion catalog.
export type OrganizationJobType = {
  id: string;
  name: string;
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getOrganizationJobTypes: build.query<{ job_types: OrganizationJobType[] }, void>({
      query: () => '/job-types',
      providesTags: ['OrgJobTypes'],
    }),
    createOrganizationJobType: build.mutation<OrganizationJobType, { name: string }>({
      query: (body) => ({ url: '/job-types', method: 'POST', body }),
      invalidatesTags: ['OrgJobTypes'],
    }),
    updateOrganizationJobType: build.mutation<
      OrganizationJobType,
      { jobTypeId: string; name: string }
    >({
      query: ({ jobTypeId, name }) => ({
        url: `/job-types/${jobTypeId}`,
        method: 'PUT',
        body: { name },
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
