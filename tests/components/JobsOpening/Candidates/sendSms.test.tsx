import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatStoredPhoneForDisplay } from '../../../../src/shared/utils/validation/phoneValidation';

type SendResult = { candidate_id: string; sent: boolean; skipped_reason: string | null };
let sendResults: SendResult[] = [];
const showToastMock = vi.fn();

vi.mock('../../../../src/api/candidate-service/Candidates/messaging', () => ({
  useSendBulkCandidateSmsMutation: () => [
    () => ({ unwrap: () => Promise.resolve({ results: sendResults }) }),
    { isLoading: false },
  ],
  usePreviewCandidateSmsMutation: () => [vi.fn(), { data: undefined, isLoading: false }],
  useGenerateSmsContentMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock('../../../../src/components/shared/ui/toast', () => ({
  showToast: (...args: unknown[]) => showToastMock(...args),
}));

import BulkSendSmsModal from '../../../../src/components/JobsOpening/Candidates/Modal/BulkSendSmsModal';

const person = (id: string, first: string) =>
  ({ id, first_name: first, last_name: 'Setia' }) as never;

const send = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Send SMS' }));
  });
};

describe('formatStoredPhoneForDisplay', () => {
  it('puts a space between the country code and the number', () => {
    expect(formatStoredPhoneForDisplay('+447911123456')).toBe('+44 7911123456');
    expect(formatStoredPhoneForDisplay('+919878800140')).toBe('+91 9878800140');
  });

  it('leaves a number without a country code, and empty values, alone', () => {
    expect(formatStoredPhoneForDisplay('(555) 014-7823')).toBe('(555) 014-7823');
    expect(formatStoredPhoneForDisplay('')).toBe('');
    expect(formatStoredPhoneForDisplay(null)).toBe('');
  });
});

describe('Send SMS to one candidate', () => {
  beforeEach(() => showToastMock.mockReset());

  it('closes after sending instead of showing the Results screen', async () => {
    sendResults = [{ candidate_id: 'c1', sent: true, skipped_reason: null }];
    const onClose = vi.fn();
    render(<BulkSendSmsModal open onClose={onClose} candidates={[person('c1', 'Vedansh')]} />);
    await send();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Results')).toBeNull();
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'SMS queued.', type: 'success' })
    );
  });

  it('keeps the form open and says why when the one candidate was not sent to', async () => {
    sendResults = [{ candidate_id: 'c1', sent: false, skipped_reason: 'no_phone' }];
    const onClose = vi.fn();
    render(<BulkSendSmsModal open onClose={onClose} candidates={[person('c1', 'Vedansh')]} />);
    await send();

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText('Results')).toBeNull();
    expect(screen.getByText(/Not sent:/)).toBeTruthy();
  });
});

describe('Send SMS to several candidates', () => {
  it('still shows the per-candidate Results screen', async () => {
    sendResults = [
      { candidate_id: 'c1', sent: true, skipped_reason: null },
      { candidate_id: 'c2', sent: true, skipped_reason: null },
    ];
    const onClose = vi.fn();
    render(
      <BulkSendSmsModal
        open
        onClose={onClose}
        candidates={[person('c1', 'Asha'), person('c2', 'Ravi')]}
      />
    );
    fireEvent.change(screen.getByPlaceholderText('Type your SMS'), { target: { value: 'Hello' } });
    await send();

    expect(screen.getByText('Results')).toBeTruthy();
    expect(screen.getAllByText('Queued')).toHaveLength(2);
    expect(onClose).not.toHaveBeenCalled();
  });
});
