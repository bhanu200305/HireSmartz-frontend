import { api } from '../../index';

type ArchiveCompanyRequest = {
  companyId: number;
  isArchived: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    archiveCompany: build.mutation<void, ArchiveCompanyRequest>({
      query: ({ companyId, isArchived }) => ({
        url: `/orguserservice/companies/archive?companyId=${companyId}`,
        method: 'PUT',
        body: { isArchived },
      }),
    }),
  }),
});

export const { useArchiveCompanyMutation } = extendedApi;
