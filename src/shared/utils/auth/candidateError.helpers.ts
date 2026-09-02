import { get } from 'lodash-es';
import { getPlatformErrorMessage, getPlatformErrorRequestId } from '../api/platformErrorEnvelope';

/**
 * candidate-service's error envelope is genuinely NOT the same shape as
 * authentication-service/organization-service/job-service's
 * `{error_code, message, request_id}` (all three build on `cfp_platform`'s
 * shared exception handler) — do not reuse `orgError.helpers.ts`/
 * `jobError.helpers.ts` here, they parse the wrong nesting.
 *
 * candidate-service has its OWN response-envelope convention
 * (API_CONTRACT.md's "Response envelope"), used for every domain error:
 *
 *   {"status": "error", "status_code": 422, "message": "...", "data": null}
 *
 * `message` sits at the top level (same place `getPlatformErrorMessage`
 * already looks — `err.data.message` — so that one generic helper is safe to
 * reuse), but there is **no `error_code` field anywhere in this shape** —
 * FRONTEND_INTEGRATION_DETAILS.md §2 is explicit that domain-error codes
 * only exist in server logs today, not the JSON body. Branch on
 * `getCandidateErrorStatusCode(err)` + the route you called + `message`
 * text instead (see that doc's full status/route/meaning table).
 *
 * The ONE exception, also documented in §2: a missing/expired/revoked
 * bearer token never reaches candidate-service's own code — shared platform
 * middleware rejects it first with the flatter
 * `{error_code: "UNAUTHENTICATED", message, request_id}` shape. That shape
 * also happens to carry `message`/`request_id` at the same top level, so
 * `getCandidateErrorMessage`/`getCandidateErrorRequestId` below read it
 * correctly too — you don't need to special-case 401 to get a message, only
 * to decide whether to redirect to login (candidateApi.ts's
 * `candidateBaseQueryWithReauth` already does that part).
 */

export type CandidateApiErrorBody = {
  status?: 'error';
  status_code?: number;
  message?: string;
  /**
   * `null` on almost every domain error. On a 422 from request validation
   * (malformed JSON, wrong type, a failed Pydantic constraint — as opposed
   * to a domain rule like "candidate already has a resume") this is
   * FastAPI/Pydantic's raw error list instead — see
   * `getCandidateValidationErrors` below for mapping it to form fields.
   */
  data?: unknown;
  /** Only present on the 401 UNAUTHENTICATED shape, never a domain error. */
  error_code?: string;
  request_id?: string | null;
};

export const getCandidateErrorBody = (err: unknown): CandidateApiErrorBody | undefined =>
  get(err, 'data') as CandidateApiErrorBody | undefined;

/** The message to show a user — the backend's own wording, never invented client-side. */
export const getCandidateErrorMessage = getPlatformErrorMessage;

/**
 * The HTTP status code — this is what `FRONTEND_INTEGRATION_DETAILS.md`
 * says to actually branch error handling on (status_code + route + message
 * text), since no per-domain `error_code` reaches the JSON body. RTK
 * Query's own `error.status` already carries this for a normal HTTP
 * response.
 */
export const getCandidateErrorStatusCode = (err: unknown): number | undefined =>
  (get(err, 'status') as number | undefined) ?? get(err, 'data.status_code');

/** Worth surfacing in support-facing copy — ties a user's report to a server-side log line. */
export const getCandidateErrorRequestId = getPlatformErrorRequestId;

/** One row of FastAPI/Pydantic's raw 422-validation error list. */
export type CandidateValidationError = {
  type: string;
  loc: (string | number)[];
  msg: string;
  input?: unknown;
};

/**
 * Only meaningful on a 422 caused by request validation (bad JSON shape,
 * wrong type, a failed field constraint) — API_CONTRACT.md's "Response
 * envelope" section calls this out as the one case `data` is genuinely
 * useful for: map each row's `loc` (e.g. `["body", "subject"]`) to the
 * matching form field. A 422 from a *domain* rule (e.g. "candidate already
 * has a resume") has `data: null` and puts everything in `message` instead
 * — this returns `undefined` in that case, don't assume a non-empty array.
 */
export const getCandidateValidationErrors = (
  err: unknown
): CandidateValidationError[] | undefined => {
  const data = get(err, 'data.data');
  return Array.isArray(data) ? (data as CandidateValidationError[]) : undefined;
};
