import api from '../..';

/**
 * Represents a single job assignment for a candidate.
 * Part of the candidate stream response.
 */
export type CandidateJobAssignment = {
  candidateId: number;
  parentCandidateId: number | null;
  jobOpeningId: number;
  jobProfileCode: string;
  jobTitle: string;
  location: string;
  externalStatus: string;
  assignedAt: string;
  isCurrentJob: boolean;
  minSalary: number | null;
  maxSalary: number | null;
  minExperience: number | null;
  maxExperience: number | null;
  openings: number;
  hiringManagers: string[];
  jobTypes: string[];
  departments: string[];
};

/**
 * Payload for assigning a candidate to a job opening.
 * Used in POST /candidate/{candidateId}/assign-to-job
 */
export type AssignCandidateToJobPayload = {
  targetJobOpeningId: string | number;
};

/**
 * Request parameters for the assign-to-job mutation.
 * candidateId is part of the URL path.
 */
export type AssignCandidateToJobRequest = {
  candidateId: number;
  payload: AssignCandidateToJobPayload;
};

export type AssignCandidateToJobResponse = {
  success: boolean;
  message: string;
  data?: {
    candidateId: number;
    jobOpeningId: number;
  };
};

export type CandidateApplication = {
  jobOpeningId: number;
  jobTitle: string;
  applicationStatus: string;
  candidateScore: number | null;
  appliedDate: string;
  jobProfileCode?: string;
  departmentName?: string;
  hiringManager?: string;
};

export type GetCandidateApplicationsResponse = {
  success: boolean;
  message: string;
  data: CandidateApplication[];
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    assignCandidateToJob: build.mutation<AssignCandidateToJobResponse, AssignCandidateToJobRequest>(
      {
        query: ({ candidateId, payload }) => ({
          url: `/candidate/${candidateId}/assign-to-job`,
          method: 'POST',
          body: payload,
        }),
        invalidatesTags: (_result, _error, { candidateId }) => [
          { type: 'SearchResults', id: 'JobOpenings' },
          { type: 'SearchResults', id: 'Candidates' },
          { type: 'CandidateApplications', id: candidateId },
        ],
      }
    ),
    getCandidateApplications: build.query<
      GetCandidateApplicationsResponse,
      { candidateId: number }
    >({
      query: ({ candidateId }) => ({
        url: `/candidate/${candidateId}/applications`,
        method: 'GET',
      }),
      providesTags: (_result, _error, { candidateId }) => [
        { type: 'CandidateApplications', id: candidateId },
      ],
    }),
  }),
  overrideExisting: false,
});

export const { useAssignCandidateToJobMutation, useGetCandidateApplicationsQuery } = extendedApi;

/**
 * Internal helper to construct the assign payload.
 * Useful for ensuring type safety when calling the mutation.
 */
export const makeAssignCandidatePayload = (
  targetJobOpeningId: number
): AssignCandidateToJobPayload => ({
  targetJobOpeningId,
});
