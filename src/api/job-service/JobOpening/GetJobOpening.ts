import { JobFilterRequest, JobFilterResponse } from '../../../types';
import { api } from '../../index';

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getJobOpenings: build.query<JobFilterResponse, Partial<JobFilterRequest>>({
      query: (body) => ({
        url: `/job-opening/getByFilter?page=${body.page ?? 0}&size=${body.size ?? 10}${body.sortBy ? `&sortBy=${body.sortBy}` : ''}${body.sortDir ? `&sortDir=${body.sortDir}` : ''}`,
        method: 'POST',
        body,
      }),
      providesTags: [{ type: 'SearchResults', id: 'JobOpenings' }],
    }),
  }),
});

export const { useGetJobOpeningsQuery } = extendedApi;
