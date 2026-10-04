import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DropdownWithAddOption from '../../../../src/components/shared/ui/DropdownWithAddOption';

const options = [{ id: '1', name: 'Bartender', isActive: true }];

const openDeleteConfirm = async (onDeleteOption: () => Promise<void>) => {
  const user = userEvent.setup();
  render(
    <DropdownWithAddOption
      value={undefined}
      onChange={vi.fn()}
      options={options}
      type="jobTitle"
      onDeleteOption={onDeleteOption}
    />
  );
  await user.click(screen.getByRole('combobox'));
  const deleteButton = document.querySelector('.hover-actions-container button.group');
  expect(deleteButton).not.toBeNull();
  await user.click(deleteButton as Element);
  const confirm = await screen.findByRole('button', { name: 'Remove' });
  return { user, confirm };
};

describe('DropdownWithAddOption - delete confirmation', () => {
  it('stays open when the delete fails, so the user can retry or cancel', async () => {
    const onDeleteOption = vi.fn().mockRejectedValue(new Error('server said no'));
    const { user, confirm } = await openDeleteConfirm(onDeleteOption);

    await user.click(confirm);

    await waitFor(() => expect(onDeleteOption).toHaveBeenCalledWith('1', 'jobTitle'));
    expect(screen.getByRole('button', { name: 'Remove' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('closes when the delete succeeds', async () => {
    const onDeleteOption = vi.fn().mockResolvedValue(undefined);
    const { user, confirm } = await openDeleteConfirm(onDeleteOption);

    await user.click(confirm);

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull());
  });

  it('can be cancelled without calling delete', async () => {
    const onDeleteOption = vi.fn().mockResolvedValue(undefined);
    const { user } = await openDeleteConfirm(onDeleteOption);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDeleteOption).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull());
  });
});
