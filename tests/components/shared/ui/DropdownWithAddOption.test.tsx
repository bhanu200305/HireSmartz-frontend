import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DropdownWithAddOption from '../../../../src/components/shared/ui/DropdownWithAddOption';

const options = [{ id: '1', name: 'Bartender', isActive: true }];

describe('DropdownWithAddOption — Enter-to-add', () => {
  it('adds the typed value on Enter when nothing matches it', async () => {
    const user = userEvent.setup();
    const onAddOption = vi.fn();
    render(
      <DropdownWithAddOption
        value={undefined}
        onChange={vi.fn()}
        options={options}
        type="jobTitle"
        onAddOption={onAddOption}
      />
    );

    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.type(input, 'Chef{Enter}');

    expect(onAddOption).toHaveBeenCalledWith('Chef', 'jobTitle');
  });

  it('does not add on Enter when typing narrows to an exact existing option', async () => {
    const user = userEvent.setup();
    const onAddOption = vi.fn();
    const onChange = vi.fn();
    render(
      <DropdownWithAddOption
        value={undefined}
        onChange={onChange}
        options={options}
        type="jobTitle"
        onAddOption={onAddOption}
      />
    );

    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.type(input, 'Bartender{Enter}');

    expect(onAddOption).not.toHaveBeenCalled();
  });
});

describe('DropdownWithAddOption — status toggle', () => {
  it('calls onToggleActive with the option id and next state after confirming a deactivate', async () => {
    const user = userEvent.setup();
    const onToggleActive = vi.fn();
    render(
      <DropdownWithAddOption
        value={undefined}
        onChange={vi.fn()}
        options={options}
        type="jobTitle"
        enableEditDelete
        onToggleActive={onToggleActive}
      />
    );

    const input = screen.getByRole('combobox');
    await user.click(input);

    const toggle = screen.getByRole('switch');
    await user.click(toggle);

    const confirmButton = await screen.findByRole('button', { name: /deactivate/i });
    await user.click(confirmButton);

    expect(onToggleActive).toHaveBeenCalledWith('1', false, 'jobTitle');
  });
});
