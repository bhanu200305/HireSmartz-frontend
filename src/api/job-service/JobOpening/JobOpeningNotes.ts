import { jobApi } from '../jobApi';
import { mapApiNotesResponseToItems } from './notesResponseMappers';
import type { CandidateNoteItem } from '../../../components/JobsOpening/Notes/notesTypes';
import type { JobNoteResponse } from '../types';

type CreateJobNoteRequest = {
  jobOpeningId?: string;
  noteText: string;
  parentType?: string;
  parentId?: string | number;
  invalidateJobId?: string | number;
};

type UpdateJobNoteRequest = {
  jobOpeningId?: string;
  noteId: string;
  noteText: string;
  invalidateJobId?: string | number;
};

type DeleteJobNoteRequest = {
  jobOpeningId?: string;
  noteId: string;
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

export const {
  useGetJobOpeningNotesQuery,
  useCreateJobOpeningNoteMutation,
  useUpdateJobOpeningNoteMutation,
  useDeleteJobOpeningNoteMutation,
} = jobNotesApi;
