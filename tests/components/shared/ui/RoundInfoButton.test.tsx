import { describe, it, expect } from 'vitest';
import { ConfigProvider } from 'antd';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RoundInfoButton from '../../../../src/components/shared/ui/RoundInfoButton';

const sections = [{ title: 'Round Overview', text: 'A live video interview.' }];

const renderButton = (props: Partial<React.ComponentProps<typeof RoundInfoButton>> = {}) =>
  render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <RoundInfoButton
        roundName="Live Video Interview"
        sections={sections}
        ariaLabel="About this round"
        {...props}
      />
    </ConfigProvider>
  );

describe('RoundInfoButton', () => {
  it('previews the round on hover and hides it when the mouse leaves', async () => {
    renderButton();
    const button = screen.getByRole('button', { name: 'About this round' });

    fireEvent.mouseEnter(button);
    expect(await screen.findByText('A live video interview.')).toBeTruthy();

    fireEvent.mouseLeave(button);
    await waitFor(() => expect(screen.queryByText('A live video interview.')).toBeNull());
  });

  it('opens a modal on click that can be closed', async () => {
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: 'About this round' }));

    expect(await screen.findByText('Live Video Interview')).toBeTruthy();
    expect(screen.getByText('A live video interview.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Close' })).toBeNull());
  });

  it('does not show the hover preview on top of the open modal', async () => {
    renderButton();
    const button = screen.getByRole('button', { name: 'About this round' });
    fireEvent.mouseEnter(button);
    fireEvent.click(button);

    await screen.findByRole('button', { name: 'Close' });
    expect(screen.getAllByText('A live video interview.')).toHaveLength(1);
  });

  it('does nothing while disabled', () => {
    renderButton({ disabled: true });
    const button = screen.getByRole('button', { name: 'About this round' }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    fireEvent.mouseEnter(button);
    fireEvent.click(button);
    expect(screen.queryByText('A live video interview.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
  });
});
