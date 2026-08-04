import { api } from '../../index';

export type Location = {
  id: number;
  locationName: string;
  name?: string;
  status?: boolean;
  primary?: boolean;
};

type GetLocationsRawResponse = {
  data?:
    | Location[]
    | {
        data?: Location[];
        success?: boolean;
        message?: string;
      };
  success?: boolean;
  message?: string;
};

type GetLocationsParams = {
  companyId: number;
  activeOnly?: boolean;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getLocations: build.query<Location[], GetLocationsParams>({
      query: ({ companyId, activeOnly }) => {
        return {
          url: `/orguserservice/locations/company/${companyId}`,
          method: 'GET',
          params: activeOnly !== undefined ? { activeOnly } : {},
        };
      },
      transformResponse: (response: GetLocationsRawResponse | Location[]): Location[] => {
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response?.data?.data)
              ? response.data.data
              : [];

        return list
          .map((location) => ({
            id: Number(location.id),
            locationName: location.locationName || location.name || '',
            name: location.name,
            status: location.status,
            primary: location.primary,
          }))
          .filter((location) => Number.isFinite(location.id) && location.id > 0);
      },
    }),
  }),
});

export const { useGetLocationsQuery } = extendedApi;
