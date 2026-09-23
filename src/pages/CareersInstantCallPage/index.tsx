import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Input, Checkbox } from 'antd';
import { toast } from 'react-toastify';
import ReCAPTCHA from 'react-google-recaptcha';
import { EnvironmentOutlined, CalendarOutlined } from '@ant-design/icons';
import { useStartIntakeCallMutation } from '../../api/candidate-service/PublicApply/index';
import { useGetPublicJobQuery } from '../../api/job-service/PublicCareers/index';
import { PublicFooter } from '../../components/shared/PublicFooter';
import { PhoneNumberField, ResponsiveRecaptcha } from '../../components/shared';
import { usePublicCareersBranding } from '../../hooks/usePublicCareersBranding';
import {
  isPhoneValidForCountry,
  PHONE_VALIDATION_MESSAGE,
  toE164,
} from '../../shared/utils/validation/phoneValidation';

// Same default every other phone field in this app starts from.
const DEFAULT_COUNTRY_CODE = '+1';

// New — Path B of candidate-service's public apply surface
// (`POST /public/v1/apply/instant-call`, FRONTEND_INTEGRATION_DETAILS.md
// §5.2). No resume yet — `contact_no` is REQUIRED here (unlike Path A's
// optional phone), since interview-service needs a number to place the
// call. The candidate submits a resume later via an emailed link
// (`CareersResumeUploadPage`, `/resume-upload/:token`) — that page is only
// ever reached from the email itself, never linked from anywhere in this
// app's own navigation, so don't add a nav entry pointing at it here.

export const CareersInstantCallPage = () => {
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

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phone, setPhone] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [firstNameError, setFirstNameError] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [smsConsent, setSmsConsent] = useState(false);
  const [tosConsent, setTosConsent] = useState(false);
  const [tosError, setTosError] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const [startIntakeCall, { isLoading: isSubmitting }] = useStartIntakeCallMutation();

  const handleSubmit = async () => {
    const noFirstName = !firstName.trim();
    const noPhone = !phone.trim();
    const badPhone = !noPhone && !isPhoneValidForCountry(phone, countryCode);
    const noTos = !tosConsent;
    const noCaptcha = !captchaToken;

    setFirstNameError(noFirstName);
    setPhoneError(
      noPhone ? 'Phone number is required' : badPhone ? PHONE_VALIDATION_MESSAGE : null
    );
    setTosError(noTos);
    if (noCaptcha) setCaptchaError('Please confirm you are not a robot');

    if (noFirstName || noPhone || badPhone || noTos || noCaptcha) return;

    try {
      const res = await startIntakeCall({
        organizationId: organizationId ?? '',
        jobOpeningId: jobId ?? '',
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        emailId: email.trim() || undefined,
        contactNo: toE164(countryCode, phone),
        termsAccepted: tosConsent,
        smsConsent,
        captchaToken: captchaToken ?? '',
      }).unwrap();
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      toast.success(res.message || 'Request received.');
      // `call_placed: false` is NOT a failure — the candidate record exists
      // either way, the call itself just couldn't be placed right now (§6
      // "Degraded booking"). Either outcome routes to the same success
      // page, which reads this flag to word itself correctly.
      navigate(
        `/careers/${organizationId}/jobs/${jobId}/apply/success?callPlaced=${res.data.call_placed}`,
        { replace: true }
      );
    } catch (err) {
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      const apiMessage = (err as { data?: { message?: string } })?.data?.message;
      toast.error(apiMessage ?? 'Failed to submit. Please try again.');
    }
  };

  return (
    <div className="public-page min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-gray-900 shadow-md text-white px-4 h-12 flex items-center justify-center relative shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 cursor-pointer text-white p-1 hover:opacity-75 transition-opacity"
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
        </button>
        {logoUrl ? (
          <img src={logoUrl} alt={companyName ?? 'Company logo'} className="h-9 object-contain" />
        ) : (
          <span className="text-white font-bold text-xl tracking-widest">CFP</span>
        )}
      </header>

      <main className="w-full max-w-3xl mx-auto px-4 md:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Instant Call with Iris</h1>
        <p className="text-sm text-gray-500 mb-5">
          Leave your number and we&apos;ll call you shortly. No resume needed yet.
        </p>

        {job && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
            <h2 className="text-base font-bold text-gray-900">
              {job.job_title ?? job.job_profile_code}
            </h2>
            <p className="text-xs text-gray-400 mb-3">{job.job_profile_code}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {job.locations?.[0] && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <EnvironmentOutlined />
                  <span>
                    {[job.locations[0].city, job.locations[0].state, job.locations[0].country]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
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
                <p className="text-sm text-red-500 mt-1">First name is required</p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-800 mb-2">
                Last Name
              </label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="rounded-full"
                style={{ height: 44, paddingLeft: 16, paddingRight: 16 }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-800 mb-2">
                Phone Number <span className="text-red-500">*</span>
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
                Email (optional)
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@example.com"
                className="rounded-full"
                style={{ height: 44, paddingLeft: 16, paddingRight: 16 }}
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5 select-none">
            <Checkbox
              id="sms-consent"
              checked={smsConsent}
              onChange={(e) => setSmsConsent(e.target.checked)}
              className="mt-0.5 shrink-0"
            />
            <label htmlFor="sms-consent" className="text-sm text-gray-600 leading-relaxed">
              I agree to receive SMS updates about my application.
              <br />
              <span className="text-gray-400">
                (Optional: you can continue without agreeing to SMS communication)
              </span>
            </label>
          </div>

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
              This form can&apos;t accept requests right now; reCAPTCHA isn&apos;t configured for
              this site. Please contact the site administrator.
            </p>
          )}
          {captchaError && <p className="text-sm text-red-500 -mt-2">{captchaError}</p>}
        </div>
      </main>

      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-4 z-10">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !recaptchaSiteKey}
            className="w-full cursor-pointer bg-black text-white font-bold tracking-widest text-sm py-3.5 rounded-full hover:bg-gray-800 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'SUBMITTING…' : 'REQUEST A CALL'}
          </button>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
};

export default CareersInstantCallPage;
