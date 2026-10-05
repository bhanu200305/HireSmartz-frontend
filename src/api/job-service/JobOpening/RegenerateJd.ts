import { jobApi } from '../jobApi';

type RegenerateJobDescriptionRequest = {
  aiJobDescriptionId?: number | string;
  jobOpeningId?: string;
  text: string;
  generateFromScratch?: boolean;
};

type RegenerateJobDescriptionResponse = {
  message: string;
  success: boolean;
  data: {
    id: string;
    // Always '' - both /jd/regenerate and /jd/enhance only trigger the
    // async job (jd_status: GENERATING/PROCESSING), they never return JD
    // text. The real content only ever arrives via GET /jd/status polling.
    jobDescription: string;
    createdAt?: string;
  };
};

const resolveJobId = (args: RegenerateJobDescriptionRequest): string => {
  if (args.jobOpeningId) return String(args.jobOpeningId);
  return args.aiJobDescriptionId != null ? String(args.aiJobDescriptionId) : '';
};

const extendedApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    regenerateJobDescription: build.mutation<
      RegenerateJobDescriptionResponse,
      RegenerateJobDescriptionRequest
    >({
      async queryFn(args, _api, _extra, baseQuery) {
        const jobOpeningId = resolveJobId(args);
        if (!jobOpeningId) {
          return {
            error: {
              status: 400,
              data: { message: 'jobOpeningId is required to regenerate a JD' },
            } as never,
          };
        }

        // AI Prompt path: regenerate from revised prompt.
        // Manual/Upload path: enhance current JD (no prompt on the wire).
        const result = args.generateFromScratch
          ? await baseQuery({
              url: `/job-openings/${jobOpeningId}/jd/regenerate`,
              method: 'POST',
              body: { prompt_text: args.text },
            })
          : args.text?.trim()
            ? await baseQuery({
                url: `/job-openings/${jobOpeningId}/jd/regenerate`,
                method: 'POST',
                body: { prompt_text: args.text },
              })
            : await baseQuery({
                url: `/job-openings/${jobOpeningId}/jd/enhance`,
                method: 'POST',
                body: {},
              });

        if (result.error) {
          return { error: result.error };
        }

        return {
          data: {
            success: true,
            message: 'Job Description regeneration started',
            data: {
              id: jobOpeningId,
              jobDescription: '',
            },
          },
        };
      },
      invalidatesTags: (_r, _e, args) => [
        { type: 'JobDescription', id: resolveJobId(args) },
        { type: 'JobDetails', id: resolveJobId(args) },
      ],
    }),
  }),
});

export const { useRegenerateJobDescriptionMutation } = extendedApi;
