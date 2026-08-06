import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Input, Select, Checkbox } from 'antd';
import { toast } from 'react-toastify';
import ReCAPTCHA from 'react-google-recaptcha';
import {
  EnvironmentOutlined,
  CalendarOutlined,
  UserOutlined,
  DollarOutlined,
  UploadOutlined,
  DeleteOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import {
  useApplyToJobMutation,
  useGetUploadUrlMutation,
  useApplyLaterMutation,
  useGetApplyLaterPrefillQuery,
  useGetPublicJobsQuery,
} from '../../api/candidate-service/PublicQr/index';
import { usePublicBranding } from '../../hooks/usePublicBranding';
import { PublicFooter } from '../../components/shared/PublicFooter';
import type { PublicJob } from '../../types/PublicQr';

const formatSalary = (min: number, max: number): string => {
  const fmt = (n: number): string => (n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${n}`);
  return `${fmt(min)} – ${fmt(max)}`;
};

const formatExperience = (min: number, max: number | null): string => {
  if (max !== null && max !== undefined) return `${min}-${max} Years of Experience`;
  return `${min}+ Years of Experience`;
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const COUNTRY_CODES = ['+1', '+44', '+91', '+61', '+49', '+33', '+81', '+86'];

export const PublicJobApplyPage = () => {
  const { qrCode, jobId } = useParams<{ qrCode: string; jobId: string }>();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const applyLaterToken = searchParams.get('applyLaterToken');
  const companyIdFromParams = searchParams.get('companyId')
    ? Number(searchParams.get('companyId'))
    : null;
  const { state } = useLocation();
  const jobFromState = (state as { job?: PublicJob; companyId?: number } | null)?.job ?? null;
  const companyId = (state as { companyId?: number } | null)?.companyId ?? companyIdFromParams;

  // Fetch prefill data when arriving via email link
  const { data: prefillData } = useGetApplyLaterPrefillQuery(applyLaterToken ?? '', {
    skip: !applyLaterToken,
  });

  // Fetch job list when not available in router state (direct URL / email link access)
  const { data: jobsData } = useGetPublicJobsQuery(
    { qrCode: qrCode ?? '', page: 0, size: 20 },
    { skip: !qrCode || !!jobFromState }
  );

  const jobFromApi = jobsData?.content.find((j) => j.jobId === Number(jobId)) ?? null;
  const job = jobFromState ?? jobFromApi ?? null;

  const { bannerUrl, headerStyle } = usePublicBranding(companyId);

  const [resume, setResume] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [resumeRequired, setResumeRequired] = useState(false);
  const [firstNameError, setFirstNameError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [tosConsent, setTosConsent] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Pre-fill form when arriving via apply-later email link
  useEffect(() => {
    if (prefillData) {
      if (prefillData.firstName) setFirstName(prefillData.firstName);
      if (prefillData.lastName) setLastName(prefillData.lastName);
      if (prefillData.email) setEmail(prefillData.email);
    }
  }, [prefillData]);

  const [applyToJob, { isLoading: isSubmitting }] = useApplyToJobMutation();
  const [applyLater, { isLoading: isApplyingLater }] = useApplyLaterMutation();
  const [getUploadUrl] = useGetUploadUrlMutation();
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedS3Key, setUploadedS3Key] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowed.includes(file.type)) {
      setResume(file);
      setFileError('Invalid file type. Only PDF and DOCX are allowed');
      setUploadedFileUrl(null);
      setUploadedS3Key(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResume(file);
      setFileError('File too large (Max 5MB)');
      setUploadedFileUrl(null);
      setUploadedS3Key(null);
      return;
    }
    setResume(file);
    setFileError(null);
    setUploadedFileUrl(null);
    setUploadedS3Key(null);

    try {
      setIsUploading(true);
      const { uploadUrl, fileUrl, s3Key } = await getUploadUrl({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }).unwrap();

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      setUploadedFileUrl(fileUrl);
      setUploadedS3Key(s3Key);
    } catch {
      setFileError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    const noResume = !resume || !!fileError || isUploading || !uploadedS3Key;
    const noFirstName = !firstName.trim();
    const noEmail = !email.trim();
    const noPhone = !phone.trim();
    const noCaptcha = !captchaToken;

    setResumeRequired(noResume);
    setFirstNameError(noFirstName);
    setEmailError(noEmail);
    setPhoneError(noPhone);
    if (noCaptcha) setCaptchaError('Please confirm you are not a robot');

    if (noResume || noFirstName || noEmail || noPhone || noCaptcha) return;

    const body = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      countryCode,
      phoneNumber: phone.trim(),
      jobId: Number(jobId),
      resumeUrl: uploadedFileUrl ?? '',
      s3Key: uploadedS3Key,
      fileType: resume.type,
      fileSize: resume.size,
      captchaToken: captchaToken ?? '',
      smsConsent,
    };

    try {
      const res = await applyToJob({ qrCode: qrCode ?? '', body }).unwrap();
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      navigate(
        `/public/q/${qrCode}/jobs/${jobId}/success${companyId ? `?companyId=${companyId}` : ''}`,
        {
          state: { message: res.message, jobTitle: job?.jobTitle, companyId },
          replace: true,
        }
      );
    } catch (err) {
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
      const apiMessage = (err as { data?: { message?: string } })?.data?.message;
      toast.error(apiMessage ?? 'Failed to submit application. Please try again.');
    }
  };

  const handleApplyLater = async () => {
    const noEmail = !email.trim();
    const noCaptcha = !captchaToken;

    setEmailError(noEmail);
    if (noCaptcha) setCaptchaError('Please confirm you are not a robot');

    if (noEmail || noCaptcha) return;
    try {
      const res = await applyLater({
        qrCode: qrCode ?? '',
        body: {
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          email: email.trim(),
          countryCode: phone.trim() ? countryCode : undefined,
          phoneNumber: phone.trim() || undefined,
          jobId: Number(jobId),
          captchaToken,
        },
      }).unwrap();
      toast.success(res.message || 'Job link has been sent to your email.');
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    } catch (err) {
      const errMsg =
        (err as { data?: { message?: string } })?.data?.message ?? 'Failed. Please try again.';
      toast.error(errMsg);
    }
  };

  return (
    <div className="public-page min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header
        className="text-white px-4 py-3 flex items-center justify-center relative shrink-0"
        style={headerStyle}
      >
        <button
          onClick={() =>
            navigate(`/public/q/${qrCode ?? ''}${companyId ? `?companyId=${companyId}` : ''}`, {
              state: { companyId },
            })
          }
          className="absolute left-4 text-white p-1 hover:opacity-75 transition-opacity"
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
        {bannerUrl ? (
          <img src={bannerUrl} alt="Company Logo" className="h-16 object-contain max-w-90" />
        ) : (
          <span className="text-white font-bold text-xl tracking-widest">CFP</span>
        )}
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 md:px-8 py-6 pb-36">
        <h1 className="text-2xl font-bold text-gray-900 mb-5">Apply</h1>

        {/* Job Summary Card */}
        {job && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
            <h2 className="text-base font-bold text-gray-900 mb-3">{job.jobTitle}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <EnvironmentOutlined />
                <span>
                  {job.location
                    ? [
                        job.location.addressLine1,
                        job.location.addressLine2,
                        job.location.city,
                        job.location.state,
                      ]
                        .filter(Boolean)
                        .join(', ')
                    : 'Location not specified'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CalendarOutlined />
                <span>{formatExperience(job.minimumExperience, job.maximumExperience)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <UserOutlined />
                <span>{job.isRemote ? 'Remote' : job.jobType}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <DollarOutlined />
                <span>{formatSalary(job.minimumSalary, job.maximumSalary)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {/* Resume Upload */}
          <div>
            <label htmlFor="resume-upload" className="block text-sm font-medium text-gray-800 mb-2">
              Resume/CV <span className="text-red-500">*</span>
            </label>
            {/* Error banner */}
            {fileError && (
              <div className="mb-3 flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                <span className="shrink-0 w-5 h-5 rounded-full border-2 border-red-500 flex items-center justify-center text-xs font-bold">
                  !
                </span>
                <span>Some files couldn&apos;t be uploaded. Please check the requirements</span>
              </div>
            )}
            <div
              className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-gray-300 transition-colors bg-white"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadOutlined className="text-2xl text-brand-400 mb-2" />
              <p className="text-sm font-medium text-gray-700">Click to Upload file</p>
              <p className="text-xs text-gray-400 mt-1">PDF or DOCX only · Max 5MB</p>
            </div>
            <input
              ref={fileInputRef}
              id="resume-upload"
              type="file"
              accept=".pdf,.docx"
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
                  {isUploading && <p className="text-xs text-brand-500 mt-0.5">Uploading…</p>}
                  {!isUploading && uploadedS3Key && !fileError && (
                    <p className="text-xs text-green-500 mt-0.5">✓ Uploaded</p>
                  )}
                  {!isUploading && fileError && (
                    <p className="text-xs text-red-500 mt-0.5">⚠ {fileError}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setResume(null);
                    setFileError(null);
                    setUploadedFileUrl(null);
                    setUploadedS3Key(null);
                  }}
                  className="text-gray-400 hover:text-red-400 transition-colors shrink-0"
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
                <p className="text-sm text-red-500 mt-1">First name is required</p>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-800 mb-2">
                Last Name <span className="text-red-500">*</span>
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

          {/* Email + Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-800 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <Select
                  value={countryCode}
                  onChange={(val: string) => setCountryCode(val)}
                  style={{ height: 44, width: 88 }}
                >
                  {COUNTRY_CODES.map((code) => (
                    <Select.Option key={code} value={code}>
                      {code}
                    </Select.Option>
                  ))}
                </Select>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (e.target.value.trim()) setPhoneError(false);
                  }}
                  placeholder="(555) 123-4567"
                  className="flex-1 rounded-full"
                  style={{
                    height: 44,
                    paddingLeft: 16,
                    paddingRight: 16,
                    borderColor: phoneError ? '#ef4444' : undefined,
                  }}
                />
              </div>
              {phoneError && <p className="text-sm text-red-500 mt-1">Phone number is required</p>}
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
              Message & data rates may apply. Reply STOP to opt out.
              <br />
              <span className="text-gray-400">
                (Optional – you can apply without agreeing to SMS communication)
              </span>
            </label>
          </div>

          {/* Terms of Service Checkbox */}
          <div className="flex items-start gap-2.5 mb-2 select-none">
            <Checkbox
              id="tos-consent"
              checked={tosConsent}
              onChange={(e) => setTosConsent(e.target.checked)}
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
              .
            </label>
          </div>

          {/* reCAPTCHA v2 */}
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY as string}
            onChange={(token) => {
              setCaptchaToken(token);
              setCaptchaError(null);
            }}
            onExpired={() => {
              setCaptchaToken(null);
              setCaptchaError(null);
            }}
          />
          {captchaError && <p className="text-sm text-red-500 -mt-2">{captchaError}</p>}
        </div>
      </main>

      {/* Sticky Footer Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 z-10">
        <div className="flex flex-col md:flex-row gap-3 max-w-3xl mx-auto">
          <button
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || isUploading}
            className="w-full md:flex-1 bg-black text-white font-bold tracking-widest text-sm py-3.5 rounded-full hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-60 md:order-2"
          >
            {isUploading ? 'UPLOADING...' : isSubmitting ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
          </button>
          <button
            onClick={() => void handleApplyLater()}
            disabled={isApplyingLater}
            className="w-full md:flex-1 border-2 border-gray-900 text-gray-900 font-semibold text-sm py-3.5 rounded-full hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-60 md:order-1"
          >
            {isApplyingLater ? 'SAVING...' : 'APPLY LATER'}
          </button>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
};

export default PublicJobApplyPage;
