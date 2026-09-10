import { jobApi } from '../jobApi';
import type {
  ListMasterScoringCategoriesResponse,
  MasterScoringCategory,
  SaveMasterScoringCategoryWeightsRequest,
  UpdateMasterScoringCategoryRequest,
} from '../types';

export type ScoringStage = 'RESUME' | 'INTERVIEW';

// The Super Admin's platform scoring-category catalogue.
const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    listMasterScoringCategories: build.query<MasterScoringCategory[], ScoringStage>({
      query: (stage) => ({
        url: '/platform/scoring-categories',
        method: 'GET',
        params: { stage },
      }),
      transformResponse: (response: ListMasterScoringCategoriesResponse) => response.categories,
      providesTags: ['PlatformScoringCategories'],
    }),

    updateMasterScoringCategory: build.mutation<
      MasterScoringCategory,
      UpdateMasterScoringCategoryRequest & { categoryId: string }
    >({
      query: ({ categoryId, ...body }) => ({
        url: `/platform/scoring-categories/${categoryId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['PlatformScoringCategories'],
    }),

    saveMasterScoringCategoryWeights: build.mutation<
      MasterScoringCategory[],
      SaveMasterScoringCategoryWeightsRequest & { stage: ScoringStage }
    >({
      query: ({ stage, weights }) => ({
        url: `/platform/scoring-categories/${stage}/weights`,
        method: 'PUT',
        body: { weights },
      }),
      transformResponse: (response: ListMasterScoringCategoriesResponse) => response.categories,
      invalidatesTags: ['PlatformScoringCategories'],
    }),
  }),
});

export { extendedApi as masterScoringCategoriesApi };

export const {
  useListMasterScoringCategoriesQuery,
  useUpdateMasterScoringCategoryMutation,
  useSaveMasterScoringCategoryWeightsMutation,
} = extendedApi;
