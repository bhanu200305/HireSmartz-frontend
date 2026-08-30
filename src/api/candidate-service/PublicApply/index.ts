import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// POST /public/v1/apply — candidate-service's new, genuinely public
// (no login) apply endpoint (public_router.py). Separate `createApi`
// instance, same reasoning as publicQrApi.ts (its own reducerPath/baseQuery,
// registered in redux/reducers + redux/provider/store) — this can't ride the
// shared `api` client, which points at whichever service VITE_BACKEND_ENDPOINT
// is currently set to.
//
// Unlike the old apply flow (a separate presigned-upload-URL step, then a
// JSON body referencing the uploaded file), this endpoint takes the resume
// file directly in the same multipart request — there is no upload-url call
// to make first.
const PUBLIC_BASE_URL = `${import.meta.env.VITE_CANDIDATE_SERVICE_ENDPOINT}/public/v1`;

export type PublicApplyRequest = {
  organizationId: string;
  jobOpeningId: string;
  file: File;
  firstName?: string;
  lastName?: string;
  emailId?: string;
  contactNo?: string;
  termsAccepted: boolean;
  smsConsent: boolean;
  captchaToken: string;
};

export type PublicApplyResponse = {
  status_code: string;
  status: string;
  message: string;
  data: { id: string };
};

export const publicApplyApi = createApi({
  reducerPath: 'publicApplyApi',
  baseQuery: fetchBaseQuery({ baseUrl: PUBLIC_BASE_URL }),
  endpoints: (build) => ({
    submitPublicApplication: build.mutation<PublicApplyResponse, PublicApplyRequest>({
      query: ({
        organizationId,
        jobOpeningId,
        file,
        firstName,
        lastName,
        emailId,
        contactNo,
        termsAccepted,
        smsConsent,
        captchaToken,
      }) => {
        // Backend reads these as Form(...) fields, not JSON — multipart is
        // the only shape that carries both the file and the rest of the
        // fields in one request.
        const body = new FormData();
        body.append('organization_id', organizationId);
        body.append('job_opening_id', jobOpeningId);
        body.append('file', file);
        if (firstName) body.append('first_name', firstName);
        if (lastName) body.append('last_name', lastName);
        if (emailId) body.append('email_id', emailId);
        if (contactNo) body.append('contact_no', contactNo);
        body.append('terms_accepted', String(termsAccepted));
        body.append('sms_consent', String(smsConsent));
        body.append('captcha_token', captchaToken);

        return { url: '/apply', method: 'POST', body };
      },
    }),
  }),
});

export const { useSubmitPublicApplicationMutation } = publicApplyApi;
