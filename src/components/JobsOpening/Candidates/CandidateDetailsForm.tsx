import { useEffect, useRef, useState } from 'react';
import { Button, Input, PhoneNumberField, showToast } from '../../shared';
import {
  useUpdateCandidateMutation,
  type CandidateView,
} from '../../../api/candidate-service/Candidates/CandidateLifecycle';
import { phoneNumberIssueMessage } from './phoneNumberIssue';
import { FORM_EMAIL_REGEX } from '../../../constants/app.constants';
import { getCandidateErrorMessage } from '../../../shared/utils/auth/candidateError.helpers';
import {
  isPhoneValidForCountry,
  PHONE_VALIDATION_MESSAGE,
  splitStoredPhone,
  toE164,
} from '../../../shared/utils/validation/phoneValidation';

// Shared look for every field, read-only or editable. Disabled fields get the
// browser's not-allowed cursor (circle with a slash) on hover — the old app's
// cue that the details can't be changed until "Edit Details" is clicked.
const FIELD_CLASS =
  'h-12 rounded-full border border-gray-300 bg-white px-4 text-sm text-gray-800 disabled:cursor-not-allowed disabled:bg-white disabled:text-gray-600';

// Candidate Details tab's fields, in place (replaces the old Edit Candidate
// modal, as in the legacy app). `PATCH /candidates/{id}`
// (`UpdateCandidateRequest`) — only fields that actually changed are sent, so
// this never clobbers a field the recruiter didn't touch. Source and Applied
// Date describe how/when the candidate applied, so they stay read-only even
// while editing.

type CandidateDetailsFormProps = {
  candidate: CandidateView | undefined;
  isEditing: boolean;
  onDone: () => void;
  sourceLabel: string | undefined;
  appliedDate: string | undefined;
};

const CandidateDetailsForm = ({
  candidate,
  isEditing,
  onDone,
  sourceLabel,
  appliedDate,
}: CandidateDetailsFormProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  // No default code: a stored number without one is shown as written, and the
  // recruiter picks a code only if they change the phone.
  const [countryCode, setCountryCode] = useState('');
  const [phone, setPhone] = useState('');
  // The phone as seeded, so a save that didn't touch it never re-sends or
  // re-validates it (the stored number may have no country code).
  const seededPhone = useRef({ countryCode: '', phone: '' });
  const [updateCandidate, { isLoading }] = useUpdateCandidateMutation();

  // Mirror the record while read-only (including after a save's refetch), and
  // re-seed on Cancel so unsaved edits are discarded. While editing, a
  // background refetch must not wipe what the recruiter is typing, so it is
  // skipped, EXCEPT the first time this candidate's data reaches the form:
  // "Edit Candidate Details" in the header mounts this form already in edit
  // mode, and without that first seed the fields stayed blank until Cancel.
  const seededForId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!candidate) return;
    if (isEditing && seededForId.current === candidate.id) return;
    setFirstName(candidate.first_name ?? '');
    setLastName(candidate.last_name ?? '');
    setEmail(candidate.email_id ?? '');
    const split = splitStoredPhone(candidate.contact_no);
    setCountryCode(split.countryCode);
    setPhone(split.phoneNumber);
    seededPhone.current = { countryCode: split.countryCode, phone: split.phoneNumber };
    seededForId.current = candidate.id;
  }, [candidate, isEditing]);

  // First name, last name, email and phone are all mandatory.
  const isFormValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    phone.trim().length > 0;

  const handleSave = async () => {
    if (!candidate) return;
    if (!isFormValid) {
      showToast({
        message: 'First Name, last name, email and phone are required.',
        type: 'error',
      });
      return;
    }
    if (!FORM_EMAIL_REGEX.test(email.trim())) {
      showToast({ message: 'Enter a valid email address.', type: 'error' });
      return;
    }
    const phoneChanged =
      countryCode !== seededPhone.current.countryCode || phone !== seededPhone.current.phone;
    if (phoneChanged) {
      if (!countryCode) {
        showToast({ message: 'Select a country code.', type: 'error' });
        return;
      }
      if (!isPhoneValidForCountry(phone, countryCode)) {
        showToast({ message: PHONE_VALIDATION_MESSAGE, type: 'error' });
        return;
      }
    }

    const body: Record<string, string> = {};
    const nextFirst = firstName.trim();
    const nextLast = lastName.trim();
    const nextEmail = email.trim();
    if (nextFirst !== (candidate.first_name ?? '')) body.first_name = nextFirst;
    if (nextLast !== (candidate.last_name ?? '')) body.last_name = nextLast;
    if (nextEmail !== (candidate.email_id ?? '')) body.email_id = nextEmail;
    if (phoneChanged) {
      const nextPhone = toE164(countryCode, phone);
      if (nextPhone !== (candidate.contact_no ?? '')) body.contact_no = nextPhone;
    }

    if (Object.keys(body).length === 0) {
      onDone();
      return;
    }

    try {
      const result = await updateCandidate({ candidateId: candidate.id, body }).unwrap();
      showToast({ message: 'Candidate updated.', type: 'success' });
      // The phone is flagged right away if it can't be called or texted. The
      // save already went through; this is only a heads-up.
      const phoneWarning = phoneNumberIssueMessage(result?.phone_number_issue);
      if (phoneWarning) showToast({ message: phoneWarning, type: 'warning' });
      onDone();
    } catch (e) {
      showToast({
        message: getCandidateErrorMessage(e, 'Could not update candidate'),
        type: 'error',
      });
    }
  };

  const disabled = !isEditing || isLoading;

  const label = (htmlFor: string, text: string, required: boolean) => (
    <label htmlFor={htmlFor} className="mb-2 block text-base text-gray-800">
      {text}
      {required && <span className="required-asterisk"> *</span>}
    </label>
  );

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <div className="min-w-0">
          {label('candidate-details-first-name', 'First Name', true)}
          <Input
            id="candidate-details-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={disabled}
            maxLength={100}
            placeholder="First Name"
            className={FIELD_CLASS}
          />
        </div>
        <div className="min-w-0">
          {label('candidate-details-last-name', 'Last Name', true)}
          <Input
            id="candidate-details-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={disabled}
            maxLength={100}
            placeholder="Last Name"
            className={FIELD_CLASS}
          />
        </div>
        <div className="min-w-0">
          {label('candidate-details-phone', 'Phone Number', true)}
          <PhoneNumberField
            countryCode={countryCode || undefined}
            onCountryCodeChange={setCountryCode}
            phoneNumber={phone}
            onPhoneNumberChange={setPhone}
            disabled={disabled}
            className="h-12 rounded-full !border-gray-300 !bg-white text-sm text-gray-800"
          />
        </div>
        <div className="min-w-0">
          {label('candidate-details-email', 'Email Address', true)}
          <Input
            id="candidate-details-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={disabled}
            placeholder="Email Address"
            className={FIELD_CLASS}
          />
        </div>
        <div className="min-w-0">
          {label('candidate-details-source', 'Source', false)}
          <Input
            id="candidate-details-source"
            value={sourceLabel || 'N/A'}
            title={sourceLabel || undefined}
            disabled
            readOnly
            className={`${FIELD_CLASS} truncate`}
          />
        </div>
        <div className="min-w-0">
          {label('candidate-details-applied-date', 'Applied Date', false)}
          <Input
            id="candidate-details-applied-date"
            value={appliedDate || 'N/A'}
            disabled
            readOnly
            className={`${FIELD_CLASS} truncate`}
          />
        </div>
      </div>

      {isEditing && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={isLoading || !isFormValid}
            className="h-10 w-full rounded-full bg-primary px-6 text-sm font-semibold text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isLoading ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CandidateDetailsForm;
