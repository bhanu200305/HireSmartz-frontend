import { jobApi } from '../jobApi';

/**
 * Backs the Location dropdown's permission filter: which of a candidate
 * office list the caller actually holds job:update at, per
 * GET /job-openings/{id}/details/permitted-offices.
 */
export type PermittedOfficesResponse = {
  permitted_office_ids: string[];
};

type GetPermittedOfficesArgs = {
  jobOpeningId: string;
  officeIds: string[];
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getPermittedOffices: build.query<PermittedOfficesResponse, GetPermittedOfficesArgs>({
      query: ({ jobOpeningId, officeIds }) => {
        const params = new URLSearchParams();
        officeIds.forEach((id) => params.append('office_ids', id));
        return {
          url: `/job-openings/${jobOpeningId}/details/permitted-offices?${params.toString()}`,
          method: 'GET',
        };
      },
    }),
  }),
});

export const { useGetPermittedOfficesQuery } = extendedApi;
