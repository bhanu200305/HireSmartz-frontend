import candidateApi from '../candidateApi';

// Recruiter Notes — API_CONTRACT.md's "Recruiter Notes" section. Standard
// CRUD; edit/delete are author-only (`403 NOT_AUTHOR` otherwise — hide the
// affordance client-side too, not just relying on the 403).
// `author_id` always comes from the JWT server-side, never the request
// body — you cannot post a note "as" someone else. Replaces the legacy
// `FollowUpNotes.ts` in this folder, which has no real backend equivalent.

// `updated_at` used to be declared here — removed 2026-09-07. It doesn't
// exist anywhere in candidate-service (not on `RecruiterNoteView`, not even
// tracked internally on the entity) — editing a note just isn't
// timestamped server-side. Confirmed unread anywhere in this codebase.
export type RecruiterNoteView = {
  id: string;
  candidate_id: string;
  author_id: string;
  note: string;
  created_at: string;
};

export type PaginatedRecruiterNotes = {
  items: RecruiterNoteView[];
  limit: number;
  offset: number;
};

export type AddRecruiterNoteRequest = { note: string };
/** Matches `candidate_dto.AddRecruiterNoteResultView` — just the new note's
 * id, NOT the full `RecruiterNoteView` this used to alias (which would have
 * left `candidate_id`/`author_id`/`note`/`created_at` all silently
 * `undefined` on the mutation's own result — harmless today only because
 * `CandidateRecruiterNotesPanel.tsx` never reads them, relying on the
 * list query's refetch for the real row instead). */
export type AddRecruiterNoteResultView = { id: string };

export type EditRecruiterNoteRequest = { note: string };
/** Matches `candidate_dto.EditRecruiterNoteResultView` — `id` and the
 * updated `note` text only, same "used to over-claim the full
 * `RecruiterNoteView`" issue as `AddRecruiterNoteResultView` above. */
export type EditRecruiterNoteResultView = { id: string; note: string };

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
