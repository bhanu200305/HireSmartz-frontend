import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const updateCandidate = vi.fn();
const showToast = vi.fn();

vi.mock('../../../../src/api/candidate-service/Candidates/CandidateLifecycle', () => ({
  useUpdateCandidateMutation: () => [updateCandidate, { isLoading: false }],
}));
vi.mock('../../../../src/components/shared/ui/toast', () => ({
  showToast: (...args: unknown[]) => showToast(...args),
}));

// antd's Select can't be driven in jsdom (its option list is virtualised), so the
// phone field is a plain stand-in; what's under test is the form's own logic.
vi.mock('../../../../src/components/shared/ui/PhoneNumberField', () => ({
  default: (props: {
    countryCode: string | undefined;
    onCountryCodeChange: (v: string) => void;
    phoneNumber: string;
    onPhoneNumberChange: (v: string) => void;
  }) => (
    <div>
      <select
        aria-label="Country code"
        value={props.countryCode ?? ''}
        onChange={(e) => props.onCountryCodeChange(e.target.value)}
      >
        <option value="">Code</option>
        <option value="+1">+1</option>
      </select>
      <input
        placeholder="Phone Number"
        value={props.phoneNumber}
        onChange={(e) => props.onPhoneNumberChange(e.target.value)}
      />
    </div>
  ),
}));

import CandidateDetailsForm from '../../../../src/components/JobsOpening/Candidates/CandidateDetailsForm';

const candidate = {
  id: 'c1',
  first_name: 'Jane',
  last_name: 'Doe',
  email_id: 'jane@example.com',
  contact_no: '(555) 014-7823',
} as never;

const renderForm = () =>
  render(
    <CandidateDetailsForm
      candidate={candidate}
      isEditing
      onDone={vi.fn()}
      sourceLabel="Recruiter upload"
      appliedDate="Oct 5, 2026"
    />
  );

const phoneInput = () => screen.getByPlaceholderText('Phone Number') as HTMLInputElement;

describe('CandidateDetailsForm phone handling', () => {
  beforeEach(() => {
    updateCandidate.mockReset();
    updateCandidate.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    showToast.mockReset();
  });

  it('shows a number stored without a country code as written, with no code picked', () => {
    renderForm();
    expect(phoneInput().value).toBe('5550147823');
    expect((screen.getByLabelText('Country code') as HTMLSelectElement).value).toBe('');
  });

  it('saves another field without sending or validating the phone', async () => {
    renderForm();
    const first = screen.getByPlaceholderText('First Name');
    fireEvent.change(first, { target: { value: 'Janet' } });
    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(updateCandidate).toHaveBeenCalledTimes(1));
    expect(updateCandidate.mock.calls[0][0].body).toEqual({ first_name: 'Janet' });
    expect(showToast).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('blocks saving an edited phone until a country code is chosen', async () => {
    renderForm();
    fireEvent.change(phoneInput(), { target: { value: '5550147824' } });
    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Select a country code.' })
      )
    );
    expect(updateCandidate).not.toHaveBeenCalled();
  });

  it('sends E.164 once a country code is chosen and the phone is edited', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText('Country code'), { target: { value: '+1' } });
    fireEvent.change(phoneInput(), { target: { value: '2015550123' } });
    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(updateCandidate).toHaveBeenCalledTimes(1));
    expect(updateCandidate.mock.calls[0][0].body).toEqual({ contact_no: '+12015550123' });
  });
});
