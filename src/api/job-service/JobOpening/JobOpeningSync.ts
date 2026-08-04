import api from '../..';

type SyncJobOpeningRequest = {
  jobOpeningId: number;
  isSync: boolean;
};

type SyncJobOpeningResponse = {
  success: boolean;
  message?: string;
};

interface ATS {
  id: string;
  name: string;
}

type GetAllAtsNamesByCompanyIdResponse = {
  success: boolean;
  message?: string;
  data: ATS[];
  errorCode?: string;
  providerName?: string;
  operationId?: string;
};

type SyncAtsJobOpeningRequest = {
  jobOpeningId: number;
  atsJobOpeningId: string;
  isSync: boolean;
  jobBoardIds: string[];
  isNewJob: boolean;
};

type SyncAtsJobOpeningResponse = {
  success: boolean;
  message?: string;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    syncJobOpening: build.mutation<SyncJobOpeningResponse, SyncJobOpeningRequest>({
      query: (body) => ({
        url: '/job-opening/sync',
        method: 'POST',
        body,
      }),
    }),
    getAllAtsNamesByCompanyId: build.query<GetAllAtsNamesByCompanyIdResponse, void>({
      query: () => ({
        url: '/ats/getAllAtsNamesByCompanyId',
        method: 'GET',
      }),
    }),
    syncAtsJobOpening: build.mutation<
      SyncAtsJobOpeningResponse,
      {
        body: SyncAtsJobOpeningRequest;
        providerName: string;
      }
    >({
      query: ({ body, providerName }) => ({
        url: '/ats/sync',
        method: 'POST',
        body,
        headers: {
          'X-Provider-Name': providerName,
        },
      }),
    }),
  }),
});

export const {
  useSyncJobOpeningMutation,
  useGetAllAtsNamesByCompanyIdQuery,
  useSyncAtsJobOpeningMutation,
} = extendedApi;
