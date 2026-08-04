import { api } from '../../index';

export interface FeatureFlags {
  emailTemplateConfig: boolean;
}

const featureFlagsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getFeatureFlags: build.query<FeatureFlags, void>({
      query: () => ({
        url: '/auth/feature-flags',
        method: 'GET',
      }),
      providesTags: ['FeatureFlags'],
    }),
  }),
});

export const { useGetFeatureFlagsQuery } = featureFlagsApi;
