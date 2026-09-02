import candidateApi from '../candidateApi';

// Recruiter Notes — API_CONTRACT.md's "Recruiter Notes" section. Standard
// CRUD; edit/delete are author-only (`403 NOT_AUTHOR` otherwise — hide the
// affordance client-side too, not just relying on the 403).
// `author_id` always comes from the JWT server-side, never the request
// body — you cannot post a note "as" someone else. Replaces the legacy
// `FollowUpNotes.ts` in this folder, which has no real backend equivalent.

export type RecruiterNoteView = {
  id: string;
  candidate_id: string;
  author_id: string;
  note: string;
  created_at: string;
  updated_at: string | null;
};

export type PaginatedRecruiterNotes = {
  items: RecruiterNoteView[];
  limit: number;
  offset: number;
};

export type AddRecruiterNoteRequest = { note: string };
export type AddRecruiterNoteResultView = RecruiterNoteView;

export type EditRecruiterNoteRequest = { note: string };
export type EditRecruiterNoteResultView = RecruiterNoteView;

const extendedApi = candidateApi.injectEndpoints({
  endpoints: (build) => ({
    addRecruiterNote: build.mutation<
      AddRecruiterNoteResultView,
      { candidateId: string; body: AddRecruiterNoteRequest }
    >({
      query: ({ candidateId, body }) => ({
        url: `/candidates/${candidateId}/notes`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'CandidateNotes', id: candidateId },
      ],
    }),

    listRecruiterNotes: build.query<
      PaginatedRecruiterNotes,
      { candidateId: string; limit?: number; offset?: number }
    >({
      query: ({ candidateId, limit, offset }) => ({
        url: `/candidates/${candidateId}/notes`,
        params: { limit, offset },
      }),
      providesTags: (_result, _error, { candidateId }) => [
        { type: 'CandidateNotes', id: candidateId },
      ],
    }),

    editRecruiterNote: build.mutation<
      EditRecruiterNoteResultView,
      { candidateId: string; noteId: string; body: EditRecruiterNoteRequest }
    >({
      query: ({ candidateId, noteId, body }) => ({
        url: `/candidates/${candidateId}/notes/${noteId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'CandidateNotes', id: candidateId },
      ],
    }),

    deleteRecruiterNote: build.mutation<null, { candidateId: string; noteId: string }>({
      query: ({ candidateId, noteId }) => ({
        url: `/candidates/${candidateId}/notes/${noteId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { candidateId }) => [
        { type: 'CandidateNotes', id: candidateId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useAddRecruiterNoteMutation,
  useListRecruiterNotesQuery,
  useEditRecruiterNoteMutation,
  useDeleteRecruiterNoteMutation,
} = extendedApi;
