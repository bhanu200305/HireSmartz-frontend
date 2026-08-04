import api from '../..';
import type { DuplicateCandidate } from '../../../types';

export type BatchItem = {
  id: number;
  batchId: string;
  jobOpeningId: number;
  jobProfileCode: string;
  jobTitle: string;
  status: string;
  message: string | null;
  duplicatesJson: string | null;
  metadataJson: string | null;
  uploadedBy: number;
  acknowledgement: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export type GetJobBatchesResponse = {
  success: boolean;
  message: string;
  data: BatchItem[];
};

type AcknowledgeBatchRequest = {
  batchId: string;
  acknowledgement: boolean;
};

type AcknowledgeBatchResponse = {
  success: boolean;
  message: string;
  data: null;
};

/**
 * Parse the duplicatesJson string from a BatchItem into a typed array.
 * Returns [] for null or malformed input.
 */
export const parseDuplicatesJson = (raw: string | null): DuplicateCandidate[] => {
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DuplicateCandidate[];
  } catch {
    return [];
  }
};

const batchesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getJobBatches: builder.query<GetJobBatchesResponse, { jobId: number }>({
      query: ({ jobId }) => `/job/batches?jobId=${jobId}`,
      providesTags: (_result, _error, { jobId }) => [{ type: 'JobBatches' as const, id: jobId }],
    }),
    acknowledgeBatch: builder.mutation<AcknowledgeBatchResponse, AcknowledgeBatchRequest>({
      query: (body) => ({
        url: '/batch/acknowledge',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { batchId }) => [
        { type: 'JobBatches' as const, id: batchId },
        'JobBatches',
      ],
    }),
  }),
});

export const { useGetJobBatchesQuery, useAcknowledgeBatchMutation } = batchesApi;
