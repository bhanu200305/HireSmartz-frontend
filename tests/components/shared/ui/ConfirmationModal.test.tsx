import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmationModal from '../../../../src/components/shared/ui/ConfirmationModal';

describe('ConfirmationModal', () => {
  it('uses Title Case "Cancel" by default and the given confirm text', () => {
    render(
      <ConfirmationModal
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Sure?"
        confirmText="Leave Page"
      />
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Leave Page' })).toBeTruthy();
    expect(screen.queryByText('CANCEL')).toBeNull();
  });

  it('calls onConfirm and onClose from their own buttons', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmationModal
        onClose={onClose}
        onConfirm={onConfirm}
        title="Sure?"
        confirmText="Switch"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Switch' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('accepts a custom cancel text', () => {
    render(
      <ConfirmationModal
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Sure?"
        confirmText="AI-Regenerate"
        cancelText="Use Uploaded JD"
      />
    );
    expect(screen.getByRole('button', { name: 'Use Uploaded JD' })).toBeTruthy();
  });
});
