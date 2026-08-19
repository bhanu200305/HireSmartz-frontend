import { useReducer, useState } from 'react';
import { z } from 'zod';
import { LuHeadset, LuStar, LuCalendarCheck, LuCheck } from 'react-icons/lu';
import { showToast } from '../shared/ui/toast';
import { useSubmitDemoRequestMutation } from '../../api/organization-service/Platform/guestOrganizations';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import Navbar from './Navbar';
import Footer from './Footer';
import './landingPage.css';

const COMPANY_SIZE_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '500+'];

// Backend wants a single integer (`company_size`), the form offers ranges —
// mapped to each bucket's lower bound, e.g. '11-50' -> 11.
const COMPANY_SIZE_TO_INT: Record<string, number> = {
  '1-10': 1,
  '11-50': 11,
  '51-200': 51,
  '201-500': 201,
  '500+': 500,
};

const demoRequestSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  workEmail: z
    .string()
    .min(1, 'Work email is required.')
    .email('Enter a valid email address.')
    .transform((val) => val.trim()),
  phone: z
    .string()
    .min(1, 'Phone number is required.')
    .refine((val) => /^[\d\s()+-]{7,}$/.test(val), 'Enter a valid phone number.'),
  company: z.string().min(1, 'Company is required.'),
  location: z.string().min(1, 'Location is required.'),
  jobTitle: z.string().min(1, 'Job title is required.'),
  companySize: z.string().min(1, 'Please select your company size.'),
  hearAboutUs: z.string().min(1, 'Please let us know how you heard about us.'),
});

type FormState = z.infer<typeof demoRequestSchema>;
type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_STATE: FormState = {
  firstName: '',
  lastName: '',
  workEmail: '',
  phone: '',
  company: '',
  location: '',
  jobTitle: '',
  companySize: '',
  hearAboutUs: '',
};

const FIELD_LABELS: Record<keyof FormState, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  workEmail: 'Work Email',
  phone: 'Phone',
  company: 'Company',
  location: 'Location',
  jobTitle: 'Job Title',
  companySize: 'What is Your Company Size?',
  hearAboutUs: 'How Did You Hear About Us?',
};

const inputClass =
  'w-full rounded-lg border border-neutral-200 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:outline-none';

const FormField = ({
  name,
  error,
  children,
}: {
  name: keyof FormState;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label className="mb-1.5 block text-xs font-bold text-neutral-700" htmlFor={name}>
      {FIELD_LABELS[name]} <span className="text-danger">*</span>
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
  </div>
);

const DemoIllustration = () => (
  <div className="relative flex h-full min-h-[420px] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-accent-500 p-8 sm:p-10">
    <div className="lp-blob absolute -top-16 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
    <div
      className="lp-blob absolute -right-10 -bottom-16 h-72 w-72 rounded-full bg-white/10 blur-3xl"
      style={{ animationDelay: '2s' }}
    />

    <div className="relative">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold tracking-widest text-white uppercase backdrop-blur-sm">
        Talk to our team
      </span>
      <h2 className="font-display mt-5 text-3xl leading-tight font-extrabold text-white sm:text-4xl">
        See CareerForce Pro in action
      </h2>
      <p className="mt-4 max-w-sm text-sm text-white/75">
        Get a personalized walkthrough of how AI-powered hiring can help your team screen faster and
        hire smarter.
      </p>
    </div>

    <div className="relative flex flex-col gap-3">
      <div className="lp-float flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl text-white">
          <LuHeadset />
        </span>
        <div>
          <p className="text-sm font-bold text-white">Loved by recruiting teams</p>
          <div className="mt-1 flex items-center gap-1 text-accent-300">
            {Array.from({ length: 5 }).map((_, i) => (
              <LuStar key={i} className="fill-current text-xs" />
            ))}
          </div>
        </div>
      </div>

      <div
        className="lp-float-slow flex items-center gap-4 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
        style={{ animationDelay: '0.8s' }}
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl text-white">
          <LuCalendarCheck />
        </span>
        <div>
          <p className="text-sm font-bold text-white">A 20-minute walkthrough</p>
          <p className="text-xs text-white/70">Pick a time that works for you</p>
        </div>
      </div>
    </div>
  </div>
);

const SuccessPanel = ({ onReset }: { onReset: () => void }) => (
  <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-neutral-100 bg-[#f9fafc] px-8 py-16 text-center">
    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-3xl text-success">
      <LuCheck />
    </span>
    <h2 className="font-display mt-6 text-2xl font-extrabold text-neutral-900">
      Thanks — you&apos;re all set!
    </h2>
    <p className="mt-2 max-w-sm text-sm text-neutral-500">
      Our team will reach out shortly to schedule your personalized CareerForce Pro demo.
    </p>
    <button
      type="button"
      onClick={onReset}
      className="mt-6 cursor-pointer rounded-full border border-neutral-200 px-6 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:border-primary-200 hover:text-primary-600"
    >
      Submit another request
    </button>
  </div>
);

const BookDemoPage = () => {
  const [form, setForm] = useReducer(
    (prev: FormState, next: Partial<FormState>) => ({ ...prev, ...next }),
    INITIAL_STATE
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitDemoRequest, { isLoading: isSubmitting }] = useSubmitDemoRequestMutation();

  const handleChange = (name: keyof FormState, value: string) => {
    setForm({ [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = demoRequestSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const nextErrors: FormErrors = {};
      (Object.keys(fieldErrors) as (keyof FormState)[]).forEach((key) => {
        nextErrors[key] = fieldErrors[key]?.[0];
      });
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    try {
      await submitDemoRequest({
        first_name: result.data.firstName,
        last_name: result.data.lastName,
        email: result.data.workEmail,
        contact_number: result.data.phone,
        company_name: result.data.company,
        location: result.data.location,
        company_size: COMPANY_SIZE_TO_INT[result.data.companySize] ?? 1,
        job_title: result.data.jobTitle,
        heard_about_us: result.data.hearAboutUs,
      }).unwrap();
      setSubmitted(true);
      showToast({ message: 'Demo request received!', type: 'success' });
    } catch (err) {
      showToast({
        message: getOrgErrorMessage(err, 'Failed to submit your request. Please try again.'),
        type: 'error',
      });
    }
  };

  const resetForm = () => {
    setForm(INITIAL_STATE);
    setErrors({});
    setSubmitted(false);
  };

  return (
    <div className="font-sans min-h-screen w-full bg-white">
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 pt-28 pb-20 sm:px-8 sm:pt-32">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="hidden lg:block">
            <DemoIllustration />
          </div>

          {submitted ? (
            <SuccessPanel onReset={resetForm} />
          ) : (
            <div>
              <h1 className="font-display text-3xl font-extrabold text-neutral-900 sm:text-4xl">
                Contact Us
              </h1>
              <p className="mt-2 text-neutral-500">Reach out to us for inquiries</p>

              <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField name="firstName" error={errors.firstName}>
                    <input
                      id="firstName"
                      className={inputClass}
                      placeholder="Jane"
                      value={form.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                    />
                  </FormField>
                  <FormField name="lastName" error={errors.lastName}>
                    <input
                      id="lastName"
                      className={inputClass}
                      placeholder="Doe"
                      value={form.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                    />
                  </FormField>
                </div>

                <FormField name="workEmail" error={errors.workEmail}>
                  <input
                    id="workEmail"
                    type="email"
                    className={inputClass}
                    placeholder="jane@company.com"
                    value={form.workEmail}
                    onChange={(e) => handleChange('workEmail', e.target.value)}
                  />
                </FormField>

                <FormField name="phone" error={errors.phone}>
                  <input
                    id="phone"
                    type="tel"
                    className={inputClass}
                    placeholder="(555) 000-0000"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </FormField>

                <FormField name="company" error={errors.company}>
                  <input
                    id="company"
                    className={inputClass}
                    placeholder="Acme Inc."
                    value={form.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                  />
                </FormField>

                <FormField name="location" error={errors.location}>
                  <input
                    id="location"
                    className={inputClass}
                    placeholder="San Francisco, CA"
                    value={form.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                  />
                </FormField>

                <FormField name="jobTitle" error={errors.jobTitle}>
                  <input
                    id="jobTitle"
                    className={inputClass}
                    placeholder="VP of Talent Acquisition"
                    value={form.jobTitle}
                    onChange={(e) => handleChange('jobTitle', e.target.value)}
                  />
                </FormField>

                <FormField name="companySize" error={errors.companySize}>
                  <select
                    id="companySize"
                    className={inputClass}
                    value={form.companySize}
                    onChange={(e) => handleChange('companySize', e.target.value)}
                  >
                    <option value="">Select company size</option>
                    {COMPANY_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size} employees
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField name="hearAboutUs" error={errors.hearAboutUs}>
                  <textarea
                    id="hearAboutUs"
                    rows={3}
                    className={inputClass}
                    placeholder="E.g. Google Search, YouTube, Facebook"
                    value={form.hearAboutUs}
                    onChange={(e) => handleChange('hearAboutUs', e.target.value)}
                  />
                </FormField>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 w-full cursor-pointer rounded-lg bg-neutral-950 py-3.5 text-sm font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting…' : 'Book a Demo'}
                </button>

                <p className="text-center text-[11px] leading-relaxed text-neutral-400">
                  By providing your phone number, you agree to receive SMS messages from CareerForce
                  Pro related to your demo request. Message frequency varies. Message &amp; data
                  rates may apply. Reply STOP to unsubscribe or HELP for help. See our{' '}
                  <span className="font-medium text-neutral-500">Terms of Service</span> and{' '}
                  <span className="font-medium text-neutral-500">Privacy Policy</span>.
                </p>
              </form>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BookDemoPage;
