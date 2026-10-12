import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ConfigProvider, Input, Checkbox, Select } from 'antd';
import { toast } from 'react-toastify';
import ReCAPTCHA from 'react-google-recaptcha';
import {
  EnvironmentOutlined,
  CalendarOutlined,
  UploadOutlined,
  DeleteOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import { useSubmitPublicApplicationMutation } from '../../api/candidate-service/PublicApply/index';
import { useGetPublicJobQuery } from '../../api/job-service/PublicCareers/index';
import { publicLocationLabels } from '../../shared/utils/publicJobDisplay';
import { PublicFooter } from '../../components/shared/PublicFooter';
import { PhoneNumberField, ResponsiveRecaptcha } from '../../components/shared';
import {
  getAppliedLocationErrorMessage,
  getCandidateErrorMessage,
} from '../../shared/utils/auth/candidateError.helpers';
import { usePublicCareersBranding } from '../../hooks/usePublicCareersBranding';
import {
  isPhoneValidForCountry,
  PHONE_VALIDATION_MESSAGE,
  toE164,
} from '../../shared/utils/validation/phoneValidation';

// Same default every other phone field in this app starts from.
const DEFAULT_COUNTRY_CODE = '+1';

// PDF/DOC/DOCX, max 5MB — matches candidate-service's own resume policy
// exactly (upload_resume.py's ALLOWED_RESUME_CONTENT_TYPES/MAX_RESUME_BYTES,
// reused unchanged by the public_apply use case).
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

export const CareersApplyPage = () => {
  const { organizationId, jobId } = useParams<{ organizationId: string; jobId: string }>();
  const navigate = useNavigate();
  const recaptchaSiteKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) || null;
  const { companyName, logoUrl } = usePublicCareersBranding(organizationId);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const { data: job } = useGetPublicJobQuery(
    { organizationId: organizationId ?? '', jobId: jobId ?? '' },
    { skip: !organizationId || !jobId }
  );

  // The job's offices a candidate can choose between (an address typed by hand has no id).
  const applyLocations = (job?.locations ?? []).filter((location) => location.job_location_id);
  const locationLabels = publicLocationLabels(job?.locations ?? []);
  const applyLocationLabels = publicLocationLabels(applyLocations);
  const [resume, setResume] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [resumeRequired, setResumeRequired] = useState(false);
  // A job at several locations asks where the candidate is applying.
  const [appliedLocationId, setAppliedLocationId] = useState('');
  const [locationError, setLocationError] = useState(false);
  const [firstNameError, setFirstNameError] = useState(false);
  const [lastNameError, setLastNameError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  // SMS is on unless the candidate opts out, so the box starts ticked.
  const [smsConsent, setSmsConsent] = useState(true);
  const [tosConsent, setTosConsent] = useState(false);
  const [tosError, setTosError] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [submitApplication, { isLoading: isSubmitting }] = useSubmitPublicApplicationMutation();

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
    const noFirstName = !firstName.trim();
    const noLastName = !lastName.trim();
    const noEmail = !email.trim();
    const noTos = !tosConsent;
    const noCaptcha = !captchaToken;
    const noLocation = applyLocations.length > 1 && !appliedLocationId;
    const badPhone = phone.trim() ? !isPhoneValidForCountry(phone, countryCode) : false;

    setResumeRequired(noResume);
    setLocationError(noLocation);
    setFirstNameError(noFirstName);
    setLastNameError(noLastName);
    setEmailError(noEmail);
    setTosError(noTos);
    setPhoneError(badPhone ? PHONE_VALIDATION_MESSAGE : null);
    if (noCaptcha) setCaptchaError('Please confirm you are not a robot');

    if (
      noResume ||
      noFirstName ||
      noLastName ||
      noEmail ||
      noTos ||
      noCaptcha ||
      noLocation ||
      badPhone ||
      !resume
    )
      return;

    try {
      const res = await submitApplication({
        organizationId: organizationId ?? '',
        jobOpeningId: jobId ?? '',
        file: resume,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailId: email.trim(),
        contactNo: phone.trim() ? toE164(countryCode, phone) : undefined,
        appliedJobLocationId: appliedLocationId || undefined,
        termsAccepted: tosConsent,
        smsConsent,
        captchaToken: captchaToken ?? '',
      }).unwrap();
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      toast.success(res.message || 'Application submitted successfully.');
      // `intake_call_booking_token` is only present when the job has an
      // Intake Call round configured AND interview-service was reachable at
      // apply time (FRONTEND_INTEGRATION_DETAILS.md §5.1 step 2/§6) — route
      // to the slot picker only then; otherwise this candidate simply has no
      // Intake Call to schedule (or it degraded gracefully), straight to the
      // plain success screen either way.
      const bookingToken = res.data.intake_call_booking_token;
      if (bookingToken) {
        navigate(
          `/careers/${organizationId}/jobs/${jobId}/apply/schedule?token=${encodeURIComponent(bookingToken)}`,
          { replace: true }
        );
      } else {
        navigate(`/careers/${organizationId}/jobs/${jobId}/apply/success`, { replace: true });
      }
    } catch (err) {
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      const fetchErr = err as { status?: number; data?: { message?: string } };
      // 409 is DuplicateApplicationError (DUPLICATE_APPLICATION): the same resume
      // file, or the same email, is already on this job. The server's message says
      // which of the two matched, so it is shown as sent instead of guessing here.
      if (fetchErr?.status === 409) {
        toast.error(getCandidateErrorMessage(err, "You've already applied to this job."), {
          autoClose: 6000,
        });
        return;
      }
      // 502 = the upload was rejected as a duplicate but the cleanup failed:
      // internal detail, so only a generic retry message is shown.
      if (fetchErr?.status === 502) {
        toast.error('Something went wrong while submitting your application. Please try again.', {
          autoClose: 6000,
        });
        return;
      }
      toast.error(
        getAppliedLocationErrorMessage(err) ??
          fetchErr?.data?.message ??
          'Failed to submit application. Please try again.',
        {
          autoClose: 6000,
        }
      );
    }
  };

  return (
    <div className="public-page min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gray-900 shadow-md text-white px-4 h-12 flex items-center justify-center relative shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 inline-flex cursor-pointer items-center gap-1 text-white p-1 hover:opacity-75 transition-opacity"
          aria-label="Go back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm">Back</span>
        </button>
        {logoUrl ? (
          <img src={logoUrl} alt={companyName ?? 'Company logo'} className="h-9 object-contain" />
        ) : (
          <span className="text-white font-bold text-xl tracking-widest">CFP</span>
        )}
      </header>

      <main className="w-full max-w-3xl mx-auto px-4 md:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-5">Apply</h1>

        {job && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
            <h2 className="text-base font-bold text-gray-900">
              {job.job_title ?? job.job_profile_code}
            </h2>
            <p className="text-xs text-gray-400 mb-3">{job.job_profile_code}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {locationLabels.map((label, index) => (
                <div
                  key={`${label}-${index}`}
                  className="flex items-center gap-2 text-sm text-gray-500"
                >
                  <EnvironmentOutlined />
                  <span>{label}</span>
                </div>
              ))}
              {(job.min_experience_req !== null || job.max_experience_req !== null) && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CalendarOutlined />
                  <span>
                    {job.min_experience_req !== null && job.max_experience_req !== null
                      ? `${job.min_experience_req}-${job.max_experience_req} Years of Experience`
                      : `${job.min_experience_req ?? job.max_experience_req}+ Years of Experience`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {applyLocations.length > 1 && (
            <div>
              <label
                htmlFor="applied-location"
                className="block text-sm font-medium text-gray-800 mb-2"
              >
                Which location are you applying for? <span className="text-red-500">*</span>
              </label>
              <ConfigProvider theme={{ components: { Select: { controlHeightLG: 44 } } }}>
                <Select
                  id="applied-location"
                  value={appliedLocationId || undefined}
                  placeholder="Select a location"
                  onChange={(value) => {
                    setAppliedLocationId(value);
                    setLocationError(false);
                  }}
                  status={locationError ? 'error' : undefined}
                  size="large"
                  className="w-full [&_.ant-select-selector]:!rounded-full [&_.ant-select-selector]:!px-4 [&_.ant-select-selection-placeholder]:!top-0 [&_.ant-select-selection-placeholder]:!bottom-0 [&_.ant-select-selection-placeholder]:!translate-y-0 [&_.ant-select-selection-placeholder]:!transform-none"
                  options={applyLocations.map((location, index) => ({
                    value: location.job_location_id ?? '',
                    label: applyLocationLabels[index],
                    address: location.address_line_1,
                    place: [location.city, location.state, location.country]
                      .filter(Boolean)
                      .join(', '),
                  }))}
                  optionRender={(option) => (
                    <div className="py-0.5">
                      <div className="text-sm font-medium text-gray-800">
                        {option.data.address || option.data.place}
                      </div>
                      {option.data.address && (
                        <div className="text-xs text-gray-500">{option.data.place}</div>
                      )}
                    </div>
                  )}
                />
              </ConfigProvider>
              {locationError && (
                <p className="mt-1 text-sm text-red-500">Please choose a location.</p>
              )}
            </div>
          )}
          {/* Resume Upload */}
          <div>
            <label htmlFor="resume-upload" className="block text-sm font-medium text-gray-800 mb-2">
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

          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-800 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  if (e.target.value.trim()) setFirstNameError(false);
                }}
                placeholder="John"
                className="rounded-full"
                style={{
                  height: 44,
                  paddingLeft: 16,
                  paddingRight: 16,
                  borderColor: firstNameError ? '#ef4444' : undefined,
                }}
              />
              {firstNameError && (
                <p className="text-sm text-red-500 mt-1">First Name is required</p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-800 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  if (e.target.value.trim()) setLastNameError(false);
                }}
                placeholder="Doe"
                className="rounded-full"
                style={{
                  height: 44,
                  paddingLeft: 16,
                  paddingRight: 16,
                  borderColor: lastNameError ? '#ef4444' : undefined,
                }}
              />
              {lastNameError && <p className="text-sm text-red-500 mt-1">Last Name is required</p>}
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-800 mb-2">
                Phone Number
              </label>
              <PhoneNumberField
                countryCode={countryCode}
                onCountryCodeChange={setCountryCode}
                phoneNumber={phone}
                onPhoneNumberChange={(value) => {
                  setPhone(value);
                  setPhoneError(null);
                }}
                className="h-11 rounded-full"
              />
              {phoneError && <p className="text-sm text-red-500 mt-1">{phoneError}</p>}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-800 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (e.target.value.trim()) setEmailError(false);
                }}
                placeholder="john.doe@example.com"
                className="rounded-full"
                style={{
                  height: 44,
                  paddingLeft: 16,
                  paddingRight: 16,
                  borderColor: emailError ? '#ef4444' : undefined,
                }}
              />
              {emailError && <p className="text-sm text-red-500 mt-1">Email is required</p>}
            </div>
          </div>

          {/* SMS Consent Checkbox */}
          <div className="flex items-start gap-2.5 mt-2 mb-2 select-none">
            <Checkbox
              id="sms-consent"
              checked={smsConsent}
              onChange={(e) => setSmsConsent(e.target.checked)}
              className="mt-1 shrink-0"
            />
            <label
              htmlFor="sms-consent"
              className="text-sm text-gray-600 leading-relaxed cursor-pointer"
            >
              I agree to receive SMS updates regarding my job application, interview scheduling,
              reminders, and status updates from Careerforce Pro. Message frequency may vary.
              Message &amp; data rates may apply. Reply STOP to opt out.
              <br />
              <span className="text-gray-400">(Uncheck if you don&apos;t want SMS updates)</span>
            </label>
          </div>

          {/* Terms of Service Checkbox */}
          <div className="flex items-start gap-2.5 mb-2 select-none">
            <Checkbox
              id="tos-consent"
              checked={tosConsent}
              onChange={(e) => {
                setTosConsent(e.target.checked);
                if (e.target.checked) setTosError(false);
              }}
              className="mt-0.5 shrink-0"
            />
            <label
              htmlFor="tos-consent"
              className="text-sm text-gray-600 leading-relaxed cursor-pointer"
            >
              By checking, I accept{' '}
              <a
                href="https://www.careerforcepro.com/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline"
              >
                Terms of Service
              </a>{' '}
              &amp;{' '}
              <a
                href="https://www.careerforcepro.com/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline"
              >
                Privacy Policy
              </a>
              . <span className="text-red-500">*</span>
            </label>
          </div>
          {tosError && (
            <p className="text-sm text-red-500 -mt-3">You must accept the terms to continue</p>
          )}

          {/* reCAPTCHA v2 — react-google-recaptcha renders through Google's own
              script and throws if `sitekey` is missing/undefined, and with no
              error boundary anywhere in this app that crash unmounts the
              whole page (blank screen), not just this widget. Render it only
              when a real key is configured; otherwise say so plainly instead
              of crashing. VITE_RECAPTCHA_SITE_KEY is not set in any env file
              yet — see the earlier session note on this gap. */}
          {recaptchaSiteKey ? (
            <ResponsiveRecaptcha
              ref={recaptchaRef}
              sitekey={recaptchaSiteKey}
              onChange={(token) => {
                setCaptchaToken(token);
                setCaptchaError(null);
              }}
              onExpired={() => {
                setCaptchaToken(null);
                setCaptchaError(null);
              }}
            />
          ) : (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              This form can&apos;t accept applications right now; reCAPTCHA isn&apos;t configured
              for this site. Please contact the site administrator.
            </p>
          )}
          {captchaError && <p className="text-sm text-red-500 -mt-2">{captchaError}</p>}
        </div>
      </main>

      {/* Sticky Footer Button */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 z-10">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !recaptchaSiteKey}
            className="w-full cursor-pointer bg-black text-white font-bold tracking-widest uppercase text-sm py-3.5 rounded-full hover:bg-gray-800 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
};

export default CareersApplyPage;
