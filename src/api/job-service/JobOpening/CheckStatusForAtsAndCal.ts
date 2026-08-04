import api from '../..';

type CheckAtsCalStatusResponse = {
  success: boolean;
  message?: string;
  data: null;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    checkAtsCalStatus: build.mutation<CheckAtsCalStatusResponse, void>({
      query: () => ({
        url: '/job-opening/checkStatusForAtsAndCal',
        method: 'GET',
      }),
    }),
  }),
});

export const { useCheckAtsCalStatusMutation } = extendedApi;
