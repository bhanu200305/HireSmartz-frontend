import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import { UploadOutlined, DeleteOutlined, FilePdfOutlined } from '@ant-design/icons';
import {
  useGetResumeUploadLinkDetailsQuery,
  useSubmitResumeUploadMutation,
} from '../../api/candidate-service/PublicApply/index';
import { PublicFooter } from '../../components/shared/PublicFooter';
import { ResponsiveRecaptcha } from '../../components/shared';
import {
  getCandidateErrorMessage,
  getCandidateErrorStatusCode,
} from '../../shared/utils/auth/candidateError.helpers';

// New — the actual destination of the "upload your resume within 24 hours"
// email (FRONTEND_INTEGRATION_DETAILS.md §5.2 step 3/4, notification-
// service's `LinkBuilder.resume_upload_url` — `{frontend_base_url}/resume-
// upload/{token}`, token in the PATH, never a query string, see that
// module's own docstring on why). Never reached from anywhere in this
// app's own navigation, same as CareersInstantCallPage's own comment
// already said before this page existed — this candidate has no account,
// no job id, no organization id in hand, only the signed token in the URL.
// That's also why there's no tenant branding/back button here unlike the
// other Careers* pages: there is nothing to resolve either from.
//
// PublicApplyResultView (the POST response) deliberately returns only an
// id, nothing about scores/status — so this page cannot and should not try
// to show a score. Scoring itself is triggered server-side, unconditionally,
// by `Candidate.attach_resume()` the moment the upload succeeds (stages
// `CandidateResumeScoreRequested` in the same transaction) — nothing this
// page needs to ask for separately.

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const CareersResumeUploadPage = () => {
  const { token } = useParams<{ token: string }>();
  const recaptchaSiteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) || null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const {
    data: linkDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
  } = useGetResumeUploadLinkDetailsQuery(token ?? '', { skip: !token });

  const [resume, setResume] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [resumeRequired, setResumeRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitResumeUpload, { isLoading: isSubmitting }] = useSubmitResumeUploadMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setResume(file);
      setFileError('Invalid file type. Only PDF, DOC, and DOCX are allowed');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setResume(file);
      setFileError('File too large (Max 5MB)');
      return;
    }
    setResume(file);
    setFileError(null);
    setResumeRequired(false);
  };

  const handleSubmit = async () => {
    const noResume = !resume || !!fileError;
    const noCaptcha = !captchaToken;

    setResumeRequired(noResume);
    if (noCaptcha) setCaptchaError('Please confirm you are not a robot');
    setSubmitError(null);

    if (noResume || noCaptcha || !resume || !token) return;

    try {
      await submitResumeUpload({ token, file: resume, captchaToken: captchaToken ?? '' }).unwrap();
      setSubmitted(true);
    } catch (err) {
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      const statusCode = getCandidateErrorStatusCode(err);
      // §5.2 step 4 — both need a clear "this link no longer works" message,
      // not a generic error. Distinct wording per code anyway since the two
      // are different situations a candidate can actually do something
      // about (409: nothing to do, you're already covered; 422: too late,
      // contact the recruiter directly).
      if (statusCode === 409) {
        setSubmitError("You've already submitted a resume for this application; no action needed.");
      } else if (statusCode === 422) {
        setSubmitError(
          'This link has expired (resume uploads close 24 hours after your call). Please contact the recruiter directly.'
        );
      } else {
        setSubmitError(getCandidateErrorMessage(err, 'Failed to submit. Please try again.'));
      }
    }
  };

  const detailsStatusCode = getCandidateErrorStatusCode(detailsError);
  const linkInvalid = !!detailsError;

  return (
    <div className="public-page min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-black text-white px-4 py-3 flex items-center justify-center shrink-0">
        <span className="text-white font-bold text-xl tracking-widest">CFP</span>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-10">
        {!token ? (
          <p className="text-sm text-gray-500 text-center max-w-sm mx-auto">
            This link is missing its token. Please use the link from your email instead of
            navigating here directly.
          </p>
        ) : isLoadingDetails ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
        ) : linkInvalid ? (
          <p className="text-sm text-gray-500 text-center max-w-sm mx-auto">
            {detailsStatusCode === 404
              ? 'This link is invalid or has already expired. Please contact the recruiter directly if you still need to submit your resume.'
              : detailsStatusCode === 409
                ? "You've already submitted a resume for this application; no action needed."
                : detailsStatusCode === 422
                  ? 'This link has expired (resume uploads close 24 hours after your call). Please contact the recruiter directly.'
                  : getCandidateErrorMessage(
                      detailsError,
                      'Could not load this page. Please try again.'
                    )}
          </p>
        ) : submitted ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 text-3xl flex items-center justify-center mx-auto mb-4">
              ✓
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Resume received!</h1>
            <p className="text-sm text-gray-500">
              Thanks{linkDetails?.data.first_name ? `, ${linkDetails.data.first_name}` : ''}, your
              resume is on its way to the hiring team. No further action needed on your end.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {linkDetails?.data.first_name
                ? `Hi ${linkDetails.data.first_name}, upload your resume`
                : 'Upload your resume'}
            </h1>
            <p className="text-sm text-gray-500 mb-8">
              Following up on your call. Add your resume below to finish your application.
            </p>

            <div className="flex flex-col gap-5">
              <div>
                <label
                  htmlFor="resume-upload"
                  className="block text-sm font-medium text-gray-800 mb-2"
                >
                  Resume/CV <span className="text-red-500">*</span>
                </label>
                <div
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-gray-300 transition-colors bg-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadOutlined className="text-2xl text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700">Click to Upload file</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, DOC, or DOCX only · Max 5MB</p>
                </div>
                <input
                  ref={fileInputRef}
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {resume && (
                  <div className="mt-3 bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <FilePdfOutlined className="text-gray-500 text-base" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{resume.name}</p>
                      <p className="text-xs text-gray-400">{formatFileSize(resume.size)}</p>
                      {fileError && <p className="text-xs text-red-500 mt-0.5">⚠ {fileError}</p>}
                    </div>
                    <button
                      onClick={() => {
                        setResume(null);
                        setFileError(null);
                      }}
                      className="text-gray-400 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
                      aria-label="Remove file"
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                )}
                {resumeRequired && !resume && (
                  <p className="text-sm text-red-500 mt-1">Resume is required</p>
                )}
              </div>

              {recaptchaSiteKey ? (
                <ResponsiveRecaptcha
                  ref={recaptchaRef}
                  sitekey={recaptchaSiteKey}
                  onChange={(value) => {
                    setCaptchaToken(value);
                    setCaptchaError(null);
                  }}
                  onExpired={() => {
                    setCaptchaToken(null);
                    setCaptchaError(null);
                  }}
                />
              ) : (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  This form can&apos;t accept uploads right now; reCAPTCHA isn&apos;t configured for
                  this site. Please contact the site administrator.
                </p>
              )}
              {captchaError && <p className="text-sm text-red-500 -mt-2">{captchaError}</p>}
              {submitError && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  {submitError}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSubmitting || !recaptchaSiteKey}
                className="w-full bg-black text-white font-bold tracking-widest text-sm py-3.5 rounded-full hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? 'SUBMITTING…' : 'SUBMIT RESUME'}
              </button>
            </div>
          </>
        )}
      </main>

      <PublicFooter />
    </div>
  );
};

export default CareersResumeUploadPage;
