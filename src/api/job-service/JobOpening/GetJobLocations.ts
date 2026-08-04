import { api } from '../../index';

export type JobLocation = {
  id: number;
  companyId: number;
  name: string;
  code: string;
  addressLine1: string;
  addressLine2: string;
  country: string;
  state: string;
  city: string;
  zipCode: string;
  timezone: string;
  primary: boolean;
  status: boolean;
  createdAt: string;
  userCount: number;
};

export type GetJobLocationsResponse = {
  success: boolean;
  message: string;
  data: JobLocation[];
};

type GetJobLocationsParams = {
  companyId: number;
  activeOnly?: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getJobLocations: build.query<GetJobLocationsResponse, GetJobLocationsParams>({
      query: (params) => ({
        url: `/orguserservice/locations/company/${params.companyId}?activeOnly=${params.activeOnly ?? false}`,
        method: 'GET',
      }),
    }),
    getMyLocations: build.query<GetJobLocationsResponse, { activeOnly?: boolean }>({
      query: (params) => ({
        url: `/orguserservice/locations/my-locations?activeOnly=${params.activeOnly ?? false}`,
        method: 'GET',
      }),
    }),
  }),
});

export const { useGetJobLocationsQuery, useGetMyLocationsQuery } = extendedApi;
