import { api } from '../../index';

export type ScoringStage = 'RESUME' | 'INTERVIEW';

export type ScoringWeight = {
  id: number;
  categoryName: string;
  weightPercentage: number;
};

export type ScoringConfig = {
  id: number;
  companyId: number;
  stage: ScoringStage;
  isDefault: boolean;
  isActive: boolean;
  weights: ScoringWeight[];
  createdAt: string;
  updatedAt: string;
};

export type ScoringConfigResponse = {
  success: boolean;
  message: string;
  data: ScoringConfig;
};

export type UpdateScoringConfigRequest = {
  id: number;
  companyId: number;
  stage: ScoringStage;
  weights: ScoringWeight[];
};

export type CreateScoringConfigRequest = {
  companyId: number;
  stage: ScoringStage;
  weights: ScoringWeight[];
};

export type UpdateAllowConfigRequest = {
  companyId: number;
  isScoringConfigEditable: boolean;
};

export type ScoringDefaultsResponse = {
  success: boolean;
  message: string;
  data: {
    resume: ScoringConfig;
    interview: ScoringConfig;
  };
};

export const scoringConfigApi = api.injectEndpoints({
  endpoints: (build) => ({
    getScoringConfig: build.query<
      ScoringConfigResponse,
      { companyId: number; stage: ScoringStage }
    >({
      query: ({ companyId, stage }) => ({
        url: `/scoring-configs?companyId=${companyId}&stage=${stage}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, { companyId, stage }) => [
        { type: 'SAMPLE_TAG_TYPES', id: `scoring-${companyId}-${stage}` },
      ],
    }),

    updateScoringConfig: build.mutation<ScoringConfigResponse, UpdateScoringConfigRequest>({
      query: ({ id, companyId, stage, weights }) => ({
        url: `/scoring-configs/${id}`,
        method: 'PUT',
        body: { companyId, stage, weights },
      }),
      invalidatesTags: ['SAMPLE_TAG_TYPES'],
    }),

    createScoringConfig: build.mutation<ScoringConfigResponse, CreateScoringConfigRequest>({
      query: ({ companyId, stage, weights }) => ({
        url: `/scoring-configs`,
        method: 'POST',
        body: { companyId, stage, weights },
      }),
      invalidatesTags: ['SAMPLE_TAG_TYPES'],
    }),

    resetScoringConfig: build.mutation<ScoringConfigResponse, { id: number }>({
      query: ({ id }) => ({
        url: `/scoring-configs/${id}/reset`,
        method: 'POST',
        body: '',
      }),
      invalidatesTags: ['SAMPLE_TAG_TYPES'],
    }),

    updateAllowCompanyToConfigureScoring: build.mutation<
      { status: string; message: string; code: string },
      UpdateAllowConfigRequest
    >({
      query: ({ companyId, isScoringConfigEditable }) => ({
        url: `/orguserservice/companies/${companyId}/scoring-editable`,
        method: 'PUT',
        body: { isScoringConfigEditable },
      }),
    }),

    getDefaultScoringConfigs: build.query<ScoringDefaultsResponse, void>({
      query: () => ({
        url: '/scoring-configs/defaults',
        method: 'GET',
      }),
      providesTags: [{ type: 'SAMPLE_TAG_TYPES', id: 'scoring-defaults' }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetScoringConfigQuery,
  useUpdateScoringConfigMutation,
  useCreateScoringConfigMutation,
  useResetScoringConfigMutation,
  useUpdateAllowCompanyToConfigureScoringMutation,
  useGetDefaultScoringConfigsQuery,
} = scoringConfigApi;
