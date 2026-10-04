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
          round_name: 'Hiring Panel Round',
          round_description: 'Human panel.',
          variant_labels: { online: 'Online Round', offline: 'In-Person Round' },
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
      'Hiring Panel Round'
    );
    expect(
      (screen.getByPlaceholderText(/display text for "online"/i) as HTMLInputElement).value
    ).toBe('Online Round');
    expect(
      (screen.getByPlaceholderText(/display text for "offline"/i) as HTMLInputElement).value
    ).toBe('In-Person Round');
    expect(
      (screen.getByPlaceholderText(/display text for "soundwave"/i) as HTMLInputElement).value
    ).toBe('');
  });

  it('saves the new name and only the labels that have text', async () => {
    const user = await openEdit();

    const name = await screen.findByPlaceholderText('Name *');
    await user.clear(name);
    await user.type(name, '  Panel Interview ');
    const online = screen.getByPlaceholderText(/display text for "online"/i);
    await user.clear(online);
    await user.type(online, ' Remote Panel ');
    await user.clear(screen.getByPlaceholderText(/display text for "offline"/i));

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(updateRoundType).toHaveBeenCalledTimes(1));
    expect(updateRoundType).toHaveBeenCalledWith({
      roundTypeId: 'rt-1',
      round_name: 'Panel Interview',
      round_description: 'Human panel.',
      variant_labels: { online: 'Remote Panel' },
    });
  });

  it('sends no labels at all when every label is cleared', async () => {
    const user = await openEdit();

    await user.clear(await screen.findByPlaceholderText(/display text for "online"/i));
    await user.clear(screen.getByPlaceholderText(/display text for "offline"/i));
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(updateRoundType).toHaveBeenCalledTimes(1));
    expect(updateRoundType.mock.calls[0][0].variant_labels).toBeNull();
  });
});
