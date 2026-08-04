import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  PublicJob,
  PublicJobListResponse,
  PublicLocationItem,
  PublicJobsQueryParams,
  UploadUrlRequest,
  UploadUrlResponse,
  ApplyToJobRequest,
  ApplyLaterRequest,
  ApplyLaterPrefill,
} from '../../../types/PublicQr';
import type { EmailTemplateConfigResponse } from '../../tenant-service/MyCompany/emailTemplate';

const PUBLIC_BASE_URL = `${import.meta.env.VITE_BACKEND_ENDPOINT}/v1`;

export const publicQrApi = createApi({
  reducerPath: 'publicQrApi',
  baseQuery: fetchBaseQuery({ baseUrl: PUBLIC_BASE_URL }),
  tagTypes: ['PublicJobs', 'PublicLocations'],
  endpoints: (builder) => ({
    getPublicJobs: builder.query<PublicJobListResponse, PublicJobsQueryParams>({
      query: ({ qrCode, page = 0, size = 20, search, searchFields, locationIds, remote }) => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('size', String(size));
        if (search) params.set('search', search);
        if (searchFields?.length) params.set('searchFields', searchFields.join(','));
        locationIds?.forEach((id) => params.append('location', String(id)));
        if (remote) params.set('remote', 'true');
        return `/public/q/${qrCode}/jobs?${params.toString()}`;
      },
      providesTags: ['PublicJobs'],
    }),
    getPublicJobById: builder.query<PublicJob, { qrCode: string; jobId: number }>({
      query: ({ qrCode, jobId }) => `/public/q/${qrCode}/jobs/${jobId}`,
      providesTags: (_result, _error, { jobId }) => [{ type: 'PublicJobs', id: jobId }],
    }),
    getPublicLocations: builder.query<PublicLocationItem[], string>({
      query: (qrCode) => `/public/q/${qrCode}/locations`,
      providesTags: ['PublicLocations'],
    }),
    /** Fetches email template config (banner + theme colors) for a company — no auth required */
    getPublicEmailTemplateConfig: builder.query<EmailTemplateConfigResponse, number>({
      query: (companyId) => `/mail/template-config/${companyId}/default`,
    }),
    applyToJob: builder.mutation<
      { candidateId: number; message: string },
      { qrCode: string; body: ApplyToJobRequest }
    >({
      query: ({ qrCode, body }) => ({
        url: `/public/q/${qrCode}/apply`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
    }),
    getUploadUrl: builder.mutation<UploadUrlResponse, UploadUrlRequest>({
      query: (body) => ({
        url: '/public/upload-url',
        method: 'POST',
        body,
      }),
    }),
    getApplyLaterPrefill: builder.query<ApplyLaterPrefill, string>({
      query: (applyLaterToken) => `/public/apply-later/prefill?applyLaterToken=${applyLaterToken}`,
    }),
    applyLater: builder.mutation<{ message: string }, { qrCode: string; body: ApplyLaterRequest }>({
      query: ({ qrCode, body }) => ({
        url: `/public/q/${qrCode}/apply-later`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
    }),
  }),
});

export const {
  useGetPublicJobsQuery,
  useGetPublicJobByIdQuery,
  useGetPublicLocationsQuery,
  useGetPublicEmailTemplateConfigQuery,
  useApplyToJobMutation,
  useGetUploadUrlMutation,
  useApplyLaterMutation,
  useGetApplyLaterPrefillQuery,
} = publicQrApi;
