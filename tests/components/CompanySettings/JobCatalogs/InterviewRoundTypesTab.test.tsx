import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const updateRoundType = vi.fn();

vi.mock('../../../../src/api/job-service/Platform/masterInterviewRounds', () => ({
  useSearchPlatformInterviewRoundTypesQuery: () => ({
    isLoading: false,
    data: {
      total: 1,
      items: [
        {
          round_type_id: 'rt-1',
          round_name: 'AI Video Interview',
          round_description: 'AI video.',
          variant_labels: { soundwave: 'Voice Agent Round', avatar: 'Avatar Round' },
        },
      ],
    },
  }),
  useUpdatePlatformInterviewRoundTypeMutation: () => [updateRoundType],
}));

import InterviewRoundTypesTab from '../../../../src/components/CompanySettings/JobCatalogs/InterviewRoundTypesTab';

const openEdit = async () => {
  const user = userEvent.setup();
  render(<InterviewRoundTypesTab />);
  await user.click(await screen.findByLabelText(/edit round type/i));
  return user;
};

describe('InterviewRoundTypesTab', () => {
  beforeEach(() => {
    updateRoundType.mockReset();
    updateRoundType.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('does not offer creating a round type', () => {
    render(<InterviewRoundTypesTab />);
    expect(screen.queryByRole('button', { name: /add round type/i })).toBeNull();
  });

  it('opens the editor with the saved name, description and variant labels', async () => {
    await openEdit();
    expect((await screen.findByPlaceholderText('Name *')) as HTMLInputElement).toHaveProperty(
      'value',
      'AI Video Interview'
    );
    expect(
      (screen.getByPlaceholderText(/display text for "soundwave"/i) as HTMLInputElement).value
    ).toBe('Voice Agent Round');
    expect(
      (screen.getByPlaceholderText(/display text for "avatar"/i) as HTMLInputElement).value
    ).toBe('Avatar Round');
    expect(screen.queryByPlaceholderText(/display text for "online"/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/display text for "offline"/i)).toBeNull();
  });

  it('saves the new name and only the labels that have text', async () => {
    const user = await openEdit();

    const name = await screen.findByPlaceholderText('Name *');
    await user.clear(name);
    await user.type(name, '  AI Video ');
    const soundwave = screen.getByPlaceholderText(/display text for "soundwave"/i);
    await user.clear(soundwave);
    await user.type(soundwave, ' Voice Round ');
    await user.clear(screen.getByPlaceholderText(/display text for "avatar"/i));

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(updateRoundType).toHaveBeenCalledTimes(1));
    expect(updateRoundType).toHaveBeenCalledWith({
      roundTypeId: 'rt-1',
      round_name: 'AI Video',
      round_description: 'AI video.',
      variant_labels: { soundwave: 'Voice Round' },
    });
  });

  it('sends no labels at all when every label is cleared', async () => {
    const user = await openEdit();

    await user.clear(await screen.findByPlaceholderText(/display text for "soundwave"/i));
    await user.clear(screen.getByPlaceholderText(/display text for "avatar"/i));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(updateRoundType).toHaveBeenCalledTimes(1));
    expect(updateRoundType.mock.calls[0][0].variant_labels).toBeNull();
  });
});
