import { jobApi } from '../jobApi';
import { mapApiNotesResponseToItems } from './notesResponseMappers';
import type { CandidateNoteItem } from '../../../components/JobsOpening/Notes/notesTypes';
import type { JobNoteResponse } from '../types';
import api from '../..';

type CreateJobNoteRequest = {
  jobOpeningId?: string;
  noteText: string;
  parentType?: string;
  parentId?: string | number;
  invalidateCandidateId?: number;
  invalidateRoundBookingId?: number;
  invalidateJobId?: string | number;
};

type UpdateJobNoteRequest = {
  jobOpeningId?: string;
  noteId: string;
  noteText: string;
  invalidateCandidateId?: number;
  invalidateRoundBookingId?: number;
  invalidateJobId?: string | number;
};

type DeleteJobNoteRequest = {
  jobOpeningId?: string;
  noteId: string;
  invalidateCandidateId?: number;
  invalidateRoundBookingId?: number;
  invalidateJobId?: string | number;
};

const jobNotesApi = jobApi.injectEndpoints({
  endpoints: (build) => ({
    getJobOpeningNotes: build.query<CandidateNoteItem[], string>({
      query: (jobId) => ({
        url: `/job-openings/${jobId}/notes`,
        method: 'GET',
      }),
      transformResponse: (response: { notes: JobNoteResponse[] }) =>
        mapApiNotesResponseToItems({ notes: response.notes }),
      providesTags: (_r, _e, jobId) => [{ type: 'JobNotes', id: `job-${jobId}` }],
    }),

    createJobOpeningNote: build.mutation<JobNoteResponse, CreateJobNoteRequest>({
      query: ({ jobOpeningId, noteText, parentId }) => ({
        url: `/job-openings/${jobOpeningId ?? parentId}/notes`,
        method: 'POST',
        body: { note_text: noteText },
      }),
      invalidatesTags: (_r, _e, { jobOpeningId, invalidateJobId, parentId }) => [
        { type: 'JobNotes', id: `job-${jobOpeningId ?? invalidateJobId ?? parentId}` },
      ],
    }),

    updateJobOpeningNote: build.mutation<JobNoteResponse, UpdateJobNoteRequest>({
      query: ({ jobOpeningId, noteId, noteText, invalidateJobId }) => ({
        url: `/job-openings/${jobOpeningId ?? invalidateJobId}/notes/${noteId}`,
        method: 'PUT',
        body: { note_text: noteText },
      }),
      invalidatesTags: (_r, _e, { jobOpeningId, invalidateJobId }) => [
        { type: 'JobNotes', id: `job-${jobOpeningId ?? invalidateJobId}` },
      ],
    }),

    deleteJobOpeningNote: build.mutation<void, DeleteJobNoteRequest>({
      query: ({ jobOpeningId, noteId, invalidateJobId }) => ({
        url: `/job-openings/${jobOpeningId ?? invalidateJobId}/notes/${noteId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { jobOpeningId, invalidateJobId }) => [
        { type: 'JobNotes', id: `job-${jobOpeningId ?? invalidateJobId}` },
      ],
    }),
  }),
});

// Candidate / round notes are NOT on job-service — they belong to
// candidate-service (out of this integration's scope). Left on the shared
// legacy `api` so existing candidate screens keep compiling; those calls
// will 404 until candidate-service is wired the same way.
const candidateNotesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCandidateNotesAll: build.query<CandidateNoteItem[], number | string>({
      query: (candidateId) => ({
        url: `/job-opening/notes/candidate/${candidateId}/all`,
        method: 'GET',
      }),
      transformResponse: (response: unknown) => mapApiNotesResponseToItems(response),
    }),
    getRoundNotes: build.query<CandidateNoteItem[], number | string>({
      query: (bookingId) => ({
        url: `/job-opening/notes/round/${bookingId}`,
        method: 'GET',
      }),
      transformResponse: (response: unknown) => mapApiNotesResponseToItems(response),
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetJobOpeningNotesQuery,
  useCreateJobOpeningNoteMutation,
  useUpdateJobOpeningNoteMutation,
  useDeleteJobOpeningNoteMutation,
} = jobNotesApi;

export const { useGetCandidateNotesAllQuery, useGetRoundNotesQuery } = candidateNotesApi;
