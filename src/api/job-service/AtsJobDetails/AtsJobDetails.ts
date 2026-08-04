import api from '../..';
import {
  GetAllAtsNamesByCompanyIdResponse,
  GetAllAtsNamesByCompanyIdRequest,
  GetAtsDropdownsValuesResponse,
  GetAtsJobByIdRequest,
  AtsJobOpeningData,
} from '../../../types';

export type GetAtsJobByIdResponse = {
  success: boolean;
  message: string;
  data: AtsJobOpeningData;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getAllAtsNamesByCompanyId: build.query<
      GetAllAtsNamesByCompanyIdResponse,
      GetAllAtsNamesByCompanyIdRequest
    >({
      query: () => ({
        url: `/ats/getAllAtsNamesByCompanyId`,
        method: 'GET',
      }),
    }),

    getAtsDropdownsValues: build.query<GetAtsDropdownsValuesResponse, void>({
      query: () => ({
        url: '/ats/dropdownsValues',
        method: 'GET',
      }),
    }),

    getAtsJobById: build.query<GetAtsJobByIdResponse, GetAtsJobByIdRequest>({
      query: ({ atsJobOpeningId }) => ({
        url: `/ats/job-by-id?atsJobOpeningId=${atsJobOpeningId}`,
        method: 'GET',
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAllAtsNamesByCompanyIdQuery,
  useGetAtsDropdownsValuesQuery,
  useLazyGetAtsJobByIdQuery,
} = extendedApi;
