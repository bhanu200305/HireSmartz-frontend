import api from '../..';
import { mapApiNotesResponseToItems } from './notesResponseMappers';
import type { CandidateNoteItem } from '../../../components/JobsOpening/Notes/notesTypes';

export type NotesParentType = 'JOB' | 'CANDIDATE' | 'CANDIDATE_ROUND';

type InvalidateNotesArg = {
  invalidateJobId?: number;
  invalidateCandidateId?: number;
  invalidateRoundBookingId?: number;
};

export type CreateJobOpeningNoteRequest = {
  parentType: NotesParentType | string;
  parentId: number;
  noteText: string;
} & InvalidateNotesArg;

export type UpdateJobOpeningNoteRequest = {
  noteId: number;
  noteText: string;
} & InvalidateNotesArg;

export type DeleteJobOpeningNoteRequest = {
  noteId: number;
} & InvalidateNotesArg;

function invalidateTagsForNotes(arg: InvalidateNotesArg) {
  const tags: Array<
    | 'JobOpeningNotes'
    | 'CandidateNotes'
    | { type: 'JobOpeningNotes'; id: string }
    | { type: 'CandidateNotes'; id: string }
  > = [];
  if (arg.invalidateJobId != null) {
    tags.push({ type: 'JobOpeningNotes', id: `job-${arg.invalidateJobId}` });
  }
  if (arg.invalidateCandidateId != null) {
    tags.push({ type: 'CandidateNotes', id: `all-${arg.invalidateCandidateId}` });
    tags.push({ type: 'CandidateNotes', id: `candidate-${arg.invalidateCandidateId}` });
  }
  if (arg.invalidateRoundBookingId != null) {
    tags.push({ type: 'CandidateNotes', id: `round-${arg.invalidateRoundBookingId}` });
  }
  return tags;
}

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getJobOpeningNotes: build.query<CandidateNoteItem[], number>({
      query: (jobId) => ({
        url: `/job-opening/notes/job/${jobId}`,
        method: 'GET',
      }),
      transformResponse: (response: unknown) => mapApiNotesResponseToItems(response),
      providesTags: (_r, _e, jobId) => [{ type: 'JobOpeningNotes', id: `job-${jobId}` }],
    }),
    getCandidateNotesAll: build.query<CandidateNoteItem[], number>({
      query: (candidateId) => ({
        url: `/job-opening/notes/candidate/${candidateId}/all`,
        method: 'GET',
      }),
      transformResponse: (response: unknown) => mapApiNotesResponseToItems(response),
      providesTags: (_r, _e, candidateId) => [{ type: 'CandidateNotes', id: `all-${candidateId}` }],
    }),
    getRoundNotes: build.query<CandidateNoteItem[], number>({
      query: (bookingId) => ({
        url: `/job-opening/notes/round/${bookingId}`,
        method: 'GET',
      }),
      transformResponse: (response: unknown) => mapApiNotesResponseToItems(response),
      providesTags: (_r, _e, bookingId) => [{ type: 'CandidateNotes', id: `round-${bookingId}` }],
    }),
    createJobOpeningNote: build.mutation<unknown, CreateJobOpeningNoteRequest>({
      query: ({
        invalidateJobId: _j,
        invalidateCandidateId: _c,
        invalidateRoundBookingId: _r,
        ...body
      }) => ({
        url: '/job-opening/notes/create',
        method: 'POST',
        body: {
          parentType: body.parentType,
          parentId: body.parentId,
          noteText: body.noteText,
        },
      }),
      invalidatesTags: (_r, _e, arg) => invalidateTagsForNotes(arg),
    }),
    updateJobOpeningNote: build.mutation<unknown, UpdateJobOpeningNoteRequest>({
      query: ({
        noteId,
        noteText,
        invalidateJobId: _j,
        invalidateCandidateId: _c,
        invalidateRoundBookingId: _r,
      }) => ({
        url: `/job-opening/notes/update/${noteId}`,
        method: 'PUT',
        body: { noteText },
      }),
      invalidatesTags: (_r, _e, arg) => invalidateTagsForNotes(arg),
    }),
    deleteJobOpeningNote: build.mutation<unknown, DeleteJobOpeningNoteRequest>({
      query: ({
        noteId,
        invalidateJobId: _j,
        invalidateCandidateId: _c,
        invalidateRoundBookingId: _r,
      }) => ({
        url: `/job-opening/notes/delete/${noteId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, arg) => invalidateTagsForNotes(arg),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetJobOpeningNotesQuery,
  useLazyGetJobOpeningNotesQuery,
  useGetCandidateNotesAllQuery,
  useGetRoundNotesQuery,
  useCreateJobOpeningNoteMutation,
  useUpdateJobOpeningNoteMutation,
  useDeleteJobOpeningNoteMutation,
} = extendedApi;
