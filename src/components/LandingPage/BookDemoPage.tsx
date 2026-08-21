import { useReducer, useState } from 'react';
import { z } from 'zod';
import { Select } from 'antd';
import { LuHeadset, LuStar, LuCalendarCheck, LuCheck } from 'react-icons/lu';
import { showToast } from '../shared/ui/toast';
import { useSubmitDemoRequestMutation } from '../../api/organization-service/Platform/guestOrganizations';
import { getOrgErrorMessage } from '../../shared/utils/auth/orgError.helpers';
import { countryCodes } from '../../constants/countryCode';
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

const HEAR_ABOUT_US_OPTIONS = [
  'Google Search',
  'Social Media (LinkedIn, Facebook, X, etc.)',
  'Referral from a colleague',
  'Blog or Article',
  'Event or Conference',
  'Other',
];
const HEAR_ABOUT_US_OTHER = 'Other';

// Dial codes for the phone field's country-code dropdown — reuses the same
// `countryCodes` list `LocationFormModal` already draws its phone selector
// from (see components/shared/ui/locationFormModal.tsx), so this page and
// that one show the same set of countries/codes. Two countries can share a
// dial code (+1 for US/Canada, +7 for Russia/Kazakhstan) — that's fine,
// only the code itself is ever sent, not which entry was picked.
const DEFAULT_COUNTRY_CODE = '+1';
const PHONE_COUNTRY_CODE_REGEX = /^\+\d{1,4}$/;

// Plain country names for the Location section's Country dropdown — derived
// from the same static `countryCodes` list (no network call). A full
// country → state → city cascade exists (`useCountryDropdown`), but it's
// backed by an authenticated tenant-service endpoint; this page is
// anonymous (no JWT — same as the rest of the "Book a Demo" submission), so
// it can't call that safely. Country becomes a real dropdown; State and
// City stay validated free-text fields.
const COUNTRY_NAME_OPTIONS = Array.from(
  new Set(countryCodes.map(({ label }) => label.replace(/\s*\(\+\d+\)\s*$/, '')))
).sort((a, b) => a.localeCompare(b));

// Backend's `location` (single free-text column, max 200 chars — see
// BookDemoRequest in requests.py) has no city/state/country structure of its
// own. The form collects the three separately for better validation and UX,
// then joins them into one string on submit so the API contract stays
// unchanged. Each part is capped at 60 chars so the joined value ("City,
// State, Country") can never exceed the backend's 200-char limit.
const LOCATION_PART_MAX = 60;

// Same idea for `heard_about_us` (single optional free-text column, max 500
// chars): the dropdown selection and the optional detail text are combined
// into one string before submit.
const HEAR_ABOUT_US_DETAIL_MAX = 200;

// Names: letters only, with single spaces allowed between words (e.g. "Mary
// Jane") — no digits, no punctuation. Enforced twice: this regex at submit
// time, and `handleNameChange` strips any disallowed character as the user
// types so an invalid one can never even land in the field.
const NAME_REGEX = /^[A-Za-z]+(?:\s[A-Za-z]+)*$/;
const LOCATION_PART_REGEX = /^[A-Za-z][A-Za-z\s.'-]*$/;
const COMPANY_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s&.,'-]*$/;
const JOB_TITLE_REGEX = /^[A-Za-z][A-Za-z\s&.,'/-]*$/;
const PHONE_REGEX = /^\d{7,15}$/;
// Stricter than zod's built-in `.email()` (which accepts things like
// "user@localhost" with no TLD): requires a proper local-part and a domain
// with at least one dot, and rejects a leading/trailing dot or @ on either
// side.
const EMAIL_REGEX =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

const demoRequestObjectSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters.')
    .max(100, 'First name must be under 100 characters.')
    .regex(NAME_REGEX, 'First name can only contain letters (and single spaces between words).'),
  lastName: z
    .string()
    .trim()
    .min(2, 'Last name must be at least 2 characters.')
    .max(100, 'Last name must be under 100 characters.')
    .regex(NAME_REGEX, 'Last name can only contain letters (and single spaces between words).'),
  workEmail: z
    .string()
    .trim()
    .min(1, 'Work email is required.')
    .max(254, 'Email must be under 254 characters.')
    .email('Enter a valid email address.')
    .regex(EMAIL_REGEX, 'Enter a valid email address (e.g. name@company.com).')
    .transform((val) => val.trim().toLowerCase()),
  countryCode: z
    .string()
    .min(1, 'Please select a country code.')
    .regex(PHONE_COUNTRY_CODE_REGEX, 'Invalid country code.'),
  phone: z
    .string()
    .trim()
    .min(1, 'Phone number is required.')
    .regex(PHONE_REGEX, 'Enter a valid phone number (7–15 digits, numbers only).'),
  company: z
    .string()
    .trim()
    .min(2, 'Company name must be at least 2 characters.')
    .max(200, 'Company name must be under 200 characters.')
    .regex(COMPANY_REGEX, 'Enter a valid company name.'),
  city: z
    .string()
    .trim()
    .min(2, 'City must be at least 2 characters.')
    .max(LOCATION_PART_MAX, `City must be under ${LOCATION_PART_MAX} characters.`)
    .regex(LOCATION_PART_REGEX, 'City can only contain letters, spaces, hyphens, and periods.'),
  state: z
    .string()
    .trim()
    .min(2, 'State must be at least 2 characters.')
    .max(LOCATION_PART_MAX, `State must be under ${LOCATION_PART_MAX} characters.`)
    .regex(LOCATION_PART_REGEX, 'State can only contain letters, spaces, hyphens, and periods.'),
  // A dropdown, not free text (see COUNTRY_NAME_OPTIONS) — validated
  // against that same list so a tampered request can't smuggle in
  // something else.
  country: z
    .string()
    .min(1, 'Please select your country.')
    .refine((val) => COUNTRY_NAME_OPTIONS.includes(val), 'Please select a valid country.'),
  jobTitle: z
    .string()
    .trim()
    .min(2, 'Job title must be at least 2 characters.')
    .max(150, 'Job title must be under 150 characters.')
    .regex(JOB_TITLE_REGEX, 'Enter a valid job title.'),
  companySize: z.string().min(1, 'Please select your company size.'),
  hearAboutUs: z.string().min(1, 'Please let us know how you heard about us.'),
  hearAboutUsDetail: z
    .string()
    .trim()
    .max(HEAR_ABOUT_US_DETAIL_MAX, `Please keep this under ${HEAR_ABOUT_US_DETAIL_MAX} characters.`)
    .default(''),
});

// `.superRefine` wraps the object in a `ZodEffects`, which no longer exposes
// `.shape` — kept as a separate schema so per-field (onBlur) validation can
// still validate one key at a time via `demoRequestObjectSchema.shape[key]`.
const demoRequestSchema = demoRequestObjectSchema.superRefine((data, ctx) => {
  if (data.hearAboutUs === HEAR_ABOUT_US_OTHER && data.hearAboutUsDetail.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['hearAboutUsDetail'],
      message: 'Please tell us how you heard about us.',
    });
  }
});

type FormState = z.infer<typeof demoRequestSchema>;
type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL_STATE: FormState = {
  firstName: '',
  lastName: '',
  workEmail: '',
  countryCode: DEFAULT_COUNTRY_CODE,
  phone: '',
  company: '',
  city: '',
  state: '',
  country: '',
  jobTitle: '',
  companySize: '',
  hearAboutUs: '',
  hearAboutUsDetail: '',
};

const FIELD_LABELS: Record<keyof FormState, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  workEmail: 'Work Email',
  countryCode: 'Country Code',
  phone: 'Phone',
  company: 'Company',
  city: 'City',
  state: 'State',
  country: 'Country',
  jobTitle: 'Job Title',
  companySize: 'What is Your Company Size?',
  hearAboutUs: 'How Did You Hear About Us?',
  hearAboutUsDetail: 'Tell us a bit more',
};

const inputClass =
  'w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-sm transition-all duration-200 hover:border-neutral-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-100 focus:outline-none';

// Same visual treatment as `inputClass` (border/shadow/hover/focus), but for
// a div wrapping an AntD `Select` instead of a plain `<input>`. The Select
// itself renders `variant="borderless"` so this div's border is the only
// one ever drawn — no double-border seam between AntD's chrome and ours.
const selectWrapperClass = (hasError: boolean, extra = '') =>
  `rounded-xl border bg-white shadow-sm transition-all duration-200 hover:border-neutral-300 focus-within:border-primary-400 focus-within:ring-2 focus-within:ring-primary-100 ${
    hasError ? 'border-danger' : 'border-neutral-200'
  } ${extra}`;

const FormField = ({
  name,
  error,
  required = true,
  children,
}: {
  name: keyof FormState;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div>
    <label className="mb-1.5 block text-xs font-bold text-neutral-700" htmlFor={name}>
      {FIELD_LABELS[name]} {required && <span className="text-danger">*</span>}
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
      className="mt-6 cursor-pointer rounded-full border border-neutral-200 px-6 py-2.5 text-sm font-semibold text-neutral-700 shadow-sm transition-all duration-200 hover:border-primary-200 hover:text-primary-600 hover:shadow-md"
    >
      Submit another request
    </button>
  </div>
);

// Joins the dropdown selection and optional detail text into the single
// string the backend's `heard_about_us` column expects.
const buildHeardAboutUs = (selection: string, detail: string): string => {
  const trimmedDetail = detail.trim();
  if (selection === HEAR_ABOUT_US_OTHER) {
    return trimmedDetail ? `Other: ${trimmedDetail}` : HEAR_ABOUT_US_OTHER;
  }
  return trimmedDetail ? `${selection} — ${trimmedDetail}` : selection;
};

// Joins city/state/country into the single string the backend's `location`
// column expects.
const buildLocation = (city: string, state: string, country: string): string =>
  [city.trim(), state.trim(), country.trim()].filter(Boolean).join(', ');

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

  // Names should only ever contain letters and spaces — filtered as the
  // user types (same reasoning as the phone filter below) so a digit or
  // symbol can never land in the field to begin with.
  const handleNameChange = (name: 'firstName' | 'lastName', value: string) => {
    setForm({ [name]: value.replace(/[^A-Za-z\s]/g, '') });
  };

  // Phone should only ever contain digits — filtered as the user types
  // rather than merely validated afterwards, so an invalid character can
  // never make it into the field at all.
  const handlePhoneChange = (value: string) => {
    setForm({ phone: value.replace(/\D/g, '').slice(0, 15) });
  };

  const handleHearAboutUsChange = (value: string) => {
    // Clear any stale "Other" detail once the caller picks a different
    // option, so a leftover value can't sneak into the combined string.
    if (value !== HEAR_ABOUT_US_OTHER) {
      setForm({ hearAboutUs: value, hearAboutUsDetail: '' });
    } else {
      setForm({ hearAboutUs: value });
    }
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
        contact_number: `${result.data.countryCode}${result.data.phone}`,
        company_name: result.data.company,
        location: buildLocation(result.data.city, result.data.state, result.data.country),
        company_size: COMPANY_SIZE_TO_INT[result.data.companySize] ?? 1,
        job_title: result.data.jobTitle,
        heard_about_us: buildHeardAboutUs(result.data.hearAboutUs, result.data.hearAboutUsDetail),
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
                      maxLength={100}
                      value={form.firstName}
                      onChange={(e) => handleNameChange('firstName', e.target.value)}
                    />
                  </FormField>
                  <FormField name="lastName" error={errors.lastName}>
                    <input
                      id="lastName"
                      className={inputClass}
                      placeholder="Doe"
                      maxLength={100}
                      value={form.lastName}
                      onChange={(e) => handleNameChange('lastName', e.target.value)}
                    />
                  </FormField>
                </div>

                <FormField name="workEmail" error={errors.workEmail}>
                  <input
                    id="workEmail"
                    type="email"
                    className={inputClass}
                    placeholder="jane@company.com"
                    maxLength={254}
                    value={form.workEmail}
                    onChange={(e) => handleChange('workEmail', e.target.value)}
                  />
                </FormField>

                <FormField name="phone" error={errors.countryCode || errors.phone}>
                  <div
                    className={selectWrapperClass(
                      !!(errors.countryCode || errors.phone),
                      'flex items-center pl-1'
                    )}
                  >
                    <Select
                      id="countryCode"
                      aria-label="Country code"
                      value={form.countryCode}
                      onChange={(value) => handleChange('countryCode', value)}
                      variant="borderless"
                      size="large"
                      style={{ width: 92 }}
                      popupMatchSelectWidth={false}
                      showSearch
                      optionLabelProp="value"
                      filterOption={(input, option) =>
                        String(option?.label ?? '')
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      options={countryCodes.map(({ short, value, label }) => ({
                        label: `${short} — ${label}`,
                        value,
                      }))}
                    />
                    <span className="h-5 w-px bg-neutral-200" />
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="w-full border-none px-2.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                      placeholder="(555) 123-4567"
                      maxLength={15}
                      value={form.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                    />
                  </div>
                </FormField>

                <FormField name="company" error={errors.company}>
                  <input
                    id="company"
                    className={inputClass}
                    placeholder="Acme Inc."
                    maxLength={200}
                    value={form.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                  />
                </FormField>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <FormField name="city" error={errors.city}>
                    <input
                      id="city"
                      className={inputClass}
                      placeholder="San Francisco"
                      maxLength={LOCATION_PART_MAX}
                      value={form.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                    />
                  </FormField>
                  <FormField name="state" error={errors.state}>
                    <input
                      id="state"
                      className={inputClass}
                      placeholder="California"
                      maxLength={LOCATION_PART_MAX}
                      value={form.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                    />
                  </FormField>
                  <FormField name="country" error={errors.country}>
                    <div className={selectWrapperClass(!!errors.country)}>
                      <Select
                        id="country"
                        className="w-full"
                        variant="borderless"
                        size="large"
                        placeholder="Select country"
                        value={form.country || undefined}
                        onChange={(value) => handleChange('country', value)}
                        showSearch
                        filterOption={(input, option) =>
                          String(option?.label ?? '')
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                        options={COUNTRY_NAME_OPTIONS.map((countryName) => ({
                          label: countryName,
                          value: countryName,
                        }))}
                      />
                    </div>
                  </FormField>
                </div>

                <FormField name="jobTitle" error={errors.jobTitle}>
                  <input
                    id="jobTitle"
                    className={inputClass}
                    placeholder="VP of Talent Acquisition"
                    maxLength={150}
                    value={form.jobTitle}
                    onChange={(e) => handleChange('jobTitle', e.target.value)}
                  />
                </FormField>

                <FormField name="companySize" error={errors.companySize}>
                  <div className={selectWrapperClass(!!errors.companySize)}>
                    <Select
                      id="companySize"
                      className="w-full"
                      variant="borderless"
                      size="large"
                      placeholder="Select company size"
                      value={form.companySize || undefined}
                      onChange={(value) => handleChange('companySize', value)}
                      options={COMPANY_SIZE_OPTIONS.map((size) => ({
                        label: `${size} employees`,
                        value: size,
                      }))}
                    />
                  </div>
                </FormField>

                <FormField name="hearAboutUs" error={errors.hearAboutUs}>
                  <div className={selectWrapperClass(!!errors.hearAboutUs)}>
                    <Select
                      id="hearAboutUs"
                      className="w-full"
                      variant="borderless"
                      size="large"
                      placeholder="Select an option"
                      value={form.hearAboutUs || undefined}
                      onChange={handleHearAboutUsChange}
                      options={HEAR_ABOUT_US_OPTIONS.map((option) => ({
                        label: option,
                        value: option,
                      }))}
                    />
                  </div>
                </FormField>

                <FormField
                  name="hearAboutUsDetail"
                  error={errors.hearAboutUsDetail}
                  required={form.hearAboutUs === HEAR_ABOUT_US_OTHER}
                >
                  <input
                    id="hearAboutUsDetail"
                    className={inputClass}
                    placeholder={
                      form.hearAboutUs === HEAR_ABOUT_US_OTHER
                        ? 'Please tell us where you heard about us'
                        : 'Optional — a colleague, event, or article name'
                    }
                    maxLength={HEAR_ABOUT_US_DETAIL_MAX}
                    value={form.hearAboutUsDetail}
                    onChange={(e) => handleChange('hearAboutUsDetail', e.target.value)}
                  />
                </FormField>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 w-full cursor-pointer rounded-xl bg-neutral-950 py-3.5 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-primary-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
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
