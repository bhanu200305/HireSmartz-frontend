import api from '../..';
import {
  InitiateVapiCallRequest,
  InitiateVapiCallResponse,
  ExtractResumeRequest,
  ExtractResumeResponse,
  CandidateByIdResponse,
  GetAllCandidatesResponse,
  GetAllCandidatesRequest,
  FetchAllAtsCandidatesRequest,
  FetchAllAtsCandidatesResponse,
  InterviewScheduleRequest,
  InterviewScheduleResponse,
  BulkScheduleInterviewResponse,
  CancelBookingRequest,
  CancelBookingResponse,
  FetchAllMembersResponse,
  FinalFeedbackStatusRequest,
  FinalFeedbackStatusResponse,
  CandidateResumeStatusRequest,
  CandidateResumeStatusResponse,
  RefreshResumeRequest,
  FetchCandidateSourceResponse,
  FetchCandidateListingInterviewStatusResponse,
  EditCandidateResponse,
  EditCandidateRequest,
  SkipInterviewRoundRequest,
  SkipInterviewResponse,
  UpdateInterviewStatusRequest,
  ResumeThumbStatusRequest,
  ExtractMultipleResumesResponse,
  SubstituteInterviewerRequest,
  SubstituteInterviewerResponse,
  BulkStatusUpdateRequest,
  BulkStatusUpdateResponse,
  SmsConversationResponse,
  GetSmsConversationRequest,
  SendCandidateSmsRequest,
  SendCandidateSmsResponse,
  SendCandidateSmsActionRequest,
  SendCandidateSmsActionResponse,
} from '../../../types';

type CandidatesByIdRequest = {
  candidateId: number;
};

const extendedApi = api.injectEndpoints({
  endpoints: (build) => ({
    initiateVapiCall: build.mutation<InitiateVapiCallResponse, InitiateVapiCallRequest>({
      query: ({ candidateId }) => ({
        url: `/candidate/initiate_vapi_call?candidateId=${candidateId}`,
        method: 'POST',
        body: { candidateId },
      }),
    }),
    extractResume: build.mutation<ExtractResumeResponse, ExtractResumeRequest>({
      query: (formData) => ({
        url: '/candidate/extract/resume',
        method: 'POST',
        body: formData,
      }),
    }),
    extractMultipleResumes: build.mutation<ExtractMultipleResumesResponse, ExtractResumeRequest>({
      query: (formData) => ({
        url: '/candidate/extract/multiple',
        method: 'POST',
        body: formData,
      }),
      extraOptions: {
        statusCode: 202,
      },
    }),
    getCandidateById: build.query<CandidateByIdResponse, CandidatesByIdRequest>({
      query: ({ candidateId }) => ({
        url: `/candidate/getByID?candidateId=${candidateId}`,
        method: 'GET',
      }),
    }),
    resumeThumbStatus: build.mutation<void, ResumeThumbStatusRequest>({
      query: (body) => ({
        url: '/candidate/resume-thumb-status',
        method: 'POST',
        body,
      }),
    }),
    getAllCandidates: build.query<GetAllCandidatesResponse, GetAllCandidatesRequest>({
      query: ({
        jobOpeningId,
        page = 0,
        size = 10,
        status = true,
        sortBy = '',
        sortDir = '',
        ...rest
      }) => ({
        url: `/candidate/getAll?jobOpeningId=${jobOpeningId}&page=${page}&size=${size}${sortBy ? `&sortBy=${sortBy}` : ''}${sortDir ? `&sortDir=${sortDir}` : ''}`,
        method: 'POST',
        body: {
          ...rest,
        },
      }),
    }),
    fetchAllAtsCandidates: build.query<FetchAllAtsCandidatesResponse, FetchAllAtsCandidatesRequest>(
      {
        query: ({ atsJobOpeningId }) => ({
          url: `/ats/fetch-all-candidates?atsJobOpeningId=${atsJobOpeningId}`,
          method: 'GET',
        }),
      }
    ),
    refreshResume: build.mutation<void, RefreshResumeRequest>({
      query: ({ candidateId }) => ({
        url: `/candidate/retry-resume?candidateId=${candidateId}`,
        method: 'POST',
      }),
    }),
    scheduleInterview: build.mutation<InterviewScheduleResponse, InterviewScheduleRequest>({
      query: (body) => ({
        url: '/interview/schedule',
        method: 'POST',
        body,
      }),
    }),
    substituteInterviewer: build.mutation<
      SubstituteInterviewerResponse,
      SubstituteInterviewerRequest
    >({
      query: (body) => ({
        url: '/interview/substitute-interviewer',
        method: 'POST',
        body,
      }),
    }),
    cancelInterviewBooking: build.mutation<CancelBookingResponse, CancelBookingRequest>({
      query: (body) => ({
        url: '/interview/booking/delete',
        method: 'POST',
        body,
      }),
    }),
    skipInterviewRound: build.mutation<SkipInterviewResponse, SkipInterviewRoundRequest>({
      query: (body) => ({
        url: '/interview/skip',
        method: 'POST',
        body,
      }),
    }),
    fetchAllMembers: build.query<FetchAllMembersResponse, void>({
      query: () => ({
        url: `/interview/getAllHosts`,
        method: 'GET',
      }),
    }),
    videoFinalFeedbackStatus: build.mutation<
      FinalFeedbackStatusResponse,
      FinalFeedbackStatusRequest
    >({
      query: ({ query, body }) => ({
        url: `/interview/video-interview-status?jobOpeningId=${query.jobOpeningId}&candidateId=${query.candidateId}&roundId=${query.roundId}`,
        method: 'POST',
        body,
      }),
    }),
    candidateResumeStatus: build.mutation<
      CandidateResumeStatusResponse,
      CandidateResumeStatusRequest
    >({
      query: ({ candidateId, ...body }) => ({
        url: `/candidate/resume-status?candidateId=${candidateId}`,
        method: 'POST',
        body,
      }),
    }),
    fetchCandidateListingSource: build.query<FetchCandidateSourceResponse, void>({
      query: () => ({
        url: `/candidate/sources`,
        method: 'GET',
      }),
    }),
    fetchCandidateListingInterviewStatus: build.query<
      FetchCandidateListingInterviewStatusResponse,
      void
    >({
      query: () => ({
        url: `/candidate/interview-statuses`,
        method: 'GET',
      }),
    }),
    editCandidate: build.mutation<EditCandidateResponse, EditCandidateRequest>({
      query: ({ candidateId, ...body }) => ({
        url: `/candidate/edit?candidateId=${candidateId}`,
        method: 'PUT',
        body,
      }),
    }),
    statusUpdate: build.mutation<void, UpdateInterviewStatusRequest>({
      query: (body) => ({
        url: '/interview/status/update',
        method: 'POST',
        body,
      }),
    }),
    bulkStatusUpdate: build.mutation<BulkStatusUpdateResponse, BulkStatusUpdateRequest>({
      query: (body) => ({
        url: '/interview/bulk/status/update',
        method: 'POST',
        body,
      }),
    }),
    bulkScheduleInterview: build.mutation<
      BulkScheduleInterviewResponse,
      Array<{ candidateId: number; jobId: number; interviewRoundId: number }>
    >({
      query: (body) => ({
        url: '/interview/bulk/schedule',
        method: 'POST',
        body,
      }),
    }),
    downloadBatchErrorFile: build.query<Blob, { jobId: number }>({
      query: ({ jobId }) => ({
        url: `/candidate/download/batch-error-file?jobId=${jobId}`,
        method: 'GET',
        responseHandler: (response) => response.blob(),
      }),
    }),
    getCandidateMessagingDetails: build.query<
      unknown,
      { candidateIds: number[]; jobOpeningId: string | number }
    >({
      query: ({ candidateIds, jobOpeningId }) => {
        const params = new URLSearchParams();
        candidateIds.forEach((id) => params.append('candidateIds', String(id)));
        params.set('jobOpeningId', String(jobOpeningId));
        return {
          url: `/job-opening/candidate-messaging/details?${params.toString()}`,
          method: 'GET',
        };
      },
    }),
    getSmsConversationThread: build.query<SmsConversationResponse, GetSmsConversationRequest>({
      query: ({
        candidateId,
        jobOpeningId,
        page = 0,
        size = 20,
        sortBy = 'createdAt',
        sortDirection = 'ASC',
      }) => ({
        url: `/job-opening/candidate-messaging/sms/conversation/thread?candidateId=${candidateId}&jobOpeningId=${jobOpeningId}&page=${page}&size=${size}&sortBy=${sortBy}&sortDirection=${sortDirection}`,
        method: 'GET',
      }),
      transformResponse: (response: any): SmsConversationResponse => {
        const thread = response?.data?.messages;
        const candidateName = response?.data?.candidateName || 'Candidate';
        const content = (thread?.content || []).map((message: any) => {
          const direction = message?.direction === 'INBOUND' ? 'INBOUND' : 'OUTBOUND';
          return {
            id: Number(message?.id) || 0,
            messageText: String(message?.messageText ?? message?.messageBody ?? ''),
            direction,
            senderName: String(message?.sentByName ?? message?.senderName ?? candidateName),
            senderType: message?.senderType,
            sentByRole: message?.sentByRole,
            createdAt: String(message?.createdAt || ''),
            status: message?.status,
          };
        });

        return {
          content,
          totalElements: Number(thread?.totalElements) || content.length,
          totalPages: Number(thread?.totalPages) || 0,
          number: Number(thread?.number) || 0,
          size: Number(thread?.size) || content.length,
          candidateName: response?.data?.candidateName || undefined,
          candidatePhone: response?.data?.candidatePhone || undefined,
          conversationId:
            Number.isFinite(Number(response?.data?.conversationId)) &&
            Number(response?.data?.conversationId) > 0
              ? Number(response?.data?.conversationId)
              : undefined,
        };
      },
    }),
    sendCandidateSms: build.mutation<SendCandidateSmsResponse, SendCandidateSmsRequest>({
      query: (body) => ({
        url: '/job-opening/candidate-messaging/sms/send',
        method: 'POST',
        body,
      }),
    }),
    sendCandidateSmsAction: build.mutation<
      SendCandidateSmsActionResponse,
      SendCandidateSmsActionRequest
    >({
      query: (body) => ({
        url: '/job-opening/candidate-messaging/sms/action/send',
        method: 'POST',
        body,
      }),
    }),
    sendBulkCandidateSms: build.mutation<
      unknown,
      { candidateIds: number[]; jobOpeningId: string | number; messageText: string }
    >({
      query: (body) => ({
        url: '/job-opening/candidate-messaging/sms/send/bulk',
        method: 'POST',
        body,
      }),
    }),
    sendCandidateEmail: build.mutation<
      unknown,
      {
        candidateId: number;
        jobOpeningId: string | number;
        subject: string;
        header: string;
        body: string;
        companyName: string;
        /** Resolved recipient addresses (must be sent; server may ignore candidate profile email if set) */
        toEmails: string[];
        ccEmails: string[];
        bccEmails: string[];
        dynamicAiContent?: string;
      }
    >({
      query: (body) => ({
        url: '/job-opening/candidate-messaging/email/send',
        method: 'POST',
        body,
      }),
    }),
    sendBulkCandidateEmail: build.mutation<
      unknown,
      {
        candidateIds: number[];
        jobOpeningId: string | number;
        subject: string;
        header: string;
        body: string;
        companyName: string;
        toEmails: string[];
        ccEmails: string[];
        bccEmails: string[];
        dynamicAiContent?: string;
        smsCandidateIds?: number[];
      }
    >({
      query: (body) => ({
        url: '/job-opening/candidate-messaging/email/send/bulk',
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useInitiateVapiCallMutation,
  useExtractResumeMutation,
  useExtractMultipleResumesMutation,
  useGetCandidateByIdQuery,
  useResumeThumbStatusMutation,
  useGetAllCandidatesQuery,
  useLazyGetAllCandidatesQuery,
  useFetchAllAtsCandidatesQuery,
  useRefreshResumeMutation,
  useScheduleInterviewMutation,
  useCancelInterviewBookingMutation,
  useSkipInterviewRoundMutation,
  useFetchAllMembersQuery,
  useVideoFinalFeedbackStatusMutation,
  useCandidateResumeStatusMutation,
  useFetchCandidateListingSourceQuery,
  useFetchCandidateListingInterviewStatusQuery,
  useEditCandidateMutation,
  useStatusUpdateMutation,
  useSubstituteInterviewerMutation,
  useBulkStatusUpdateMutation,
  useDownloadBatchErrorFileQuery,
  useLazyDownloadBatchErrorFileQuery,
  useLazyGetCandidateMessagingDetailsQuery,
  useSendCandidateSmsMutation,
  useSendCandidateSmsActionMutation,
  useSendBulkCandidateSmsMutation,
  useSendCandidateEmailMutation,
  useSendBulkCandidateEmailMutation,
  useBulkScheduleInterviewMutation,
  useGetSmsConversationThreadQuery,
} = extendedApi;
