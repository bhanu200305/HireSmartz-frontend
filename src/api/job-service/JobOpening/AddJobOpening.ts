import api from '../..';
import { SaveJobOpeningRequest } from '../../../types';

type SaveJobOpeningResponse = {
  success: boolean;
  message?: string;
  data: {
    aiJobDescriptionId: number;
    jobOpeningId: number;
  };
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    saveJobOpening: build.mutation<SaveJobOpeningResponse, SaveJobOpeningRequest>({
      query: (body) => ({
        url: '/job-opening/save',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useSaveJobOpeningMutation } = extendedApi;
