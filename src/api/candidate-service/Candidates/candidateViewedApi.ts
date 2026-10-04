import candidateApi from '../candidateApi';

// Records that the signed-in user opened this candidate's profile, so the
// list's "New" badge can be per person and work on any device.
//
// `POST /candidates/{candidate_id}/viewed`: no body, no user id (the server
// reads the user from the token). Idempotent: repeat calls for the same
// person and candidate do nothing new. 200/204 on success; a 404 is ignored
// (the profile page shows its own not-found state). Deliberately invalidates
// NO tags: it is fire-and-forget and must never trigger a refetch.
const candidateViewedApi = candidateApi.injectEndpoints({
  endpoints: (build) => ({
    recordCandidateViewed: build.mutation<unknown, string>({
      query: (candidateId) => ({
        url: `/candidates/${candidateId}/viewed`,
        method: 'POST',
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useRecordCandidateViewedMutation } = candidateViewedApi;
