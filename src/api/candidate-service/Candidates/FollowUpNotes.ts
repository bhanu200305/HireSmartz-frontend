import { api } from '../../index';

export type FollowupNoteEmailRequest = {
  interviewBookingId: number;
  subject: string;
  followupNotes: string[];
  recipientEmail: string;
  ccemails: string[];
  bccemails: string[];
};

export type FollowupNoteEmailResponse = {
  message: string;
  status: string;
  code: string;
};

export type InterviewDetails = {
  candidateName: string;
  companyName: string | null;
  modeOfInterview: string;
  roundName: string;
  name: string;
  position: string;
};

export type GetFollowupNoteResponse = {
  success: boolean;
  message: string;
  data: {
    followupNotes: string[];
    recipientEmail: string;
    subject: string;
    interviewDetails: InterviewDetails;
    ccemails: string[];
    bccemails: string[];
  };
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    getFollowupNoteEmail: build.query<GetFollowupNoteResponse, number>({
      query: (interviewBookingId) => ({
        url: `interview/get-email/followup-note?interviewBookingId=${interviewBookingId}`,
        method: 'GET',
      }),
      transformResponse: (response: GetFollowupNoteResponse) => response,
    }),
    sendFollowupNoteEmail: build.mutation<FollowupNoteEmailResponse, FollowupNoteEmailRequest>({
      query: (body) => ({
        url: 'interview/send-email/followup-note',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useGetFollowupNoteEmailQuery, useSendFollowupNoteEmailMutation } = extendedApi;
